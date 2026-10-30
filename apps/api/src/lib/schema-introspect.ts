import postgres from "postgres";

export interface RawSchema {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
}

/**
 * Connects to the customer's DB and pulls raw schema metadata.
 * Never reads actual rows, only structure.
 */
export async function introspectSchema(connectionString: string): Promise<RawSchema[]> {
  const sql = postgres(connectionString, { max: 1, prepare: false, ssl: "require" });

  try {
    const result = await sql<RawSchema[]>`
      SELECT 
        table_name as "tableName",
        column_name as "columnName",
        data_type as "dataType",
        is_nullable = 'YES' as "isNullable"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name NOT IN ('leak_test_orders', 'schema_migrations', 'drizzle_migrations')
      ORDER BY table_name, ordinal_position
    `;
    return result;
  } finally {
    await sql.end();
  }
}