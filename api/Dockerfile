# =======================================================
# Multi-stage Dockerfile for Connect 2026 API
# =======================================================

# Stage 1: Base & Tooling
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

# Stage 2: Dependencies & Builder
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml prisma.config.ts ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile
RUN pnpm prisma:generate

COPY tsconfig*.json ./
COPY src ./src

RUN pnpm build

# Stage 3: Production Dependencies
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml prisma.config.ts ./
COPY prisma ./prisma/
RUN pnpm install --prod --frozen-lockfile
RUN pnpm prisma:generate

# Stage 4: Production Runner
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl dumb-init curl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3030

COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

USER node

EXPOSE 3030

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://127.0.0.1:${PORT}/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "./docker-entrypoint.sh"]
