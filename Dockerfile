# =========================================================
# Multi-Stage Production Dockerfile for Egotech SaaS Platform
# =========================================================

# Stage 1: Build Frontend SPA
FROM node:22-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# Stage 2: Production Server Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install dependencies for server
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --omit=dev --workspace=server

# Copy server code
COPY server/ ./server/

# Copy built frontend assets to server public directory for single-container serving
COPY --from=client-builder /app/client/dist ./server/public

# Ensure database directory and backup directory exist
RUN mkdir -p /app/server/data/backups

# Expose Egotech HTTP port
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start server
CMD ["node", "server/src/index.js"]
