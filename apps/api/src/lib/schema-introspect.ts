import postgres from "postgres";

export interface RawSchema {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  foreignTable?: string | null;
  foreignColumn?: string | null;
}

/**
 * Connects to the customer's DB and pulls raw schema metadata, including foreign keys.
 */
export async function introspectSchema(connectionString: string): Promise<RawSchema[]> {
  const sql = postgres(connectionString, { max: 1, prepare: false, ssl: "require" });

  try {
    const result = await sql<RawSchema[]>`
      SELECT 
        c.table_name as "tableName",
        c.column_name as "columnName",
        c.data_type as "dataType",
        c.is_nullable = 'YES' as "isNullable",
        ccu.table_name as "foreignTable",
        ccu.column_name as "foreignColumn"
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu
        ON c.table_name = kcu.table_name 
        AND c.column_name = kcu.column_name
        AND c.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON kcu.constraint_name = ccu.constraint_name
        AND kcu.table_schema = ccu.table_schema
      WHERE c.table_schema = 'public'
        AND c.table_name NOT IN ('leak_test_orders', 'schema_migrations', 'drizzle_migrations')
      ORDER BY c.table_name, c.ordinal_position
    `;
    return result;
  } finally {
    await sql.end();
  }
}