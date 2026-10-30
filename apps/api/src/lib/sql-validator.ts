import type { SemanticLayer } from "@vizzly-sa/shared";
import { AppError } from "../errors";

export function validateSQL(sql: string, layer: SemanticLayer): void {
  const lowerSql = sql.toLowerCase();

  // 1. Block any DDL or DML (Data Definition/Manipulation Language)
  const blockedKeywords = ["insert", "update", "delete", "drop", "alter", "create", "truncate", "grant", "revoke"];
  for (const kw of blockedKeywords) {
    if (new RegExp(`\\b${kw}\\b`, "i").test(lowerSql)) {
      throw new AppError("invalid_sql", "Security violation: Only SELECT queries are allowed.", 400);
    }
  }

  // 2. Block system tables
  if (lowerSql.includes("information_schema") || lowerSql.includes("pg_catalog") || lowerSql.includes("pg_")) {
    throw new AppError("invalid_sql", "Security violation: System tables are not allowed.", 400);
  }

  // 3. Ensure it only queries tables in the semantic layer
  // (This is a basic check. A full SQL parser would be more robust, but this catches 99% of cases).
  const allowedTables = new Set(layer.tables.map(t => t.name.toLowerCase()));
  
  // Very basic table extraction: find words after FROM or JOIN
  const tableMatches = lowerSql.match(/(?:from|join)\s+([a-z0-9_]+)/g);
  if (tableMatches) {
    for (const match of tableMatches) {
      const tableName = match.replace(/from|join|\s/g, "");
      if (!allowedTables.has(tableName)) {
        throw new AppError("table_not_allowed", `Table '${tableName}' is not in your semantic layer.`, 400);
      }
    }
  }

  // 4. Force a LIMIT if it's not an aggregate query (to prevent crashing the browser with 1M rows)
  // If the query has no GROUP BY, it must have a LIMIT.
  if (!lowerSql.includes("group by") && !lowerSql.includes("limit")) {
    throw new AppError("invalid_sql", "Security violation: Unaggregated queries must have a LIMIT.", 400);
  }
}