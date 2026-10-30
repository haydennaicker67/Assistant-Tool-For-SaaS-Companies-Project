import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";

/**
 * Attaches a request id to every request. Echoed in the response header
 * so logs can be correlated to client-side reports.
 */
export const requestIdMiddleware: MiddlewareHandler<AppEnv> = async (
  c,
  next
) => {
  const id = c.req.header("x-request-id") ?? crypto.randomUUID();
  c.set("requestId", id);
  c.header("x-request-id", id);
  await next();
};