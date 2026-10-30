import type { MiddlewareHandler } from "hono";
import type { Logger } from "../logger";
import type { AppEnv } from "../types";

/** Attaches the pino logger to ctx. Registered first in index.ts. */
export function contextMiddleware(logger: Logger): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    c.set("logger", logger);
    await next();
  };
}