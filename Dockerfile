# FilmFlex Dockerfile with Pre-built React Frontend
FROM --platform=linux/amd64 node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ libc6-compat

# Set npm to use AMD64 architecture
ENV npm_config_target_platform=linux
ENV npm_config_target_arch=x64

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --no-audit --no-fund && npm cache clean --force

# Copy source code (including pre-built client/dist)
COPY . .

# Create a production server file that serves the React app
RUN mkdir -p dist && cat > dist/server.js << 'EOF'
import express from "express";
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { registerRoutes } from "../server/routes.js";
import { config } from '../server/config.js';
import { pool } from '../server/db.js';
import { setupAuth } from '../server/auth.js';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins in production for now
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Range'],
  exposedHeaders: ['Set-Cookie', 'Content-Range', 'Accept-Ranges'],
}));

// Serve static files from public directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Setup server
async function startServer() {
  try {
    await pool.connect();
    console.log('Database connected successfully');
    
    setupAuth(app);
    registerRoutes(app);
    
    // Error handling
    app.use((err, req, res, next) => {
      console.error(err);
      res.status(500).json({ message: err.message || 'Internal Server Error' });
    });
    
    // Serve React app from dist/public (Vite builds to dist/public)
    const clientDistPath = path.join(process.cwd(), 'dist', 'public');
    const indexPath = path.join(clientDistPath, 'index.html');
    
    if (fs.existsSync(clientDistPath)) {
      console.log('Serving React app from dist/public');
      app.use(express.static(clientDistPath));
      
      // SPA fallback - serve index.html for all non-API routes
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('React app not found');
        }
      });
    } else {
      console.log('Client dist not found at dist/public, checking client/dist');
      const altClientDistPath = path.join(process.cwd(), 'client', 'dist');
      const altIndexPath = path.join(altClientDistPath, 'index.html');
      
      if (fs.existsSync(altClientDistPath)) {
        console.log('Serving React app from client/dist');
        app.use(express.static(altClientDistPath));
        
        app.get('*', (req, res) => {
          if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API endpoint not found' });
          }
          
          if (fs.existsSync(altIndexPath)) {
            res.sendFile(altIndexPath);
          } else {
            res.status(404).send('React app not found');
          }
        });
      } else {
        console.log('React app not found in either location');
        app.get('*', (req, res) => {
          if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API endpoint not found' });
          }
          res.send('<h1>FilmFlex Server Running</h1><p>React app not built</p>');
        });
      }
    }
    
    server.listen(config.port, () => {
      console.log(`FilmFlex server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
EOF

# Build the server with esbuild
RUN npx esbuild dist/server.js \
  --bundle \
  --platform=node \
  --target=es2022 \
  --format=esm \
  --outfile=dist/index.js \
  --packages=external \
  --external:@vitejs/* \
  --external:vite \
  --external:@types/* \
  --external:typescript

# Production stage
FROM --platform=linux/amd64 node:20-alpine AS runtime

RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S filmflex -u 1001

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund && npm cache clean --force

# Copy built application and React frontend
COPY --from=builder --chown=filmflex:nodejs /app/dist ./dist
COPY --from=builder --chown=filmflex:nodejs /app/dist/public ./dist/public
COPY --from=builder --chown=filmflex:nodejs /app/server ./server
COPY --from=builder --chown=filmflex:nodejs /app/shared ./shared
COPY --from=builder --chown=filmflex:nodejs /app/public ./public

# Copy config files
COPY --chown=filmflex:nodejs ecosystem.config.cjs ./

RUN mkdir -p logs && chown filmflex:nodejs logs

USER filmflex
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]