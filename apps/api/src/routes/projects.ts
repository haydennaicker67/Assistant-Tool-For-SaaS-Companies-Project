import { Hono } from "hono";
import { z } from "zod";
import { db } from "../lib/db";
import { projects, semanticLayers } from "../db/schema";
import { introspectSchema } from "../lib/schema-introspect";
import { generateSemanticLayer } from "../lib/semantic-gen";
import { AppError } from "../errors";
import type { AppEnv } from "../types";

export const projectRoutes = new Hono<AppEnv>();

const connectSchema = z.object({
  name: z.string().min(1),
  dbConnectionString: z.string().url(), // basic validation, must start with postgres://
});

projectRoutes.post("/connect-db", async (c) => {
  const logger = c.get("logger");
  const body = await c.req.json();
  
  const parsed = connectSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError("invalid_request", "Invalid payload", 400, parsed.error.message);
  }

  const { name, dbConnectionString } = parsed.data;

  logger.info("Connecting to customer DB and introspecting...");
  
  try {
    // 1. Introspect the customer's DB
    const rawSchema = await introspectSchema(dbConnectionString);
    if (rawSchema.length === 0) {
      throw new AppError("invalid_request", "No tables found in the public schema of this database.", 400);
    }

    // 2. Generate the semantic layer via GPT-4o
    logger.info("Generating semantic layer via OpenAI...");
    const semanticLayer = await generateSemanticLayer(rawSchema);

       // 3. Save the project and the semantic layer to our control plane
    const [newProject] = await db.insert(projects).values({
      name,
      dbConnectionString,
    }).returning();

    if (!newProject) {
      throw new AppError("internal_error", "Failed to create project in control plane", 500);
    }

    await db.insert(semanticLayers).values({
      projectId: newProject.id,
      layer: semanticLayer,
      published: false, // Draft mode
    });

    return c.json({
      ok: true,
      projectId: newProject.id,
      semanticLayer
    });

  } catch (err: any) {
    logger.error({ err }, "Failed to connect DB");
    if (err instanceof AppError) throw err;
    // Handle postgres connection errors gracefully
    if (err.code === "ECONNREFUSED" || err.code === "28P01") {
      throw new AppError("invalid_request", "Failed to connect to the database. Please check the host, password, and ensure it allows external connections.", 400);
    }
    throw new AppError("internal_error", "An error occurred while generating the semantic layer.", 500);
  }
});