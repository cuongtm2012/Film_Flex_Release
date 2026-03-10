# PhimGG Scripts

This directory contains various scripts for managing and maintaining the PhimGG application.

## Database Scripts

### Database Reset (`reset-db.sh` / `reset-db.cmd`)

Reset and reinitialize the film database from scratch. This script:
- Drops all existing tables in the database
- Regenerates the database schema based on the Drizzle ORM definitions
- Seeds the database with initial data (admin user, roles, permissions)

**Usage:**
```bash
# On macOS/Linux
./scripts/reset-db.sh

# On Windows
scripts\reset-db.cmd
```

See [`DB_RESET.md`](../DB_RESET.md) in the project root for detailed documentation.

### TypeScript Reset Script (`reset-film-database.ts`)

This is the core TypeScript implementation of the database reset functionality. It can be called directly with:

```bash
npx tsx scripts/reset-film-database.ts
```

## Other Scripts

### Deployment Scripts

The `deployment/` subdirectory contains scripts for deploying the application to various environments.

### Maintenance Scripts

The `maintenance/` subdirectory contains scripts for routine maintenance tasks.

### Test Scripts

The `tests/` subdirectory contains scripts for running and managing tests.

### Data Scripts

The `data/` subdirectory contains scripts for data management and migration.

---

## Import Scripts

### Ophim Movie Importer (`import-ophim-movies.ts` / `import-ophim.sh`)

Import movies from Ophim API (ophim1.com) into the database.

**Features:**
- Import by page or page range
- Auto-skip existing movies
- Data validation before import
- Retry logic with rate limiting
- Detailed progress tracking and logging

**Quick Start:**
```bash
# Import page 1
./scripts/import-ophim.sh --page 1

# Import pages 1-5
./scripts/import-ophim.sh --start 1 --end 5

# Verbose output
./scripts/import-ophim.sh --page 1 --verbose
```

**Direct TypeScript:**
```bash
npx tsx scripts/import-ophim-movies.ts --page 1
```

**Options:**
- `--page N` - Import single page
- `--start N --end M` - Import page range
- `--no-skip` - Re-import existing movies
- `--validate-only` - Validate without importing
- `--verbose` - Detailed output
- `--rate-limit MS` - API rate limit (default: 500ms)

See [`docs/OPHIM_IMPORT.md`](../docs/OPHIM_IMPORT.md) for complete documentation. 