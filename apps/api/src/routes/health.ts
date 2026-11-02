import { Hono } from "hono";
import type { AppEnv } from "../types";
import { purgeOldLogs } from "../lib/retention";

const VERSION = "0.1.0-part1";

export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get("/health", (c) =>
  c.json({
    ok: true,
    version: VERSION,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  })
);

// ... existing health route
healthRoutes.post("/purge-logs", async (c) => {
  await purgeOldLogs();
  return c.json({ ok: true, message: "Purge complete" });
});