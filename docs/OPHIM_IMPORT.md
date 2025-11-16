# Ophim Movie Import System

## 📋 Overview

Hệ thống import tự động phim từ **Ophim API** (ophim1.com) vào database PhimGG. Hỗ trợ import theo page hoặc range page, tự động kiểm tra tồn tại, và validate dữ liệu trước khi lưu.

### Features
- ✅ **Smart Import**: Chỉ import phim mới, skip phim đã tồn tại
- ✅ **Retry Logic**: Tự động retry khi API fails với exponential backoff
- ✅ **Rate Limiting**: Tránh spam API (default: 500ms giữa các calls)
- ✅ **Data Validation**: Validate dữ liệu trước khi lưu DB
- ✅ **Data Transformation**: Tự động transform từ Ophim format sang DB schema
- ✅ **Episodes Import**: Import cả thông tin tập phim theo server
- ✅ **Progress Tracking**: Hiển thị tiến độ realtime
- ✅ **Detailed Logging**: Log chi tiết vào file
- ✅ **Error Handling**: Xử lý lỗi gracefully, không crash

---

## 🚀 Quick Start

### Cài đặt dependencies

```bash
cd ~/Desktop/3.Project/3.Filmflex/Film_Flex_Release
npm install
```

### Import 1 trang đơn giản

```bash
# Sử dụng Bash script (recommended)
chmod +x scripts/import-ophim.sh
./scripts/import-ophim.sh --page 1

# Hoặc gọi trực tiếp TypeScript script
npx tsx scripts/import-ophim-movies.ts --page 1
```

### Import nhiều trang

```bash
# Import pages 1-5
./scripts/import-ophim.sh --start 1 --end 5

# Import pages 10-20 với verbose output
./scripts/import-ophim.sh --start 10 --end 20 --verbose
```

---

## 📚 Usage Guide

### Command Line Options

```bash
npx tsx scripts/import-ophim-movies.ts [OPTIONS]
```

| Option | Short | Description | Example |
|--------|-------|-------------|---------|
| `--page` | `-p` | Import 1 trang cụ thể | `--page 1` |
| `--start` | `-s` | Trang bắt đầu (range) | `--start 1` |
| `--end` | `-e` | Trang kết thúc (range) | `--end 5` |
| `--no-skip` | | Re-import phim đã tồn tại | `--no-skip` |
| `--validate-only` | | Chỉ validate, không lưu DB | `--validate-only` |
| `--verbose` | `-v` | Hiển thị chi tiết | `--verbose` |
| `--rate-limit` | | Delay giữa API calls (ms) | `--rate-limit 1000` |
| `--help` | `-h` | Hiển thị help | `--help` |

### Examples

**1. Import trang 1**
```bash
./scripts/import-ophim.sh --page 1
```

**2. Import pages 1-10**
```bash
./scripts/import-ophim.sh --start 1 --end 10
```

**3. Re-import trang 1 (bao gồm phim đã tồn tại)**
```bash
./scripts/import-ophim.sh --page 1 --no-skip
```

**4. Validate only (không lưu DB)**
```bash
./scripts/import-ophim.sh --page 1 --validate-only
```

**5. Verbose output để debug**
```bash
./scripts/import-ophim.sh --page 1 --verbose
```

**6. Slow down API calls (tránh bị ban)**
```bash
./scripts/import-ophim.sh --page 1 --rate-limit 2000
```

---

## 🔧 Architecture

### File Structure

```
Film_Flex_Release/
├── scripts/
│   ├── import-ophim-movies.ts    # Main import script
│   └── import-ophim.sh            # Bash wrapper
├── server/
│   └── services/
│       ├── ophim-api.ts           # Ophim API client
│       └── ophim-transformer.ts   # Data transformer
└── logs/
    └── import-ophim-*.log         # Import logs
```

### Component Overview

#### 1. **ophim-api.ts** - API Service
```typescript
// Fetch danh sách phim mới
fetchOphimMovieList(page: number): Promise<OphimMovieListResponse>

// Fetch chi tiết phim theo slug
fetchOphimMovieDetail(slug: string): Promise<OphimMovieDetailResponse>

// Retry với exponential backoff
retryApiCall(fn, retries, delay): Promise<T>

// Rate limiter
RateLimiter.execute(fn): Promise<T>
```

#### 2. **ophim-transformer.ts** - Data Transformer
```typescript
// Transform Ophim data → DB format
transformOphimMovieToDbFormat(ophimData): { movie, episodes }

// Validate movie data
validateMovieData(movieData): { valid, errors }

// Validate episode data
validateEpisodeData(episodeData): { valid, errors }
```

#### 3. **import-ophim-movies.ts** - Main Script
```typescript
class OphimMovieImporter {
  import(): Promise<ImportStats>
  
  private importPage(page): Promise<void>
  private importMovie(movieItem): Promise<void>
  private printSummary(): void
}
```

---

## 📊 Import Process Flow

```
┌─────────────────────────────────────────────────────┐
│ 1. Parse CLI Arguments                              │
│    (page, start, end, options)                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 2. Loop through pages (pageStart → pageEnd)         │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 3. Fetch Movie List from Ophim API                  │
│    GET /v1/api/danh-sach/phim-moi?page={page}      │
│    - Retry on failure (max 3 times)                 │
│    - Rate limit: 500ms between calls                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 4. Loop through each movie item                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 5. Check if movie exists in DB (by slug)            │
│    SELECT * FROM movies WHERE slug = ?              │
└──────────────────┬──────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
    ┌────────┐         ┌─────────────┐
    │ Exists │         │ Not Exists  │
    └────┬───┘         └──────┬──────┘
         │                    │
         ▼                    ▼
    ┌────────┐         ┌─────────────────────────────┐
    │  Skip  │         │ 6. Fetch Movie Detail       │
    └────────┘         │    GET /v1/api/phim/{slug}  │
                       └──────┬──────────────────────┘
                              │
                              ▼
                       ┌─────────────────────────────┐
                       │ 7. Transform Data           │
                       │    Ophim → DB Schema        │
                       └──────┬──────────────────────┘
                              │
                              ▼
                       ┌─────────────────────────────┐
                       │ 8. Validate Data            │
                       │    Check required fields    │
                       └──────┬──────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
              ┌──────────┐        ┌──────────┐
              │  Valid   │        │ Invalid  │
              └─────┬────┘        └─────┬────┘
                    │                   │
                    ▼                   ▼
         ┌───────────────────┐   ┌──────────┐
         │ 9. Save to DB     │   │ Log Error│
         │ - Insert movie    │   └──────────┘
         │ - Insert episodes │
         └───────────────────┘
```

---

## 🎯 Data Mapping

### Ophim API → Database Schema

**Movie Fields:**

| Ophim Field | DB Field | Transform | Example |
|-------------|----------|-----------|---------|
| `_id` | `movieId` | Direct | `"66abc123..."` |
| `slug` | `slug` | Direct | `"avengers-endgame"` |
| `name` | `name` | Direct | `"Avengers: Endgame"` |
| `origin_name` | `originName` | Direct | `"Avengers: Endgame"` |
| `poster_url` | `posterUrl` | Direct | `"https://..."` |
| `thumb_url` | `thumbUrl` | Direct | `"https://..."` |
| `type` | `type` | Normalize | `"single"` → `"movie"` |
| `status` | `status` | Direct | `"completed"` |
| `quality` | `quality` | Direct | `"HD"`, `"FHD"` |
| `lang` | `lang` | Direct | `"Vietsub"` |
| `year` | `year` | Parse int | `2019` |
| `time` | `time` | Direct | `"181 phút"` |
| `content` | `description` | Clean HTML | Text only |
| `episode_current` | `episodeCurrent` | Direct | `"Full"`, `"10/20"` |
| `episode_total` | `episodeTotal` | Direct | `"1"`, `"20"` |
| `category[]` | `categories` | JSONB | `[{id, name, slug}]` |
| `country[]` | `countries` | JSONB | `[{id, name, slug}]` |
| `actor[]` | `actors` | Join strings | `"Actor 1, Actor 2"` |
| `director[]` | `directors` | Join strings | `"Director 1"` |
| `trailer_url` | `trailerUrl` | Direct | `"https://..."` |
| `sub_docquyen` | `subDocquyen` | Direct | `true/false` |
| `chieurap` | `chieurap` | Direct | `true/false` |

**Episode Fields:**

| Ophim Field | DB Field | Transform |
|-------------|----------|-----------|
| (from movie) | `movieSlug` | Parent slug |
| `server_name` | `serverName` | Direct |
| `name` | `name` | Direct |
| `slug` | `slug` | Direct or generate |
| `filename` | `filename` | Direct |
| `link_embed` | `linkEmbed` | Direct |
| `link_m3u8` | `linkM3u8` | Direct |

---

## 📝 Import Statistics

Sau mỗi lần import, script sẽ hiển thị summary:

```
================================
📊 Import Summary
================================
Total pages processed: 5
Total movies processed: 120
Movies imported: 95 ✅
Movies skipped: 20 ⏭️
Movies failed: 5 ❌
Episodes imported: 1840
Duration: 245.67s
Speed: 0.49 movies/s
================================
```

---

## 🔍 Logging

### Log Files

Mỗi lần import tạo log file:
```
logs/import-ophim-YYYYMMDD_HHMMSS.log
```

### Log Content

```log
[INFO] Import started at: 2025-11-09 14:30:00
[INFO] Command: ./import-ophim.sh --page 1
[INFO] Running import script...

📄 Processing page 1...
   Found 24 movies
   
   🎥 Processing: Avengers Endgame (avengers-endgame)
      ✅ Imported: 1 episodes
   
   🎥 Processing: Spider-Man (spider-man-2024)
      ⏭️  Already exists, skipping

================================
📊 Import Summary
================================
...

[SUCCESS] Import completed successfully!
[INFO] Import ended at: 2025-11-09 14:35:30
```

---

## ⚠️ Troubleshooting

### Common Issues

**1. API Rate Limit / 429 Error**
```bash
# Tăng rate limit lên 2 giây
./scripts/import-ophim.sh --page 1 --rate-limit 2000
```

**2. Database Connection Error**
```bash
# Check DB credentials
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=filmflex
export DB_USER=filmflex
export DB_PASSWORD=filmflex2024

# Test connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"
```

**3. Validation Errors**
```bash
# Run validate-only mode để xem lỗi
./scripts/import-ophim.sh --page 1 --validate-only --verbose
```

**4. Phim import lỗi liên tục**
```bash
# Check logs để xem lỗi chi tiết
cat logs/import-ophim-*.log | grep "❌"

# Skip phim lỗi, import tiếp
# (script tự động skip và log lỗi)
```

**5. Memory Issues (nhiều pages)**
```bash
# Import từng page một
for i in {1..10}; do
  ./scripts/import-ophim.sh --page $i
  sleep 5
done
```

---

## 🔐 Security & Best Practices

### Rate Limiting
- **Default**: 500ms between API calls
- **Recommended**: 1000-2000ms for production
- **Reason**: Tránh bị Ophim API ban IP

### Database
- **Transaction**: Mỗi phim là 1 transaction
- **Rollback**: Nếu insert movie OK nhưng episodes fail, chỉ episodes fail
- **Connection Pool**: Sử dụng Drizzle ORM connection pool

### Error Handling
- **API Errors**: Retry 3 lần với exponential backoff
- **Validation Errors**: Log và skip, không crash
- **DB Errors**: Log và skip, không crash

### Performance
- **Batch Size**: Import theo page (thường ~24 movies/page)
- **Parallel**: Không nên parallel nhiều page cùng lúc (rate limit)
- **Memory**: Script giải phóng memory sau mỗi page

---

## 📈 Advanced Usage

### Custom Data Transformation

Nếu cần custom transform logic:

```typescript
// server/services/ophim-transformer.ts

export function transformOphimMovieToDbFormat(ophimData) {
  // Thêm custom logic ở đây
  const transformed = {
    // ... existing transforms
    
    // Custom: Set default section based on type
    section: ophimData.movie.type === 'hoathinh' ? 'anime' : null,
    
    // Custom: Mark as recommended if view > 1M
    isRecommended: (ophimData.movie.view || 0) > 1000000,
  };
  
  return transformed;
}
```

### Scheduled Import (Cron Job)

```bash
# Import mỗi ngày lúc 2 AM
crontab -e

# Add:
0 2 * * * /path/to/scripts/import-ophim.sh --page 1 >> /path/to/logs/cron-import.log 2>&1
```

### Docker Integration

```bash
# Run inside Docker container
docker exec -it filmflex-app bash
cd /app
./scripts/import-ophim.sh --page 1
```

---

## 📞 Support

### Issues?

1. Check logs: `logs/import-ophim-*.log`
2. Run verbose mode: `--verbose`
3. Test validation: `--validate-only`
4. Check database connection
5. Verify API accessibility: `curl https://ophim1.com/v1/api/danh-sach/phim-moi?page=1`

### Contact

- **Team**: PhimGG Development Team
- **Email**: admin@phimgg.com
- **Docs**: `docs/OPHIM_IMPORT.md`

---

## 📄 License

Internal tool for PhimGG project only.

---

**Version**: 1.0.0  
**Last Updated**: November 9, 2025  
**Author**: PhimGG Development Team
