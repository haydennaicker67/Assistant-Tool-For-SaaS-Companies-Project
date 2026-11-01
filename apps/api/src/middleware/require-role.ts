import type { MiddlewareHandler } from "hono";
import type { AuthEnv } from "./auth";
import { AppError } from "../errors";

export const requireRole = (allowedRoles: string[]): MiddlewareHandler<AuthEnv> => {
  return async (c, next) => {
    const claims = c.get("embedClaims");
    
    if (!claims || !allowedRoles.includes(claims.role)) {
      throw new AppError(
        "invalid_token", 
        "You do not have permission to perform this action.", 
        403
      );
    }

    await next();
  };
};