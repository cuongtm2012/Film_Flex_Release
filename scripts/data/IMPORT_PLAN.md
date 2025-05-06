# FilmFlex Strategic Import Plan

This document outlines strategies for importing the full movie database from phimapi.com, which contains over 22,557 movies across 2,256 pages.

## Challenges

- The API has pagination with 10 items per page
- There are 2,256 pages of data in total
- The entire dataset is too large to import in one batch
- API rate limits and server load must be considered
- Database insertions take time and resources

## Import Strategies

### 1. New Content Monitoring (Daily)

The existing import script focuses on grabbing new content as it appears:

```bash
# Regular daily imports (page 1 only - new content)
bash scripts/data/import-movies.sh
```

This is already handled by the cron job that runs twice daily.

### 2. Batch Importing (Initial Filling)

For importing large sections of the database in batches:

```bash
# Import pages 1-100 (1000 movies)
bash scripts/data/batch-import.sh --start-page 1 --end-page 100

# Import pages 101-200 (next 1000 movies)
bash scripts/data/batch-import.sh --start-page 101 --end-page 200
```

This approach allows you to:
- Import data in manageable chunks
- Resume if an import fails
- Distribute the load over time

### 3. Weekend Deep Scans (Automated Maintenance)

The existing system already performs deeper scans on weekends:

```bash
# Deeper scan runs automatically on Saturdays
# (via cron job)
```

## Recommended Import Plan for Full Database

There are two approaches to import the entire database of 22,557 movies:

### Approach 1: Automated Full Import (Recommended)

Use the automated full import script which handles everything for you:

```bash
# Run the full import script - it will handle all 2,256 pages with breaks
bash scripts/data/full-import.sh
```

This script:
- Divides all 2,256 pages into batches of 100 pages
- Takes a 1-hour break between each batch to avoid API rate limits
- Tracks progress so you can resume if the process is interrupted
- Provides detailed logs of the import process

You can also start from a specific batch if needed:

```bash
# The script will ask if you want to start from a specific batch
bash scripts/data/full-import.sh
```

### Approach 2: Manual Phased Import

If you prefer more control, follow this phased approach manually:

#### Phase 1: Initial Import (Latest Content)

Import the first 500 pages (5,000 movies) which represent the most recent content:

```bash
# First batch: Pages 1-100
bash scripts/data/batch-import.sh --start-page 1 --end-page 100 --delay 3

# Wait 1 hour before continuing

# Second batch: Pages 101-200
bash scripts/data/batch-import.sh --start-page 101 --end-page 200 --delay 3

# Continue with similar batches up to page 500, waiting 1 hour between each
```

Each batch of 100 pages will take approximately 1-2 hours depending on API response times.

#### Phase 2: Backfill Older Content

After the initial import, continue with older content in batches of 100 pages:

```bash
# Pages 501-600
bash scripts/data/batch-import.sh --start-page 501 --end-page 600 --delay 5

# Wait 1 hour before continuing

# Pages 601-700
bash scripts/data/batch-import.sh --start-page 601 --end-page 700 --delay 5

# Continue with later pages, waiting 1 hour between each batch
```

This phase can be done over several days or weeks according to your timeline.

#### Phase 3: Background Import for Oldest Content

For the oldest content (pages 1500+), run imports during off-peak hours:

```bash
# Run imports during night time
bash scripts/data/batch-import.sh --start-page 1501 --end-page 1600 --delay 8

# Wait 1 hour before continuing to the next batch
```

#### Phase 4: Complete the Import

Finish importing any remaining pages:

```bash
# Continue with 100-page batches until completion
bash scripts/data/batch-import.sh --start-page 2201 --end-page 2256 --delay 5
```

## Progress Tracking

The batch import script creates a progress file at `scripts/data/batch_progress.json` that tracks:
- Which pages have been completed
- Which pages have failed
- Overall progress percentage

You can use this to resume imports that were interrupted.

## Avoiding Duplicate Imports

The import script checks if a movie already exists in the database before importing it, so it's safe to run overlapping ranges if needed.

## Best Practices

1. **Start with newest content**: Pages 1-300 contain the most relevant and recent movies
2. **Mind the API limits**: Use the --delay parameter to avoid overwhelming the API
3. **Monitor database size**: The full import will require significant database space
4. **Run during off-peak hours**: Schedule large imports during nights or weekends
5. **Verify after completion**: Run sanity checks on movie counts after large imports

## Estimating Import Time

With an average processing time of 5 seconds per movie:
- 100 pages (1,000 movies) ≈ 1.5 hours
- 500 pages (5,000 movies) ≈ 7-8 hours
- Full database (22,557 movies) ≈ 30-40 hours of total processing time

This is why breaking into batches is essential.