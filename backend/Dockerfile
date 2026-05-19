FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY prisma ./prisma
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
COPY requirements.txt ./
RUN pip3 install --break-system-packages --no-cache-dir -r requirements.txt || true
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3002
ENV PYTHON_EXECUTABLE=python3

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs appuser

COPY --from=build --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=appuser:nodejs /app/dist ./dist
COPY --from=build --chown=appuser:nodejs /app/prisma ./prisma
COPY --from=build --chown=appuser:nodejs /app/package.json ./package.json
COPY --from=build --chown=appuser:nodejs /app/requirements.txt ./requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -r requirements.txt || true

USER appuser
EXPOSE 3002
CMD ["node", "dist/main.js"]
