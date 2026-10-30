import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { queryWithRLS } from "./rls";

// Load the root .env file for the test environment
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!DB_URL) {
  throw new Error("DATABASE_URL is missing. Check your root .env file.");
}

describe("RLS Cross-Tenant Leak Test", () => {
  let sql: postgres.Sql;
  const tenantA = "11111111-1111-1111-1111-111111111111";
  const tenantB = "22222222-2222-2222-2222-222222222222";

  beforeAll(async () => {
    // Connect to Supabase (requires ssl)
    sql = postgres(DB_URL, { max: 1, ssl: "require" });
    
    // 1. Create a mock "customer" table
    await sql`
      CREATE TABLE IF NOT EXISTS leak_test_orders (
        id uuid primary key default gen_random_uuid(),
        tenant_id uuid not null,
        amount integer not null
      )
    `;

    // Grant permissions to the authenticated role (simulating a normal customer user)
    await sql`GRANT SELECT ON leak_test_orders TO authenticated`;

    // 2. Enable RLS
    await sql`ALTER TABLE leak_test_orders ENABLE ROW LEVEL SECURITY`;

    // 3. Create the RLS policy
    await sql`
      DROP POLICY IF EXISTS tenant_isolation_policy ON leak_test_orders;
    `;
    await sql`
      CREATE POLICY tenant_isolation_policy ON leak_test_orders
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    `;

    // 4. Insert test data for Tenant A and Tenant B
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
    // Fire A and B requests back-to-back. If SET LOCAL leaks, one will see both.
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