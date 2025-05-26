# FilmFlex Database Schema Sync - Summary

## Issue
The production database schema was different from the local development database schema, causing inconsistencies and import errors.

## Schema Differences Found
**Local Database (Target)**:
- `categories` and `countries` are `jsonb` columns
- Has `movie_id` column with unique constraint
- Has `description` column
- Has complete index set including `idx_movies_episode`

**Production Database (Before Fix)**:
- `categories` and `countries` were `text[]` columns
- Missing several columns and constraints
- Different column names and types

## Root Cause
The production database was created with a different schema than local development, causing:
1. Import script failures due to array vs JSON format mismatches
2. Missing columns causing application errors
3. Different data types causing query failures

## Fixes Applied

### 1. Schema Migration Script
**File**: `migrations/fix_schema_for_recommended_movies.sql`
**Changes**:
- Converts `text[]` columns to `jsonb` format to match local DB
- Adds all missing columns (`movie_id`, `description`, `status`, etc.)
- Adds proper constraints (`movies_movie_id_unique`, `movies_slug_unique`)
- Creates indexes matching local schema (`idx_movies_episode`, etc.)
- Handles data migration safely with proper type conversion

### 2. Import Script Update
**File**: `scripts/data/import-movies-sql.cjs`
**Change**: 
```javascript
// Updated to use JSON.stringify for jsonb columns (matching local DB)
categories: JSON.stringify(movie.category || []),
countries: JSON.stringify(movie.country || []),
```

### 3. Complete Database Sync Script
**File**: `scripts/sync-production-db-schema.sh`
**Purpose**:
- Recreates production movies table with exact local schema
- Safely migrates existing data with proper type conversions
- Verifies schema after migration
- Tests API endpoints

### 4. Sample Data Import Script
**File**: `scripts/data/import-sample-movies.cjs`
**Updates**:
- Uses `jsonb` format for categories and countries
- Includes all required fields matching local schema
- Generates proper `movie_id` values
- Maps `content` to `description` field

### 5. GitHub Actions Workflow
**File**: `.github/workflows/filmflex-deploy.yml`
**Added**:
- New `db-sync` deployment mode for schema synchronization
- Automatic execution of schema sync before deployments
- Proper permissions for new scripts

### 6. Development Tools
**File**: `test-schema-sync.ps1`
- Windows PowerShell script for local schema verification
- Dry-run mode for testing without changes
- Schema comparison and validation

## Target Schema (Production Will Match Local)

### Movies Table
```sql
CREATE TABLE public.movies (
	id serial4 NOT NULL,
	movie_id text NOT NULL,
	slug text NOT NULL,
	"name" text NOT NULL,
	origin_name text NULL,
	poster_url text NULL,
	thumb_url text NULL,
	"year" int4 NULL,
	"type" text NULL,
	quality text NULL,
	lang text NULL,
	"time" text NULL,
	"view" int4 DEFAULT 0 NULL,
	description text NULL,
	status text DEFAULT 'ongoing'::text NULL,
	trailer_url text NULL,
	"section" text NULL,
	is_recommended bool DEFAULT false NULL,
	categories jsonb DEFAULT '[]'::jsonb NULL,
	countries jsonb DEFAULT '[]'::jsonb NULL,
	actors text NULL,
	directors text NULL,
	episode_current text NULL,
	episode_total text NULL,
	modified_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT movies_movie_id_unique UNIQUE (movie_id),
	CONSTRAINT movies_pkey PRIMARY KEY (id),
	CONSTRAINT movies_slug_unique UNIQUE (slug)
);
CREATE INDEX idx_movies_episode ON public.movies USING btree (episode_current, episode_total);
```

### Episodes Table
```sql
CREATE TABLE public.episodes (
	id serial4 NOT NULL,
	"name" text NOT NULL,
	slug text NOT NULL,
	movie_slug text NOT NULL,
	server_name text NOT NULL,
	filename text NULL,
	link_embed text NOT NULL,
	link_m3u8 text NULL,
	CONSTRAINT episodes_pkey PRIMARY KEY (id),
	CONSTRAINT episodes_slug_unique UNIQUE (slug)
);
```

## Deployment Options

### Option 1: GitHub Actions (Recommended)
```bash
# Use the workflow with db-sync mode
# This will sync the production schema safely
```

### Option 2: Manual Production Sync
```bash
# On production server
cd /root/Film_Flex_Release
./scripts/sync-production-db-schema.sh
```

### Option 3: Local Development Test
```powershell
# On Windows development machine
.\test-schema-sync.ps1 -DryRun
```

## Verification Steps
After deployment:
1. ✅ Production schema matches local development schema exactly
2. ✅ Import scripts work without "malformed array literal" errors  
3. ✅ `/api/movies/recommended` endpoint returns proper JSON responses
4. ✅ All existing data is preserved and properly migrated
5. ✅ New movie imports use correct `jsonb` format

## Safety Features
- **Backup Creation**: Existing data is backed up before schema changes
- **Rollback Capability**: Backup table allows rollback if needed
- **Data Preservation**: All existing data is migrated with proper type conversion
- **Verification**: Schema and data integrity checks after migration
- **API Testing**: Endpoint functionality verified after changes

## Benefits
1. **Consistency**: Production and development environments now identical
2. **Reliability**: No more schema-related import failures
3. **Maintainability**: Single source of truth for database schema
4. **Scalability**: Proper indexes and constraints for performance
5. **Future-Proof**: Changes prevent similar issues from recurring

The production database will now exactly match your local development database schema, ensuring consistent behavior across all environments.
