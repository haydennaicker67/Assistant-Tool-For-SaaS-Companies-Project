import { describe, it, expect, beforeAll } from "vitest";
import { signEmbedToken, verifyEmbedToken } from "./embed";
import { generateKeyPairSync } from "node:crypto";

const PROJECT = "proj_123";

describe("embed JWT", () => {
  let privateKey: string;
  let publicKey: string;

  beforeAll(() => {
    // Generate a mock RSA key pair for testing
    const keys = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    privateKey = keys.privateKey;
    publicKey = keys.publicKey;
  });

  it("roundtrips claims", async () => {
    const token = await signEmbedToken(
      { tenant_id: "tenant-a", user_id: "user-1", role: "viewer" },
      { privateKey: privateKey, projectId: PROJECT }
    );
    
    const claims = await verifyEmbedToken(token, {
      publicKey: publicKey,
      projectId: PROJECT
    });
    
    expect(claims.tenant_id).toBe("tenant-a");
    expect(claims.user_id).toBe("user-1");
    expect(claims.role).toBe("viewer");
  });

  it("rejects a token signed for another project", async () => {
    const token = await signEmbedToken(
      { tenant_id: "tenant-a", user_id: "user-1", role: "viewer" },
      { privateKey: privateKey, projectId: "proj_OTHER" }
    );
    
    await expect(
      verifyEmbedToken(token, { publicKey: publicKey, projectId: PROJECT })
    ).rejects.toThrow();
  });

  it("rejects a token signed with a different key", async () => {
    const otherKeys = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const token = await signEmbedToken(
      { tenant_id: "tenant-a", user_id: "user-1", role: "viewer" },
      { privateKey: otherKeys.privateKey, projectId: PROJECT }
    );
    
    await expect(
      verifyEmbedToken(token, { publicKey: publicKey, projectId: PROJECT })
    ).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const token = await signEmbedToken(
      { tenant_id: "tenant-a", user_id: "user-1", role: "viewer" },
      { privateKey: privateKey, projectId: PROJECT, ttlSeconds: 1 }
    );
    
    // Wait for the token to expire
    await new Promise((r) => setTimeout(r, 1100));
    
    await expect(
      verifyEmbedToken(token, { publicKey: publicKey, projectId: PROJECT })
    ).rejects.toThrow();
  });
});