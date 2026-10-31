import { db } from "./db";
import { auditLogs } from "../db/schema";

export async function logAudit(
  projectId: string,
  actorId: string,
  action: "query" | "export" | "semantic_update" | "login",
  details: Record<string, any>
) {
  try {
    await db.insert(auditLogs).values({
      projectId,
      actorId,
      action,
      details,
    });
  } catch (err) {
    console.error("Failed to write audit log", err);
  }
}