import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorHandler } from "./errors";
import { contextMiddleware } from "./middleware/context";
import { accessLogMiddleware } from "./middleware/logger";
import { requestIdMiddleware } from "./middleware/request-id";
import { healthRoutes } from "./routes/health";
import type { Env } from "./env";
import { createLogger } from "./logger";
import type { AppEnv } from "./types";
import { projectRoutes } from "./routes/projects";
import { queryRoutes } from "./routes/query";
import { billingRoutes } from "./routes/billing";
import { auditRoutes } from "./routes/audit";
import { versionRoutes } from "./routes/versions";
import { analyticsRoutes } from "./routes/analytics";
import { requireUser } from "./middleware/require-user"; // NEW

export function buildApp(env: Env) {
  const logger = createLogger(env);
  const app = new Hono<AppEnv>();

  app.use("*", requestIdMiddleware);
  app.use("*", contextMiddleware(logger));
  app.use("*", accessLogMiddleware);
  
  app.use(
    "*",
    cors({
      origin: (origin) => {
        // S13 FIX: Stricter CORS check
        if (!origin || origin.includes("localhost") || origin.includes("vizzly.co.za")) {
          return origin;
        }
        return "http://localhost:3000";
      },
      allowHeaders: ["Content-Type", "Authorization", "x-project-id"], // Removed x-api-key
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: ["x-request-id"]
    })
  );
  
  app.onError(errorHandler);

  // Public routes
  app.route("/", healthRoutes);
  
  // Protected Control Plane routes (require valid Supabase session)
  app.use("/v1/projects/*", requireUser);
  app.use("/v1/versions/*", requireUser);
  app.use("/v1/audit/*", requireUser);
  app.use("/v1/analytics/*", requireUser);
  app.use("/v1/billing/*", requireUser);

  app.route("/v1/projects", projectRoutes);
  app.route("/v1/versions", versionRoutes);
  app.route("/v1/audit", auditRoutes);
  app.route("/v1/analytics", analyticsRoutes);
  app.route("/v1/billing", billingRoutes);
  
  // Note: /v1/query is protected by authMiddleware (JWT), not requireUser
  app.route("/v1/query", queryRoutes);

  return app;
}