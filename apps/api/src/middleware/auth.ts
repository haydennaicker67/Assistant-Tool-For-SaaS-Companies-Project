import type { MiddlewareHandler } from "hono";
import { verifyEmbedToken, type EmbedClaims } from "@vizzly-sa/shared";
import type { AppEnv } from "../types";
import { AppError } from "../errors";
import { db } from "../lib/db";
import { embedSecrets } from "../db/schema";
import { eq } from "drizzle-orm";

// Extend the Hono context to include the verified claims
export type AuthEnv = AppEnv & {
  Variables: AppEnv["Variables"] & {
    embedClaims: EmbedClaims;
    projectId: string;
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

  // The SDK sends the project ID in the header
  const projectId = c.req.header("x-project-id");
  if (!projectId) {
    throw new AppError("invalid_request", "Missing x-project-id header", 400);
  }

  try {
    // 1. Look up the secret for this project in the database
    const [secretRecord] = await db.select().from(embedSecrets).where(eq(embedSecrets.projectId, projectId));
    
    if (!secretRecord) {
      throw new AppError("invalid_token", "No embed secret found for this project", 401);
    }

    // 2. Verify the token using the project's specific secret
    const payload = await verifyEmbedToken(token, {
      secret: secretRecord.secret,
      projectId: projectId
    });

    c.set("embedClaims", payload);
    c.set("projectId", projectId);
    
    await next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("invalid_token", "Invalid or expired token", 401);
  }
};