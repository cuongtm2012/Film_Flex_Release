# FilmFlex Scripts Overview

This directory contains all the scripts, tools, and guides for managing the FilmFlex application.

## Directory Structure

The scripts are organized into these categories:

```
scripts/
├── deployment/   # Deployment and server setup scripts
│   ├── deploy-filmflex.sh  # All-in-one deployment script
│   ├── env.example         # Example environment variables
│   └── README.md           # Comprehensive deployment guide
│
├── data/         # Data import and management scripts
│   ├── import-movies-sql.cjs  # Main movie import script (CommonJS)
│   ├── import-movies.sh       # Import wrapper script for development/production
│   ├── force-deep-scan.sh     # Interactive script for manual deep imports
│   ├── setup-cron.sh          # Script to set up scheduled imports
│   ├── import_progress.json   # Import progress tracking
│   └── README.md              # Comprehensive data management guide
│
├── maintenance/  # User management and maintenance scripts
│   ├── reset_admin.ts  # Script to reset admin credentials
│   └── README.md       # Maintenance guide
│
└── tests/        # Testing scripts
    ├── comprehensive-test-runner.js  # Main test runner
    ├── run-admin-tests.js            # Admin panel tests
    ├── run-all-tests.js              # All tests
    ├── run-real-tests.js             # Tests against real components
    ├── run-test-demo.js              # Demo test runner
    ├── test-profile-image.js         # Profile image tests
    └── README.md                     # Testing guide
```

## Quick Links

- [Deployment Guide](deployment/README.md) - How to deploy and configure FilmFlex
- [Data Management Guide](data/README.md) - How to import and manage movie data
- [Maintenance Guide](maintenance/README.md) - Routine maintenance tasks
- [Testing Guide](tests/README.md) - How to run and write tests

## Common Tasks

### Deployment

```bash
# Deploy or update application
./deployment/deploy-filmflex.sh
```

### Data Management

```bash
# Import movie data (regular scan - page 1 only)
bash scripts/data/import-movies.sh

# Import movie data with deep scan (multiple pages)
bash scripts/data/import-movies.sh --deep-scan

# Interactive deep scan with custom page count
bash scripts/data/force-deep-scan.sh

# Set up scheduled imports (cron job)
bash scripts/data/setup-cron.sh
```

### Testing

```bash
# Run all tests
node scripts/tests/run-all-tests.js

# Run comprehensive test suite
node scripts/tests/comprehensive-test-runner.js
```

### Maintenance

```bash
# Reset admin user with TypeScript directly
npx tsx scripts/maintenance/reset_admin.ts

# Deployment maintenance
bash scripts/deployment/deploy-filmflex.sh [options]
```

## Script Organization

All scripts are organized in subdirectories based on their purpose:

```bash
# Deployment
./deployment/deploy-filmflex.sh [options]

# Testing
./tests/run_all_tests.sh

# Data import
./data/import.ts [start_page] [end_page]

# Maintenance
./maintenance/reset_admin.ts
```

This clean organization keeps the codebase easy to navigate and maintain:

1. All scripts for a specific function are in their respective directories
2. Each directory has a README with detailed documentation
3. Scripts are clearly named and well-documented internally

## Contributing

When adding new scripts:

1. Place them in the appropriate category directory
2. Update the corresponding README file
3. Make sure the script is executable (`chmod +x script_name.sh`)
4. Add documentation for your script