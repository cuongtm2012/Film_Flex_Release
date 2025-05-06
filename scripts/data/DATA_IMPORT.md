# FilmFlex Data Import Guide

This document provides information about the FilmFlex data import process, explaining how to set up, run, and manage scheduled imports in a production environment.

## Overview

FilmFlex automatically fetches movie data from an external API and imports it into the local database. The import process can be:

1. Run manually at any time
2. Scheduled to run automatically at specific times via cron jobs

## Import Scripts

The data import functionality consists of:

- `import-movies.js`: The main Node.js script that fetches and processes movie data
- `import-movies.sh`: A shell script wrapper for running the import in a production environment
- `setup-cron.sh`: Script to set up scheduled imports via cron

## Setting Up Scheduled Imports

To set up scheduled imports that run at 6AM and 6PM every day:

```bash
cd /var/www/filmflex
sudo bash scripts/data/setup-cron.sh
```

This will:
1. Make the import scripts executable
2. Create a cron job entry in `/etc/cron.d/filmflex-data-import`
3. Optionally run an initial import immediately

## Running Manual Imports

To run a data import manually at any time:

```bash
cd /var/www/filmflex
sudo bash scripts/data/import-movies.sh
```

## Import Logs

Logs from the import process are stored in:

```
/var/log/filmflex/data-import.log
```

You can view these logs to monitor the import process and troubleshoot any issues:

```bash
tail -f /var/log/filmflex/data-import.log
```

## Customizing the Import Process

### Changing Import Frequency

To modify when the imports run, edit the cron job file:

```bash
sudo nano /etc/cron.d/filmflex-data-import
```

The default schedule is:
- `0 6 * * *` - Run at 6:00 AM every day
- `0 18 * * *` - Run at 6:00 PM every day

You can modify these cron expressions to change the schedule. For example, to run every hour:

```
0 * * * * root /var/www/filmflex/scripts/data/import-movies.sh > /dev/null 2>&1
```

### Modifying Import Behavior

To adjust how the import process works (e.g., number of pages to fetch, API endpoints):

1. Edit the configuration variables in `import-movies.js`:

```bash
sudo nano /var/www/filmflex/scripts/data/import-movies.js
```

Look for these variables near the top of the file:

```javascript
const API_BASE_URL = 'https://ophim1.com';
const MOVIE_LIST_ENDPOINT = '/danh-sach/phim-moi-cap-nhat';
const MOVIE_PAGE_SIZE = 50;
const MAX_PAGES = 5; // Adjust as needed
```

2. Save your changes and run a manual import to test.

## Troubleshooting

### Import Failures

If the import fails, check:

1. API availability: Ensure the external API is accessible
   ```bash
   curl https://ophim1.com/danh-sach/phim-moi-cap-nhat
   ```

2. Database connectivity: Verify the database connection is working
   ```bash
   sudo -u postgres psql -c "SELECT 1;"
   ```

3. Log file: Check for specific errors in the log
   ```bash
   tail -n 100 /var/log/filmflex/data-import.log
   ```

### Cron Job Issues

If scheduled imports are not running:

1. Check cron service is running:
   ```bash
   systemctl status cron
   ```

2. Verify cron job file permissions:
   ```bash
   ls -la /etc/cron.d/filmflex-data-import
   ```
   (Should be 644 and owned by root:root)

3. Check system logs for cron errors:
   ```bash
   grep CRON /var/log/syslog
   ```

## Advanced

### Email Notifications

To receive email notifications when imports fail, install an MTA like postfix and modify the MAILTO line in the cron job:

```
MAILTO=your.email@example.com
```

### Backup Before Import

To back up the database before each import, modify `import-movies.sh` to add a database backup step:

```bash
# Add this before running the import
pg_dump -h localhost -U filmflex -d filmflex > "/backup/filmflex_$(date +%Y%m%d_%H%M%S).sql"
```