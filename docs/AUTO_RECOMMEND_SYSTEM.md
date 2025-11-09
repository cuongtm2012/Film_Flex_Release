# Automatic Movie Recommendation System

## 📋 Overview

Hệ thống tự động chọn phim để hiển thị trên **Hero Carousel** (trang chủ) dựa trên thuật toán đánh giá chất lượng đa chiều.

### Trước đây (Manual)
- Admin phải thủ công chọn phim và đánh dấu `is_recommended = true`
- Không có tiêu chí rõ ràng
- Tốn thời gian và thiếu tính khách quan

### Hiện tại (Automated)
- Script tự động chọn top 5 phim tốt nhất
- Dựa trên công thức Quality Score khoa học
- Chạy tự động theo lịch (cron job)

---

## 🎯 Tiêu Chí Chọn Phim

### 1. Quality Score Formula

```
Quality Score = (Views × 0.4) + (Likes × 0.3) + (Quality Weight × 0.2) + (Year Recency × 0.1)
```

#### Breakdown:
- **Views (40%)**: Số lượt xem thực tế
  - Normalize: `views / 10,000`
  - Phim có 100K views = 10 điểm

- **Likes (30%)**: Tương tác người dùng
  - Net Reactions: `likes - dislikes`
  - 100 likes thuần = 100 điểm

- **Quality Weight (20%)**: Chất lượng video
  - 4K/UHD: 95-100 điểm
  - FHD/Full HD: 90 điểm
  - HD: 70 điểm
  - SD: 50 điểm
  - CAM/TS: 20-25 điểm

- **Year Recency (10%)**: Độ mới của phim
  - Formula: `(2025 - year) × -0.5 + 10`
  - Phim 2024: ~10 điểm
  - Phim 2020: ~8 điểm
  - Phim 2018: ~7 điểm

### 2. Filtering Criteria

**Minimum Requirements:**
```sql
- views >= 1000        -- Phim phải có ít nhất 1K views
- year >= 2018         -- Phim từ năm 2018 trở lại đây
- year <= 2025         -- Không quá xa tương lai
- quality NOT IN ('CAM', 'TS')  -- Loại bỏ chất lượng kém
```

### 3. Diversity & Balance

**Genre Diversity:**
- Tối đa 2 phim cùng thể loại
- Đảm bảo hero carousel không bị lặp lại một thể loại

**Content Mix:**
- 60% Movies (3 phim)
- 40% TV Series (2 phim)
- Cung cấp trải nghiệm đa dạng cho người dùng

---

## 🚀 Script Usage

### Location
```bash
scripts/maintenance/recommend-movies.sh
```

### Basic Commands

```bash
# Chạy bình thường (5 recommendations)
./recommend-movies.sh

# Dry run - test không thay đổi database
./recommend-movies.sh --dry-run

# Verbose mode - chi tiết logs
./recommend-movies.sh --verbose

# Custom số lượng recommend
./recommend-movies.sh --count 10

# Kết hợp options
./recommend-movies.sh --dry-run --verbose --count 8
```

### Help
```bash
./recommend-movies.sh --help
```

---

## ⏰ Automation Setup

### Cron Job (Recommended)

**Chạy mỗi tuần Chủ Nhật lúc 3:00 AM:**
```bash
0 3 * * 0 /path/to/scripts/maintenance/recommend-movies.sh >> /path/to/logs/recommend.log 2>&1
```

**Hoặc chạy mỗi ngày lúc 2:00 AM:**
```bash
0 2 * * * /path/to/scripts/maintenance/recommend-movies.sh >> /path/to/logs/recommend.log 2>&1
```

### Setup Instructions

1. **Mở crontab:**
```bash
crontab -e
```

2. **Thêm dòng sau:**
```bash
# Auto-recommend movies every Sunday at 3 AM
0 3 * * 0 /root/Film_Flex_Release/scripts/maintenance/recommend-movies.sh >> /root/Film_Flex_Release/logs/recommend.log 2>&1
```

3. **Lưu và thoát** (`Ctrl+O`, `Enter`, `Ctrl+X`)

4. **Verify cron job:**
```bash
crontab -l
```

---

## 📊 How It Works

### Step-by-Step Process

```
1. Backup Current Data
   └─> Create backup of all movies (safety first)

2. Clear All Recommendations
   └─> SET is_recommended = false for ALL movies

3. Calculate Quality Scores
   ├─> Filter candidates (views >= 1000, year >= 2018)
   ├─> Assign quality weights (4K=100, HD=70, etc.)
   ├─> Calculate reaction scores (likes - dislikes)
   └─> Compute final quality score

4. Apply Diversity Rules
   ├─> Limit per genre (max 2 per genre)
   └─> Balance content type (60% movies, 40% series)

5. Select Top N Movies
   └─> ORDER BY quality_score DESC LIMIT 5

6. Mark as Recommended
   └─> UPDATE movies SET is_recommended = true

7. Fallback Strategy (if needed)
   └─> If < 5 selected, add high-quality movies without strict views

8. Generate Reports
   ├─> Statistics summary
   ├─> Recommended movie list
   ├─> Quality distribution
   └─> Type distribution
```

---

## 📈 Example Quality Score Calculation

### Movie Example: "Avengers: Endgame"

**Data:**
- Views: 5,000,000
- Likes: 8,500
- Dislikes: 200
- Quality: 4K
- Year: 2019

**Calculation:**
```
Views Score    = (5,000,000 / 10,000) × 0.4 = 500 × 0.4 = 200.0
Likes Score    = (8,500 - 200) × 0.3 = 8,300 × 0.3 = 2,490.0
Quality Score  = 100 × 0.2 = 20.0
Year Score     = ((2025 - 2019) × -0.5 + 10) × 0.1 = 7 × 0.1 = 0.7

Total Quality Score = 200.0 + 2,490.0 + 20.0 + 0.7 = 2,710.7
```

### TV Series Example: "Breaking Bad"

**Data:**
- Views: 3,200,000
- Likes: 12,000
- Dislikes: 500
- Quality: FHD
- Year: 2020

**Calculation:**
```
Views Score    = (3,200,000 / 10,000) × 0.4 = 320 × 0.4 = 128.0
Likes Score    = (12,000 - 500) × 0.3 = 11,500 × 0.3 = 3,450.0
Quality Score  = 90 × 0.2 = 18.0
Year Score     = ((2025 - 2020) × -0.5 + 10) × 0.1 = 7.5 × 0.1 = 0.75

Total Quality Score = 128.0 + 3,450.0 + 18.0 + 0.75 = 3,596.75
```

**Result:** Breaking Bad (3,596.75) > Avengers (2,710.7) ✅

---

## 📁 Output Files

### Logs
```
logs/recommend-movies-YYYYMMDD_HHMMSS.log
```
Chứa toàn bộ quá trình thực thi, bao gồm:
- Thời gian bắt đầu/kết thúc
- Số lượng phim đã chọn
- Errors/warnings (nếu có)

### Reports
```
logs/recommendation_report-YYYYMMDD_HHMMSS.txt
```
Chứa:
- Danh sách phim được recommend
- Thống kê views, likes, quality
- Phân bố theo type (movie/series)
- Phân bố theo quality (HD/FHD/4K)

### Backups
```
.backup/recommendations/recommendations_backup_YYYYMMDD_HHMMSS.sql
```
Backup toàn bộ bảng movies trước khi thay đổi.

---

## 🔧 Configuration

### Environment Variables

```bash
# Database connection
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="filmflex"
export DB_USER="filmflex"
export DB_PASSWORD="filmflex2024"
```

### Script Variables (edit in script)

```bash
RECOMMEND_COUNT=5      # Số lượng phim recommend (default: 5 cho hero carousel)
MIN_VIEWS=1000         # Lượt xem tối thiểu để xét duyệt
MIN_YEAR=2018          # Năm phát hành tối thiểu
MAX_PER_GENRE=2        # Tối đa phim cùng thể loại
```

---

## 🎭 Fallback Strategy

### Khi nào fallback được kích hoạt?

Nếu số phim được chọn < `RECOMMEND_COUNT` (5), script sẽ:

1. **Giảm yêu cầu views:**
   - Bỏ qua `MIN_VIEWS=1000`
   - Chỉ cần phim có quality tốt (HD+)

2. **Sắp xếp ưu tiên:**
   ```sql
   ORDER BY view DESC, year DESC
   ```

3. **Bổ sung thiếu:**
   - Thêm phim cho đủ 5 (hoặc số cấu hình)

### Example Scenario

```
Primary Selection: Chọn được 3 phim (thiếu 2)

Fallback Triggers:
  ├─> Find top 2 movies with:
  │   ├─> quality IN ('HD', 'FHD', '4K')
  │   ├─> year >= 2018
  │   └─> NOT already recommended
  └─> Add to recommendations

Final Result: 5 movies recommended ✅
```

---

## 🧪 Testing

### Dry Run Test
```bash
./recommend-movies.sh --dry-run --verbose
```

**Expected Output:**
```
[INFO] Running in DRY RUN mode
[INFO] Verbose mode enabled
[INFO] Starting Movie Recommendation Script
[DRY RUN] Would create backup at: ...
[DRY RUN] Would execute SQL query
[INFO] Marked 0 movies as recommended (dry run)
```

### Manual Verification
```sql
-- Check current recommendations
SELECT slug, name, type, quality, year, view
FROM movies
WHERE is_recommended = true
ORDER BY view DESC;

-- Should return exactly 5 rows (or your custom count)
```

---

## 🔍 Monitoring & Troubleshooting

### Check Recommendation Count
```sql
SELECT COUNT(*) FROM movies WHERE is_recommended = true;
```
Expected: 5 (or configured count)

### View Top Candidates (without running script)
```sql
WITH quality_scores AS (
    SELECT 
        slug,
        name,
        type,
        quality,
        year,
        view,
        (
            (COALESCE(view, 0) / 10000.0) * 0.4 +
            (70) * 0.2 +  -- Assume HD quality
            ((2025 - year) * -0.5 + 10) * 0.1
        ) as estimated_score
    FROM movies
    WHERE view >= 1000
      AND year >= 2018
)
SELECT * FROM quality_scores
ORDER BY estimated_score DESC
LIMIT 10;
```

### Common Issues

**Issue 1: No movies recommended**
- **Cause:** Không có phim nào đạt `MIN_VIEWS=1000`
- **Solution:** Giảm `MIN_VIEWS` hoặc chạy với `--count` thấp hơn

**Issue 2: All same genre**
- **Cause:** Database thiếu đa dạng thể loại
- **Solution:** Tăng `MAX_PER_GENRE` hoặc import thêm phim

**Issue 3: Too many TV series**
- **Cause:** TV series có views cao hơn movies
- **Solution:** Script đã cân bằng 60/40, kiểm tra logic `balanced_selection`

---

## 🎬 Integration with Frontend

### API Endpoint
```
GET /api/movies/recommended?page=1&limit=5
```

### Frontend Usage (Home.tsx)
```typescript
const { data: recommendedMovies } = useQuery<MovieListResponse>({
  queryKey: ['/api/movies/recommended', { page: 1, limit: 5 }],
});

const featuredMovies = useMemo(() => {
  return (recommendedMovies?.items || []).slice(0, 5).map(...);
}, [recommendedMovies]);

<HeroCarousel movies={featuredMovies} />
```

### Backend Logic (storage.ts)
```typescript
async getRecommendedMovies(page: number, limit: number) {
  const data = await db.select()
    .from(movies)
    .where(eq(movies.isRecommended, true))  // ← Script sets this
    .orderBy(desc(movies.modifiedAt))
    .limit(limit)
    .offset(offset);
  
  return { data, total: count };
}
```

---

## 📊 Performance Impact

### Database Load
- **Query Complexity:** Medium (CTE with joins)
- **Execution Time:** ~2-5 seconds (depends on DB size)
- **Frequency:** Weekly (low impact)

### Recommendation
- Run during low-traffic hours (3 AM suggested)
- Monitor slow query log if DB > 100K movies

---

## 🔄 Comparison with Manual System

| Aspect | Manual (Before) | Automated (After) |
|--------|----------------|-------------------|
| **Selection Time** | 10-15 min | 3-5 sec |
| **Objectivity** | Subjective | Algorithm-based |
| **Consistency** | Varies | Always same criteria |
| **Diversity** | Random | Guaranteed (60/40 mix) |
| **Updates** | Ad-hoc | Scheduled (weekly) |
| **Quality Control** | Manual check | Auto quality score |
| **Maintenance** | High | Low (automated) |

---

## 🎯 Future Enhancements

### Planned Features
1. **Genre-based rotation:** Rotate featured genres weekly
2. **Seasonal recommendations:** Prioritize holiday/seasonal content
3. **User behavior tracking:** Recommend based on trending searches
4. **A/B testing:** Test different recommendation algorithms
5. **Manual override:** Admin can pin specific movies

### Advanced Scoring
```
Future Formula:
Quality Score = 
  (Views × 0.3) + 
  (Likes × 0.25) + 
  (Quality × 0.15) + 
  (Year × 0.1) + 
  (Completion Rate × 0.1) +     // NEW
  (Trending Score × 0.05) +     // NEW
  (User Rating × 0.05)          // NEW
```

---

## 📞 Support

### Questions?
- Check logs: `logs/recommend-movies-*.log`
- Check reports: `logs/recommendation_report-*.txt`
- Run dry-run: `./recommend-movies.sh --dry-run --verbose`

### Modify Criteria?
Edit script variables:
```bash
vim scripts/maintenance/recommend-movies.sh

# Modify these lines:
RECOMMEND_COUNT=5
MIN_VIEWS=1000
MIN_YEAR=2018
MAX_PER_GENRE=2
```

---

## ✅ Checklist for Deployment

- [ ] Script has execute permission: `chmod +x recommend-movies.sh`
- [ ] Database credentials configured (DB_HOST, DB_USER, etc.)
- [ ] Test with dry-run: `./recommend-movies.sh --dry-run`
- [ ] Backup directory created: `.backup/recommendations/`
- [ ] Log directory exists: `logs/`
- [ ] Cron job added: `crontab -l` shows entry
- [ ] Test actual run: `./recommend-movies.sh --verbose`
- [ ] Verify results: Check `is_recommended = true` count
- [ ] Monitor first week: Check logs after cron runs

---

**Author:** PhimGG Development Team  
**Last Updated:** November 9, 2025  
**Version:** 1.0.0
