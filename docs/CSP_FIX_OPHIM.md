# CSP Fix for Ophim Video Player

## 🎯 Vấn đề

**Lỗi:** Iframe từ `vip.opstream90.com` bị block bởi Content Security Policy

```
Refused to frame 'https://vip.opstream90.com/' because it violates 
the following Content Security Policy directive: "frame-src 'self' 
https://www.youtube.com https://player.vimeo.com ..."
```

## ✅ Giải pháp

### 1. Updated CSP Headers

**File:** `server/middleware/security.ts`

**Before:**
```typescript
"frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.facebook.com https://accounts.google.com https://challenges.cloudflare.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com",
```

**After:**
```typescript
"frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.facebook.com https://accounts.google.com https://challenges.cloudflare.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://vip.opstream90.com https://*.opstream90.com https://opstream90.com",
```

### 2. Domains Added

✅ `https://vip.opstream90.com` - Main Ophim video CDN
✅ `https://*.opstream90.com` - All subdomains (vip, cdn, etc.)
✅ `https://opstream90.com` - Base domain

## 📋 Kiểm tra CSP

### Test Script
```bash
npx tsx scripts/test-csp.ts
```

### Manual Check
```bash
# Get CSP header
curl -I http://localhost:5000/ | grep -i content-security

# Or in browser console
fetch('/').then(r => console.log(r.headers.get('content-security-policy')))
```

### Expected Output
```
frame-src 'self' 
  https://www.youtube.com 
  https://player.vimeo.com 
  https://www.facebook.com 
  https://accounts.google.com 
  https://challenges.cloudflare.com 
  https://googleads.g.doubleclick.net 
  https://tpc.googlesyndication.com 
  https://www.google.com 
  https://vip.opstream90.com ✅
  https://*.opstream90.com ✅
  https://opstream90.com ✅
```

## 🚀 Áp dụng thay đổi

### Development
```bash
# Build with new CSP
npm run build

# Restart dev server
# Stop current server (Ctrl+C)
# Then start again:
npm run dev
```

### Production
```bash
# Build
npm run build

# Restart PM2
pm2 restart all

# Or specific app
pm2 restart filmflex
```

### Docker
```bash
# Rebuild image
docker-compose build

# Restart containers
docker-compose restart
```

## 🔍 Verify Video Playback

### Browser Test
1. Navigate to movie: `neu-the-gioi-la-san-khau-vay-hau-truong-o-dau`
2. Open DevTools Console
3. Should NOT see CSP error
4. Video iframe should load (if server is up)

### Console Check
```javascript
// Should NOT see this error anymore:
// ❌ Refused to frame 'https://vip.opstream90.com/'

// Should see successful load or 502 from external server:
// ✅ Loading video from https://vip.opstream90.com/share/...
```

## 📊 Complete CSP Configuration

```typescript
const cspDirectives = [
  "default-src 'self'",
  
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 
    https://static.cloudflareinsights.com 
    https://pagead2.googlesyndication.com 
    https://www.googletagmanager.com 
    https://www.google-analytics.com 
    https://challenges.cloudflare.com 
    https://cdn.jsdelivr.net 
    https://unpkg.com 
    https://www.gstatic.com 
    https://adservice.google.com",
    
  "style-src 'self' 'unsafe-inline' 
    https://fonts.googleapis.com 
    https://cdn.jsdelivr.net 
    https://unpkg.com",
    
  "font-src 'self' data: 
    https://fonts.gstatic.com 
    https://cdn.jsdelivr.net",
    
  "img-src 'self' data: blob: https: http:",
  
  "media-src 'self' blob: https: http:",
  
  "connect-src 'self' 
    https://api.phimgg.com 
    https://phimgg.com 
    https://*.phimgg.com 
    https://www.google-analytics.com 
    https://cloudflareinsights.com 
    https://fcm.googleapis.com 
    https://firebase.googleapis.com 
    https://pagead2.googlesyndication.com 
    https://googleads.g.doubleclick.net 
    wss: ws:",
    
  "frame-src 'self' 
    https://www.youtube.com 
    https://player.vimeo.com 
    https://www.facebook.com 
    https://accounts.google.com 
    https://challenges.cloudflare.com 
    https://googleads.g.doubleclick.net 
    https://tpc.googlesyndication.com 
    https://www.google.com 
    https://vip.opstream90.com ✅
    https://*.opstream90.com ✅
    https://opstream90.com ✅",
    
  "worker-src 'self' blob:",
  
  "frame-ancestors 'self' 
    https://phimgg.com 
    https://*.phimgg.com",
    
  "object-src 'none'",
  
  "base-uri 'self'",
  
  "form-action 'self' 
    https://accounts.google.com 
    https://www.facebook.com",
    
  "upgrade-insecure-requests"
];
```

## 🌟 Các video CDN được hỗ trợ

### YouTube
- ✅ `https://www.youtube.com`
- ✅ `https://youtube.com`

### Vimeo
- ✅ `https://player.vimeo.com`

### Ophim API Videos
- ✅ `https://vip.opstream90.com` (NEW)
- ✅ `https://*.opstream90.com` (NEW)
- ✅ `https://opstream90.com` (NEW)

### Social Media Embeds
- ✅ `https://www.facebook.com`

### OAuth/Login
- ✅ `https://accounts.google.com`

### Ads
- ✅ `https://googleads.g.doubleclick.net`
- ✅ `https://tpc.googlesyndication.com`
- ✅ `https://www.google.com`

## 🔐 Security Notes

### Why CSP is Important
- Prevents XSS attacks
- Controls which resources can be loaded
- Prevents clickjacking
- Improves overall security posture

### Why We Added Ophim
- Required for video playback from imported movies
- Ophim API returns video URLs from opstream90.com
- Without CSP allowance, browsers block these iframes

### Wildcard Usage
```typescript
"https://*.opstream90.com"
```
This allows all subdomains like:
- `https://vip.opstream90.com`
- `https://cdn.opstream90.com`
- `https://stream.opstream90.com`
- etc.

## 📝 Related Files

- ✅ `server/middleware/security.ts` - Main CSP configuration
- ✅ `scripts/test-csp.ts` - CSP testing script
- 📄 `nginx/nginx.conf` - No CSP (handled by Express)
- 📄 `nginx/phimgg.com.conf` - No CSP override

## 🐛 Troubleshooting

### Still seeing CSP errors?
1. **Clear browser cache** - Old CSP might be cached
2. **Hard reload** - Ctrl+Shift+R (Chrome) or Cmd+Shift+R (Mac)
3. **Check server restarted** - Verify new build is running
4. **Verify CSP** - Run `npx tsx scripts/test-csp.ts`

### Video still not playing?
1. **Check external server** - `curl -I https://vip.opstream90.com/...`
2. **502 Bad Gateway?** - External CDN down, not CSP issue
3. **Try HLS fallback** - Should auto-switch after 8 seconds
4. **Check other movies** - Test with working movies first

### Testing CSP in Production
```bash
# SSH to server
ssh user@your-server.com

# Test CSP
curl -I https://phimgg.com/ | grep -i content-security

# Should show opstream in frame-src
```

## ✅ Checklist

- [x] Updated `server/middleware/security.ts` with Ophim domains
- [x] Created CSP test script (`scripts/test-csp.ts`)
- [x] Built application (`npm run build`)
- [ ] **Restart dev server** (required for changes to take effect)
- [ ] Test in browser
- [ ] Verify no CSP errors in console
- [ ] Test video playback

## 🎯 Next Steps

1. **Restart dev server** to apply CSP changes
2. Test video playback in browser
3. If external server still down (502), HLS fallback should activate
4. Deploy to production when ready

---

**Status:** CSP configuration updated ✅  
**Requires:** Server restart to take effect  
**Impact:** Allows video playback from Ophim CDN
