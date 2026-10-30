import { serve } from "@hono/node-server";
import { buildApp } from "./app";
import { loadEnv } from "./env";

const env = loadEnv();
const app = buildApp(env);

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT
  },
  (info) => {
    // eslint-disable-next-line no-console
    console.log(
      `[vizzly-api] listening on http://localhost:${info.port} (env=${env.NODE_ENV})`
    );
  }
);

const shutdown = (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`[vizzly-api] ${signal} received, shutting down`);
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

/**
 * AppType export — imported by the SDK and (later) the dashboard to get
 * end-to-end types on API calls. Keep this stable.
 */
export type AppType = ReturnType<typeof buildApp>;