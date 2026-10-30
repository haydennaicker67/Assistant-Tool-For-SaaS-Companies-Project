import { Hono } from "hono";
import type { AppEnv } from "../types";

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