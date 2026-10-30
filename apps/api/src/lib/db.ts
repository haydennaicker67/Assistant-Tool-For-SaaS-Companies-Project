import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import * as schema from "../db/schema";

dotenv.config({ path: "../../.env" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

// Note: For the control plane, we use a standard connection pool.
// We will only use SET LOCAL for the *customer's* DB in Step 5.
const client = postgres(process.env.DATABASE_URL, { prepare: false });
export const db = drizzle(client, { schema });