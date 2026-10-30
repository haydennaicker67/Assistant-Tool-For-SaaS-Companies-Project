import { z } from "zod";

/**
 * Env schema. Fails fast at boot if anything required is missing.
 * Optional-in-dev values default sensibly so `pnpm dev` works without setup.
 */
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  /** Populated in Step 4. Optional here so Step 3 boots standalone. */
  DATABASE_URL: z.string().optional(),
   /** Populated in Step 5. Optional here so Step 3 boots standalone. */
  EMBED_JWT_SECRET: z.string().min(32).optional(),
  OPENAI_API_KEY: z.string().optional()
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(processEnv: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(processEnv);
  if (!parsed.success) {
    console.error("Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}