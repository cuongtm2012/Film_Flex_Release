# FilmFlex Movie Import Guide

This guide explains how to import movies into the FilmFlex platform database.

## Overview

Our import script provides a robust solution for adding movies to the database with:

- Progress tracking to resume interrupted imports
- Automatic retries for handling API failures
- Duplicate detection to prevent database errors
- Detailed statistics and estimated completion time

## Quick Start

Use the provided shell script to import movies:

```bash
# Go to the scripts directory
cd scripts

# Show help
./import-movies.sh --help

# Import a single page (page 1)
./import-movies.sh 1 1

# Import a range of pages (pages 1-10)
./import-movies.sh 1 10

# Resume from the last completed page
./import-movies.sh --resume
```

## Import Process

The import process works as follows:

1. Fetches a list of movies from the external API (paginated)
2. For each movie:
   - Checks if it already exists in our database
   - If new, fetches detailed information
   - Converts the API data to our internal data model
   - Saves the movie and its episodes
3. Tracks progress to enable resuming if interrupted

## Features

### Progress Tracking

The script saves progress after each page in `import_progress.json`, allowing you to resume interrupted imports. This is especially helpful for long imports that may take hours or days to complete.

### Error Handling with Retries

The script includes automatic retry mechanisms for API failures, with exponential backoff to avoid overwhelming the external service. It properly handles different error types, including database constraint violations.

### Duplication Prevention

Before saving any movie or episode, the script checks if it already exists in the database. This prevents duplicate entries and database constraint violations.

### Estimated Completion Time

The script calculates and displays an estimated time to completion based on the average processing time for pages so far. This helps you plan and monitor long-running imports.

## Advanced Usage

### Controlling Import Range

By default, the script imports 5 pages at a time. You can specify which pages to import:

```bash
# Import pages 1 through 20
./import-movies.sh 1 20

# Import only page 100
./import-movies.sh 100 100
```

### Resuming Interrupted Imports

If an import is interrupted (by network issues, computer shutdown, etc.), you can resume from where it left off:

```bash
# Resume from the last completed page
./import-movies.sh --resume
```

### Running Without the Shell Script

If needed, you can run the TypeScript file directly:

```bash
# Using npx tsx
npx tsx scripts/import.ts [startPage] [endPage]
npx tsx scripts/import.ts --resume
```

### Troubleshooting

If you encounter issues:

1. Check console output for specific error messages
2. Verify database connection (the script requires a working database)
3. Try importing a single page to isolate problems
4. Check for rate limiting by the external API

## Notes

- The import process is intentionally paced to avoid overwhelming the API and database
- Each page contains about 20 movies and their associated episodes
- The total number of pages is 2252, so importing all movies will take a significant amount of time
- Consider running imports in batches (10-20 pages at a time) for best results

## Implementation Details

- `import-movies.sh`: Shell script wrapper for easy execution
- `import.ts`: Main import implementation
- `import_progress.json`: JSON file that tracks import progress
- Uses API functions from `server/api.ts` to fetch movie data
- Uses storage functions from `server/storage.ts` to save to the database