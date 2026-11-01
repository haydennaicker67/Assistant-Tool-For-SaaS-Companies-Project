import type { MiddlewareHandler } from "hono";
import { createClient } from "@supabase/supabase-js";
import type { AppEnv } from "../types";
import { AppError } from "../errors";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // We use the service role to verify the token securely
);

export type AuthUserEnv = AppEnv & {
  Variables: AppEnv["Variables"] & {
    userId: string;
  };
};

export const requireUser: MiddlewareHandler<AuthUserEnv> = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("invalid_token", "Missing Authorization header", 401);
  }

  const token = authHeader.split(" ")[1];
  if (!token) throw new AppError("invalid_token", "Missing token", 401);

  // Verify the token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new AppError("invalid_token", "Invalid or expired session", 401);
  }

  // Attach the verified userId to the context
  c.set("userId", user.id);
  await next();
};