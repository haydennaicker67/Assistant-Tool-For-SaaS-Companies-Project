import { Redis } from "@upstash/redis";
import crypto from "node:crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Generates a unique hash for a query.
 * S4 FIX: Includes projectId, role, tenantId, and a hash of the semantic layer 
 * to prevent cross-tenant/cross-project cache leaks.
 */
export function generateCacheKey(
  projectId: string, 
  tenantId: string, 
  role: string,
  question: string,
  semanticLayerHash: string
): string {
  const queryHash = crypto.createHash("sha256").update(question.toLowerCase().trim()).digest("hex");
  return `vizzly:query:${projectId}:${tenantId}:${role}:${semanticLayerHash}:${queryHash}`;
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