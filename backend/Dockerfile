# ==============================================================================
# Multi-Vendor Marketplace - Production Multi-Stage Dockerfile
# ==============================================================================

# --- Stage 1: Build & Compile ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies
RUN apk add --no-cache openssl libc6-compat

# Copy package descriptors
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy application source
COPY tsconfig*.json nest-cli.json ./
COPY src ./src/

# Compile TypeScript production bundle
RUN npm run build

# Prune development dependencies
RUN npm prune --production

# --- Stage 2: Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Install minimal runtime dependencies (OpenSSL for Prisma engine)
RUN apk add --no-cache openssl libc6-compat dumb-init

ENV NODE_ENV=production
ENV PORT=3000

# Create application user and group for non-root execution
USER node

# Copy compiled application & pruned node_modules from builder
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist
COPY --chown=node:node --from=builder /usr/src/app/prisma ./prisma
COPY --chown=node:node --from=builder /usr/src/app/package*.json ./

EXPOSE 3000

# Use dumb-init to properly forward signals to node process
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "dist/main.js"]
