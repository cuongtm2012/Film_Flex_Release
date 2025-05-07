# FilmFlex Data Import Scripts

This directory contains scripts for importing movie data from the phimapi.com API into the FilmFlex database.

## Script Overview

### Import Scripts

| Script | Description |
|--------|-------------|
| `import-movies.sh` | Base import script for daily updates of new movies |
| `import-movies-sql.cjs` | Core Node.js script that handles API requests and database operations |
| `import-all-movies-node.sh` | Complete database import script using Node.js with batch processing |
| `import-all-movies-resumable.sh` | Enhanced import script with robust resume functionality |
| `import-range.sh` | Targeted import of a specific range of pages |

### Import Options

Each script provides different options for importing movie data:

- **Daily Updates**: Import only the latest movies (1-5 pages)
- **Deep Scan**: Import more pages to catch missed movies (default on Saturdays)
- **Full Import**: Import the entire movie catalog (22,557+ movies)
- **Range Import**: Import specific pages of movies
- **Resumable Import**: Import with the ability to pause and resume

## Usage Instructions

### Basic Import (Latest Movies)

For daily updates to import only the newest movies:

```bash
# Run the standard import script
cd /var/www/filmflex
bash scripts/data/import-movies.sh

# For a deeper scan that checks more pages
bash scripts/data/import-movies.sh --deep-scan
```

### Complete Database Import

To import the entire movie catalog (22,557+ movies across 2,256 pages):

```bash
# Run the resumable import script (recommended)
cd /var/www/filmflex
bash scripts/data/import-all-movies-resumable.sh

# Alternative: use the basic complete import script
bash scripts/data/import-all-movies-node.sh
```

> **Warning**: The complete import process will take multiple days to finish and uses significant server resources.

### Targeted Range Import

To import a specific range of pages:

```bash
cd /var/www/filmflex
scripts/data/import-range.sh
# You will be prompted to enter start and end page numbers
```

### Resumable Import

The most robust import method with pause/resume capability:

```bash
cd /var/www/filmflex
bash scripts/data/import-all-movies-resumable.sh
```

If the import is interrupted:
1. Run the same command again
2. Select option 1 to resume from where it left off
3. The script will skip already imported pages

#### Resume Options

The resumable script offers multiple options:
1. **Resume from last position**: Continue from where the script was interrupted
2. **Start over**: Begin a fresh import from page 1
3. **Start from a specific point**: Choose a specific batch and page to start from

## Implementation Details

### Batch Processing

The complete import scripts use a batch processing approach:
- Each batch processes 100 pages (approximately 1,000 movies)
- Takes a 60-minute break between batches to prevent API rate limiting
- Saves progress after each page/batch for resumability

### Progress Tracking

Progress is tracked in two JSON files:
- `complete_import_progress.json`: Overall progress information
- `import_detailed_progress.json`: Detailed record of completed pages

### Logs

The import scripts generate detailed logs:
- Main log: `log/complete-node-import.log`
- Standard import log: `log/data-import.log`

## Troubleshooting

### Common Issues

1. **API Rate Limiting**
   - Symptom: "Error fetching movie list" or empty responses
   - Solution: Decrease import speed by increasing the delay between requests

2. **Database Connection Errors**
   - Symptom: "Failed to connect to database"
   - Solution: Verify database credentials in the .env file

3. **Import Stops Unexpectedly**
   - Solution: Use the resumable import script which can recover from interruptions

### Checking Import Status

To check the status of an ongoing or completed import:

```bash
# View progress tracking file
cat scripts/data/complete_import_progress.json

# Check the import log
tail -f log/complete-node-import.log
```

## Automated Imports

FilmFlex has a daily import scheduled via cron at 2:00 AM:

```
# In /etc/cron.d/filmflex-data-import
0 2 * * * root bash /var/www/filmflex/scripts/data/import-movies.sh >> /var/log/filmflex/cron-import.log 2>&1
```

This ensures the database stays up-to-date with the latest movies without manual intervention.