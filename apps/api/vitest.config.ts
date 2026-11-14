import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/postgres",
      ENCRYPTION_KEY: "12345678901234567890123456789012",
      EMBED_JWT_SECRET: "dummy_secret_for_ci_build_only_12345",
      GEMINI_API_KEY: "dummy",
      UPSTASH_REDIS_REST_URL: "https://dummy.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "dummy",
      PAYSTACK_SECRET_KEY: "sk_test_dummy",
      
      // S1 FIX: Add these so require-user.ts doesn't crash
      NEXT_PUBLIC_SUPABASE_URL: "https://dummy.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "dummy_anon_key",
      SUPABASE_SERVICE_ROLE_KEY: "dummy_service_role_key"
    }
  }
});