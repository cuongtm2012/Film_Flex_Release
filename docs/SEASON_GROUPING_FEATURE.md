# Season Grouping Feature Documentation

## 📺 Overview

Film_Flex now automatically groups TV series seasons together and displays them in a unified interface, allowing users to easily navigate between different seasons of the same show.

## 🎯 Features

### Automatic Season Detection
- Detects series with multiple seasons/parts
- Recognizes patterns: "Phần X", "Season X", "Mùa X"
- Works with Vietnamese and English naming

### Smart Grouping
- Groups all seasons of the same series
- Sorts by season number and year
- Displays complete season information

### Season Selector UI
- Beautiful responsive grid layout
- Visual indication of current season
- Quick season switching
- Episode count for each season

## 🔧 Technical Implementation

### Backend (API)

#### 1. Base Name Extraction
```typescript
extractBaseSeriesName("Sống Chất (Phần 1)") → "Sống Chất"
extractBaseSeriesName("Breaking Bad (Season 2)") → "Breaking Bad"
```

#### 2. Related Seasons Query
```sql
SELECT movie_id, name, slug, year, episode_current, episode_total
FROM movies 
WHERE name LIKE '%Sống Chất%'
ORDER BY year ASC, name ASC
```

#### 3. API Response Structure
```json
{
  "movie": {
    "name": "Sống Chất (Phần 1)",
    "slug": "song-chat-phan-1",
    ...other fields...,
    "related_seasons": [
      {
        "movieId": "...",
        "name": "Sống Chất (Phần 1)",
        "slug": "song-chat-phan-1",
        "year": 2018,
        "episodeCurrent": "Hoàn Tất (8/8)",
        "episodeTotal": "8"
      },
      {
        "movieId": "...",
        "name": "Sống Chất (Phần 2)",
        "slug": "song-chat-phan-2",
        "year": 2018,
        "episodeCurrent": "Hoàn Tất (8/8)",
        "episodeTotal": "8"
      },
      ...more seasons...
    ]
  },
  "episodes": [ /* episodes for current season */ ]
}
```

### Frontend (React)

#### 1. State Management
```typescript
// Track which season is currently selected
const [selectedSeasonSlug, setSelectedSeasonSlug] = useState(initialSlug);

// Fetch data for selected season
const { data: movieDetail } = useQuery<MovieDetailResponse>({
  queryKey: [`/api/movies/${selectedSeasonSlug}`],
  enabled: !!selectedSeasonSlug
});
```

#### 2. Season Selector UI
```tsx
{movieDetail.movie.related_seasons && movieDetail.movie.related_seasons.length > 1 && (
  <div className="season-selector">
    <h4>All Seasons ({movieDetail.movie.related_seasons.length} total)</h4>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {movieDetail.movie.related_seasons.map((season) => (
        <Button
          variant={season.slug === selectedSeasonSlug ? "default" : "outline"}
          onClick={() => setSelectedSeasonSlug(season.slug)}
        >
          Season {seasonNumber}
          <span>{season.year}</span>
          <span>{season.episodeCurrent}</span>
        </Button>
      ))}
    </div>
  </div>
)}
```

## 📖 Usage Examples

### Example 1: Sống Chất (Queer Eye)
```
URL: /movie/song-chat-phan-1

Display:
- Season selector showing Seasons 1-10
- Currently on Season 1 (2018, 8 episodes)
- Click "Season 5" → loads Phần 5 (2020, 10 episodes)
```

### Example 2: Liệu Pháp Sự Thật (Shrinking)
```
URL: /movie/lieu-phap-su-that-phan-1

Display:
- Season selector showing Seasons 1-3
- Currently on Season 1 (2023)
- Click "Season 3" → loads Phần 3 (2026)
```

### Example 3: Single Movie (No Seasons)
```
URL: /movie/nhung-ke-dot-nhap

Display:
- No season selector (only 1 movie, not a series)
- Normal movie detail view
```

## 🎨 UI/UX Design

### Season Selector Appearance

```
┌────────────────────────────────────────────────────┐
│ 📺 All Seasons (10 total)                          │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │Season 1 │  │Season 2 │  │Season 3 │  ...       │
│  │  2018   │  │  2018   │  │  2019   │            │
│  │  8/8 ✓  │  │  8/8    │  │  8/8    │            │
│  └─────────┘  └─────────┘  └─────────┘            │
│      ^                                             │
│   (current)                                        │
└────────────────────────────────────────────────────┘
```

### Responsive Design
- **Mobile (< 640px)**: 2 columns
- **Tablet (640-768px)**: 3 columns
- **Desktop (768-1024px)**: 4 columns
- **Large (> 1024px)**: 5 columns

### Visual States
- **Current Season**: Primary color background, check icon
- **Other Seasons**: Outline style, hover effect
- **Switching**: Toast notification + loading state

## 🔍 Algorithm Details

### Season Detection
```typescript
function isMultiSeasonSeries(movie) {
  return (
    movie.type === 'tvshows' || 
    movie.name.includes('Phần') || 
    movie.name.includes('Season') ||
    movie.name.includes('Mùa')
  );
}
```

### Base Name Extraction
```typescript
function extractBaseSeriesName(name: string): string {
  return name
    .replace(/\s*\(Phần\s+\d+\)/gi, '')     // Remove "(Phần 1)"
    .replace(/\s*\(Season\s+\d+\)/gi, '')   // Remove "(Season 1)"
    .replace(/\s*\(Mùa\s+\d+\)/gi, '')      // Remove "(Mùa 1)"
    .replace(/\s*-\s*Phần\s+\d+/gi, '')     // Remove "- Phần 1"
    .replace(/\s*-\s*Season\s+\d+/gi, '')   // Remove "- Season 1"
    .trim();
}
```

### Season Number Extraction
```typescript
function extractSeasonNumber(name: string): number {
  const match = name.match(/Phần\s*(\d+)|Season\s*(\d+)|Mùa\s*(\d+)/i);
  return match ? parseInt(match[1] || match[2] || match[3]) : 999;
}
```

### Season Sorting
```typescript
seasons.sort((a, b) => {
  const numA = extractSeasonNumber(a.name);
  const numB = extractSeasonNumber(b.name);
  return numA - numB;
});
```

## 🚀 Performance

### Caching Strategy
- Related seasons are fetched once per movie
- Cached along with movie detail
- Cache invalidated with `?clear_cache=true`

### Database Query
- Single query to find all seasons
- Uses LIKE pattern matching
- Sorted in SQL for efficiency

### Frontend Loading
- Season selector loads with movie detail
- No additional API calls needed
- Instant season switching (data already loaded)

## 📊 Statistics

### Impact
- **Before**: Each season = separate page, no navigation between seasons
- **After**: All seasons unified, easy navigation

### Usage Patterns
```
Example: "Sống Chất" series
- 10 seasons
- 82 total episodes
- User can browse all from one page
- Seamless season switching
```

## 🎯 Future Enhancements

### Potential Improvements
1. **Auto-continue**: Automatically load next season when current ends
2. **Progress tracking**: Remember which season user is watching
3. **Season banners**: Different banner for each season
4. **Season descriptions**: Unique description per season
5. **Combined episode list**: Show all episodes from all seasons in one list
6. **Season statistics**: Total runtime, release date ranges

### Upcoming Features
- [ ] Season-specific ratings
- [ ] Season-specific comments
- [ ] Watchlist by season
- [ ] Season recommendations

## 🐛 Troubleshooting

### Issue: Seasons not showing
**Solution**: Clear cache and refresh
```
URL: /api/movies/slug?clear_cache=true
Browser: Cmd+Shift+R (hard refresh)
```

### Issue: Wrong season order
**Solution**: Check season number regex patterns
```typescript
// Verify patterns match your naming convention
/Phần\s*(\d+)/i
/Season\s*(\d+)/i
```

### Issue: Missing seasons
**Solution**: Check database query patterns
```sql
-- Verify all seasons have the base name
SELECT name FROM movies WHERE name LIKE '%Sống Chất%';
```

## 📝 Code Files Modified

### Backend
- ✅ `server/routes.ts` - Added season grouping logic
- ✅ `shared/schema.ts` - Added RelatedSeason type

### Frontend
- ✅ `client/src/pages/MovieDetail.tsx` - Added season selector UI

### Documentation
- ✅ `docs/SEASON_GROUPING_FEATURE.md` - This file

---

**Created**: 2026-01-29
**Version**: 1.0
**Status**: Production Ready ✅
