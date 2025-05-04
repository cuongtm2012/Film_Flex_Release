# FilmFlex Movie Import Guide

This guide explains how to import movies into the FilmFlex platform database using our import tools.

## Overview

We've created a robust import script that properly handles errors and provides better feedback during the import process. The script includes:

- Progress tracking to resume interrupted imports
- Better error handling for API failures
- Duplication prevention to avoid database errors
- Detailed logging of the import process

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

## Features

1. **Progress Tracking**: The script saves progress after each page in `import_progress.json`, allowing you to resume interrupted imports.

2. **Error Handling**: The script properly handles API errors and database constraints, ensuring the import continues even if some movies fail.

3. **Duplicate Prevention**: The script checks if movies and episodes already exist before attempting to save them, preventing database errors.

4. **Detailed Logging**: The script provides detailed logs of what's happening during the import process.

## Advanced Usage

### Understanding the Import Process

The FilmFlex import process fetches movie data from an external API and saves it to our database. The process involves:

1. Fetching a list of movies from the API (paginated)
2. For each movie, fetching detailed information
3. Converting the API data to our internal data model
4. Saving the movie and its episodes to the database

The external API has approximately 2252 pages of movies, with each page containing about 20 movies.

### Limiting Pages

By default, the script imports 5 pages at a time. You can control this by specifying the start and end pages:

```bash
# Import pages 1 through 20
./import-movies.sh 1 20

# Import only page 100
./import-movies.sh 100 100
```

### Resuming Imports

If an import is interrupted, you can resume from where it left off:

```bash
# Resume from the last completed page
./import-movies.sh --resume
```

### Troubleshooting

If you encounter issues:

1. Check the console output for error messages
2. Make sure you're in the `scripts` directory when running the command
3. Try importing just a single page to identify specific issues
4. Check `import_progress.json` to see the last successfully completed page

## Notes

- The import process is intentionally slow to avoid overwhelming the API or the database.
- Each page contains about 20 movies and their associated episodes.
- The total number of pages is 2252, so importing all movies will take a significant amount of time.
- Consider running imports in batches of 10-20 pages at a time.

## Script Files

- `import-movies.sh`: Main shell script for easy execution
- `import_new.ts`: The new TypeScript import implementation
- `import_progress.json`: File that tracks import progress

## For Developers

If you need to modify the import process:

1. The main import logic is in `import_new.ts`
2. The script uses the API functions in `server/api.ts` to fetch movie data
3. The storage functions in `server/storage.ts` are used to save data to the database