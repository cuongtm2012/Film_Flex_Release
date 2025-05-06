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
./scripts/deployment/deploy-filmflex.sh
```

### Data Management

```bash
# Import movie data
./scripts/deployment/deploy-filmflex.sh --import
```

### Testing

```bash
# Run all tests
./scripts/tests/run_tests.sh
```

### Maintenance

```bash
# Reset admin user
./scripts/deployment/deploy-filmflex.sh --reset-admin
```

## Root Wrapper Scripts

For convenience and backward compatibility, several wrapper scripts are available at the root of the project:

```bash
# Deployment script
./deploy.sh [options]

# Test runner
./run-tests.sh [options]

# Data import
./run-import.sh
```

These root-level scripts are thin wrappers that call the actual implementation scripts in their respective directories. This approach:

1. Maintains backward compatibility with existing CI/CD pipelines
2. Provides easy access to common functions from the project root
3. Keeps implementation details organized in the scripts/ directory

### How Wrapper Scripts Work

Each wrapper script:
1. Determines the project root directory
2. Checks if the target script exists
3. Passes all arguments to the actual implementation script
4. Returns the same exit code as the implementation script

## Contributing

When adding new scripts:

1. Place them in the appropriate category directory
2. Update the corresponding README file
3. Make sure the script is executable (`chmod +x script_name.sh`)
4. Add documentation for your script