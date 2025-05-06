# FilmFlex Scripts Overview

This directory contains all the scripts, tools, and guides for managing the FilmFlex application.

## Directory Structure

The scripts are organized into these categories:

```
scripts/
├── deployment/   # Deployment and server setup scripts
│   ├── deploy-filmflex.sh  # All-in-one deployment script
│   ├── DEPLOYMENT.md       # Original deployment guide
│   └── README.md           # Comprehensive deployment guide
│
├── data/         # Data import and management scripts
│   ├── import.ts             # Movie import script
│   ├── clear_movie_data.ts   # Script to clear movie data
│   ├── import_progress.json  # Import progress tracking
│   ├── IMPORT_GUIDE.md       # Original import guide
│   └── README.md             # Comprehensive data management guide
│
├── maintenance/  # User management and maintenance scripts
│   ├── reset_admin.ts  # Script to reset admin credentials
│   └── README.md       # Maintenance guide
│
└── tests/        # Testing scripts
    ├── comprehensive-test-runner.js  # Main test runner
    ├── run-admin-tests.js            # Admin panel tests
    ├── run-all-tests.js              # All tests
    ├── run_all_tests.js              # Alternative test runner
    ├── run-real-tests.js             # Tests against real components
    ├── run-test-demo.js              # Demo test runner
    ├── run_tests.sh                  # Test shell script
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
# Import movie data with TypeScript directly
npx tsx ./data/import.ts [start_page] [end_page]

# Alternatively, with the deployment script
./deployment/deploy-filmflex.sh --import
```

### Testing

```bash
# Run all tests with detailed output
./tests/run_all_tests.sh
```

### Maintenance

```bash
# Reset admin user with TypeScript directly
npx tsx ./maintenance/reset_admin.ts

# Alternatively, with the deployment script
./deployment/deploy-filmflex.sh --reset-admin
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