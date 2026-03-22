# Đánh giá Caching - FilmFlex / PhimGG

Review các tầng cache hiện tại và khuyến nghị cải thiện.

---

## 1. Hiện trạng

### 1.1 Server-side (Backend)

| Tầng | Công nghệ | Phạm vi | TTL | Ghi chú |
|------|-----------|---------|-----|---------|
| **Movie Detail** | In-memory `Map` (storage.ts) | movieDetail:slug | 2 phút | ✅ Đã có |
| **Movie List** | In-memory `Map` | movieList:page | 2 phút | ⚠️ Có interface nhưng **chưa được gọi** từ API |
| **Movie Category** | In-memory `Map` | movieCategory:slug:page | 2 phút | ⚠️ Có interface nhưng **chưa được gọi** từ API |
| **AI Recommendations** | In-memory `Map` | userId | 1 giờ | ✅ Đã có |
| **Redis** | ioredis | verify:token (email) | Theo TTL | Chỉ dùng cho verification token |
| **Session** | memorystore | sessionId | Theo config | In-memory, mất khi restart |

**Hạn chế in-memory Map:**
- Mất cache khi restart app
- Tốn RAM (VPS 4GB đã hạn chế heap Node 384MB)
- Không chia sẻ giữa nhiều instance (nếu scale horizontal)
- `getMovieListCache` / `getMovieCategoryCache` **không được sử dụng** trong routes

### 1.2 API routes – Ai đang dùng cache?

| Endpoint | Cache? | Ghi chú |
|----------|--------|---------|
| `GET /api/movies/:slug` | ✅ Có | movie-detail.ts dùng getMovieDetailCache |
| `GET /api/movies` (list) | ❌ Không | Gọi trực tiếp storage.getMovies |
| `GET /api/movies/sections/:section` | ❌ Không | Gọi trực tiếp storage.getMoviesBySection |
| `GET /api/categories/:slug` | ❌ Không | Gọi trực tiếp storage.getMoviesByCategory |
| `GET /api/sitemap-*.xml` | ❌ Không | Query DB mỗi request |
| `GET /api/search` | N/A | Elasticsearch – đã index, tương đối nhanh |
| `GET /api/movies/recommended` | ❌ Không | Có logic AI + DB |
| AI recommendations | ✅ Có | In-memory cache theo userId |

### 1.3 Client-side (React Query)

| Query | staleTime | gcTime | Ghi chú |
|-------|-----------|--------|---------|
| Home (trending, latest, tv, anime...) | 5–30 phút | 30 phút | ✅ Tốt |
| Movie detail | Default | - | Phụ thuộc queryClient |
| Search | - | - | Theo query key |
| Watchlist, history | 5 phút | - | ✅ Hợp lý |

Client cache đã ổn, giảm đáng kể số lần gọi API lặp lại.

### 1.4 HTTP cache (Nginx / response headers)

| Resource | Cache-Control | Ghi chú |
|----------|---------------|---------|
| `/assets/*` | `max-age=31536000, immutable` | ✅ Tốt |
| `/api/*` | Không set | Mặc định no-cache / private |
| Sitemap XML | Không set | Có thể cache ngắn |

---

## 2. Khuyến nghị

### 2.1 Cache Movie List, Section, Category (đã triển khai)

**Cache đã bật cho:**

- `GET /api/movies`: `getMovieListCache(page, limit, sortBy, filters)` – cache key bao gồm đầy đủ params
- `GET /api/movies/sections/:section`: `getMovieSectionCache(section, page, limit)`
- `GET /api/categories/:slug`: `getMovieCategoryCache(slug, page, limit)` (khi có data từ DB)

→ Giảm tải DB cho các API được gọi nhiều nhất (Home, list, category).

### 2.2 Redis cache (đã triển khai)

**Cache movie/category đã chuyển sang Redis** (xem `server/services/movie-cache.ts`):

- Dùng Redis khi `REDIS_HOST` được set trong .env
- Fallback in-memory khi Redis không khả dụng
- TTL 5 phút, key prefix `filmflex:cache:`

Để bật Redis cache, set trong `.env`:
```
REDIS_HOST=38.54.14.154
REDIS_PORT=6379
REDIS_PASSWORD=  # để trống nếu không dùng
```

### 2.3 Ưu tiên trung bình – HTTP cache cho API

Thêm `Cache-Control` cho response read-only:

- `GET /api/movies`, sections, categories: `Cache-Control: public, max-age=60` (1 phút)
- `GET /api/sitemap-index.xml`, sitemap-pages, sitemap-movies-*: `Cache-Control: public, max-age=3600` (1 giờ)

Browser + CDN (Cloudflare) sẽ cache, giảm tải server.

### 2.4 Ưu tiên thấp – Nginx proxy_cache

Cấu hình `proxy_cache` cho `/api/` nếu traffic rất cao. Cần:

- `proxy_cache_path`
- `proxy_cache_key`
- `proxy_cache_valid` theo status code

Phức tạp hơn, chỉ nên làm khi đã tối ưu cache app và HTTP headers.

### 2.5 Điều chỉnh TTL

- Hiện tại: 2 phút – có thể tăng lên **5–10 phút** cho movie detail/list vì dữ liệu không đổi liên tục
- Cân nhắc invalidate cache khi admin cập nhật/sync movie (đã có `clearMovieDetailCache`)

---

## 3. Kết luận

| Hạng mục | Cần thêm cache? | Hành động đề xuất |
|----------|------------------|-------------------|
| Movie Detail | Đã có | Có thể tăng TTL 2→5 phút |
| Movie List | **Cần** | Dùng `getMovieListCache` trong route |
| Movie Sections | **Cần** | Thêm cache section (hoặc dùng chung logic list) |
| Movie Category | **Cần** | Dùng `getMovieCategoryCache` trong route |
| Sitemap | **Nên** | Cache trong app (5–10 phút) hoặc HTTP header 1h |
| Redis | **Tùy chọn** | Dùng khi cần persistence, giảm RAM Node |
| HTTP headers | **Nên** | Thêm Cache-Control cho read-only API |

**Tóm lại:** App **đã có** nền tảng cache (in-memory Map, Redis, React Query) nhưng chưa dùng hết. Khuyến nghị ngắn hạn: **bật cache cho movie list, sections, category** và thêm **Cache-Control** cho API. Redis có thể triển khai sau khi traffic tăng hoặc khi cần giảm RAM cho Node.
