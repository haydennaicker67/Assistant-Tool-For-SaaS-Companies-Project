import { Hono } from "hono";
import { db } from "../lib/db";
import { semanticLayerVersions, semanticLayers, projects } from "../db/schema"; // Added projects
import { eq, desc, and } from "drizzle-orm"; // Added and
import type { AuthUserEnv } from "../middleware/require-user";
import { AppError } from "../errors";

export const versionRoutes = new Hono<AuthUserEnv>();

versionRoutes.get("/:projectId", async (c) => {
  const projectId = c.req.param("projectId");
  const userId = c.get("userId");

  // S2/S16 FIX: Verify ownership
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || project.userId !== userId) {
    throw new AppError("invalid_request", "Project not found or unauthorized", 404);
  }

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
  const projectId = c.req.param("projectId");
  const versionId = c.req.param("versionId");
  const userId = c.get("userId");

  // S2/S16 FIX: Verify ownership
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || project.userId !== userId) {
    throw new AppError("invalid_request", "Project not found or unauthorized", 404);
  }

  // S16 FIX: Filter by BOTH projectId and versionId
  const [version] = await db.select()
    .from(semanticLayerVersions)
    .where(and(
      eq(semanticLayerVersions.id, versionId),
      eq(semanticLayerVersions.projectId, projectId)
    ));

  if (!version) return c.json({ error: "Version not found" }, 404);

  return c.json({ layer: version.layer });
});

versionRoutes.post("/:projectId/:versionId/rollback", async (c) => {
  const projectId = c.req.param("projectId");
  const versionId = c.req.param("versionId");
  const userId = c.get("userId");

  // S2/S16 FIX: Verify ownership
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || project.userId !== userId) {
    throw new AppError("invalid_request", "Project not found or unauthorized", 404);
  }

  // S16 FIX: Filter by BOTH projectId and versionId
  const [version] = await db.select()
    .from(semanticLayerVersions)
    .where(and(
      eq(semanticLayerVersions.id, versionId),
      eq(semanticLayerVersions.projectId, projectId)
    ));

  if (!version) return c.json({ error: "Version not found" }, 404);

  await db.update(semanticLayers)
    .set({ layer: version.layer, updatedAt: new Date() })
    .where(eq(semanticLayers.projectId, projectId));

  return c.json({ ok: true });
});