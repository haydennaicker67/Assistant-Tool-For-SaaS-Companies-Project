import postgres from "postgres";
import { AppError } from "../errors";

export async function queryWithRLS(
  connectionString: string,
  tenantId: string,
  queryFn: (tx: postgres.TransactionSql) => Promise<any>
) {
  // S3 FIX: We enforce max connections, disable prepare (to avoid injection), and require SSL
  const sql = postgres(connectionString, { max: 1, prepare: false, ssl: "require" });

  try {
    const result = await sql.begin(async (tx) => {
      // S3 FIX: Ensure the session is read-only
      await tx`SET TRANSACTION READ ONLY`;
      
      // S3 FIX: Kill queries that take longer than 5 seconds
      await tx`SET LOCAL statement_timeout = '5s'`;
      
      // S3 FIX: Switch to an unprivileged role so RLS is strictly enforced
      await tx`SET LOCAL ROLE authenticated`;
      
      // Inject the tenant ID securely
      await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;

      // Run the query
      return await queryFn(tx);
    });

    return result;
  } catch (err: any) {
    // If the query fails because of read-only or timeout, return a friendly error
    if (err.code === "25006") {
      throw new AppError("invalid_sql", "Write operations are strictly forbidden.", 400);
    }
    if (err.code === "57014") {
      throw new AppError("invalid_sql", "The query took too long to execute.", 400);
    }
    throw err;
  } finally {
    await sql.end();
  }
}