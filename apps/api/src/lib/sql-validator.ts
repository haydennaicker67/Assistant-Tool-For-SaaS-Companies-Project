import { parse } from "pgsql-ast-parser";
import type { SemanticLayer } from "@vizzly-sa/shared";
import { AppError } from "../errors";

export function validateSQL(sql: string, layer: SemanticLayer): string {
  // 1. Parse the SQL into an Abstract Syntax Tree (AST)
  let ast;
  try {
    ast = parse(sql);
  } catch (err) {
    throw new AppError("invalid_sql", "I couldn't understand the generated SQL syntax—try rephrasing.", 400);
  }

  // 2. Ensure it's exactly one statement
  if (ast.length !== 1) {
    throw new AppError("invalid_sql", "Security violation: Only single-statement queries are allowed.", 400);
  }

  // 3. Ensure the statement is a SELECT
  const statement = ast[0];
  if (!statement) {
    throw new AppError("invalid_sql", "Security violation: Empty query.", 400);
  }
  if (statement.type !== "select") {
    throw new AppError("invalid_sql", "Security violation: Only SELECT queries are allowed.", 400);
  }

  const lowerSql = sql.toLowerCase();

  // 4. Block system catalogs and DDL/DML in raw string (defense in depth)
  if (lowerSql.includes("pg_") || lowerSql.includes("information_schema") || lowerSql.includes("pg_catalog")) {
    throw new AppError("invalid_sql", "Security violation: System tables are not allowed.", 400);
  }
  
  if (lowerSql.includes(";")) {
    throw new AppError("invalid_sql", "Security violation: Multi-statement queries are not allowed.", 400);
  }

  const blockedKeywords = ["drop", "alter", "truncate", "insert", "update", "delete", "create", "grant", "revoke"];
  for (const kw of blockedKeywords) {
    if (new RegExp(`\\b${kw}\\b`).test(lowerSql)) {
      throw new AppError("invalid_sql", `Security violation: ${kw.toUpperCase()} is not allowed.`, 400);
    }
  }

  // 5. Extract all table references from the AST
  const allowedTables = new Set(layer.tables.map(t => t.name.toLowerCase()));
  const extractedTables: string[] = [];
  
  function walk(node: any) {
    if (!node || typeof node !== "object") return;
    
    if (node.type === "table" && typeof node.name === "string") {
      extractedTables.push(node.name.toLowerCase());
    }
    
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child === "object") walk(child);
    }
  }
  walk(statement);

  // Fallback: If the AST walk didn't find any tables (for some parser quirks),
  // do a raw regex extraction from the FROM clause.
  if (extractedTables.length === 0) {
    const fromMatches = lowerSql.match(/from\s+([a-z0-9_]+)/g);
    if (fromMatches) {
      fromMatches.forEach(m => {
        const tableName = m.replace(/from\s+/i, "").trim();
        extractedTables.push(tableName);
      });
    }
  }

  for (const table of extractedTables) {
    if (!allowedTables.has(table)) {
      throw new AppError("table_not_allowed", `Table '${table}' is not in your semantic layer.`, 400);
    }
  }

  // 6. Auto-append LIMIT
  let finalSql = sql.trim().replace(/;+$/, "");
  const hasLimit = /limit\s+\d+/i.test(finalSql);
  const isAggregate = /count\(|sum\(|avg\(|max\(|min\(/i.test(finalSql);
  
  if (!hasLimit && !isAggregate) {
    finalSql = `${finalSql} LIMIT 100`;
  }

  return finalSql;
}