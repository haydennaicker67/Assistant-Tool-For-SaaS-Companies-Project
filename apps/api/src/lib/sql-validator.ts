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

  // 4. Block system catalogs and forbidden tables
  const allowedTables = new Set(layer.tables.map(t => t.name.toLowerCase()));
  
  const extractedTables: string[] = [];
  function findTables(node: any) {
    if (!node) return;
    // S3 FIX: Guard against non-string names (parser can return objects for aliases)
    if (node.type === "table" && typeof node.name === "string") {
      extractedTables.push(node.name.toLowerCase());
    }
    if (node.type === "ref" && typeof node.name === "string") {
      extractedTables.push(node.name.toLowerCase());
    }
    for (const key of Object.keys(node)) {
      if (Array.isArray(node[key])) node[key].forEach(findTables);
      else if (typeof node[key] === 'object') findTables(node[key]);
    }
  }
  findTables(statement);

  for (const table of extractedTables) {
    if (table.includes("pg_") || table.includes("information_schema")) {
      throw new AppError("invalid_sql", "Security violation: System tables are not allowed.", 400);
    }
    if (!allowedTables.has(table)) {
      throw new AppError("table_not_allowed", `Table '${table}' is not in your semantic layer.`, 400);
    }
  }

  // 5. Auto-append LIMIT if it's missing and it's not an aggregate
  let finalSql = sql.trim().replace(/;+$/, "");
  const hasLimit = /limit\s+\d+/i.test(finalSql);
  const isAggregate = /count\(|sum\(|avg\(|max\(|min\(/i.test(finalSql);
  
  if (!hasLimit && !isAggregate) {
    finalSql = `${finalSql} LIMIT 100`;
  }

  return finalSql;
}