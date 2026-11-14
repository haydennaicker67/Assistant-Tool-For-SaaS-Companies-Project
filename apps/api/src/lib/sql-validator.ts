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

  // 4. Block dangerous SQL patterns in the raw string (defense-in-depth)
  const lowerSql = sql.toLowerCase();
  
  // Block multi-statements (shouldn't happen after parse check, but just in case)
  if (lowerSql.includes(";")) {
    throw new AppError("invalid_sql", "Security violation: Multi-statement queries are not allowed.", 400);
  }

  // Block system catalogs
  if (lowerSql.includes("pg_catalog") || lowerSql.includes("pg_") || lowerSql.includes("information_schema")) {
    throw new AppError("invalid_sql", "Security violation: System tables are not allowed.", 400);
  }

  // Block DDL/DML keywords
  const blockedKeywords = ["drop", "alter", "truncate", "insert", "update", "delete", "create", "grant", "revoke"];
  for (const kw of blockedKeywords) {
    if (new RegExp(`\\b${kw}\\b`).test(lowerSql)) {
      throw new AppError("invalid_sql", `Security violation: ${kw.toUpperCase()} is not allowed.`, 400);
    }
  }

  // 5. Extract all table references from the AST (both direct and nested)
  const allowedTables = new Set(layer.tables.map(t => t.name.toLowerCase()));
  const extractedTables: string[] = [];
  
  function walk(node: any) {
    if (!node || typeof node !== "object") return;
    
    // Capture table nodes (column refs use type: "ref")
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

  for (const table of extractedTables) {
    if (!allowedTables.has(table)) {
      throw new AppError("table_not_allowed", `Table '${table}' is not in your semantic layer.`, 400);
    }
  }

  // 6. Auto-append LIMIT if it's missing and it's not an aggregate
  let finalSql = sql.trim().replace(/;+$/, "");
  const hasLimit = /limit\s+\d+/i.test(finalSql);
  const isAggregate = /count\(|sum\(|avg\(|max\(|min\(/i.test(finalSql);
  
  if (!hasLimit && !isAggregate) {
    finalSql = `${finalSql} LIMIT 100`;
  }

  return finalSql;
}