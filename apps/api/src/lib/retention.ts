import { db } from "./db";
import { auditLogs, usageEvents } from "../db/schema";
import { lt } from "drizzle-orm";

/**
 * S21 FIX: Purge logs older than 90 days per our retention policy.
 * This should be run daily via a cron job (Railway cron, Vercel cron, etc.)
 */
export async function purgeOldLogs() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  console.log(`[Retention] Purging logs older than ${ninetyDaysAgo.toISOString()}`);

  const deletedAudit = await db.delete(auditLogs)
    .where(lt(auditLogs.createdAt, ninetyDaysAgo))
    .returning({ id: auditLogs.id });

  // Usage events can be purged too, but keep 12 months for billing
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const deletedUsage = await db.delete(usageEvents)
    .where(lt(usageEvents.createdAt, oneYearAgo))
    .returning({ id: usageEvents.id });

  console.log(`[Retention] Deleted ${deletedAudit.length} audit logs and ${deletedUsage.length} usage events.`);
}