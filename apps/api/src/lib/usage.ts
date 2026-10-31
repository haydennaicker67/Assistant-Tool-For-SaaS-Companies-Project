import { db } from "./db";
import { usageEvents } from "../db/schema";

/**
 * Records a query event for billing and rate-limiting purposes.
 * In Part 2, this will also increment a Redis counter for fast limit checks.
 */
export async function trackUsage(projectId: string, tenantId: string) {
  try {
    await db.insert(usageEvents).values({
      projectId,
      tenantId,
      eventType: "query",
    });
  } catch (err) {
    // We don't want usage tracking failures to break the actual query
    console.error("Failed to track usage event", err);
  }
}