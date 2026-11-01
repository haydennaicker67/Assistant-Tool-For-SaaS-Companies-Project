/**
 * The semantic layer is the tenant-specific description of their Postgres schema.
 * It is authored by the auto-generator (Step 6), edited by the developer in the
 * dashboard (Step 11), and consumed by the NL-to-SQL pipeline (Step 7) as the
 * *only* allowlist of tables/columns the model is permitted to reference.
 */

export type ColumnType =
  | "text"
  | "integer"
  | "bigint"
  | "numeric"
  | "boolean"
  | "timestamp"
  | "date"
  | "uuid"
  | "json"
  | "unknown";

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  description: string;
  isDimension: boolean;
  isMeasure: boolean;
  // NEW: If true, the AI will never see or query this column
  isSensitive?: boolean; 
  sampleValues?: string[];
}

export interface TableMeta {
  /** Actual Postgres table name, e.g. "orders" */
  name: string;
  /** Human-readable description, e.g. "One row per customer order" */
  description: string;
  columns: ColumnMeta[];
  /** Columns that uniquely identify a row (usually ["id"]) */
  primaryKey: string[];
  /** Foreign keys to other tables in this semantic layer */
  foreignKeys: Array<{
    column: string;
    referencesTable: string;
    referencesColumn: string;
  }>;
}

/**
 * A named, reusable metric. Part 3 deepens this (Step 3.2 of the spec);
 * for Part 1 we support the shape so the NL engine can reference metrics
 * by name from day one.
 */
export interface MetricDef {
  /** Machine name, e.g. "revenue" */
  name: string;
  /** Human-readable, e.g. "Revenue" */
  label: string;
  description: string;
  /** SQL expression over the semantic layer, e.g. "SUM(orders.total_amount)" */
  sqlExpression: string;
  /** Format hint for the chart renderer */
  format?: "currency" | "number" | "percent" | "duration";
}

export interface SemanticLayer {
  version: 1;
  tables: TableMeta[];
  metrics: MetricDef[];
  /** ISO timestamp of last publish */
  publishedAt: string | null;
  /** Whether this layer has been reviewed/edited by a human */
  published: boolean;
}

/** Convenience: look up a table by name. Returns undefined if absent. */
export function findTable(
  layer: SemanticLayer,
  name: string
): TableMeta | undefined {
  return layer.tables.find((t) => t.name === name);
}

/** Convenience: flat set of all table names — the NL validator's allowlist. */
export function allowedTableNames(layer: SemanticLayer): Set<string> {
  return new Set(layer.tables.map((t) => t.name));
}