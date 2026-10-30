import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Go up from apps/api to repo root
const envPath = path.resolve(__dirname, "../../.env");

console.log("Loading .env from:", envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  throw new Error(`Failed to load .env at ${envPath}: ${result.error.message}`);
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in .env");
}

console.log("DATABASE_URL loaded (first 20 chars):", process.env.DATABASE_URL.slice(0, 20) + "...");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});