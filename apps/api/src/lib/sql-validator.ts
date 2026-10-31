import type { SemanticLayer } from "@vizzly-sa/shared";
import { AppError } from "../errors";

export function validateSQL(sql: string, layer: SemanticLayer): string {
  let finalSql = sql.trim();
  const lowerSql = finalSql.toLowerCase();

  // 1. Block any DDL or DML
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
  const allowedTables = new Set(layer.tables.map(t => t.name.toLowerCase()));
  const tableMatches = lowerSql.match(/(?:from|join)\s+([a-z0-9_]+)/g);
  if (tableMatches) {
    for (const match of tableMatches) {
      const tableName = match.replace(/from|join|\s/g, "");
      if (!allowedTables.has(tableName)) {
        throw new AppError("table_not_allowed", `Table '${tableName}' is not in your semantic layer.`, 400);
      }
    }
  }

  // 4. Auto-append LIMIT if missing on unaggregated queries
  const isAggregate = /group\s+by|count\(|sum\(|avg\(|max\(|min\(/i.test(lowerSql);
  
  if (!isAggregate && !lowerSql.includes("limit")) {
    // Remove any trailing semicolons before appending
    finalSql = finalSql.replace(/;+$/, "");
    finalSql = `${finalSql} LIMIT 100;`;
  }

  return finalSql;
}