/**
 * Wire format between SDK ↔ control plane. Both `POST /v1/query/nl` and
 * `POST /v1/query/structured` accept a QueryRequest and return a ChartSpec.
 */

export type ChartType = "bar" | "line" | "pie" | "scatter" | "table";

export interface DateRange {
  /** ISO date, inclusive */
  from: string;
  /** ISO date, inclusive */
  to: string;
}

export interface FilterValue {
  column: string;
  /** eq | neq | in | gt | gte | lt | lte | contains | between */
  op: "eq" | "neq" | "in" | "gt" | "gte" | "lt" | "lte" | "contains" | "between";
  value: unknown;
}

/**
 * Structured (non-NL) request. The SDK's <FilterBar> builds this and passes
 * it to <Chart> / <Table> via useVizzlyQuery.
 */
export interface StructuredQueryRequest {
  kind: "structured";
  /** Table from the semantic layer */
  table: string;
  /** Columns to select. If empty, the server picks all dimensions + measures. */
  columns?: string[];
  /** Metrics (by name) to include. Resolved against SemanticLayer.metrics. */
  metrics?: string[];
  /** Dimension to group by */
  groupBy?: string;
  filters?: FilterValue[];
  dateRange?: DateRange;
  /** Row limit. Server enforces a max. */
  limit?: number;
  /** Chart the caller wants back */
  chartType?: ChartType;
}

/**
 * Natural-language request. Server runs NL→SQL then returns a ChartSpec.
 */
export interface NLQueryRequest {
  kind: "nl";
  /** The user's question, e.g. "show last month's revenue by customer" */
  question: string;
  /** Optional chart-type hint; server may override based on the result shape */
  chartTypeHint?: ChartType;
}

export type QueryRequest = StructuredQueryRequest | NLQueryRequest;

/**
 * The response the SDK renders. Deliberately shallow: no nested metadata
 * the host can't override, no styles, no hints about how to render.
 */
export interface ChartSpec {
  chartType: ChartType;
  columns: ColumnSpec[];
  rows: Array<Record<string, unknown>>;
  meta: {
    explanation?: string;
    sql?: string;
    queryMs?: number;
    totalMs?: number;
    aiMs?: number; // NEW: AI generation time
    cached: boolean;
    rowCount: number;
    truncated: boolean;
  };
}
export interface ColumnSpec {
  /** Column key as it appears in ChartSpec.rows */
  name: string;
  /** Human-readable label for the axis/header */
  label: string;
  /** Used by the SDK to pick a default formatter */
  type: ColumnType;
  /** If this column is an aggregate, the metric it came from */
  metric?: string;
}

/**
 * Error envelope. Every non-2xx response from the control plane looks like this
 * — never a stack trace.
 */
export interface QueryError {
  code:
    | "invalid_token"
    | "invalid_sql"
    | "invalid_request"
    | "table_not_allowed"
    | "limit_exceeded"
    | "rate_limited"
    | "upstream_error"
    | "internal_error";
  /** Human-readable, safe to show to an end-user */
  message: string;
  /** Optional detail for logs; never surfaced in the SDK */
  detail?: string;
}

// Re-export the column type so query.ts has no import cycle
import type { ColumnType } from "./semantic";
export type { ColumnType };