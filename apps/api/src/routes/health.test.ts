import { describe, it, expect } from "vitest";
import { buildApp } from "../app";
import type { Env } from "../env";

const testEnv: Env = {
  NODE_ENV: "test",
  PORT: 0,
  LOG_LEVEL: "fatal" as Env["LOG_LEVEL"]
};

describe("GET /health", () => {
  it("returns ok with version and uptime", async () => {
    const app = buildApp(testEnv);
    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      ok: boolean;
      version: string;
      uptimeSeconds: number;
    };
    expect(body.ok).toBe(true);
    expect(body.version).toBe("0.1.0-part1");
    expect(typeof body.uptimeSeconds).toBe("number");
  });

  it("echoes x-request-id", async () => {
    const app = buildApp(testEnv);
    const res = await app.request("/health", {
      headers: { "x-request-id": "test-req-123" }
    });
    expect(res.headers.get("x-request-id")).toBe("test-req-123");
  });

  it("generates x-request-id when absent", async () => {
    const app = buildApp(testEnv);
    const res = await app.request("/health");
    expect(res.headers.get("x-request-id")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});