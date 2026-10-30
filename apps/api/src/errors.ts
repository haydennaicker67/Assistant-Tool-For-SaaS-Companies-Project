import type { QueryError } from "@vizzly-sa/shared";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * Application-level error. Thrown from routes; caught by errorMiddleware
 * and serialized to the QueryError envelope. Never leaks internals.
 */
export class AppError extends Error {
  constructor(
    public code: QueryError["code"],
    message: string,
    public status: ContentfulStatusCode = 400,
    public detail?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toEnvelope(err: AppError): QueryError {
  const body: QueryError = { code: err.code, message: err.message };
  if (err.detail) body.detail = err.detail;
  return body;
}

/**
 * Hono error handler. Registered in index.ts via app.onError.
 * In production, unknown errors become a generic 500 — no stack traces.
 */
export function errorHandler(err: unknown, c: Context) {
  const logger = c.get("logger");

  if (err instanceof AppError) {
    logger.warn({ code: err.code, detail: err.detail }, err.message);
    return c.json(toEnvelope(err), err.status);
  }

  logger.error(
    { err: err instanceof Error ? err.stack ?? err.message : String(err) },
    "unhandled error"
  );

  // Never leak stack traces or internal messages to the client
  return c.json(
    {
      code: "internal_error",
      message: "Something went wrong. Please try again."
    } satisfies QueryError,
    500
  );
}