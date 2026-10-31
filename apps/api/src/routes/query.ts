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
import { trackUsage } from "../lib/usage";
import { checkUsageLimit } from "../lib/limits";
import { generateCacheKey, getCachedQuery, setCachedQuery } from "../lib/cache";
import { logAudit } from "../lib/audit"; // NEW IMPORT

export const queryRoutes = new Hono<AuthEnv>();

const nlRequestSchema = z.object({
  question: z.string().min(1),
  projectId: z.string().uuid(),
});

queryRoutes.post("/nl", authMiddleware, async (c) => {
  const logger = c.get("logger");
  const claims = c.get("embedClaims"); 
  const projectId = c.get("projectId"); 

  await checkUsageLimit(projectId);
  trackUsage(projectId, claims.tenant_id).catch(console.error);

  const body = await c.req.json();
  const parsed = nlRequestSchema.safeParse({ ...body, projectId });
  
  if (!parsed.success) {
    throw new AppError("invalid_request", "Invalid payload", 400, parsed.error.message);
  }

  const { question } = parsed.data;

  const cacheKey = generateCacheKey(claims.tenant_id, question);
  const cachedResult = await getCachedQuery(cacheKey);
  
  if (cachedResult) {
    logger.info("Returning cached NL query result");
    return c.json({ 
      ...(cachedResult as any), 
      meta: { ...(cachedResult as any).meta, cached: true } 
    });
  }

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) throw new AppError("invalid_request", "Project not found", 404);

  const [layerRecord] = await db.select().from(semanticLayers).where(eq(semanticLayers.projectId, projectId));
  if (!layerRecord) throw new AppError("invalid_request", "Semantic layer not found", 404);

  logger.info({ question }, "Generating SQL");
  const { sql, explanation } = await generateSQL(question, layerRecord.layer);

  logger.info({ sql }, "Validating SQL");
  const validatedSql = validateSQL(sql, layerRecord.layer);

  logger.info("Executing query");
  const start = Date.now();
  let rows: any[];
  
  try {
    rows = await queryWithRLS(project.dbConnectionString, claims.tenant_id, async (tx) => {
      return await tx.unsafe(validatedSql); 
    });
  } catch (err: any) {
    logger.error({ err, sql }, "Query execution failed");
    throw new AppError("invalid_sql", "I couldn't understand that question—try rephrasing.", 400, err.message);
  }
  
  const queryMs = Date.now() - start;

  const columns = rows.length > 0 
    ? Object.keys(rows[0]).map(key => ({
        name: key,
        label: key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        type: typeof rows[0][key] === "number" ? "numeric" : "text" as any,
      }))
    : [];

  let chartType: "table" | "bar" = "table";
  if (sql.toLowerCase().includes("group by") && columns.length >= 2) {
    chartType = "bar";
  }

  const chartSpec: ChartSpec = {
    chartType: chartType,
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

  // NEW: Log the audit event
  logAudit(projectId, claims.user_id, "query", { question, sql: validatedSql }).catch(console.error);

  await setCachedQuery(cacheKey, chartSpec, 60);

  return c.json(chartSpec);
});