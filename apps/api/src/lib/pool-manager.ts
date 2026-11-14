import postgres from "postgres";

interface PoolEntry {
  sql: postgres.Sql;
  lastUsed: number;
}

const pools = new Map<string, PoolEntry>();
const POOL_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_POOL_SIZE = 10;

export function getProjectPool(
  projectId: string, 
  connectionString: string, 
  caCertificate?: string | null // S20 FIX: Accept CA cert
): postgres.Sql {
  const existing = pools.get(projectId);
  const now = Date.now();

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

  // S20 FIX: Configure strict TLS verification
  const sslConfig = caCertificate 
    ? { ca: caCertificate, rejectUnauthorized: true } 
    : { rejectUnauthorized: true }; 

  const sql = postgres(connectionString, {
    max: MAX_POOL_SIZE,
    prepare: false,
    ssl: sslConfig,
    connect_timeout: 10,
    idle_timeout: 60,
  });

  pools.set(projectId, { sql, lastUsed: now });
  return sql;
}