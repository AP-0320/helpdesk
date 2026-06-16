# ---- Stage 1: install all workspace dependencies ----
FROM node:22-alpine AS deps

WORKDIR /app

# Copy only manifests first so this layer is cached until lockfile changes
COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci


# ---- Stage 2: build client + server ----
FROM deps AS builder

WORKDIR /app

# Copy full source tree
COPY . .

# Generate Prisma client into node_modules
RUN cd server && npx prisma generate

# Build React client (VITE_API_URL is baked in at image build time).
# Use vite directly so Docker build does not fail on TS type errors —
# type checking belongs in CI, not in the production image build.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN cd client && npx vite build

# Bundle server with tsup — @helpdesk/core is inlined so it needs no runtime TS resolution
RUN cd server && npm run build


# ---- Stage 3: lean production image ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Expose workspace .bin so prisma CLI is on PATH
ENV PATH=/app/node_modules/.bin:$PATH

# Root node_modules: contains prisma CLI, generated Prisma client, express, zod, etc.
COPY --from=builder /app/node_modules ./node_modules

# Server bundle + Prisma migration files + runtime assets
COPY --from=builder /app/server/dist         ./server/dist
COPY --from=builder /app/server/prisma       ./server/prisma
COPY --from=builder /app/server/package.json ./server/package.json
# tsup bundles to dist/index.js so __dirname is /app/server/dist at runtime;
# ../../knowledge-base.md from there resolves to /app/knowledge-base.md
COPY --from=builder /app/server/knowledge-base.md ./knowledge-base.md

# Built React client (served as static files by Express)
COPY --from=builder /app/client/dist ./client/dist

# Root package.json (workspace context for node resolution)
COPY package.json ./

EXPOSE 3000

WORKDIR /app/server

# Apply any pending migrations then start the server
CMD ["sh", "-c", "prisma migrate deploy && node dist/index.js"]
