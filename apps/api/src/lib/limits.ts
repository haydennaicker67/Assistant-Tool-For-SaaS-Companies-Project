import { db } from "./db";
import { usageEvents, projects } from "../db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { AppError } from "../errors";

// For now, everyone is on the "Free" tier (1,000 queries/month).
// In the next step, we'll fetch their actual Stripe tier.
const FREE_TIER_LIMIT = 1000; // Temporarily set to 0 to test

export async function checkUsageLimit(projectId: string) {
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

  if (currentUsage >= FREE_TIER_LIMIT) {
    throw new AppError(
      "limit_exceeded",
      "You have reached your monthly query limit. Please upgrade your plan to continue.",
      402 // Payment Required
    );
  }
}