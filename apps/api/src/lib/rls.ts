import postgres from "postgres";
import { AppError } from "../errors";
import { getProjectPool } from "./pool-manager";

export async function queryWithRLS(
  projectId: string, // NEW: Required for pool lookup
  connectionString: string,
  tenantId: string,
  queryFn: (tx: postgres.TransactionSql) => Promise<any>
) {
  // R1 FIX: Use a shared pool instead of creating a new one per request
  const sql = getProjectPool(projectId, connectionString);

  try {
    const result = await sql.begin(async (tx) => {
      await tx`SET TRANSACTION READ ONLY`;
      await tx`SET LOCAL statement_timeout = '5s'`;
      await tx`SET LOCAL ROLE authenticated`;
      await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return await queryFn(tx);
    });

    return result;
  } catch (err: any) {
    if (err.code === "25006") {
      throw new AppError("invalid_sql", "Write operations are strictly forbidden.", 400);
    }
    if (err.code === "57014") {
      throw new AppError("invalid_sql", "The query took too long to execute.", 400);
    }
    throw err;
  }
}