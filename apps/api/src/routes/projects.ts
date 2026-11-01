import { Hono } from "hono";
import { z } from "zod";
import { db } from "../lib/db";
import { embedSecrets, projects, semanticLayers, semanticLayerVersions } from "../db/schema";
import { introspectSchema, verifyRLSCoverage } from "../lib/schema-introspect"; // NEW
import { generateSemanticLayer } from "../lib/semantic-gen";
import { AppError } from "../errors";
import type { AuthUserEnv } from "../middleware/require-user";
import { eq, sql } from "drizzle-orm"; 
import { randomBytes } from "node:crypto";
import { logAudit } from "../lib/audit"; 
import { encrypt, decrypt } from "../lib/crypto";
import { validateDatabaseUrl } from "../lib/url-validator";

export const projectRoutes = new Hono<AuthUserEnv>();

const connectSchema = z.object({
  name: z.string().min(1),
  dbConnectionString: z.string().url(),
});

projectRoutes.post("/connect-db", async (c) => {
  const logger = c.get("logger");
  const userId = c.get("userId");
  const body = await c.req.json();
  
  const parsed = connectSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError("invalid_request", "Invalid payload", 400, parsed.error.message);
  }

  const { name, dbConnectionString } = parsed.data;

  // S9 FIX: Block SSRF attempts
  try {
    validateDatabaseUrl(dbConnectionString);
  } catch (err: any) {
    throw new AppError("invalid_request", err.message, 400);
  }
  
  logger.info("Connecting to customer DB and verifying RLS...");
  
  try {
    // S11 FIX: Verify RLS is enabled on all tables
    const rlsStatus = await verifyRLSCoverage(dbConnectionString);
    const unprotectedTables = rlsStatus.filter(t => !t.rlsEnabled);
    
    if (unprotectedTables.length > 0) {
      const tableNames = unprotectedTables.map(t => t.tableName).join(", ");
      throw new AppError(
        "invalid_request", 
        `Security Error: The following tables do not have Row-Level Security enabled: ${tableNames}. Please enable RLS before connecting.`, 
        400
      );
    }

    const rawSchema = await introspectSchema(dbConnectionString);
    if (rawSchema.length === 0) {
      throw new AppError("invalid_request", "No tables found in the public schema of this database.", 400);
    }

    logger.info("Generating semantic layer...");
    const semanticLayer = await generateSemanticLayer(rawSchema);

    const [newProject] = await db.insert(projects).values({
      name,
      dbConnectionStringEncrypted: encrypt(dbConnectionString),
      userId: userId, 
    }).returning();

    if (!newProject) {
      throw new AppError("internal_error", "Failed to create project in control plane", 500);
    }

    await db.insert(semanticLayers).values({
      projectId: newProject.id,
      layer: semanticLayer,
      published: false,
    });

    return c.json({ ok: true, projectId: newProject.id, semanticLayer });

  } catch (err: any) {
    logger.error({ err }, "Failed to connect DB");
    if (err instanceof AppError) throw err;
    if (err.code === "ECONNREFUSED" || err.code === "28P01") {
      throw new AppError("invalid_request", "Failed to connect to the database. Please check the host, password, and ensure it allows external connections.", 400);
    }
    throw new AppError("internal_error", "An error occurred while generating the semantic layer.", 500);
  }
});

projectRoutes.get("/:id/semantic-layer", async (c) => {
  const userId = c.get("userId");
  const projectId = c.req.param("id");
  
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || project.userId !== userId) {
    throw new AppError("invalid_request", "Project not found or unauthorized", 404);
  }

  const [layerRecord] = await db.select().from(semanticLayers).where(eq(semanticLayers.projectId, projectId));
  if (!layerRecord) throw new AppError("invalid_request", "Semantic layer not found", 404);

  const [secretRecord] = await db.select().from(embedSecrets).where(eq(embedSecrets.projectId, projectId));

  return c.json({
    layer: layerRecord.layer,
    published: layerRecord.published,
    secret: secretRecord?.secret || null
  });
});

projectRoutes.post("/:id/semantic-layer/publish", async (c) => {
  const userId = c.get("userId");
  const projectId = c.req.param("id");
  const body = await c.req.json().catch(() => ({})); 

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || project.userId !== userId) {
    throw new AppError("invalid_request", "Project not found or unauthorized", 404);
  }

  let updatedLayer;
  if (body.layer) {
    const [result] = await db.update(semanticLayers)
      .set({ layer: body.layer, published: true, updatedAt: new Date() })
      .where(eq(semanticLayers.projectId, projectId))
      .returning();
    if (!result) throw new AppError("internal_error", "Failed to update semantic layer", 500);
    updatedLayer = result.layer;
  } else {
    const [result] = await db.update(semanticLayers)
      .set({ published: true, updatedAt: new Date() })
      .where(eq(semanticLayers.projectId, projectId))
      .returning();
    if (!result) throw new AppError("internal_error", "Failed to update semantic layer", 500);
    updatedLayer = result.layer;
  }

  const [versionResult] = await db.select({ count: sql<number>`count(*)` })
    .from(semanticLayerVersions)
    .where(eq(semanticLayerVersions.projectId, projectId));
  
  const nextVersionNumber = Number(versionResult?.count || 0) + 1;

  await db.insert(semanticLayerVersions).values({
    projectId,
    layer: updatedLayer,
    versionNumber: nextVersionNumber
  });

  const [existingSecret] = await db.select().from(embedSecrets).where(eq(embedSecrets.projectId, projectId));
  let secret = existingSecret?.secret;
  if (!secret) {
    secret = randomBytes(32).toString("hex");
    await db.insert(embedSecrets).values({ projectId, secret });
  }

  logAudit(projectId, userId, "semantic_update", { 
    message: `Published semantic layer version ${nextVersionNumber}` 
  }).catch(console.error);

  return c.json({ ok: true, secret, version: nextVersionNumber });
});