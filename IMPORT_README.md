# PhimAPI Movie Import Guide

This guide explains how to use the import tools to populate your FilmFlex database with movies from the PhimAPI.

## Available Tools

1. **import_movies.ts** - Core import script with retry and progress tracking capabilities
2. **import_tool.ts** - User-friendly CLI tool to simplify the import process

## Quick Start Guide

The easiest way to import movies is using the import tool:

```bash
npx tsx import_tool.ts
```

This will launch an interactive menu with the following options:

1. Import all pages (1-2252)
2. Import a specific range of pages
3. Import a single page (for testing)
4. Resume from last saved point
5. Exit

## Import Process Details

### How It Works

1. The import process fetches movie lists page by page from PhimAPI
2. For each movie in the list, it fetches detailed information
3. It saves movie details and episodes to your database
4. Progress is automatically saved after each page to allow resuming later

### Important Information

- **Total Pages**: There are 2252 pages with approximately 10 movies per page
- **Total Movies**: Approximately 22,520 movies (including TV series)
- **Time Estimate**: Importing all pages may take several days depending on your connection speed
- **Resume Capability**: You can safely stop the import at any time and resume later
- **Progress Tracking**: A file named `import_progress.json` tracks your progress
- **Duplicate Prevention**: The script checks for existing movies to prevent duplicates

## Advanced Usage

### Direct Script Usage

You can run the import_movies.ts script directly with specific parameters:

```bash
# Import specific page range (e.g., pages 1 to 10)
npx tsx import_movies.ts 1 10

# Import all pages
npx tsx import_movies.ts 1 2252

# Import a single page
npx tsx import_movies.ts 42 42

# Disable auto-resume (third parameter)
npx tsx import_movies.ts 1 2252 noresume
```

### Tips for Large Imports

1. **Start Small**: Test with a single page first to ensure everything works
2. **Use Ranges**: Import in smaller ranges (e.g., 100 pages at a time)
3. **Server Resources**: The import process uses significant bandwidth and database resources
4. **Monitor Progress**: Check the console output and progress file to monitor the import
5. **Network Issues**: If you encounter network errors, the script will automatically retry

## Troubleshooting

- **Import Fails**: The script includes retry mechanisms for temporary failures
- **Resuming Import**: Use option 4 in the import tool to resume from where you left off
- **Database Errors**: Check for constraint violations or disk space issues
- **API Rate Limiting**: The script includes delays to respect API limits
- **Timeout Errors**: Increase the DELAY_BETWEEN_REQUESTS value in import_movies.ts

## Need Help?

If you encounter issues not covered here, please check the console output for specific error messages or review the code in import_movies.ts and import_tool.ts for implementation details.