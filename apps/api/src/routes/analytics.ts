import { Hono } from "hono";
import { db } from "../lib/db";
import { usageEvents } from "../db/schema";
import { sql } from "drizzle-orm";
import type { AppEnv } from "../types";

export const analyticsRoutes = new Hono<AppEnv>();

analyticsRoutes.get("/:projectId/usage", async (c) => {
  const projectId = c.req.param("projectId");

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const rawUsage = await db.select({
    date: sql<string>`DATE(${usageEvents.createdAt})`,
    count: sql<number>`count(*)`,
  })
  .from(usageEvents)
  .where(
    sql`${usageEvents.projectId} = ${projectId} AND ${usageEvents.createdAt} >= ${sevenDaysAgo.toISOString()}`
  )
  .groupBy(sql`DATE(${usageEvents.createdAt})`)
  .orderBy(sql`DATE(${usageEvents.createdAt})`);

  const chartData = rawUsage.map(row => ({
    date: row.date,
    queries: Number(row.count)
  }));

  return c.json({ chartData });
});