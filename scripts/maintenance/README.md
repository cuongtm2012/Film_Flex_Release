# PhimGG Maintenance Guide

This document provides instructions for performing maintenance tasks for the PhimGG application.

## Table of Contents

- [User Management](#user-management)
- [Database Maintenance](#database-maintenance)
- [Server Maintenance](#server-maintenance)
- [Security](#security)
- [Regular Maintenance Checklist](#regular-maintenance-checklist)

## User Management

### Resetting Admin User

If you need to reset the admin user credentials:

```bash
# Using the deployment script
./deploy.sh --reset-admin

# Or directly
npx tsx scripts/maintenance/reset_admin.ts
```

This will:
1. Set the admin user's password to a default value
2. Ensure the admin user has the correct role and permissions
3. Output the new credentials

### Managing User Roles

PhimGG supports multiple user roles:
- `admin`: Full system access
- `moderator`: Content management but no system settings
- `premium`: Premium user features
- `user`: Standard user

To change a user's role (must be done from the database):

```bash
# Connect to the database
PGPASSWORD=filmflex2024 psql -h localhost -U filmflex -d filmflex

# Update the user's role
UPDATE users SET role = 'admin' WHERE username = 'username';
```

## Database Maintenance

### Optimizing the Database

Periodically optimize the database for better performance:

```bash
# Using the deployment script
./deploy.sh --db-optimize
```

This runs:
1. `VACUUM ANALYZE` to reclaim space and update statistics
2. `REINDEX DATABASE` to rebuild indexes

### Backup and Restore

Regular backups are essential:

```bash
# Create a manual backup
./deploy.sh --backup

# Restore from backup
./deploy.sh --restore=/var/backups/filmflex/filmflex_20250505-120000.sql.gz
```

Automatic backups are created daily at 2 AM in `/var/backups/filmflex/`.

## Server Maintenance

### Checking Server Status

```bash
# Get comprehensive status report
./deploy.sh --status
```

This shows:
- System resources (memory, disk)
- Application status
- Database status
- Recent logs

### Log Management

Periodically check and rotate logs:

```bash
# Check logs
./deploy.sh --logs --all

# Clean up old logs (if not using logrotate)
find /var/log/filmflex -name "*.log.*" -mtime +30 -delete
```

## Security

### SSL Certificate Management

SSL certificates from Let's Encrypt auto-renew, but you should check their status:

```bash
# Check certificate status
certbot certificates

# Test renewal
certbot renew --dry-run
```

### Security Updates

Regularly update the server:

```bash
# Update system packages
apt update && apt upgrade -y

# Update Node.js dependencies (after testing!)
cd /var/www/filmflex
npm update --save
```

## Regular Maintenance Checklist

Perform these maintenance tasks regularly:

### Daily
- Check application status with `./deploy.sh --status`
- Verify successful backups
- Review error logs with `./deploy.sh --logs --error`

### Weekly
- Run database optimization with `./deploy.sh --db-optimize`
- Check disk space with `df -h`
- Verify SSL certificates are valid

### Monthly
- Update system packages
- Test backup restoration
- Clean up old backup files and logs
- Review user accounts for suspicious activity

---

# Movie Categorization Automation System

## 🎯 Quick Start

### **Test First (Recommended)**
```bash
# See what would be categorized (no changes made)
cd ~/Desktop/1.PROJECT/Film_Flex_Release
./scripts/maintenance/test-categorization.sh
```

### **Run Categorization**

**Local Development:**
```bash
# Dry run (safe test)
./scripts/maintenance/categorize-movies.sh --dry-run

# Real run
./scripts/maintenance/categorize-movies.sh
```

**Production Server:**
```bash
# Dry run
./scripts/maintenance/categorize-movies-docker.sh --dry-run

# Real run
./scripts/maintenance/categorize-movies-docker.sh
```

### **Setup Cronjob (Auto-run every Monday 6 AM)**
```bash
# Edit crontab
crontab -e

# Add this line:
0 6 * * 1 /root/Film_Flex_Release/scripts/maintenance/categorize-movies-docker.sh >> /root/Film_Flex_Release/logs/categorize-cron.log 2>&1
```

## 📋 Files Created

| File | Purpose |
|------|---------|
| `categorize-movies.sh` | Main categorization script (direct DB access) |
| `categorize-movies-docker.sh` | Docker wrapper for production |
| `test-categorization.sh` | Test queries without making changes |
| `CATEGORIZATION_GUIDE.md` | Detailed documentation |

## 🎬 Categorization Logic

### **Trending** (50 movies)
- **Criteria:** Released in last year + High views
- **Formula:** `(views × 0.7) + (reactions × 10 × 0.3)`
- **Purpose:** Show hot movies that are currently popular

### **Latest** (50 movies)
- **Criteria:** Newest by release year + recently updated
- **Formula:** `(year × 1000) - (days_since_modified)`
- **Purpose:** Show newest releases and fresh updates

### **Top Rated** (50 movies)
- **Criteria:** High ratings (likes) + High views (>100)
- **Formula:** `(likes - dislikes) × 0.6 + (views / 100) × 0.4`
- **Purpose:** Show quality content with positive feedback

### **Popular TV** (50 movies)
- **Criteria:** TV series type + High views + Good ratings
- **Formula:** `(views × 0.5) + (likes - dislikes) × 0.5`
- **Purpose:** Show popular TV series and shows

### **Anime** (No Script - Backend Fallback)
- **Criteria:** Automatic detection by backend API
- **Logic:** 
  - `type = 'hoathinh'` OR
  - `categories` containing 'anime' or 'hoạt hình'
- **Sort:** Newest releases first (year DESC)
- **Purpose:** Show latest anime content
- **Note:** No script categorization needed, handled automatically by API

## 📊 Output Files

### **Logs**
- `logs/categorize-movies-TIMESTAMP.log` - Execution log
- `logs/categorization_report-TIMESTAMP.txt` - Detailed report

### **Cache** (for fast API responses)
- `.cache/sections/trending_now.json`
- `.cache/sections/latest_movies.json`
- `.cache/sections/top_rated.json`
- `.cache/sections/popular_tv.json`
- ⚠️ **Note:** No anime cache (uses backend fallback)

### **Backups**
- `.backup/sections/sections_backup-TIMESTAMP.sql`

## 🔍 Monitoring

```bash
# Check latest log
ls -lt logs/categorize-movies-*.log | head -1 | xargs cat

# Check section distribution
docker exec -it filmflex-postgres psql -U filmflex -d filmflex -c "
SELECT section, COUNT(*) FROM movies GROUP BY section ORDER BY count DESC;"

# View cache (4 sections only)
cat .cache/sections/trending_now.json | jq '.[0:5]'
```

## ⚙️ Configuration

Edit limits in `categorize-movies.sh`:
```bash
TRENDING_LIMIT=50      # Max trending movies
LATEST_LIMIT=50        # Max latest movies
TOP_RATED_LIMIT=50     # Max top rated movies
POPULAR_TV_LIMIT=50    # Max popular TV series
# Note: No ANIME_LIMIT (uses backend fallback)
```

## 🚀 Performance Tips

1. **Run during off-peak hours** (2-6 AM recommended)
2. **Use cache files** in API endpoints for fast responses
3. **Monitor database indexes** - ensure proper indexing on:
   - `movies(section)`
   - `movies(year)`
   - `movies(view)`
   - `movie_reactions(movie_slug)`
4. **Anime performance** - Backend fallback is efficient with proper indexes on `type` and `categories`

## 🆘 Troubleshooting

### Script won't run
```bash
chmod +x scripts/maintenance/*.sh
```

### Database connection fails
```bash
# Check container
docker ps | grep postgres

# Test connection
docker exec -it filmflex-postgres psql -U filmflex -d filmflex -c "SELECT 1;"
```

### No movies categorized
```bash
# Run with verbose mode
./scripts/maintenance/categorize-movies.sh --verbose

# Check if actually in dry-run mode
grep "DRY_RUN" scripts/maintenance/categorize-movies.sh
```

### Anime not showing
```bash
# Check backend fallback is working
curl "https://phimgg.com/api/movies/section/anime?page=1&limit=10"

# Check anime count in database
docker exec -it filmflex-postgres psql -U filmflex -d filmflex -c "
SELECT COUNT(*) FROM movies WHERE type='hoathinh' OR categories::text ILIKE '%anime%';"
```

## 📚 Full Documentation

See `CATEGORIZATION_GUIDE.md` for:
- Detailed setup instructions
- Cronjob configuration examples
- Performance optimization tips
- Customization guide
- API integration examples

## 🔗 Integration with API

The script automatically creates cache files for 4 sections. Use them in your API:

```typescript
// In your homepage API endpoint
import fs from 'fs';

app.get('/api/homepage', async (req, res) => {
  const sections = {
    trending: JSON.parse(fs.readFileSync('.cache/sections/trending_now.json', 'utf8')),
    latest: JSON.parse(fs.readFileSync('.cache/sections/latest_movies.json', 'utf8')),
    topRated: JSON.parse(fs.readFileSync('.cache/sections/top_rated.json', 'utf8')),
    popularTV: JSON.parse(fs.readFileSync('.cache/sections/popular_tv.json', 'utf8')),
    // Anime uses backend query (no cache file)
    anime: await storage.getMoviesBySection('anime', 1, 50)
  };
  
  res.json(sections);
});
```

## ℹ️ Why Anime Uses Backend Fallback

**Benefits:**
- ✅ **Flexibility:** Automatically detects anime by type/category without script updates
- ✅ **Simplicity:** No need to maintain anime categorization logic in script
- ✅ **Performance:** Backend query is fast with proper indexes
- ✅ **Always Current:** No dependency on script execution schedule
- ✅ **Less Maintenance:** One less section to manage in script

**Trade-offs:**
- ⚠️ Slightly more complex query (mitigated by indexes)
- ⚠️ No pre-computed cache (acceptable for anime section)

## 📧 Support

For issues:
1. Check logs in `logs/` directory
2. Review `CATEGORIZATION_GUIDE.md`
3. Run test script: `./scripts/maintenance/test-categorization.sh`
4. Contact: admin@phimgg.com

---

**Version:** 2.0  
**Last Updated:** 2025-11-03  
**Sections Managed:** 4 (Trending, Latest, Top Rated, Popular TV)  
**Backend Fallback:** Anime  
**Author:** PhimGG Development Team