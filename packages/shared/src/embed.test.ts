import { describe, it, expect } from "vitest";
import { signEmbedToken, verifyEmbedToken } from "./embed";

const SECRET = "test-secret-32-bytes-long-do-not-use";
const PROJECT = "proj_123";

describe("embed JWT", () => {
  it("roundtrips claims", async () => {
    const token = await signEmbedToken(
      { tenant_id: "tenant-a", user_id: "user-1", role: "viewer" },
      { secret: SECRET, projectId: PROJECT }
    );
    const claims = await verifyEmbedToken(token, {
      secret: SECRET,
      projectId: PROJECT
    });
    expect(claims.tenant_id).toBe("tenant-a");
    expect(claims.user_id).toBe("user-1");
    expect(claims.role).toBe("viewer");
  });

  it("rejects a token signed for another project", async () => {
    const token = await signEmbedToken(
      { tenant_id: "tenant-a", user_id: "user-1", role: "viewer" },
      { secret: SECRET, projectId: "proj_OTHER" }
    );
    await expect(
      verifyEmbedToken(token, { secret: SECRET, projectId: PROJECT })
    ).rejects.toThrow();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signEmbedToken(
      { tenant_id: "tenant-a", user_id: "user-1", role: "viewer" },
      { secret: "wrong-secret", projectId: PROJECT }
    );
    await expect(
      verifyEmbedToken(token, { secret: SECRET, projectId: PROJECT })
    ).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const token = await signEmbedToken(
      { tenant_id: "tenant-a", user_id: "user-1", role: "viewer" },
      { secret: SECRET, projectId: PROJECT, ttlSeconds: 1 }
    );
    await new Promise((r) => setTimeout(r, 1100));
    await expect(
      verifyEmbedToken(token, { secret: SECRET, projectId: PROJECT })
    ).rejects.toThrow();
  });
});