import express, { type Request, Response, NextFunction } from "express";
import http from 'http';
import cors from 'cors';
import path from 'path';
import { registerRoutes } from "./routes.js";
import { log } from "./utils.js";
import { config } from './config.js';
import { pool } from './db.js';
import { setupAuth } from './auth.js';

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Fix CORS configuration to ensure cookies work properly
app.use(cors({
  origin: function (origin, callback) {
    try {
      // Always allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) {
        return callback(null, true);
      }
      
      // Define allowed origins for production
      const allowedOrigins = [
        'http://154.205.142.255:5000',
        'https://154.205.142.255:5000',
        'http://154.205.142.255:3000',
        'https://154.205.142.255:3000',
        'http://154.205.142.255',
        'https://154.205.142.255',
        'https://phimgg.com',
        'https://www.phimgg.com',
        'http://localhost:3000',
        'http://localhost:5000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5000'
      ];
      
      // Add client URL from config if available
      if (config.clientUrl && !allowedOrigins.includes(config.clientUrl)) {
        allowedOrigins.push(config.clientUrl);
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Allow any origin containing the server IP for flexibility
      if (origin.includes('154.205.142.255')) {
        return callback(null, true);
      }
      
      // In production, be permissive to avoid blocking legitimate requests
      if (process.env.NODE_ENV === 'production') {
        return callback(null, true);
      }
      
      // Development mode - allow localhost variations
      if (process.env.NODE_ENV === 'development' && 
          (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }
      
      // Default allow to prevent blocking
      return callback(null, true);
      
    } catch (error) {
      console.error('CORS origin check error:', error);
      // If there's any error, allow the request to prevent service disruption
      return callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Range', 'Accept-Ranges'],
  exposedHeaders: ['Set-Cookie', 'Content-Range', 'Accept-Ranges', 'Content-Length'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Additional headers for video streaming support
app.use((req, res, next) => {
  // Cache control headers for different file types
  if (req.path.match(/\.(js|css)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else if (req.path.match(/\.html$/)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Allow all origins for media files
  if (req.path.match(/\.(m3u8|ts|mp4|webm|ogg)$/)) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Range, Accept-Ranges');
    res.header('Accept-Ranges', 'bytes');
  }
  
  // Set headers for iframe embedding
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('X-Content-Type-Options', 'nosniff');
  
  next();
});

// Serve files from public directory first for direct player access
app.use(express.static(path.join(process.cwd(), 'public')));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Verify database connection before starting server
    await pool.connect();
    console.log('Successfully connected to database');
    
    // Setup auth and routes after DB connection is confirmed
    setupAuth(app);
    registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error(err);
      res.status(status).json({ message });
    });    // Setup Vite or static serving based on environment
    if (process.env.NODE_ENV === 'development') {
      // Only import Vite functions in development
      const { setupVite } = await import("./vite.js");
      await setupVite(app, server);
    } else {
      // Production: serve static files
      const clientDistPath = path.join(process.cwd(), 'client', 'dist');
      const indexPath = path.join(clientDistPath, 'index.html');
      
      // Check if built client files exist
      if (require('fs').existsSync(clientDistPath)) {
        log('Serving static files from client/dist');
        app.use(express.static(clientDistPath));
        
        // Catch-all handler for SPA routing
        app.get('*', (req, res) => {
          // Skip API routes
          if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API endpoint not found' });
          }
          
          // Serve index.html for all other routes
          if (require('fs').existsSync(indexPath)) {
            res.sendFile(indexPath);
          } else {
            res.status(404).send('Client application not built. Run npm run build first.');
          }
        });
      } else {
        log('Warning: Client dist directory not found. Run npm run build to build the client.');
        app.get('*', (req, res) => {
          if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API endpoint not found' });
          }
          res.status(503).send('Client application not available. Please build the application first.');
        });
      }
    }

    // Start server
    server.listen(config.port, () => {
      log(`Server running on http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    pool.end(() => {
      console.log('Server stopped and database pool closed.');
      process.exit(0);
    });
  });
});
