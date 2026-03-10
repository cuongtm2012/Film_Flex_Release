import type { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware
 * Adds essential security headers to all responses
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
    // HSTS - Force HTTPS for 1 year
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // CSP - Content Security Policy
    // Allow scripts from self, inline scripts (for React), and Google Ads
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' data: https: blob:; " +
        "font-src 'self' data: https://fonts.gstatic.com; " +
        "connect-src 'self' https: wss:; " +
        "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; " +
        "media-src 'self' https: blob:;"
    );

    // X-Frame-Options - Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // X-Content-Type-Options - Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
}
