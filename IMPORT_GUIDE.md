# FilmFlex Import Guide

This guide provides instructions for importing movies from PhimAPI into your FilmFlex database using the simplified import tool.

## Getting Started

The import process allows you to fetch movie data and episodes from PhimAPI and save them to your database. You can import a single page, a range of pages, or resume from where you left off.

## Import Tool Usage

We've created a simplified import tool that makes it easier to manage the import process. Here are the available commands:

### Check Import Status

To check the current status of your import:

```bash
npx tsx simple_import.ts status
```

This will show how many pages have been imported and your overall progress.

### Import a Single Page

To import a single page (useful for testing or importing specific content):

```bash
npx tsx simple_import.ts single <page_number>
```

Example:
```bash
npx tsx simple_import.ts single 5
```

### Import a Range of Pages

To import a specific range of pages:

```bash
npx tsx simple_import.ts range <start_page> <end_page>
```

Example:
```bash
npx tsx simple_import.ts range 10 20
```

### Resume from Last Saved Point

If your import was interrupted, you can resume from where you left off:

```bash
npx tsx simple_import.ts resume
```

This will automatically continue from the last successfully imported page.

## Checking Progress

The import progress is saved in a file named `import_progress.json`. This file keeps track of the last successfully imported page, allowing you to resume the import process if it's interrupted.

## Important Notes

1. **Duration**: Importing all 2,252 pages (approximately 22,520 movies) will take a significant amount of time, potentially several days depending on your system and network speed.

2. **Network Issues**: If you encounter network issues or API rate limiting, the import tool will automatically retry a few times before failing.

3. **Duplicate Movies**: The import tool checks for existing movies and will skip importing movies that already exist in your database.

4. **Interruptions**: You can safely interrupt the import process at any time by pressing Ctrl+C. The progress is saved after each page, so you can resume later.

## Troubleshooting

If you encounter issues with the import process:

1. Check your network connection
2. Verify that the PhimAPI is accessible
3. Ensure your database is running properly
4. Check available disk space

If the problem persists, try importing a single page to isolate the issue:

```bash
npx tsx simple_import.ts single 1
```

## Complete Import

To import all 2,252 pages (full database):

```bash
npx tsx simple_import.ts range 1 2252
```

Note that this will take a very long time. Consider importing in smaller ranges or setting up the process to run overnight or during periods when your system is not in active use.