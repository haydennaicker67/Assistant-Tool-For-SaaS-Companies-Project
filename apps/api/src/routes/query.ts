import { Hono } from "hono";
import { z } from "zod";
import { db } from "../lib/db";
import { projects, semanticLayers } from "../db/schema";
import { eq } from "drizzle-orm";
import { generateSQL } from "../lib/nl-to-sql";
import { validateSQL } from "../lib/sql-validator";
import { queryWithRLS } from "../lib/rls";
import { AppError } from "../errors";
import type { AuthEnv } from "../middleware/auth";
import type { ChartSpec } from "@vizzly-sa/shared";
import { authMiddleware } from "../middleware/auth";

export const queryRoutes = new Hono<AuthEnv>();

const nlRequestSchema = z.object({
  question: z.string().min(1),
});

queryRoutes.post("/nl", authMiddleware, async (c) => {
  const logger = c.get("logger");
  const claims = c.get("embedClaims"); // From auth middleware
  const projectId = c.req.header("x-project-id"); // We'll pass this from the SDK for now
  
  if (!projectId) {
    throw new AppError("invalid_request", "Missing x-project-id header", 400);
  }

  const body = await c.req.json();
  const parsed = nlRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError("invalid_request", "Invalid payload", 400, parsed.error.message);
  }

  // 1. Fetch the project and its semantic layer
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) throw new AppError("invalid_request", "Project not found", 404);

  const [layerRecord] = await db.select().from(semanticLayers).where(eq(semanticLayers.projectId, projectId));
  if (!layerRecord) throw new AppError("invalid_request", "Semantic layer not found", 404);

  // 2. Generate SQL via LLM
  logger.info({ question: parsed.data.question }, "Generating SQL");
  const { sql, explanation } = await generateSQL(parsed.data.question, layerRecord.layer);

  // 3. Validate SQL
  logger.info({ sql }, "Validating SQL");
  validateSQL(sql, layerRecord.layer);

  // 4. Execute query with RLS
  logger.info("Executing query");
  const start = Date.now();
  let rows: any[];
  try {
    rows = await queryWithRLS(project.dbConnectionString, claims.tenant_id, async (tx) => {
      return await tx.unsafe(sql); // unsafe() allows raw string execution
    });
  } catch (err: any) {
    logger.error({ err, sql }, "Query execution failed");
    // Catch Postgres syntax errors from the LLM
    throw new AppError("invalid_sql", "I couldn't understand that question—try rephrasing.", 400, err.message);
  }
  const queryMs = Date.now() - start;

  // 5. Format ChartSpec
  // (For now, we just infer columns based on the returned rows)
  const columns = rows.length > 0 
    ? Object.keys(rows[0]).map(key => ({
        name: key,
        label: key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        type: typeof rows[0][key] === "number" ? "numeric" : "text" as any,
      }))
    : [];

  const chartSpec: ChartSpec = {
    chartType: "table", // Default to table for now, the SDK will let the user switch
    columns,
    rows,
    meta: {
      explanation,
      sql,
      queryMs,
      totalMs: Date.now() - start,
      cached: false,
      rowCount: rows.length,
      truncated: false,
    }
  };

  return c.json(chartSpec);
});