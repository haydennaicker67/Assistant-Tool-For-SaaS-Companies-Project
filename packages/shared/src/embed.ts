/**
 * Embed JWT: the contract between the pilot's backend and the control plane.
 * This is the single implementation of signing and verifying — the API
 * middleware, the reference app, and the leak tests all import from here.
 *
 * Claims:
 *   tenant_id  — the SaaS customer's end-customer (a merchant, a supplier, etc.)
 *   user_id    — the end-user within that tenant
 *   role       — "viewer" | "editor" | "admin" (host app decides the semantics)
 *   iat, exp   — standard. Short-lived: 15 minutes is the recommended TTL.
 *   iss        — "vizzly-sa"
 *   aud        — the project id, so a token for project A can't be replayed on B
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface EmbedClaims {
  tenant_id: string;
  user_id: string;
  role: "viewer" | "editor" | "admin";
}

const ISSUER = "vizzly-sa";

/**
 * Sign an embed token. Called by the *host SaaS backend*, not by the end-user's
 * browser. The shared secret never leaves the host's server.
 */
export async function signEmbedToken(
  claims: EmbedClaims,
  options: {
    secret: string;
    /** Project id — becomes the token's `aud` */
    projectId: string;
    /** Seconds until expiry. Default 15 minutes. */
    ttlSeconds?: number;
  }
): Promise<string> {
  const { secret, projectId, ttlSeconds = 15 * 60 } = options;
  const key = new TextEncoder().encode(secret);

  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(projectId)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key);
}

/**
 * Verify an embed token. Called by the control plane on every request.
 * Throws on invalid signature, wrong issuer, wrong audience, or expiry.
 */
export async function verifyEmbedToken(
  token: string,
  options: { secret: string; projectId: string }
): Promise<EmbedClaims & { aud: string }> {
  const key = new TextEncoder().encode(options.secret);

  const { payload } = await jwtVerify(token, key, {
    issuer: ISSUER,
    audience: options.projectId,
    algorithms: ["HS256"] // S19 FIX: Pin the algorithm to prevent alg confusion attacks
  });

  const { tenant_id, user_id, role } = payload as JWTPayload & EmbedClaims;

  if (typeof tenant_id !== "string" || typeof user_id !== "string") {
    throw new Error("embed token missing tenant_id or user_id");
  }
  if (role !== "viewer" && role !== "editor" && role !== "admin") {
    throw new Error("embed token has invalid role");
  }

  return { tenant_id, user_id, role, aud: options.projectId };
}