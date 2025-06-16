# Film Database Reset Guide

This document provides instructions for resetting and reinitializing the FilmFlex database from scratch to ensure data integrity and consistency.

## Overview

The database reset process:

1. Checks if the database exists and creates it if needed
2. Drops all existing tables in the database
3. Pushes the latest schema directly using drizzle-kit
4. Seeds the database with initial data (admin user, roles, permissions)

## Prerequisites

- PostgreSQL database server must be running
- Node.js and npm must be installed
- Database connection details (available in `.env` file or environment variables)

## Warning

**IMPORTANT**: This process will delete ALL data in the specified database. Make sure you have a backup if you need to preserve any existing data.

## Database Reset Methods

### Method 1: Using the convenience scripts

#### On macOS/Linux:

```bash
# Make the script executable (first time only)
chmod +x reset-db.sh

# Run the reset script from project root
./reset-db.sh

# Or run directly from the scripts/data folder
./scripts/data/reset-db.sh
```

#### On Windows:

```cmd
# Run the reset batch file from project root
reset-db.cmd

# Or run directly from the scripts/data folder
scripts\data\reset-db.cmd
```

### Method 2: Using npm script

```bash
# Run the database reset script
npm run db:reset
```

### Method 3: Running the script directly

```bash
# Run with the TypeScript runner
npx tsx scripts/data/reset-film-database.ts
```

## Environment Variables

The reset script uses the `DATABASE_URL` environment variable to connect to the database. This can be set in several ways:

1. In your environment: `export DATABASE_URL=postgresql://user:password@host:port/database`
2. In a `.env` file in the project root
3. If not provided, it will default to: `postgresql://filmflex:filmflex2024@localhost:5432/filmflex`

## After Reset

Once the database has been reset, you can start the application with:

```bash
npm run dev
```

The application will be initialized with the following default admin credentials:

- Username: `admin`
- Password: `Cuongtm2012$`

## Troubleshooting

### Connection Issues

If you encounter connection errors:

1. Verify PostgreSQL is running
2. Check that the user (filmflex) exists in PostgreSQL
   - You can create the user with: `CREATE USER filmflex WITH PASSWORD 'filmflex2024';`
3. Ensure the `DATABASE_URL` is correct
4. Check firewall settings if connecting to a remote database

### Permission Issues

If you encounter permission errors:

1. Ensure the database user has sufficient privileges
   - The script will attempt to create the database if it doesn't exist
   - The user needs CREATE DATABASE permissions in PostgreSQL
2. Try running with a PostgreSQL superuser if available

### Schema Push Failures

If schema push fails:

1. Check the schema definition in `shared/schema.ts`
2. Look for syntax errors or conflicting definitions
3. Check the console output and log files for specific error messages
4. Try running `npm run db:push` separately to debug schema issues

## Logs

Reset logs are stored in the `logs` directory with timestamps, which can be helpful for troubleshooting. Look for files named `db-reset-[timestamp].log`.