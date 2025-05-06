# FilmFlex Data Management Guide

This document provides instructions for importing and managing data in the FilmFlex application.

## Table of Contents

- [Movie Import Process](#movie-import-process)
- [Import Options](#import-options)
- [Monitoring Import Progress](#monitoring-import-progress)
- [Data Management](#data-management)
- [Troubleshooting](#troubleshooting)

## Movie Import Process

FilmFlex uses an external API to import movie data. The import process is handled by the `import.ts` script in this directory.

### Quick Start

The simplest way to start the import process is using the deployment script:

```bash
./deploy.sh --import
```

This will:
1. Prompt you for start and end page numbers
2. Start a background process in a screen session
3. Log output to `/var/log/filmflex-import.log`

### Manual Import

For more control, you can run the import script directly:

```bash
# Navigate to the application directory
cd /var/www/filmflex

# Run import for pages 1-20
npx tsx scripts/data/import.ts 1 20

# Resume from last saved position
npx tsx scripts/data/import.ts --resume
```

## Import Options

The import script supports several options:

- `start_page`: The first page to import (default: 1)
- `end_page`: The last page to import (default: 2252, which is all available movies)
- `--resume`: Resume from the last saved position

## Monitoring Import Progress

The import process saves progress information in `import_progress.json`. This allows you to:

- Resume imports if they're interrupted
- Track which pages have been successfully imported

To check import progress:

```bash
# View the progress file
cat scripts/data/import_progress.json

# Follow the import log in real-time
tail -f /var/log/filmflex-import.log
```

## Data Management

### Clearing Movie Data

If you need to clear all movie data (for example, to start fresh):

```bash
# Using the deployment script
./deploy.sh --clear-data

# Or directly
npx tsx scripts/data/clear_movie_data.ts
```

**Warning**: This is a destructive operation and will delete all movie data from the database.

### Verifying Imported Data

To check how many movies have been imported:

```bash
# Using the deployment script
./deploy.sh --db-status

# Or directly with SQL
PGPASSWORD=filmflex2024 psql -h localhost -U filmflex -d filmflex -c "SELECT COUNT(*) FROM movies;"
```

## Troubleshooting

### Import Process Gets Stuck

If the import process appears to get stuck:

1. Check if it's still running:
   ```bash
   ps aux | grep import
   ```

2. If needed, kill and restart:
   ```bash
   kill <process_id>
   ./deploy.sh --import
   ```

3. You can also try resuming from where it left off:
   ```bash
   npx tsx scripts/data/import.ts --resume
   ```

### API Rate Limiting

If you encounter API rate limiting:

1. The import script has built-in retry logic and will pause when rate limited
2. You can modify the delay by editing `scripts/data/import.ts` and changing the `DELAY_BETWEEN_REQUESTS` value

### Database Connection Issues

If the import fails due to database connection issues:

1. Verify database connection:
   ```bash
   ./deploy.sh --db-status
   ```

2. Fix database configuration if needed:
   ```bash
   ./deploy.sh --db-only
   ```