# Movie Categorization Automation Guide

## 📋 Overview

This guide explains how to set up automatic movie categorization for homepage sections using cronjob scheduling.

## 🎯 What It Does

The categorization script automatically organizes movies into sections based on:

- **Trending** → Movies from last year with high views/engagement
- **Latest** → Newest movies by release year + recent updates
- **Top Rated** → High ratings (likes) + high view count
- **Popular TV** → TV series with high views and ratings
- **Anime** → Anime/hoathinh type, newest releases first

## 📂 Files Structure

```
scripts/maintenance/
├── categorize-movies.sh           # Main categorization script
├── categorize-movies-docker.sh    # Docker wrapper (for production)
└── CATEGORIZATION_GUIDE.md        # This guide

logs/
├── categorize-movies-*.log        # Execution logs
└── categorization_report-*.txt    # Detailed reports

.cache/sections/
├── trending_now.json              # Cached trending movies
├── latest_movies.json             # Cached latest movies
├── top_rated.json                 # Cached top rated movies
├── popular_tv.json                # Cached popular TV series
└── anime.json                     # Cached anime

.backup/sections/
└── sections_backup_*.sql          # Database backups before changes
```

## 🚀 Usage

### **Local Development (Direct Database Access)**

```bash
# Normal run
./scripts/maintenance/categorize-movies.sh

# Dry run (test without making changes)
./scripts/maintenance/categorize-movies.sh --dry-run

# Verbose output
./scripts/maintenance/categorize-movies.sh --verbose

# Show help
./scripts/maintenance/categorize-movies.sh --help
```

### **Production (Docker Container)**

```bash
# Normal run
./scripts/maintenance/categorize-movies-docker.sh

# Dry run
./scripts/maintenance/categorize-movies-docker.sh --dry-run

# Verbose output
./scripts/maintenance/categorize-movies-docker.sh --verbose
```

## ⚙️ Configuration

### **Environment Variables**

The script can be configured via environment variables:

```bash
# Database connection
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=filmflex
export DB_USER=filmflex
export DB_PASSWORD=filmflex2024

# Docker container name (for Docker wrapper)
export DOCKER_CONTAINER=filmflex-postgres

# Run the script
./scripts/maintenance/categorize-movies.sh
```

### **Script Parameters**

Edit limits in `categorize-movies.sh`:

```bash
# Section configuration
TRENDING_LIMIT=50      # Max trending movies
LATEST_LIMIT=50        # Max latest movies
TOP_RATED_LIMIT=50     # Max top rated movies
POPULAR_TV_LIMIT=50    # Max popular TV series
ANIME_LIMIT=50         # Max anime
```

## 📅 Cronjob Setup

### **Option 1: Local Server (Direct Database)**

```bash
# Edit crontab
crontab -e

# Add this line to run every Monday at 6 AM
0 6 * * 1 /path/to/Film_Flex_Release/scripts/maintenance/categorize-movies.sh >> /path/to/Film_Flex_Release/logs/categorize-cron.log 2>&1
```

### **Option 2: Production Server (Docker)**

```bash
# Edit crontab
crontab -e

# Add this line to run every Monday at 6 AM
0 6 * * 1 /root/Film_Flex_Release/scripts/maintenance/categorize-movies-docker.sh >> /root/Film_Flex_Release/logs/categorize-cron.log 2>&1
```

### **Cronjob Schedule Examples**

```bash
# Every Monday at 6 AM
0 6 * * 1 /path/to/script.sh

# Every day at 3 AM
0 3 * * * /path/to/script.sh

# Every Sunday at midnight
0 0 * * 0 /path/to/script.sh

# Every 6 hours
0 */6 * * * /path/to/script.sh

# First day of month at 2 AM
0 2 1 * * /path/to/script.sh
```

### **Verify Cronjob**

```bash
# List current cronjobs
crontab -l

# Check cronjob logs
tail -f /path/to/logs/categorize-cron.log
```

## 🔍 Monitoring

### **Check Execution Logs**

```bash
# View latest log
ls -lt logs/categorize-movies-*.log | head -1 | xargs cat

# View latest report
ls -lt logs/categorization_report-*.txt | head -1 | xargs cat

# Follow live execution (if running)
tail -f logs/categorize-movies-*.log
```

### **Check Section Distribution**

```bash
# Connect to database
docker exec -it filmflex-postgres psql -U filmflex -d filmflex

# Check section counts
SELECT 
    COALESCE(section, 'uncategorized') as section,
    COUNT(*) as count
FROM movies
GROUP BY section
ORDER BY count DESC;

# Check recently categorized movies
SELECT slug, name, section, year, view, modified_at
FROM movies
WHERE modified_at >= NOW() - INTERVAL '1 day'
ORDER BY modified_at DESC
LIMIT 20;
```

### **Check Cache Files**

```bash
# List cache files
ls -lh .cache/sections/

# View trending movies cache
cat .cache/sections/trending_now.json | jq '.'

# Count movies in each cache
for file in .cache/sections/*.json; do
    echo "$(basename $file): $(cat $file | jq 'length') movies"
done
```

## 🛠️ Troubleshooting

### **Script Fails to Connect to Database**

**Problem:** Cannot connect to PostgreSQL

**Solution:**
```bash
# Check database is running
docker ps | grep postgres

# Check database credentials
docker exec -it filmflex-postgres psql -U filmflex -d filmflex -c "SELECT 1;"

# Verify environment variables
echo $DB_HOST $DB_PORT $DB_USER $DB_NAME
```

### **Script Runs But No Changes**

**Problem:** Script completes but movies not categorized

**Solution:**
```bash
# Run with verbose mode
./scripts/maintenance/categorize-movies.sh --verbose

# Check if running in dry-run mode accidentally
grep "DRY_RUN=true" scripts/maintenance/categorize-movies.sh

# Check SQL execution logs
grep "Executing SQL" logs/categorize-movies-*.log
```

### **Permission Denied**

**Problem:** `bash: permission denied`

**Solution:**
```bash
# Make script executable
chmod +x scripts/maintenance/categorize-movies.sh
chmod +x scripts/maintenance/categorize-movies-docker.sh
```

### **Cronjob Not Running**

**Problem:** Cronjob scheduled but doesn't execute

**Solution:**
```bash
# Check cron service is running
sudo systemctl status cron

# Check cron logs
sudo tail -f /var/log/syslog | grep CRON

# Use absolute paths in crontab
0 6 * * 1 /usr/bin/bash /full/path/to/script.sh

# Ensure script has proper shebang
head -1 scripts/maintenance/categorize-movies.sh
# Should output: #!/bin/bash
```

## 📊 Performance Optimization

### **Reduce Database Load**

1. **Adjust Limits:** Reduce `TRENDING_LIMIT`, `LATEST_LIMIT` etc. if you have limited resources

2. **Schedule During Off-Peak:** Run cronjob during low-traffic hours (2-6 AM)

3. **Use Indexes:** Ensure database has proper indexes:
```sql
CREATE INDEX IF NOT EXISTS idx_movies_section ON movies(section);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);
CREATE INDEX IF NOT EXISTS idx_movies_view ON movies(view);
CREATE INDEX IF NOT EXISTS idx_movies_type ON movies(type);
CREATE INDEX IF NOT EXISTS idx_movie_reactions_slug ON movie_reactions(movie_slug);
```

### **Cache Strategy**

The script automatically creates JSON cache files for each section in `.cache/sections/`. 

**Benefits:**
- Fast API responses (read from file instead of database)
- Reduced database load
- Pre-computed results

**Usage in API:**
```typescript
// In your API endpoint
const fs = require('fs');
const cacheFile = '.cache/sections/trending_now.json';

if (fs.existsSync(cacheFile)) {
  const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  return res.json(cached);
}
```

### **Backup Strategy**

Script automatically creates backups before making changes:
```bash
# View backups
ls -lht .backup/sections/

# Restore from backup if needed
docker exec -i filmflex-postgres psql -U filmflex -d filmflex < .backup/sections/sections_backup_20251103_060000.sql
```

## 🔧 Customization

### **Add New Section**

1. Add function in `categorize-movies.sh`:
```bash
categorize_custom_section() {
    log_info "Categorizing CUSTOM SECTION..."
    
    local sql="
    UPDATE movies SET section = NULL WHERE section = 'custom_section';
    
    WITH custom_movies AS (
        SELECT id FROM movies
        WHERE your_criteria_here
        LIMIT 50
    )
    UPDATE movies m
    SET section = 'custom_section'
    FROM custom_movies cm
    WHERE m.id = cm.id;
    "
    
    execute_sql "${sql}"
    log_success "Categorized custom section"
}
```

2. Call it in `main()`:
```bash
main() {
    # ...existing code...
    categorize_trending
    categorize_latest
    categorize_custom_section  # Add here
    # ...existing code...
}
```

### **Change Scoring Formula**

Edit the scoring formula in SQL queries:

```sql
-- Example: Change trending score to prioritize reactions more
(COALESCE(m.view, 0) * 0.5 + COUNT(DISTINCT mr.id) * 10 * 0.5) as trending_score
-- Before: view 70%, reactions 30%
-- After:  view 50%, reactions 50%
```

## 📧 Notifications

### **Email on Completion**

Add email notification at end of script:

```bash
# At end of main() function
if command -v mail &> /dev/null; then
    echo "Categorization completed. Check logs at ${LOG_FILE}" | \
        mail -s "Movie Categorization Report - $(date)" admin@phimgg.com
fi
```

### **Slack Notification**

```bash
# At end of main() function
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    curl -X POST "${SLACK_WEBHOOK_URL}" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"Movie categorization completed! Check logs for details.\"}"
fi
```

## 📝 Best Practices

1. ✅ **Always test with `--dry-run` first** before running in production
2. ✅ **Monitor logs** after setup to ensure proper execution
3. ✅ **Keep backups** for at least 30 days
4. ✅ **Schedule during off-peak hours** to minimize impact
5. ✅ **Use cache files** in API endpoints for better performance
6. ✅ **Review categorization quality** periodically and adjust criteria
7. ✅ **Set up monitoring** alerts for script failures

## 🔗 Related Documentation

- [Database Schema](../DATABASE_SCHEMA.md)
- [Docker Deployment](../../docs/DOCKER_DEPLOYMENT.md)
- [API Documentation](../../docs/API_DOCUMENTATION.md)
- [Cron Setup Guide](../../docs/DOCKER_CRON_SETUP_GUIDE.md)

## 📧 Support

For issues or questions:
- Check logs in `logs/` directory
- Review troubleshooting section above
- Contact: admin@phimgg.com

---

**Last Updated:** 2025-11-03  
**Version:** 1.0  
**Author:** PhimGG Development Team