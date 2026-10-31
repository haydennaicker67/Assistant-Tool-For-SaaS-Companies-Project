import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";
import { AppError } from "../errors";

export const controlPlaneAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const apiKey = c.req.header("x-api-key");
  
  if (!apiKey || apiKey !== process.env.CONTROL_PLANE_API_KEY) {
    throw new AppError("invalid_token", "Unauthorized access to control plane", 401);
  }

  await next();
};