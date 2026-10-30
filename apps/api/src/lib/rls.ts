import postgres from "postgres";

/**
 * Executes a query against the CUSTOMER'S database with RLS enforced.
 * 
 * We use a transaction (`sql.begin`) to ensure `SET LOCAL` only applies to 
 * this specific query. Once the transaction ends (commit or rollback), the 
 * tenant_id setting is wiped, preventing leaks across pooled connections.
 */
export async function queryWithRLS(
  connectionString: string,
  tenantId: string,
  queryFn: (tx: postgres.TransactionSql) => Promise<any>
) {
  // max: 1 ensures we don't exhaust the customer's connection limit during bursts
  // ssl: "require" is needed for Supabase connections
  const sql = postgres(connectionString, { max: 1, prepare: false, ssl: "require" });

  try {
    const result = await sql.begin(async (tx) => {
      // 1. Switch to an unprivileged role so RLS is strictly enforced.
      // The 'authenticated' role is built into Supabase and does not bypass RLS.
      await tx`SET LOCAL ROLE authenticated`;
      
      // 2. Inject the tenant ID into the Postgres session
      // We use set_config() instead of SET LOCAL to allow parameter binding (prevents SQL injection)
      await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;

      // 3. Run the actual query using the transaction object (tx)
      return await queryFn(tx);
    });

    return result;
  } finally {
    // 4. Always close the connection
    await sql.end();
  }
}