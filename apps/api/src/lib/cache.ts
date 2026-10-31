import { Redis } from "@upstash/redis";
import crypto from "node:crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Generates a unique hash for a query based on the tenant and question.
 */
export function generateCacheKey(tenantId: string, question: string): string {
  const hash = crypto.createHash("sha256").update(question.toLowerCase().trim()).digest("hex");
  return `vizzly:query:${tenantId}:${hash}`;
}

/**
 * Get a cached response.
 */
export async function getCachedQuery(cacheKey: string) {
  try {
    const cached = await redis.get(cacheKey);
    return cached;
  } catch (err) {
    console.error("Redis GET error", err);
    return null;
  }
}

/**
 * Set a cached response (expires in 60 seconds by default).
 */
export async function setCachedQuery(cacheKey: string, payload: any, ttlSeconds = 60) {
  try {
    await redis.setex(cacheKey, ttlSeconds, JSON.stringify(payload));
  } catch (err) {
    console.error("Redis SET error", err);
  }
}