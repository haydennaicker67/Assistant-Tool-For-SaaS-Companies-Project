import { db } from "./db";
import { usageEvents, projects } from "../db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { AppError } from "../errors";

// B1-B4 FIX: Define limits per tier
const TIER_LIMITS: Record<string, number> = {
  free: 1000,
  growth: 25000,
  scale: 999999999, // Unlimited
};

export async function checkUsageLimit(projectId: string) {
  // 1. Get the project's current tier
  const [project] = await db.select({ planTier: projects.planTier })
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) throw new AppError("invalid_request", "Project not found", 404);

 const limit = TIER_LIMITS[project.planTier] ?? TIER_LIMITS.free ?? 1000;

  // 2. If limit is effectively infinite, skip the count
  if (limit >= 999999999) return;

  // 3. Count usage for the current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.projectId, projectId),
        gte(usageEvents.createdAt, startOfMonth)
      )
    );

  const currentUsage = Number(result?.count || 0);

  if (currentUsage >= limit) {
    throw new AppError(
      "limit_exceeded",
      `You have reached your monthly query limit of ${limit}. Please upgrade your plan to continue.`,
      402
    );
  }
}