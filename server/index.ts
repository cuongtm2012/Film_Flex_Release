import express, { type Request, Response, NextFunction } from "express";
import http from 'http';
import cors from 'cors';
import path from 'path';
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
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
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Check for wildcard CORS setting - ALLOW ALL ORIGINS
    if (process.env.ALLOWED_ORIGINS === '*' || process.env.CLIENT_URL === '*') {
      return callback(null, true);
    }
    
    // Get allowed origins from environment variable or use defaults
    const envAllowedOrigins = process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : [];
    
    // In development, allow localhost on any port
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    // In production, allow your specific domains and IP addresses
    const allowedOrigins = [
      'https://phimgg.com',
      'https://www.phimgg.com',
      'http://phimgg.com',
      'http://www.phimgg.com',
      'http://154.205.142.255:5000',
      'https://154.205.142.255:5000',
      'http://154.205.142.255',
      'https://154.205.142.255',
      config.clientUrl,
      ...envAllowedOrigins
    ];
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // More flexible matching for domains and IPs
    if (origin.includes('phimgg.com')) {
      return callback(null, true);
    }
    
    // Allow IP address access for testing
    if (origin.includes('154.205.142.255')) {
      return callback(null, true);    }
    
    // Allow localhost and 127.0.0.1 for testing
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // For development, also allow the configured client URL
    if (process.env.NODE_ENV === 'development' && origin === config.clientUrl) {
      return callback(null, true);
    }
    
    // In development, be more permissive
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // TEMPORARY: Allow all origins in production for initial deployment
    if (process.env.ALLOWED_ORIGINS === '*') {
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
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
    });

    // Setup Vite or static serving based on environment
    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
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
