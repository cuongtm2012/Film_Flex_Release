import type { Request, Response, NextFunction } from 'express';

/**
 * Security Headers Middleware
 * Sets comprehensive security headers including CSP, X-Frame-Options, etc.
 * These headers must be set via HTTP response headers, not HTML meta tags
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Content Security Policy (CSP)
  // Includes all necessary domains for the application to function
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://www.gstatic.com https://adservice.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' blob: https: http: https://*.kkphimplayer6.com https://*.phim1280.tv https://*.phimapi.com https://*.opstream12.com https://*.opstream17.com https://*.opstream90.com",
    "connect-src 'self' https://api.phimgg.com https://phimgg.com https://*.phimgg.com https://accounts.google.com https://oauth2.googleapis.com https://www.google-analytics.com https://cloudflareinsights.com https://fcm.googleapis.com https://firebase.googleapis.com https://firebaseinstallations.googleapis.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.kkphimplayer6.com https://*.phim1280.tv https://*.phimapi.com https://*.opstream12.com https://*.opstream17.com https://*.opstream90.com wss: ws:",
    "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.facebook.com https://accounts.google.com https://challenges.cloudflare.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://*.opstream12.com https://*.opstream17.com https://*.opstream90.com https://player.phimapi.com https://*.phimapi.com https://*.kkphimplayer6.com https://*.phim1280.tv",
    "worker-src 'self' blob:",
    "frame-ancestors 'self' https://phimgg.com https://*.phimgg.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com https://www.facebook.com",
    "upgrade-insecure-requests"
  ];

  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  // X-Frame-Options - REMOVED to allow video player iframes from external domains
  // CSP frame-ancestors already handles this more precisely
  // res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // X-Content-Type-Options - Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-XSS-Protection - Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy - Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy - Control browser features
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Strict-Transport-Security - Enforce HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Cross-Origin policies - Relaxed to allow video player iframes
  // COEP 'credentialless' and COOP 'same-origin-allow-popups' block external iframes
  // res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  // res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  next();
}

/**
 * CORS Headers Middleware
 * Sets appropriate CORS headers for API endpoints
 */
export function corsHeaders(req: Request, res: Response, next: NextFunction): void {
  const allowedOrigins = [
    'https://phimgg.com',
    'https://www.phimgg.com',
    'http://localhost:5173',
    'http://localhost:5000',
    'http://localhost:3000'
  ];

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
}

/**
 * Cache Control Headers Middleware
 * Sets appropriate cache headers based on request path
 */
export function cacheHeaders(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;

  // Static assets - long cache
  if (path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // API endpoints - no cache
  else if (path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  // HTML pages - short cache with revalidation
  else if (path.endsWith('.html') || path === '/' || !path.includes('.')) {
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  }
  // Other resources - moderate cache
  else {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }

  next();
}

/**
 * Security logging middleware
 * Logs security-related events for monitoring
 */
export function securityLogger(req: Request, res: Response, next: NextFunction): void {
  // Log suspicious activities
  const suspiciousPatterns = [
    /\.\.\//,           // Directory traversal
    /<script/i,         // XSS attempts
    /union.*select/i,   // SQL injection
    /javascript:/i,     // JavaScript protocol
    /on\w+\s*=/i       // Event handler injection
  ];

  const isSuspicious = suspiciousPatterns.some(pattern =>
    pattern.test(req.url) ||
    pattern.test(JSON.stringify(req.body)) ||
    pattern.test(JSON.stringify(req.query))
  );

  if (isSuspicious) {
    console.warn('🚨 Suspicious request detected:', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    });
  }

  next();
}
