import { Hono } from "hono";
import { db } from "../lib/db";
import { auditLogs } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import type { AppEnv } from "../types";

export const auditRoutes = new Hono<AppEnv>();

auditRoutes.get("/:projectId", async (c) => {
  const projectId = c.req.param("projectId");

  const logs = await db.select()
    .from(auditLogs)
    .where(eq(auditLogs.projectId, projectId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);

  return c.json({ logs });
});