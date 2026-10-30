import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";

/**
 * Logs every request on completion. Uses the pino logger attached to ctx.
 * Must be registered after loggerMiddleware() in index.ts.
 */
export const accessLogMiddleware: MiddlewareHandler<AppEnv> = async (
  c,
  next
) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const logger = c.get("logger");
  logger.info(
    {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ms,
      requestId: c.get("requestId")
    },
    "request"
  );
};