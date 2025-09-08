# FilmFlex Dockerfile with React Frontend Build - Fixed for package-lock.json sync issues
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies including Python for native modules
RUN apk add --no-cache python3 make g++ libc6-compat

# Copy package files
COPY package*.json ./

# Fix package-lock.json sync issues by regenerating it
RUN rm -rf node_modules package-lock.json && \
    npm install --no-audit --no-fund && \
    npm cache clean --force

# Copy source code
COPY . .

# Build the React frontend (this creates dist/public)
RUN npm run build:client

# Verify the build output exists
RUN ls -la dist/ || echo "dist directory not found"
RUN ls -la dist/public/ || echo "dist/public directory not found"

# Build the server
RUN npm run build:server

# Production stage
FROM node:20-alpine AS runtime

RUN apk add --no-cache dumb-init curl
RUN addgroup -g 1001 -S nodejs && adduser -S filmflex -u 1001

WORKDIR /app

# Copy package files and regenerate package-lock.json for production
COPY package*.json ./

# Use npm install instead of npm ci to avoid sync issues
RUN rm -rf node_modules package-lock.json && \
    npm install --only=production --no-audit --no-fund && \
    npm cache clean --force && \
    rm -rf ~/.npm /tmp/* /var/cache/apk/*

# Copy built server
COPY --from=builder --chown=filmflex:nodejs /app/dist ./dist

# Copy server source files (needed for imports)
COPY --from=builder --chown=filmflex:nodejs /app/server ./server
COPY --from=builder --chown=filmflex:nodejs /app/shared ./shared

# Copy scripts directory for data import functionality
COPY --from=builder --chown=filmflex:nodejs /app/scripts ./scripts

# Copy static assets
COPY --from=builder --chown=filmflex:nodejs /app/public ./public

# Copy config files
COPY --chown=filmflex:nodejs ecosystem.config.cjs ./

# Create logs directory
RUN mkdir -p logs && chown filmflex:nodejs logs

# Verify critical files exist
RUN test -f dist/index.js || (echo "Critical file missing: dist/index.js" && exit 1)
RUN test -f scripts/data/import-movies-docker.cjs || (echo "Warning: import script missing" && ls -la scripts/data/ || echo "scripts/data directory missing")

USER filmflex
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]