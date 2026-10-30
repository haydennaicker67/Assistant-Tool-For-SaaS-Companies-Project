import type { Logger } from "./logger";

/**
 * Context variables available to every route handler via c.get("...").
 * Extended as we add middleware in later steps.
 */
export type AppVariables = {
  logger: Logger;
  requestId: string;
};

export type AppEnv = {
  Variables: AppVariables;
};