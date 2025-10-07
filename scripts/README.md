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