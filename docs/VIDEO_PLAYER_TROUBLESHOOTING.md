# Video Player Troubleshooting Guide 🎬

## ✅ Kết quả kiểm tra

### 1. Database URLs - ALL VALID ✅
```bash
npx tsx scripts/test-video-player.ts
```

**Kết quả:**
- ✅ 5/5 movies có URLs hợp lệ
- ✅ Tất cả embed URLs đều từ `player.phimapi.com`
- ✅ Tất cả M3U8 URLs đều có format đúng
- ✅ Tất cả domains đã có trong CSP whitelist

### 2. CSP Configuration - UPDATED ✅

**File:** `server/middleware/security.ts`

**Thêm vào:**
```typescript
// frame-src - Cho phép iframe player
"frame-src ... https://player.phimapi.com https://*.phimapi.com https://*.kkphimplayer6.com https://*.phim1280.tv"

// media-src - Cho phép tải video
"media-src ... https://*.kkphimplayer6.com https://*.phim1280.tv https://*.phimapi.com"

// connect-src - Cho phép XHR/fetch
"connect-src ... https://*.kkphimplayer6.com https://*.phim1280.tv https://*.phimapi.com"
```

### 3. Service Worker - NO IMPACT ✅

**File:** `client/public/sw.js`

Service Worker **KHÔNG** cache video vì:
- Cross-origin requests bị skip
- API calls bị bypass (`/api/` trong NO_CACHE_PATTERNS)
- Chỉ cache critical assets (HTML, CSS, JS từ same-origin)

---

## 🔧 Test Page Created

**URL:** http://localhost:5000/video-player-test.html

**Features:**
1. ✅ Test 2 movies trực tiếp từ database
2. ✅ Console logging chi tiết
3. ✅ Network diagnostics
4. ✅ CSP violation monitoring
5. ✅ Browser compatibility check
6. ✅ Reload và test buttons

**Cách sử dụng:**
```bash
# 1. Start server
npm run dev

# 2. Mở browser
http://localhost:5000/video-player-test.html

# 3. Kiểm tra console và player status
```

---

## 🎯 Các bước troubleshoot

### Bước 1: Test URLs trực tiếp

**Test embed URL trong browser:**
```
https://player.phimapi.com/player/?url=https://s6.kkphimplayer6.com/20250610/ehBaFKT5/index.m3u8
```

**Kết quả mong đợi:**
- ✅ Player hiển thị
- ✅ Video tải và phát
- ❌ Nếu không phát → Vấn đề ở phía PhimAPI/CDN

**Test M3U8 URL trực tiếp:**
```
https://s6.kkphimplayer6.com/20250610/ehBaFKT5/index.m3u8
```

**Kết quả mong đợi:**
- ✅ Download file .m3u8 hoặc hiển thị playlist
- ❌ Nếu 403/404 → CDN link đã hết hạn hoặc geo-blocked

### Bước 2: Kiểm tra Browser Console

**Mở DevTools (F12) → Console tab**

**Logs cần kiểm tra:**
```javascript
// ✅ Logs bình thường
[VideoPlayer] Original embedUrl: https://player.phimapi.com/...
[VideoPlayer] Direct URL (no iframe tag): https://player.phimapi.com/...
[VideoPlayer] Rendering iframe with src: https://player.phimapi.com/...
[VideoPlayer] ✅ Iframe loaded successfully

// ❌ Lỗi CSP
Refused to frame 'https://...' because it violates the following Content Security Policy directive...

// ❌ Lỗi CORS
Access to fetch at '...' from origin 'http://localhost:5000' has been blocked by CORS policy

// ❌ Lỗi Network
GET https://... net::ERR_FAILED
```

### Bước 3: Kiểm tra Network Tab

**Mở DevTools → Network tab**

**Kiểm tra:**
1. **Request to iframe URL:**
   - Status: Should be `200 OK`
   - Type: `document`
   - Size: Should show actual size (not "disk cache")

2. **Request to M3U8:**
   - Status: Should be `200 OK`
   - Type: `application/vnd.apple.mpegurl` or `application/x-mpegURL`
   - Preview: Should show playlist content

3. **Video segments (.ts files):**
   - Multiple requests to `.ts` files
   - Status: All `200 OK`

**Lỗi thường gặp:**
- ❌ Status `403 Forbidden` → Geo-blocking hoặc hotlink protection
- ❌ Status `404 Not Found` → Link hết hạn
- ❌ Status `0` → CORS blocked hoặc network error

### Bước 4: Test với proxy

**Nếu gặp CORS error, tạo proxy route:**

```typescript
// server/routes.ts
router.get('/proxy/video', async (req, res) => {
  const url = req.query.url as string;
  
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    
    res.set({
      'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Sử dụng:**
```typescript
// VideoPlayer.tsx
const proxiedUrl = `/proxy/video?url=${encodeURIComponent(cleanSrc)}`;
<iframe src={proxiedUrl} ... />
```

### Bước 5: Disable Service Worker (tạm thời)

**Trong DevTools:**
1. Application tab → Service Workers
2. Click "Unregister" để xóa SW
3. Reload page
4. Test lại video player

**Nếu video phát sau khi disable SW:**
- ⚠️ Service Worker đang cache sai hoặc chặn request
- Fix: Update SW code hoặc clear cache

---

## 🐛 Common Issues & Solutions

### Issue 1: Iframe không load

**Triệu chứng:**
- Màn hình đen
- Console: "Refused to frame"

**Nguyên nhân:** CSP blocking

**Giải pháp:**
```typescript
// server/middleware/security.ts
"frame-src ... https://player.phimapi.com https://*.phimapi.com"
```

### Issue 2: Video không phát trong iframe

**Triệu chứng:**
- Iframe load nhưng player báo lỗi
- Console trong iframe: Network error

**Nguyên nhân:** M3U8 URL không accessible

**Giải pháp:**
1. Test M3U8 URL trực tiếp trong browser
2. Nếu 403 → CDN block
3. Nếu 404 → Link hết hạn, cần re-import từ API

### Issue 3: CORS error

**Triệu chứng:**
```
Access to fetch at 'https://...' has been blocked by CORS policy
```

**Nguyên nhân:** Server video không set CORS headers

**Giải pháp:**
- Sử dụng iframe thay vì direct video tag
- Hoặc dùng proxy backend

### Issue 4: Geo-blocking

**Triệu chứng:**
- 403 Forbidden
- Video phát được ở VPN nhưng không phát ở localhost

**Nguyên nhân:** CDN chặn theo IP/country

**Giải pháp:**
1. Sử dụng VPN
2. Hoặc backend proxy với server ở country được phép
3. Hoặc chuyển sang CDN khác

### Issue 5: Link hết hạn

**Triệu chứng:**
- 404 Not Found
- Player báo "Video not found"

**Nguyên nhân:** M3U8 URLs từ API có thời hạn

**Giải pháp:**
```bash
# Re-import movies để lấy link mới
npx tsx scripts/import-ophim-movies.ts --page 1 --no-skip
```

---

## 📊 Debug Checklist

### Trước khi báo lỗi, check:

- [ ] Test URL trực tiếp trong browser
- [ ] Check browser console có lỗi CSP/CORS không
- [ ] Check Network tab xem requests có status code gì
- [ ] Test với browser khác (Chrome, Firefox)
- [ ] Test với incognito mode
- [ ] Disable extensions (AdBlock, etc.)
- [ ] Clear browser cache và cookies
- [ ] Unregister Service Worker
- [ ] Check internet connection stable không

### Nếu vẫn không phát:

1. **Copy console logs** (tất cả errors)
2. **Screenshot Network tab** (show failed requests)
3. **Test URLs:**
   ```
   Embed URL: ...
   M3U8 URL: ...
   Status: ...
   Error: ...
   ```

---

## 🚀 Quick Fixes

### Fix 1: Clear everything và rebuild

```bash
# Clear all caches
rm -rf node_modules/.vite
rm -rf client/dist
rm -rf .cache

# Rebuild
npm run build

# Restart server
npm run dev
```

### Fix 2: Force reload trong browser

```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### Fix 3: Clear Service Worker

**Console:**
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
  location.reload();
});
```

### Fix 4: Test với alternative player

**Sử dụng video.js thay vì iframe:**

```typescript
// VideoPlayer.tsx - Alternative implementation
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

// Use video tag với HLS source
<video
  ref={videoRef}
  className="video-js"
  controls
  preload="auto"
>
  <source src={hlsUrl} type="application/x-mpegURL" />
</video>
```

---

## ✅ Production Checklist

Trước khi deploy:

- [ ] Test video playback trên localhost
- [ ] Test trên staging server
- [ ] Check CSP không block video domains
- [ ] Check CORS headers
- [ ] Test trên multiple browsers
- [ ] Test trên mobile
- [ ] Monitor console không có errors
- [ ] Test với slow network (3G simulation)

---

## 📞 Support Resources

**Test page:** http://localhost:5000/video-player-test.html

**Test script:**
```bash
npx tsx scripts/test-video-player.ts
```

**CSP config:** `server/middleware/security.ts`

**Video player:** `client/src/components/VideoPlayer.tsx`

**Service Worker:** `client/public/sw.js`
