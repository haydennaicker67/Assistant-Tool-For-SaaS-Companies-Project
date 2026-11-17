import { Hono } from "hono";
import { z } from "zod";
import { db } from "../lib/db";
import { savedCharts } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { AppError } from "../errors";
import type { AuthEnv } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";

export const chartRoutes = new Hono<AuthEnv>();

const saveChartSchema = z.object({
  title: z.string().min(1),
  question: z.string().min(1),
  chartPayload: z.any(), // The full ChartSpec
});

// Save a chart
chartRoutes.post("/save", authMiddleware, async (c) => {
  const projectId = c.get("projectId");
  const claims = c.get("embedClaims");
  const body = await c.req.json();

  const parsed = saveChartSchema.safeParse(body);
  if (!parsed.success) throw new AppError("invalid_request", "Invalid payload", 400);

  const [saved] = await db.insert(savedCharts).values({
    projectId,
    tenantId: claims.tenant_id,
    title: parsed.data.title,
    question: parsed.data.question,
    chartPayload: parsed.data.chartPayload,
  }).returning();

  if (!saved) {
    throw new AppError("internal_error", "Failed to save chart", 500);
  }

  return c.json({ ok: true, id: saved.id });
});

// Get all saved charts for the current end-user
chartRoutes.get("/list", authMiddleware, async (c) => {
  const projectId = c.get("projectId");
  const claims = c.get("embedClaims");

  const charts = await db.select()
    .from(savedCharts)
    .where(and(
      eq(savedCharts.projectId, projectId),
      eq(savedCharts.tenantId, claims.tenant_id)
    ))
    .orderBy(desc(savedCharts.createdAt));

  return c.json({ charts });
});

// Delete a chart
chartRoutes.delete("/:chartId", authMiddleware, async (c) => {
  const projectId = c.get("projectId");
  const claims = c.get("embedClaims");
  const chartId = c.req.param("chartId");

  await db.delete(savedCharts)
    .where(and(
      eq(savedCharts.id, chartId),
      eq(savedCharts.projectId, projectId),
      eq(savedCharts.tenantId, claims.tenant_id) // Ensure they own it
    ));

  return c.json({ ok: true });
});