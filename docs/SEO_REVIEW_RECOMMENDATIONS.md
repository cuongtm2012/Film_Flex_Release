# Đánh giá SEO PhimGG - Cần tối ưu thêm

## ✅ Đã làm tốt

| Hạng mục | Trạng thái |
|----------|------------|
| Meta tags cơ bản | ✅ index.html có title, description, keywords |
| Open Graph | ✅ og:title, og:description, og:image, og:url |
| Twitter Card | ✅ summary_large_image |
| Schema.org | ✅ WebSite, Organization, Breadcrumb (homepage) |
| MovieSEO component | ✅ Helmet dynamic cho trang phim |
| Sitemap động | ✅ /api/sitemap.xml với 500 phim + trang chính |
| robots.txt | ✅ Allow, Disallow hợp lý |
| Canonical | ✅ Homepage và movie pages |

---

## ⚠️ Cần cải thiện

### 1. ~~Sitemap chỉ 500 phim~~ ✅ ĐÃ SỬA

**Đã triển khai:** Sitemap index + nhiều sitemap con:
- `/api/sitemap-index.xml` – danh sách tất cả sitemap
- `/api/sitemap-pages.xml` – trang chính, genre, year
- `/api/sitemap-movies-1.xml`, `sitemap-movies-2.xml`, ... – mỗi file 5.000 phim

---

### 2. Thiếu meta cho nhiều trang

**Các trang chưa dùng Helmet/SEO:**
- Home, Movies, Series, Anime (dùng chung meta từ index.html)
- Search (`/search?q=xxx`)
- Genre (`/genre/action`)
- Year (`/year/2024`)
- Blog, About, Contact

**Đề xuất:** Thêm `PageSEO` component dùng Helmet cho từng loại trang (genre, year, search) với title/description dynamic.

---

### 3. Duration schema sai format

**File:** `client/src/components/MovieSEO.tsx`

```ts
"duration": movie.time ? `PT${movie.time}` : undefined
```

`movie.time` thường là `"120"` (phút) hoặc `"1h 30m"`. `PT120` theo ISO 8601 = 120 giây (sai).

**Sửa:** Chuyển sang định dạng ISO 8601 đúng:

```ts
// Nếu time = "120" (phút) → "PT120M" hoặc "PT2H"
// Nếu time = "1h 30m" → "PT1H30M"
const parseDuration = (time: string) => {
  if (!time) return undefined;
  const mins = parseInt(time, 10);
  if (!isNaN(mins)) return `PT${mins}M`;
  // Parse "1h 30m" nếu cần
  return undefined;
};
"duration": parseDuration(movie.time)
```

---

### 4. Ảnh poster có thể là URL tương đối

**Vấn đề:** `poster_url` có thể là `/uploads/xxx.jpg` → OG/Twitter cần URL tuyệt đối.

**Sửa:**
```ts
const absUrl = (url: string) => 
  url?.startsWith('http') ? url : `https://phimgg.com${url?.startsWith('/') ? '' : '/'}${url || ''}`;
image: absUrl(movie.poster_url || movie.thumb_url)
```

---

### 5. Breadcrumb cho trang phim

**Đề xuất:** Thêm BreadcrumbList trong MovieSEO:

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://phimgg.com" },
    { "@type": "ListItem", "position": 2, "name": "Movies", "item": "https://phimgg.com/movies" },
    { "@type": "ListItem", "position": 3, "name": "Movie Name", "item": "https://phimgg.com/movie/slug/" }
  ]
}
```

---

### 6. robots.txt

- **Crawl-delay:** Google bỏ qua, có thể xóa.
- **Sitemap ở root:** Nên thêm redirect `/sitemap.xml` → `/api/sitemap.xml` trong nginx (chuẩn thường dùng root).

---

### 7. Placeholder trong schema

- `telephone: "+1-555-PHIMGG"` → thay bằng số thật hoặc xóa.
- `logo: "https://phimgg.com/logo.png"` → dùng logo thật (ví dụ phimgg-logo.png).

---

### 8. Ngôn ngữ / khu vực

`lang="en"`, `geo.region: US` – nếu hướng tới thị trường Việt Nam, nên cân nhắc:

- `lang="vi"` hoặc `lang="x-default"`
- `og:locale: "vi_VN"`
- `geo.region: "VN"`

---

## 🔴 Vấn đề lớn: SPA (client-side rendering)

**Hiện trạng:** Ứng dụng là SPA, nội dung render bằng JS. Google có chạy JS nhưng:
- Chậm hơn SSR
- Một số crawler có thể không chạy JS
- Initial HTML chỉ có meta chung từ index.html

**Giải pháp (ưu tiên cao):**
1. **Pre-rendering:** Dùng Prerender.io, Rendertron (middleware) cho bot.
2. **SSR:** Chuyển sang Next.js, Remix, hoặc dùng Vite SSR.
3. **Tối thiểu:** Đảm bảo index.html có meta mặc định tốt cho các trang chính.

---

## Thứ tự ưu tiên

| Ưu tiên | Việc | Effort |
|---------|------|--------|
| 1 | Sửa duration schema (MovieSEO) | Thấp |
| 2 | Absolute URL cho poster/thumb | Thấp |
| 3 | Thêm Breadcrumb schema cho movie | Thấp |
| 4 | Sitemap index cho 21k phim | Trung bình |
| 5 | PageSEO cho genre, year, search | Trung bình |
| 6 | Xóa/sửa placeholder trong schema | Thấp |
| 7 | Nginx rewrite /sitemap.xml → /api/sitemap.xml | Thấp |
| 8 | SSR/Pre-rendering | Cao |
