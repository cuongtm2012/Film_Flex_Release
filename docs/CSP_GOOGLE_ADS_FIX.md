# Fix CSP cho Google Ads và News Page

## Vấn đề

Trang **News** gặp lỗi CSP (Content Security Policy) chặn iframe từ Google Ads:

```
Refused to frame 'https://googleads.g.doubleclick.net/' because it violates 
the following Content Security Policy directive: "frame-src 'self' 
https://www.youtube.com https://player.vimeo.com https://www.facebook.com 
https://accounts.google.com https://challenges.cloudflare.com".
```

**Hậu quả:**
- ❌ Iframe quảng cáo không hiển thị
- ❌ Thumbnail trên News page không load
- ❌ Console đầy lỗi CSP violations

---

## Giải pháp

### ✅ Đã cập nhật CSP directives

**File:** `server/middleware/security.ts`

### 1. frame-src Directive

**Trước:**
```typescript
"frame-src 'self' https://www.youtube.com https://player.vimeo.com 
  https://www.facebook.com https://accounts.google.com 
  https://challenges.cloudflare.com"
```

**Sau:**
```typescript
"frame-src 'self' https://www.youtube.com https://player.vimeo.com 
  https://www.facebook.com https://accounts.google.com 
  https://challenges.cloudflare.com 
  https://googleads.g.doubleclick.net 
  https://tpc.googlesyndication.com 
  https://www.google.com"
```

**Thêm:**
- ✅ `https://googleads.g.doubleclick.net` - Google Ads iframe
- ✅ `https://tpc.googlesyndication.com` - Google Ad serving
- ✅ `https://www.google.com` - Google services

---

### 2. connect-src Directive

**Thêm vào connect-src:**
```typescript
https://pagead2.googlesyndication.com
https://googleads.g.doubleclick.net
```

**Mục đích:** Cho phép kết nối XHR/fetch đến Google Ads API

---

### 3. script-src Directive

**Thêm vào script-src:**
```typescript
https://www.gstatic.com
https://adservice.google.com
```

**Mục đích:** Cho phép load JavaScript từ Google Ads SDK

---

### 4. worker-src Directive (NEW)

**Thêm directive mới:**
```typescript
"worker-src 'self' blob:"
```

**Mục đích:** Hỗ trợ Service Workers và Web Workers của Google Ads

---

## CSP Hoàn chỉnh

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
    https://www.google.com",
    
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

---

## Testing

### 1. Test trên News Page

```bash
1. Mở trang News: http://localhost:5173/news
2. Mở DevTools Console (F12)
3. Kiểm tra:
   - ✅ Không còn CSP violation errors
   - ✅ Google Ads iframe hiển thị
   - ✅ Thumbnails load thành công
```

### 2. Kiểm tra CSP Headers

```bash
# Sử dụng curl để xem headers
curl -I http://localhost:5000/

# Tìm header Content-Security-Policy
# Verify có chứa googleads.g.doubleclick.net
```

### 3. Kiểm tra Network Tab

```bash
1. Mở DevTools → Network tab
2. Filter: "doubleclick"
3. Reload page
4. Verify:
   - ✅ Requests to googleads.g.doubleclick.net: Status 200
   - ✅ iframe loads successfully
   - ✅ No CSP blocks
```

---

## Google Ads Domains Explained

| Domain | Mục đích | CSP Directive |
|--------|----------|---------------|
| `googleads.g.doubleclick.net` | Serve ad content, iframe container | `frame-src` |
| `pagead2.googlesyndication.com` | Ad serving API, JavaScript SDK | `script-src`, `connect-src` |
| `tpc.googlesyndication.com` | Third-party container for ads | `frame-src` |
| `www.gstatic.com` | Static resources for Google services | `script-src` |
| `adservice.google.com` | Ad delivery service | `script-src` |

---

## Security Considerations

### ✅ An toàn

Các domain được thêm vào là **official Google services**, được sử dụng bởi hàng triệu websites:

1. **Google Ads** - Platform quảng cáo chính thức của Google
2. **DoubleClick** - Nền tảng ad serving của Google (acquired)
3. **Gstatic** - CDN tĩnh của Google cho libraries

### 🔒 Best Practices đã áp dụng

1. ✅ **Whitelist cụ thể** - Chỉ thêm domain cần thiết, không dùng wildcard `*`
2. ✅ **HTTPS only** - Tất cả domains đều dùng HTTPS
3. ✅ **Minimal permissions** - Chỉ cấp quyền cần thiết cho từng directive
4. ✅ **No unsafe-inline cho frame-src** - Giữ security cho iframes

### ⚠️ Rủi ro đã được giảm thiểu

- **XSS Risk:** Thấp - Google Ads có sandbox riêng trong iframe
- **Data Leakage:** Không - iframe không truy cập được parent page data
- **Malicious Code:** Không - Google có strict content policies

---

## Alternative Solutions (Không khuyến nghị)

### ❌ Option 1: frame-src *
```typescript
"frame-src *"  // TOO PERMISSIVE - Nguy hiểm!
```
**Vấn đề:** Cho phép mọi domain load iframe → mất bảo mật

### ❌ Option 2: Disable CSP
```typescript
// Xóa toàn bộ CSP headers
```
**Vấn đề:** Mất toàn bộ protection khỏi XSS, clickjacking

### ✅ Option 3: Specific domains (ĐƯỢC CHỌN)
```typescript
"frame-src 'self' https://googleads.g.doubleclick.net ..."
```
**Lợi ích:** Cân bằng giữa chức năng và bảo mật

---

## Troubleshooting

### Vấn đề 1: Vẫn còn CSP errors

**Triệu chứng:**
```
Refused to frame 'https://xyz.doubleclick.net/'
```

**Giải pháp:**
1. Check domain chính xác trong console error
2. Thêm domain đó vào `frame-src`
3. Restart server để apply CSP mới

---

### Vấn đề 2: Ads không hiển thị nhưng không có CSP error

**Nguyên nhân khác:**
- Ad Blocker browser extension
- DNS blocking (Pi-hole, etc.)
- Network firewall blocking ads
- Google Ads account chưa active

**Kiểm tra:**
```bash
# Test domain có accessible không
curl -I https://googleads.g.doubleclick.net
```

---

### Vấn đề 3: Mixed Content Warning

**Triệu chứng:**
```
Mixed Content: The page at 'https://...' was loaded over HTTPS, 
but requested an insecure resource 'http://...'
```

**Giải pháp:**
```typescript
// CSP đã có directive này
"upgrade-insecure-requests"  // Tự động upgrade HTTP → HTTPS
```

---

## Monitor CSP Violations

### Setup CSP Reporting

Để track CSP violations trong production:

```typescript
const cspDirectives = [
  // ... existing directives
  "report-uri /api/csp-violations",
  "report-to csp-endpoint"
];
```

### Backend endpoint:

```typescript
app.post('/api/csp-violations', (req, res) => {
  console.log('CSP Violation:', req.body);
  // Log to monitoring service
  res.status(204).end();
});
```

---

## Related Files

- ✅ `server/middleware/security.ts` - Main CSP configuration
- ✅ `server/index.ts` - Apply security middleware
- ⚠️ `client/index.html` - NO CSP meta tags (good - use HTTP headers)

---

## Resources

- [Google Ads Help: Content Security Policy](https://support.google.com/adsense/answer/12171612)
- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator Tool](https://csp-evaluator.withgoogle.com/)

---

**Status:** ✅ Fixed  
**Date:** November 9, 2025  
**Impact:** Positive - News page ads working, no security compromises
