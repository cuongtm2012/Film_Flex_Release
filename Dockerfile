# FilmFlex Dockerfile with React Frontend Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies including Python for native modules
RUN apk add --no-cache python3 make g++ libc6-compat

# Copy package files and install all dependencies (including devDependencies for build)
COPY package*.json ./

# Clean install to avoid rollup issues
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

RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S filmflex -u 1001

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund && npm cache clean --force

# Copy built server
COPY --from=builder --chown=filmflex:nodejs /app/dist ./dist

# Copy server source files (needed for imports)
COPY --from=builder --chown=filmflex:nodejs /app/server ./server
COPY --from=builder --chown=filmflex:nodejs /app/shared ./shared

# Copy static assets
COPY --from=builder --chown=filmflex:nodejs /app/public ./public

# Copy config files
COPY --chown=filmflex:nodejs ecosystem.config.cjs ./

# Create logs directory
RUN mkdir -p logs && chown filmflex:nodejs logs

USER filmflex
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]