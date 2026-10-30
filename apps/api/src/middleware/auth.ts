import type { MiddlewareHandler } from "hono";
import { verifyEmbedToken, type EmbedClaims } from "@vizzly-sa/shared";
import type { AppEnv } from "../types";
import { AppError } from "../errors";
import { loadEnv } from "../env";

const env = loadEnv();

// Extend the Hono context to include the verified claims
export type AuthEnv = AppEnv & {
  Variables: AppEnv["Variables"] & {
    embedClaims: EmbedClaims;
    projectId: string; // We'll extract this from the JWT audience later
  };
};

export const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("invalid_token", "Missing or malformed Authorization header", 401);
  }

  const parts = authHeader.split(" ");
  const token = parts[1];

  if (!token) {
    throw new AppError("invalid_token", "Missing bearer token", 401);
  }

  const jwtSecret = env.EMBED_JWT_SECRET;
  if (!jwtSecret) {
    throw new AppError("internal_error", "JWT secret not configured on server", 500);
  }

  try {
    const payload = await verifyEmbedToken(token, {
      secret: jwtSecret,
      // We temporarily bypass the strict audience check by passing a wildcard 
      // if your shared library requires it, but let's assume we pass the actual projectId
      // from the token's aud claim.
      projectId: "test-project" // We'll refine this in Step 7 when we add the route
    });

    c.set("embedClaims", payload);
    await next();
  } catch (err) {
    throw new AppError("invalid_token", "Invalid or expired token", 401);
  }
};