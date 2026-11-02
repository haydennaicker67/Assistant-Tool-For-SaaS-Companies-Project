import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { queryWithRLS } from "./rls";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

// S25 FIX: Only use TEST_DATABASE_URL (no production fallback)
const DB_URL = process.env.TEST_DATABASE_URL;

if (!DB_URL) {
  console.error("CRITICAL: TEST_DATABASE_URL is not set. Refusing to run leak tests against production.");
  console.error("Add TEST_DATABASE_URL to your .env file to run these tests.");
  process.exit(1);
}

describe("RLS Cross-Tenant Leak Test", () => {
  let sql: postgres.Sql;
  const tenantA = "11111111-1111-1111-1111-111111111111";
  const tenantB = "22222222-2222-2222-2222-222222222222";

  beforeAll(async () => {
    // S25 FIX: Sanity check — refuse to run against known production URLs
    if (DB_URL === process.env.DATABASE_URL) {
      throw new Error("CRITICAL: TEST_DATABASE_URL is the same as DATABASE_URL. Refusing to run destructive tests against production.");
    }

    sql = postgres(DB_URL, { max: 1, ssl: "require" });
    
    await sql`
      CREATE TABLE IF NOT EXISTS leak_test_orders (
        id uuid primary key default gen_random_uuid(),
        tenant_id uuid not null,
        amount integer not null
      )
    `;

    await sql`GRANT SELECT ON leak_test_orders TO authenticated`;
    await sql`ALTER TABLE leak_test_orders ENABLE ROW LEVEL SECURITY`;
    await sql`DROP POLICY IF EXISTS tenant_isolation_policy ON leak_test_orders;`;
    await sql`
      CREATE POLICY tenant_isolation_policy ON leak_test_orders
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    `;

    await sql`INSERT INTO leak_test_orders (tenant_id, amount) VALUES (${tenantA}, 100)`;
    await sql`INSERT INTO leak_test_orders (tenant_id, amount) VALUES (${tenantB}, 200)`;
  });

  afterAll(async () => {
    await sql`DROP TABLE IF EXISTS leak_test_orders`;
    await sql.end();
  });

  it("Tenant A only sees Tenant A's data", async () => {
    const rows = await queryWithRLS(DB_URL, tenantA, async (tx) => {
      return await tx`SELECT amount FROM leak_test_orders`;
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(100);
  });

  it("Tenant B only sees Tenant B's data", async () => {
    const rows = await queryWithRLS(DB_URL, tenantB, async (tx) => {
      return await tx`SELECT amount FROM leak_test_orders`;
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(200);
  });

  it("Connections are not leaked across pooled requests", async () => {
    const [rowsA, rowsB] = await Promise.all([
      queryWithRLS(DB_URL, tenantA, async (tx) => await tx`SELECT amount FROM leak_test_orders`),
      queryWithRLS(DB_URL, tenantB, async (tx) => await tx`SELECT amount FROM leak_test_orders`),
    ]);

    expect(rowsA).toHaveLength(1);
    expect(rowsA[0].amount).toBe(100);

    expect(rowsB).toHaveLength(1);
    expect(rowsB[0].amount).toBe(200);
  });
});