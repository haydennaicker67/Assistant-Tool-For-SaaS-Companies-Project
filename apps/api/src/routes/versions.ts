import { Hono } from "hono";
import { db } from "../lib/db";
import { semanticLayerVersions } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import type { AppEnv } from "../types";

export const versionRoutes = new Hono<AppEnv>();

versionRoutes.get("/:projectId", async (c) => {
  const projectId = c.req.param("projectId");

  const versions = await db.select({
    id: semanticLayerVersions.id,
    versionNumber: semanticLayerVersions.versionNumber,
    createdAt: semanticLayerVersions.createdAt,
  })
  .from(semanticLayerVersions)
  .where(eq(semanticLayerVersions.projectId, projectId))
  .orderBy(desc(semanticLayerVersions.versionNumber));

  return c.json({ versions });
});

versionRoutes.get("/:projectId/:versionId", async (c) => {
  const versionId = c.req.param("versionId");

  const [version] = await db.select()
    .from(semanticLayerVersions)
    .where(eq(semanticLayerVersions.id, versionId));

  if (!version) return c.json({ error: "Version not found" }, 404);

  return c.json({ layer: version.layer });
});