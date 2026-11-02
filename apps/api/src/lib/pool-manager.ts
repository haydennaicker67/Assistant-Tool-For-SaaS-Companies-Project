import postgres from "postgres";

interface PoolEntry {
  sql: postgres.Sql;
  lastUsed: number;
}

const pools = new Map<string, PoolEntry>();
const POOL_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_POOL_SIZE = 10; // Max 10 connections per project

/**
 * R1 FIX: Get or create a bounded connection pool for a project.
 * Reuses existing pools instead of creating a new one per request.
 */
export function getProjectPool(projectId: string, connectionString: string): postgres.Sql {
  const existing = pools.get(projectId);
  const now = Date.now();

  // Clean up stale pools
  for (const [id, entry] of pools.entries()) {
    if (now - entry.lastUsed > POOL_IDLE_TIMEOUT_MS) {
      entry.sql.end().catch(() => {});
      pools.delete(id);
    }
  }

  if (existing) {
    existing.lastUsed = now;
    return existing.sql;
  }

  const sql = postgres(connectionString, {
    max: MAX_POOL_SIZE,
    prepare: false,
    ssl: "require",
    connect_timeout: 10,
    idle_timeout: 60, // Close idle connections after 60s
  });

  pools.set(projectId, { sql, lastUsed: now });
  return sql;
}