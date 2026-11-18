# Stage 1: Build TypeScript application with all dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy TypeScript configuration and source files
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to dist/
RUN npm run build

# Stage 2: Install production dependencies only
FROM node:22-alpine AS prod-deps

WORKDIR /app

COPY package*.json ./

# Install production dependencies only and purge cache
RUN npm ci --omit=dev && npm cache clean --force

# Stage 3: Minimal production runtime image
FROM node:22-alpine AS runner

WORKDIR /app

# Install curl for container health check
RUN apk add --no-cache curl

ENV NODE_ENV=production

# Copy production node_modules from prod-deps stage
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules

# Copy compiled JavaScript output from builder stage
COPY --chown=node:node --from=builder /app/dist ./dist

# Copy package manifests for runtime metadata
COPY --chown=node:node package*.json ./

# Run container as non-root user
USER node

EXPOSE 5000

# Periodic health check calling the public health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/api/v1/health || exit 1

# Start the API server
CMD ["node", "dist/server.js"]
