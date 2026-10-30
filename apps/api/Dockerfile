# syntax=docker/dockerfile:1.7
FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@12.16.1 --activate
WORKDIR /repo

# 1. Install dependencies using only manifests (cache-friendly)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# 2. Build shared (api imports its types)
COPY packages/config packages/config
COPY packages/shared packages/shared
RUN pnpm --filter @vizzly-sa/shared build

# 3. Build api
COPY apps/api apps/api
RUN pnpm --filter @vizzly-sa/api build

# 4. Runtime
FROM node:22-slim AS runtime
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=base /repo/node_modules node_modules
COPY --from=base /repo/packages/shared packages/shared
COPY --from=base /repo/apps/api apps/api
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]