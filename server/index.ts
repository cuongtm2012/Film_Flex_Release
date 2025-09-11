import express, { type Request, Response, NextFunction } from "express";
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // PRIORITY: Check for wildcard CORS setting first - ALLOW ALL ORIGINS
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
      'http://38.54.14.154:5000',
      'https://38.54.14.154:5000',
      'http://38.54.14.154',
      'https://38.54.14.154',
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
    if (origin.includes('38.54.14.154')) {
      return callback(null, true);
    }
    
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
    
    // Only log actual CORS blocks in development, nothing in production
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ CORS blocked origin:', origin);
    }
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

// Simplified request logging middleware - only log errors and important requests
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    
    // Only log API requests that take longer than 100ms or have errors
    if (req.path.startsWith("/api") && (duration > 100 || res.statusCode >= 400)) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  try {
    // Verify database connection before starting server
    await pool.connect();
    
    // Only log important startup info
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Database connected successfully');
    }
    
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
      // Only import Vite functions in development
      try {
        const { setupVite } = await import("./vite.js");
        await setupVite(app, server);
      } catch (error) {
        console.warn('Could not load Vite in development mode:', error);
        // Fallback to static serving even in development
        setupStaticServing();
      }
    } else {
      // Production: serve static files
      setupStaticServing();
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

// Function to setup static file serving (production mode)
function setupStaticServing() {
  const clientDistPath = path.join(process.cwd(), 'dist', 'public');
  const indexPath = path.join(clientDistPath, 'index.html');
  
  // Check if built client files exist
  if (fs.existsSync(clientDistPath)) {
    log('Serving static files from dist/public');
    app.use(express.static(clientDistPath));
    
    // Catch-all handler for SPA routing - IMPORTANT: This must come AFTER API routes
    app.get('*', (req, res) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      
      // For all frontend routes (including /forgot-password, /reset-password, etc.)
      // serve the index.html so React Router can handle client-side routing
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Client application not built. Run npm run build first.');
      }
    });
  } else {
    log('Warning: Client dist directory not found. Run npm run build to build the client.');
    
    // Even in development, we need to handle client-side routes
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      
      // In development, if no build exists, serve a helpful message
      res.status(503).send(`
        <html>
          <head><title>Development Server</title></head>
          <body>
            <h1>Development Mode</h1>
            <p>Client application not built yet.</p>
            <p>The route <code>${req.path}</code> would be handled by React Router.</p>
            <p>Please run <code>npm run build</code> or start the Vite dev server.</p>
          </body>
        </html>
      `);
    });
  }
}

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
