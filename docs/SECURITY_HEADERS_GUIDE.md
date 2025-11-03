# Security Headers & CSP Configuration Guide

## 📋 Overview

This guide explains the security headers and Content Security Policy (CSP) configuration implemented for PhimGG.com to fix browser console warnings and ensure proper security.

## 🔒 Security Headers Implemented

### 1. **Content Security Policy (CSP)**
Protects against XSS, code injection, and other attacks.

**Configured Directives:**
- `default-src 'self'` - Only load resources from same origin by default
- `script-src` - Allows scripts from:
  - Self (our domain)
  - Cloudflare Insights: `https://static.cloudflareinsights.com`
  - Google AdSense: `https://pagead2.googlesyndication.com`
  - Google Analytics: `https://www.google-analytics.com`
  - CDNs: `https://cdn.jsdelivr.net`, `https://unpkg.com`
  - ⚠️ `'unsafe-inline'` and `'unsafe-eval'` (required for React/Vite)

- `style-src` - Allows stylesheets from self and Google Fonts
- `img-src` - Allows images from any HTTPS source (for movie posters)
- `media-src` - Allows video/audio from any HTTPS source (for streaming)
- `connect-src` - Allows API calls to phimgg.com domains
- `frame-src` - Allows embedding YouTube, Vimeo, Facebook, Google OAuth
- `frame-ancestors` - Prevents site from being embedded (clickjacking protection)

### 2. **X-Frame-Options: SAMEORIGIN**
Prevents the site from being embedded in iframes on other domains.

### 3. **X-Content-Type-Options: nosniff**
Prevents browsers from MIME-sniffing responses away from declared content-type.

### 4. **X-XSS-Protection: 1; mode=block**
Enables browser's XSS filtering (legacy browsers).

### 5. **Referrer-Policy: strict-origin-when-cross-origin**
Controls how much referrer information is sent with requests.

### 6. **Strict-Transport-Security (HSTS)**
Forces HTTPS connections (production only).
- `max-age=31536000` - 1 year
- `includeSubDomains` - Apply to all subdomains
- `preload` - Eligible for browser preload list

### 7. **Permissions-Policy**
Restricts browser features like geolocation, microphone, camera.

### 8. **Cross-Origin Policies**
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `Cross-Origin-Embedder-Policy: credentialless`
- `Cross-Origin-Resource-Policy: cross-origin`

## 🛠️ Implementation

### File Structure
```
server/
├── index.ts                    # Main server file (imports middleware)
└── middleware/
    └── security.ts             # Security headers middleware
```

### Middleware Order (Important!)
```typescript
1. securityLogger          // Log suspicious requests
2. securityHeaders         // Set CSP and security headers
3. express.json()          // Parse JSON bodies
4. cors()                  // CORS configuration
5. cacheHeaders            // Cache control headers
6. ... other middleware
```

## 🔍 Fixed Issues

### ❌ Before (Problems):
1. ⚠️ CSP set via `<meta>` tag (doesn't work for `frame-ancestors`)
2. ⚠️ `X-Frame-Options` in `<meta>` tag (must be HTTP header)
3. ⚠️ Cloudflare Insights script blocked by CSP
4. ⚠️ Duplicate/conflicting cache headers
5. ⚠️ Security headers set in multiple places

### ✅ After (Fixed):
1. ✅ All security headers via HTTP response headers
2. ✅ CSP includes `https://static.cloudflareinsights.com`
3. ✅ `frame-ancestors` works correctly via HTTP header
4. ✅ Centralized cache control via middleware
5. ✅ Clean separation of concerns

## 🧪 Testing

### Check Headers in Browser DevTools
```javascript
// In browser console
fetch(location.href)
  .then(r => r.headers)
  .then(headers => {
    console.log('CSP:', headers.get('content-security-policy'));
    console.log('X-Frame-Options:', headers.get('x-frame-options'));
    console.log('Cache-Control:', headers.get('cache-control'));
  });
```

### Check CSP Violations
```javascript
// Listen for CSP violations
document.addEventListener('securitypolicyviolation', (e) => {
  console.warn('CSP Violation:', {
    directive: e.violatedDirective,
    blocked: e.blockedURI,
    original: e.originalPolicy
  });
});
```

### Verify Headers with curl
```bash
# Check response headers
curl -I https://phimgg.com

# Check specific header
curl -I https://phimgg.com | grep -i "content-security-policy"
```

## 📝 Common CSP Violations & Solutions

### 1. Script Blocked
**Error:** `Refused to execute inline script because it violates CSP directive "script-src"`

**Solution:** Add domain to `script-src` directive:
```typescript
"script-src 'self' 'unsafe-inline' https://your-domain.com"
```

### 2. Style Blocked
**Error:** `Refused to apply inline style because it violates CSP directive "style-src"`

**Solution:** Add `'unsafe-inline'` or use external stylesheets:
```typescript
"style-src 'self' 'unsafe-inline'"
```

### 3. Frame Blocked
**Error:** `Refused to frame 'https://example.com' because it violates CSP directive "frame-src"`

**Solution:** Add domain to `frame-src`:
```typescript
"frame-src 'self' https://example.com"
```

### 4. Image Blocked
**Error:** `Refused to load image because it violates CSP directive "img-src"`

**Solution:** Allow HTTPS images:
```typescript
"img-src 'self' data: blob: https:"
```

## 🔧 Maintenance

### Adding New External Services

1. **Analytics Service (e.g., Google Analytics)**
```typescript
// In server/middleware/security.ts
"script-src 'self' ... https://www.google-analytics.com",
"connect-src 'self' ... https://www.google-analytics.com"
```

2. **Video Streaming Service**
```typescript
"media-src 'self' ... https://your-cdn.com",
"connect-src 'self' ... https://your-cdn.com"
```

3. **Payment Gateway**
```typescript
"frame-src 'self' ... https://payment-provider.com",
"script-src 'self' ... https://payment-provider.com"
```

### Updating CSP for New Features

When adding new features, check:
1. ✅ External scripts/styles/fonts needed?
2. ✅ Third-party APIs/CDNs?
3. ✅ Embedded content (YouTube, maps, etc.)?
4. ✅ WebSocket connections?

Add domains to appropriate CSP directives.

## 🚀 Deployment Checklist

Before deploying security changes:

- [ ] Test locally with all features
- [ ] Check browser console for CSP violations
- [ ] Verify login/OAuth still works
- [ ] Test video streaming
- [ ] Verify AdSense displays correctly
- [ ] Check all embedded content loads
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Monitor error logs after deployment

## 📊 Monitoring

### Production Monitoring
```javascript
// In client code, report CSP violations to server
document.addEventListener('securitypolicyviolation', (e) => {
  fetch('/api/csp-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      directive: e.violatedDirective,
      blocked: e.blockedURI,
      page: location.href,
      timestamp: new Date().toISOString()
    })
  });
});
```

### Server-side Logging
Already implemented in `server/middleware/security.ts`:
- Logs suspicious requests (XSS, SQL injection attempts)
- Tracks security-related events
- Monitors for attack patterns

## 🔗 References

- [MDN CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Security Headers Scanner](https://securityheaders.com/)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)

## ⚠️ Important Notes

1. **`'unsafe-inline'` and `'unsafe-eval'`**
   - Required for React/Vite in development
   - Consider removing in production with nonce/hash approach
   - See: [CSP Nonce Guide](https://content-security-policy.com/nonce/)

2. **Cloudflare Integration**
   - Cloudflare may inject scripts (Insights, Analytics)
   - Always include `https://static.cloudflareinsights.com` in CSP
   - Test with Cloudflare enabled and disabled

3. **Browser Compatibility**
   - Modern browsers support CSP Level 3
   - Legacy browsers may need different headers
   - Test on target browser versions

4. **Performance Impact**
   - Security headers add minimal overhead
   - CSP validation happens client-side
   - Cache headers improve performance

## 📧 Support

For issues or questions:
- Check browser console for specific CSP violations
- Review server logs for security warnings
- Test with `filmflexCache.enableDebug()` in browser console
- Contact: admin@phimgg.com

---

**Last Updated:** 2025-11-03  
**Version:** 1.0  
**Author:** PhimGG Development Team
