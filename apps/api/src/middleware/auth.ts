import type { MiddlewareHandler } from "hono";
import { verifyEmbedToken, type EmbedClaims } from "@vizzly-sa/shared";
import type { AppEnv } from "../types";
import { AppError } from "../errors";
import { db } from "../lib/db";
import { embedSecrets } from "../db/schema";
import { eq } from "drizzle-orm";

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

  const projectId = c.req.header("x-project-id");
  if (!projectId) {
    throw new AppError("invalid_request", "Missing x-project-id header", 400);
  }

  try {
    // S7 FIX: Look up the PUBLIC key for this project
    const [keyRecord] = await db.select().from(embedSecrets).where(eq(embedSecrets.projectId, projectId));
    
    if (!keyRecord) {
      throw new AppError("invalid_token", "No RSA public key found for this project", 401);
    }

    // S7 FIX: Verify using the public key
    const payload = await verifyEmbedToken(token, {
      publicKey: keyRecord.publicKey,
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