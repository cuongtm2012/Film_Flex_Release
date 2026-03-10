# Ophim Import - Image & Video Fixes

## 📋 Tổng quan vấn đề đã fix

### 1. ❌ Vấn đề ảnh thumbnail
**Trước khi fix:**
- Link ảnh từ API có thể là relative path hoặc empty
- Không có fallback khi ảnh không tồn tại
- Import fail nếu URL không hợp lệ

**Sau khi fix:**
- ✅ Tự động prepend CDN domain cho relative paths
- ✅ Sử dụng placeholder SVG khi không có ảnh
- ✅ Validate URL nhưng không reject import nếu invalid
- ✅ Logging rõ ràng khi sử dụng placeholder

### 2. ❌ Vấn đề video links (M3U8)
**Trước khi fix:**
- Chỉ validate `linkEmbed`, thiếu `linkM3u8`
- Không có warning khi M3U8 link không đúng format

**Sau khi fix:**
- ✅ Validate cả `linkEmbed` và `linkM3u8`
- ✅ Accept episode nếu có ít nhất 1 trong 2 links
- ✅ Warning khi M3U8 link không kết thúc bằng `.m3u8`
- ✅ Episode slug unique: `movieSlug-serverName-episodeNumber`

### 3. ❌ Vấn đề episode duplicate
**Trước khi fix:**
- Episode slug đơn giản: "1", "2", "3" → Duplicate!

**Sau khi fix:**
- ✅ Unique slug format: `{movieSlug}-{serverSlug}-{episodeSlug}`
- ✅ Ví dụ: `thanh-pho-xa-xoi-vietsub-1-1`, `thanh-pho-xa-xoi-thuyet-minh-1-1`

---

## 🔧 Chi tiết các thay đổi

### File: `server/services/ophim-transformer.ts`

#### 1. Hàm `normalizeImageUrl()` - Xử lý URL ảnh

```typescript
function normalizeImageUrl(url: string, cdnDomain: string): string {
  if (!url) {
    // Return placeholder nếu không có URL
    return '/placeholder-movie.svg';
  }
  
  // Đã là full URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Relative path - prepend CDN domain
  const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
  return `${cdnDomain}/uploads/${cleanUrl}`;
}
```

**Cách hoạt động:**
1. URL rỗng → `/placeholder-movie.svg`
2. URL đầy đủ (http/https) → Giữ nguyên
3. Relative path → Prepend CDN domain: `https://img.ophim.live/uploads/movie-thumb.jpg`

#### 2. Hàm `validateMovieData()` - Validate không strict

```typescript
// Chỉ warning, không reject import
if (movieData.posterUrl && 
    movieData.posterUrl !== '/placeholder-movie.svg' && 
    !isValidUrl(movieData.posterUrl)) {
  console.warn(`[Validator] Invalid posterUrl: ${movieData.posterUrl}, will use anyway`);
}
```

**Lợi ích:**
- Import vẫn thành công ngay cả khi ảnh có vấn đề
- Admin có thể sửa ảnh sau qua Admin Panel

#### 3. Hàm `validateEpisodeData()` - Validate video links

```typescript
// Check ít nhất 1 video source
if (!episodeData.linkEmbed && !episodeData.linkM3u8) {
  errors.push('Missing both linkEmbed and linkM3u8 - need at least one video source');
}

// Warning nếu M3U8 không đúng format
if (episodeData.linkM3u8 && !episodeData.linkM3u8.endsWith('.m3u8')) {
  console.warn(`[Episode Validator] linkM3u8 doesn't end with .m3u8: ${episodeData.linkM3u8}`);
}
```

#### 4. Hàm `transformEpisodes()` - Unique episode slugs

```typescript
// Normalize server name để làm slug
const serverSlug = server.server_name
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

// Tạo unique slug
const uniqueSlug = `${movieSlug}-${serverSlug}-${episode.slug || episode.name || (index + 1)}`;
```

**Ví dụ:**
- Movie: `duong-trieu-quy-su-luc-phan-3`
- Server: `Vietsub #1` → `vietsub-1`
- Episode: `1` → Slug: `duong-trieu-quy-su-luc-phan-3-vietsub-1-1`

---

### File: `scripts/import-ophim-movies.ts`

#### Enhanced Logging

```typescript
if (this.config.verbose) {
  const stats = getMovieStats(transformed);
  console.log(`      ✅ Imported: ${episodesInserted} episodes (${stats.serverCount} servers)`);
  if (episodesFailed > 0) {
    console.log(`      ⚠️  Failed: ${episodesFailed} episodes`);
  }
  // Log nếu dùng placeholder
  if (transformed.movie.posterUrl === '/placeholder-movie.svg') {
    console.log(`      ℹ️  Using placeholder image (no image from API)`);
  }
}
```

---

### File: `public/placeholder-movie.svg`

Tạo placeholder image đẹp mắt với:
- Gradient background (dark theme)
- Film strip icon
- Play button
- Text "No Image Available"

```bash
# File location
public/placeholder-movie.svg
```

---

## 🎬 Video Player Support

### Yêu cầu frontend cho HLS/M3U8

Frontend cần player hỗ trợ HLS để phát video `.m3u8`:

**Option 1: Video.js + HLS Plugin**
```bash
npm install video.js @videojs/http-streaming
```

**Option 2: Plyr + HLS.js**
```bash
npm install plyr hls.js
```

**Option 3: Native HTML5 (Safari only)**
```html
<video src="video.m3u8" controls></video>
```

### Cấu trúc dữ liệu episode

```typescript
{
  movieSlug: "movie-slug",
  serverName: "Vietsub #1",
  name: "1",
  slug: "movie-slug-vietsub-1-1",
  filename: "Movie Name - Episode 1",
  linkEmbed: "https://vip.opstream90.com/share/abc123",
  linkM3u8: "https://vip.opstream90.com/20251108/12345_abc123/index.m3u8"
}
```

**Frontend nên:**
1. Ưu tiên sử dụng `linkM3u8` nếu có (chất lượng tốt hơn)
2. Fallback sang `linkEmbed` nếu M3U8 fail
3. Hiển thị dropdown để chọn server (serverName)

---

## 📊 Testing

### Test import với logging đầy đủ

```bash
# Import page 1 với verbose mode
./scripts/import-ophim.sh --page 1 --verbose

# Output sẽ hiển thị:
# ✅ Imported: 8 episodes (2 servers)
# ℹ️  Using placeholder image (no image from API)
```

### Test xóa movies để import lại

```bash
# Dry run - xem sẽ xóa gì
npx tsx scripts/delete-test-movies.ts --page 1 --dry-run

# Xóa thật
npx tsx scripts/delete-test-movies.ts --page 1

# Import lại
./scripts/import-ophim.sh --page 1 --verbose
```

### Kiểm tra ảnh placeholder

```bash
# Truy cập URL
http://localhost:5000/placeholder-movie.svg

# Hoặc trong production
https://phimgg.com/placeholder-movie.svg
```

---

## ✅ Checklist hoàn thành

- [x] Fix URL ảnh với fallback placeholder
- [x] Tạo placeholder SVG đẹp
- [x] Validate M3U8 links
- [x] Fix duplicate episode slugs
- [x] Enhanced logging (episodes count, servers, placeholder usage)
- [x] Episode validation accept both linkEmbed và linkM3u8
- [x] Warning cho invalid URLs thay vì reject

---

## 🚀 Next Steps

### Frontend - Video Player

1. **Cài đặt HLS player**
   ```bash
   npm install video.js @videojs/http-streaming
   ```

2. **Implement player component**
   ```typescript
   import videojs from 'video.js';
   
   const player = videojs('video-element', {
     sources: [{
       src: episode.linkM3u8,
       type: 'application/x-mpegURL'
     }]
   });
   ```

3. **Server selector UI**
   - Dropdown để chọn server (Vietsub #1, Thuyết Minh #1, etc.)
   - Auto-switch nếu server hiện tại fail

### Backend - Image handling

1. **Image proxy (optional)**
   - Proxy image requests qua server
   - Cache images locally
   - Fallback placeholder nếu external image fail

2. **Image validation cron job**
   - Check xem image URLs còn hoạt động không
   - Update placeholder nếu broken

---

## 📝 Notes

- **CDN Domain**: `https://img.ophim.live` (có thể thay đổi)
- **Placeholder**: `/placeholder-movie.svg` (SVG responsive, nhẹ)
- **Episode slug pattern**: `{movie}-{server}-{episode}` (unique across database)
- **Video formats**: Hỗ trợ cả `linkEmbed` (iframe) và `linkM3u8` (HLS stream)

---

## 🐛 Troubleshooting

### Vấn đề: Ảnh không hiển thị

**Kiểm tra:**
```sql
SELECT slug, poster_url, thumb_url FROM movies WHERE slug = 'movie-slug';
```

**Fix:**
1. Nếu URL là `/placeholder-movie.svg` → OK, placeholder hoạt động
2. Nếu URL là `https://img.ophim.live/uploads/...` → Check URL có accessible không
3. Update ảnh qua Admin Panel nếu cần

### Vấn đề: Video không phát được

**Kiểm tra:**
```sql
SELECT slug, server_name, link_m3u8, link_embed 
FROM episodes 
WHERE movie_slug = 'movie-slug';
```

**Fix:**
1. Check `link_m3u8` có kết thúc bằng `.m3u8` không
2. Test link trực tiếp trong browser
3. Đảm bảo frontend player hỗ trợ HLS
4. Fallback sang `link_embed` nếu M3U8 fail

### Vấn đề: Duplicate episode error

**Nguyên nhân:** Old episode slugs chưa unique

**Fix:**
```bash
# Xóa movies và import lại với unique slugs mới
npx tsx scripts/delete-test-movies.ts --slug movie-slug
./scripts/import-ophim.sh --page 1
```

---

**Tài liệu này được tạo:** 2025-11-09  
**Version:** 1.0  
**Author:** AI Assistant
