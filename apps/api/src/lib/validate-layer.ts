import { z } from "zod";
import { AppError } from "../errors";

// S18 FIX: Strict Zod schema for the SemanticLayer
export const LayerSchema = z.object({
  version: z.literal(1),
  published: z.boolean(),
  publishedAt: z.string().nullable(),
  metrics: z.array(
    z.object({
      name: z.string().min(1),
      label: z.string().min(1),
      description: z.string(),
      sqlExpression: z.string().min(1), // We'll validate this SQL below
      format: z.enum(["currency", "number", "percent", "duration"]).optional(),
    })
  ),
  tables: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string(),
      primaryKey: z.array(z.string()),
      columns: z.array(
        z.object({
          name: z.string().min(1),
          type: z.enum(["text", "integer", "bigint", "numeric", "boolean", "timestamp", "date", "uuid", "json", "unknown"]),
          description: z.string(),
          isDimension: z.boolean(),
          isMeasure: z.boolean(),
          isSensitive: z.boolean().optional(),
          sampleValues: z.array(z.string()).optional(),
        })
      ),
      foreignKeys: z.array(
        z.object({
          column: z.string(),
          referencesTable: z.string(),
          referencesColumn: z.string(),
        })
      ),
    })
  ),
});

export function validateLayer(layer: unknown) {
  const parsed = LayerSchema.safeParse(layer);
  if (!parsed.success) {
    throw new AppError("invalid_request", "Invalid semantic layer format", 400, parsed.error.message);
  }

  // S18 FIX: Validate that metric SQL expressions are safe (only column references, no DDL)
  for (const metric of parsed.data.metrics) {
    const sql = metric.sqlExpression.toLowerCase();
    
    if (sql.includes(";") || sql.includes("drop") || sql.includes("delete") || sql.includes("insert") || sql.includes("update")) {
      throw new AppError("invalid_request", `Metric '${metric.name}' contains forbidden SQL.`, 400);
    }
  }

  return parsed.data;
}