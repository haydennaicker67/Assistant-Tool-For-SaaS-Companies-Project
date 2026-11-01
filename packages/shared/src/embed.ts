import { SignJWT, jwtVerify, importSPKI, importPKCS8, type JWTPayload } from "jose";

export interface EmbedClaims {
  tenant_id: string;
  user_id: string;
  role: "viewer" | "editor" | "admin";
}

const ISSUER = "vizzly-sa";

/**
 * Sign an embed token using an RSA Private Key (RS256).
 * This function is used by the *Host SaaS backend*.
 */
export async function signEmbedToken(
  claims: EmbedClaims,
  options: {
    privateKey: string; // PEM encoded RSA private key
    projectId: string;
    ttlSeconds?: number;
  }
): Promise<string> {
  const { privateKey, projectId, ttlSeconds = 15 * 60 } = options;
  
  // Import the PEM string into a CryptoKey
  const key = await importPKCS8(privateKey, "RS256");

  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(ISSUER)
    .setAudience(projectId)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key);
}

/**
 * Verify an embed token using an RSA Public Key.
 * This function is used by the *Vizzly Control Plane*.
 */
export async function verifyEmbedToken(
  token: string,
  options: { publicKey: string; projectId: string }
): Promise<EmbedClaims & { aud: string }> {
  // Import the PEM string into a CryptoKey
  const key = await importSPKI(options.publicKey, "RS256");

  const { payload } = await jwtVerify(token, key, {
    issuer: ISSUER,
    audience: options.projectId,
    algorithms: ["RS256"] // S19 FIX
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