# Quick Commands to Enable Automatic Sections Update

## 🚀 Deploy Cron Job to Server

```bash
# SSH to server
ssh root@38.54.14.154

# Copy updated cron config
sudo cp ~/Film_Flex_Release/scripts/deployment/filmflex-cron.conf /etc/cron.d/filmflex-imports

# Set proper permissions
sudo chmod 644 /etc/cron.d/filmflex-imports

# Reload cron service
sudo systemctl reload cron

# Verify cron job added
sudo cat /etc/cron.d/filmflex-imports | grep categorize
```

## 🧪 Test Sections Update Manually

```bash
# SSH to server
ssh root@38.54.14.154

# Run categorization script
cd ~/Film_Flex_Release/scripts/maintenance
./categorize-movies-docker.sh

# Check logs
tail -50 ~/Film_Flex_Release/logs/categorize-movies-*.log
```

## ✅ Verify Sections in Database

```bash
# Check section distribution
ssh root@38.54.14.154

psql -U filmflex -d filmflex -c "
SELECT 
    COALESCE(section, 'uncategorized') as section,
    COUNT(*) as count
FROM movies
GROUP BY section
ORDER BY count DESC;
"
```

## 📊 Expected Output

```
section          | count
-----------------+-------
uncategorized    | XXXX
trending_now     | 50
latest_movies    | 50
top_rated        | 50
popular_tv       | 50
```

## 🔍 Monitor Cron Execution

```bash
# Check cron logs
sudo tail -f /var/log/syslog | grep categorize

# Check script logs
tail -f /var/log/filmflex/categorize.log
```

## 📅 Schedule

**Sections Update**: Every Monday at 6:00 AM
- Updates Trending, Latest, Top Rated, Popular TV
- Runs after weekend imports complete
- Takes ~1-2 minutes to complete
