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
import { logAudit } from "../lib/audit";
import { decrypt } from "../lib/crypto";
import { queryRatelimit } from "../lib/ratelimit";
import crypto from "node:crypto";

export const queryRoutes = new Hono<AuthEnv>();

const nlRequestSchema = z.object({
  question: z.string().min(1).max(500),
  projectId: z.string().uuid(),
  dateRange: z.object({
    from: z.string(),
    to: z.string()
  }).optional()
});

queryRoutes.post("/nl", authMiddleware, async (c) => {
  // Q4 FIX: Start the timer at the very beginning of the request
  const requestStart = Date.now();

  const logger = c.get("logger");
  const claims = c.get("embedClaims"); 
  const projectId = c.get("projectId"); 

  const { success } = await queryRatelimit.limit(claims.tenant_id);
  if (!success) {
    throw new AppError("rate_limited", "Too many requests. Please wait a moment and try again.", 429);
  }

  await checkUsageLimit(projectId);
  trackUsage(projectId, claims.tenant_id).catch(console.error);

  const body = await c.req.json();
  const parsed = nlRequestSchema.safeParse({ ...body, projectId });
  
  if (!parsed.success) {
    throw new AppError("invalid_request", "Invalid payload", 400, parsed.error.message);
  }

  const { question, dateRange } = parsed.data;

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) throw new AppError("invalid_request", "Project not found", 404);

  // Q5 FIX: Only allow queries against PUBLISHED layers
  const [layerRecord] = await db.select().from(semanticLayers).where(eq(semanticLayers.projectId, projectId));
  if (!layerRecord) throw new AppError("invalid_request", "Semantic layer not found", 404);
  if (!layerRecord.published) {
    throw new AppError("invalid_request", "The semantic layer has not been published yet. Please publish it in the dashboard.", 400);
  }

  const layerHash = crypto.createHash("sha256").update(JSON.stringify(layerRecord.layer)).digest("hex");
  
  const cacheKey = generateCacheKey(
    projectId, 
    claims.tenant_id, 
    claims.role, 
    question + (dateRange ? `:${dateRange.from}:${dateRange.to}` : ""), 
    layerHash
  );
  
  const cachedResult = await getCachedQuery(cacheKey);
  
  if (cachedResult) {
    logger.info("Returning cached NL query result");
    return c.json({ 
      ...(cachedResult as any), 
      meta: { ...(cachedResult as any).meta, cached: true } 
    });
  }

  const connectionString = decrypt(project.dbConnectionStringEncrypted);

  logger.info({ questionLength: question.length }, "Generating SQL");
  const { sql, explanation } = await generateSQL(question, layerRecord.layer, dateRange);

  logger.info({ hasSql: !!sql }, "Validating SQL");
  const validatedSql = validateSQL(sql, layerRecord.layer);

  logger.info("Executing query");
  const dbStart = Date.now();
  let rows: any[];
  
  try {
    rows = await queryWithRLS(connectionString, claims.tenant_id, async (tx) => {
      // Q2 FIX: Enforce a hard cap server-side
      const safeSql = `SELECT * FROM (${validatedSql.replace(/;+$/, "")}) AS _vizzly_inner LIMIT 1000`;
      return await tx.unsafe(safeSql); 
    });
  } catch (err: any) {
    logger.error({ err }, "Query execution failed");
    // S15 FIX: Do not leak the raw Postgres error to the client
    throw new AppError("invalid_sql", "I couldn't understand that question—try rephrasing.", 400);
  }

  const queryMs = Date.now() - dbStart;

  // Q3 FIX: Better type detection (Postgres returns BIGINT/NUMERIC as strings)
  const isNumericString = (val: any) => typeof val === "string" && /^-?\d+(\.\d+)?$/.test(val);
  
  const columns = rows.length > 0 
    ? Object.keys(rows[0]).map(key => {
        const sampleVal = rows[0][key];
        const isNumeric = typeof sampleVal === "number" || isNumericString(sampleVal);
        return {
          name: key,
          label: key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
          type: isNumeric ? "numeric" : "text" as any,
        };
      })
    : [];

  // Q3 FIX: Detect chart type from semantic layer column types
  let chartType: "table" | "bar" | "line" | "pie" = "table";
  
  if (columns.length >= 2) {
    const hasDateColumn = layerRecord.layer.tables.some((table) =>
      table.columns.some((col) => 
        ["timestamp", "date"].includes(col.type) &&
        columns.some((c) => c.name === col.name)
      )
    );

    const hasNumericColumn = columns.some((c) => c.type === "numeric");

    if (hasDateColumn && hasNumericColumn) {
      chartType = "line";
    } else if (hasNumericColumn && columns.length === 2) {
      chartType = "bar";
    }
  }

  const chartSpec: ChartSpec = {
    chartType: chartType,
    columns,
    rows,
    meta: {
      explanation,
      // S15 FIX: Only return the SQL if the user is an admin
      sql: claims.role === "admin" ? sql : undefined,
      queryMs,
      totalMs: Date.now() - requestStart, // Q4 FIX: Full request duration
      aiMs: Date.now() - requestStart - queryMs, // Q4 FIX: AI + validation time
      cached: false,
      rowCount: rows.length,
      truncated: false,
    }
  };

  logAudit(projectId, claims.user_id, "query", { questionLength: question.length }).catch(console.error);
  await setCachedQuery(cacheKey, chartSpec, 60);

  return c.json(chartSpec);
});