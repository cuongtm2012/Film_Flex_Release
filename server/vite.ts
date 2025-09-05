import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Define valid routes for your application
const VALID_ROUTES = [
  '/',
  '/auth',
  '/movies',
  '/news',
  '/my-list',
  '/search',
  '/profile',
  '/settings',
  '/watchlist',
  '/history',
  '/admin',
  '/about',
  '/faqs',
  '/terms',
  '/tv',
  '/new-releases',
  '/top-rated',
  '/genres',
  '/contact',
  '/how-to-watch',
  '/devices',
  '/careers',
  '/press',
  '/blog',
  '/partners'
];

// Define valid route patterns (for dynamic routes like /movie/:slug)
const VALID_ROUTE_PATTERNS = [
  /^\/movie\/[a-zA-Z0-9-_]+$/, // /movie/:slug
];

// Check if a route is valid
function isValidRoute(path: string): boolean {
  // Check exact matches
  if (VALID_ROUTES.includes(path)) {
    return true;
  }
  
  // Check pattern matches
  return VALID_ROUTE_PATTERNS.some(pattern => pattern.test(path));
}

// Middleware to handle 404s for invalid routes
function handle404Middleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const url = req.originalUrl;
  
  // Skip API routes - they handle their own 404s
  if (url.startsWith('/api/')) {
    return next();
  }
  
  // Skip static assets
  if (url.startsWith('/assets/') || url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/)) {
    return next();
  }
  
  // Check if this is a valid route
  const path = url.split('?')[0]; // Remove query parameters
  if (!isValidRoute(path)) {
    // Return 404 for invalid routes
    return res.status(404).send('<!DOCTYPE html><html><head><title>404 - Page Not Found</title></head><body><h1>404 - Page Not Found</h1><p>The requested page could not be found.</p></body></html>');
  }
  
  next();
}

export async function setupVite(app: Express, server: Server) {
  // Only use Vite in development mode
  if (process.env.NODE_ENV === 'production') {
    console.warn("setupVite called in production mode - this should use serveStatic instead");
    return;
  }

  // Use minimal vite config for development to avoid plugin import issues
  const viteConfig = {
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "..", "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "..", "shared"),
        "@assets": path.resolve(import.meta.dirname, "..", "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "..", "client"),
  };
  
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    host: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  
  // Add 404 handling middleware before the catch-all
  app.use("*", handle404Middleware);
  
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static assets with proper cache headers
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y', // Cache hashed assets for 1 year
    immutable: true,
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Set cache headers based on file type
      if (filePath.match(/\.(js|css|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for images
      }
    }
  }));

  // Serve other static files with shorter cache
  app.use(express.static(distPath, {
    maxAge: '1h', // Cache other files for 1 hour
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Don't cache HTML files to ensure updates are picked up
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));

  // Add 404 handling middleware before the catch-all
  app.use("*", handle404Middleware);

  // fall through to index.html if the file doesn't exist (only for valid routes)
  app.use("*", (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
