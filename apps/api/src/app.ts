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
import { authMiddleware } from "./middleware/auth";
import { billingRoutes } from "./routes/billing";
import { auditRoutes } from "./routes/audit";

/**
 * Builds the Hono app. Exported so tests can construct an app with a
 * mock env. The AppType export in index.ts wraps this for end-to-end
 * type safety on the SDK side.
 */
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
        // Allow localhost for dev, and the production URL later
        if (!origin || origin.includes("localhost") || origin.includes(process.env.WEB_BASE_URL ?? "vizzly")) {
          return origin;
        }
        return "http://localhost:3000";
      },
      allowHeaders: ["Content-Type", "Authorization", "x-project-id"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: ["x-request-id"]
    })
  );
  app.onError(errorHandler);

  app.route("/", healthRoutes);
  app.route("/v1/projects", projectRoutes);
  app.route("/v1/query", queryRoutes);
  app.route("/v1/billing", billingRoutes);
  app.route("/v1/audit", auditRoutes);

  return app;
}