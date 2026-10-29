# syntax=docker/dockerfile:1
# Next.js storefront and admin panel (pnpm, as in packageManager).
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# NEXT_PUBLIC_* values are inlined at build time.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# Owned by the runtime user: Next.js writes its cache under .next/cache.
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
# Next directly: no Corepack/pnpm download at start-up, no root-owned cache.
CMD ["./node_modules/.bin/next", "start"]
