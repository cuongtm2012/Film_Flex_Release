# FilmFlex Data Import Scripts

This directory contains scripts for importing movie data from an external API (phimapi.com) into the FilmFlex database.

## Files

- `import-movies-sql.cjs` - The main CommonJS script that fetches movie data from the API and imports it into the database
- `import-movies.sh` - Bash wrapper script for running the import script in development/production environments
- `setup-cron.sh` - Script to set up a cron job for automated data import on the production server
- `force-deep-scan.sh` - Interactive script to force a deep scan of multiple pages for new content
- `batch-import.sh` - Advanced script for importing large batches of pages from the API
- `full-import.sh` - Automated script for importing the entire database (22,557+ movies) in 100-page batches with 1-hour breaks between batches
- `IMPORT_PLAN.md` - Strategic plan for importing the full database (22,557+ movies over 2,256 pages)

## Data Import Strategy

The import system is optimized to focus on efficiency:

1. **Regular Imports** (Daily except Saturday):
   - Checks only page 1 of the API
   - Focuses on newest content which appears on the first page
   - Runs twice daily at 6 AM and 6 PM

2. **Deep Scans** (Saturdays only):
   - Checks multiple pages (5 by default)
   - Ensures we don't miss any content
   - Runs twice daily at 6 AM and 6 PM

3. **Manual Deep Scans**:
   - Can be triggered using the `force-deep-scan.sh` script
   - Allows specifying the number of pages to scan
   - Use when you need to update content after database changes

## Usage

### Development Testing

```bash
# Make scripts executable
chmod +x scripts/data/*.sh scripts/data/*.cjs

# Run regular import
bash scripts/data/import-movies.sh

# Run deep scan
bash scripts/data/import-movies.sh --deep-scan

# Run interactive deep scan
bash scripts/data/force-deep-scan.sh

# Import a specific batch of pages (useful for large imports)
bash scripts/data/batch-import.sh --start-page 1 --end-page 100

# Import with custom delay between pages (to avoid API rate limits)
bash scripts/data/batch-import.sh --start-page 101 --end-page 200 --delay 5

# See the full import plan for importing all 2,256 pages (22,557+ movies)
cat scripts/data/IMPORT_PLAN.md

# Import the ENTIRE database with 1-hour breaks between 100-page batches
bash scripts/data/full-import.sh
```

### Production Deployment

```bash
# Copy the scripts to the production server
scp scripts/data/*.cjs scripts/data/*.sh root@38.54.115.156:/var/www/filmflex/scripts/data/

# SSH to the server and set up the cron job
ssh root@38.54.115.156 "cd /var/www/filmflex && chmod +x scripts/data/*.sh scripts/data/*.cjs && bash scripts/data/setup-cron.sh"
```

## Cron Job Details

The cron job is configured with two separate entries:

```
# Normal import (page 1 only) - Every day except Saturday
0 6,18 * * 0-5 root cd /var/www/filmflex && bash /var/www/filmflex/scripts/data/import-movies.sh

# Deep scan (multiple pages) - Only on Saturdays
0 6,18 * * 6 root cd /var/www/filmflex && bash /var/www/filmflex/scripts/data/import-movies.sh --deep-scan
```

## Logs

Import script logs are stored in:
- Development: `[project_root]/log/data-import.log`
- Production: `/var/log/filmflex/data-import.log`

View logs with: `tail -f /var/log/filmflex/data-import.log`

## Database Schema Notes

The script works with:
- `movies` - Stores movie metadata using snake_case column names (movie_id, description, etc.)
- `episodes` - Stores episode data for TV series

The script only imports new movies that don't already exist in the database (based on the `slug` field).

## Troubleshooting

### CommonJS vs ES Module Issues

If you see errors like `require is not defined in ES module scope`:
1. Make sure the file extension is `.cjs` (not `.js`)
2. Check that scripts reference the `.cjs` extension

### Database Schema Issues

If you see errors like `column "xyz" of relation "movies" does not exist`:
1. Check the schema: `psql -U filmflex -d filmflex -c "\d movies"`
2. Update the script to use the correct column names (snake_case: `movie_id`, not `movieId`)