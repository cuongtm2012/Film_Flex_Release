#!/bin/bash

# FilmFlex Enhanced Final Deployment Script v3.0 - phimgg.com Production
# =====================================================================
# This script handles complete deployment including:
# - Database schema fixes and RBAC setup
# - Node.js dependency fixes (esbuild, rollup binaries)
# - ES module build compatibility with esbuild
# - CORS configuration for production
# - PM2 process management with production environment
# - Final verification and troubleshooting
#
# Updated for phimgg.com production environment (154.205.142.255)
# 
# This script includes proven fixes for:
# ✅ Missing @esbuild/linux-x64 binary
# ✅ Missing @rollup/rollup-linux-x64-gnu binary
# ✅ Corrupted node_modules issues
# ✅ Database schema missing tables
# ✅ Permission and role setup
# ✅ ES module build support with esbuild
# ✅ CORS configuration for production
# ✅ Production environment variables
#
# Usage: bash final-deploy.sh
# Everything is included in one script for simplicity and reliability

# Exit on error but with better error handling
set -e

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Updated for phimgg.com production
SOURCE_DIR="$HOME/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
PRODUCTION_IP="154.205.142.255"
PRODUCTION_DOMAIN="phimgg.com"
LOG_DIR="/var/log/filmflex"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
LOG_FILE="$LOG_DIR/final-deploy-$TIMESTAMP.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Echo to console and log file
log() {
  echo -e "$@"
  echo "$@" | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" >> "$LOG_FILE"
}

# Log a success message
success() {
  log "${GREEN}✓ $@${NC}"
}

# Log a warning message
warning() {
  log "${YELLOW}! $@${NC}"
}

# Log an error message
error() {
  log "${RED}✗ $@${NC}"
}

# Function to check command status and exit if failed
check_status() {
  if [ $? -ne 0 ]; then
    error "$1 failed"
    exit 1
  else
    success "$1 successful"
  fi
}

# Start deployment
log "${BLUE}===== FilmFlex Final Deployment Started at $(date) =====${NC}"
log "Production Environment: phimgg.com (${PRODUCTION_IP})"
log "Source directory: $SOURCE_DIR"
log "Deploy directory: $DEPLOY_DIR"
log "Log file: $LOG_FILE"

# Step 0: Fix database schema
log "${BLUE}0. Fixing database schema...${NC}"

# Get database connection info from environment or use default
if [ -n "$DATABASE_URL" ]; then
  # Use DATABASE_URL from environment if available
  log "Using DATABASE_URL from environment variable"
  DB_URL="$DATABASE_URL"
else
  # Use default connection string
  log "Using default DATABASE_URL"
  DB_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
fi

# Set PostgreSQL environment variables
export PGHOST="localhost"
export PGDATABASE="filmflex"
export PGUSER="filmflex"
export PGPASSWORD="filmflex2024"
export PGPORT="5432"

log "${BLUE}Database connection details:${NC}"
log "  Host: $PGHOST"
log "  Port: $PGPORT"
log "  Database: $PGDATABASE"
log "  User: $PGUSER"

# Create SQL fix file
cat > /tmp/db-fix.sql << 'EOSQL'
-- First check if tables exist and create them if they don't
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'movies') THEN
        CREATE TABLE movies (
            id SERIAL PRIMARY KEY,
            movie_id TEXT,
            name TEXT,
            title TEXT,
            origin_name TEXT,
            description TEXT,
            thumb_url TEXT,
            poster_url TEXT,
            trailer_url TEXT,
            time TEXT,
            quality TEXT,
            lang TEXT,
            year TEXT,
            view TEXT,
            actors TEXT,
            directors TEXT,
            categories TEXT[],
            countries TEXT[],
            modified_at TIMESTAMP DEFAULT NOW(),
            type TEXT,
            status TEXT,
            slug TEXT UNIQUE
        );
        RAISE NOTICE 'Created movies table';
    END IF;
END$$;

-- Create users table if it doesn't exist (CRITICAL for authentication)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            profile_image_url TEXT,
            role TEXT DEFAULT 'Viewer',
            status TEXT DEFAULT 'active',
            email_verified BOOLEAN DEFAULT FALSE,
            two_factor_enabled BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created users table';
    END IF;
END$$;

-- Create roles table for RBAC system
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'roles') THEN
        CREATE TABLE roles (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created roles table';
    END IF;
END$$;

-- Create permissions table for RBAC system
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'permissions') THEN
        CREATE TABLE permissions (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            module TEXT NOT NULL,
            action TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created permissions table';
    END IF;
END$$;

-- Create role_permissions junction table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'role_permissions') THEN
        CREATE TABLE role_permissions (
            id SERIAL PRIMARY KEY,
            role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
            permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(role_id, permission_id)
        );
        RAISE NOTICE 'Created role_permissions table';
    END IF;
END$$;

-- Create comments table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comments') THEN
        CREATE TABLE comments (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            movie_slug TEXT NOT NULL,
            content TEXT NOT NULL,
            parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created comments table';
    END IF;
END$$;

-- Create watchlist table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'watchlist') THEN
        CREATE TABLE watchlist (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            movie_slug TEXT NOT NULL,
            added_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, movie_slug)
        );
        RAISE NOTICE 'Created watchlist table';
    END IF;
END$$;

-- Create view_history table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'view_history') THEN
        CREATE TABLE view_history (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            movie_slug TEXT NOT NULL,
            episode_number INTEGER,
            watch_time INTEGER DEFAULT 0,
            completed BOOLEAN DEFAULT FALSE,
            last_watched TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created view_history table';
    END IF;
END$$;

-- Create audit_logs table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        CREATE TABLE audit_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            activity_type TEXT NOT NULL,
            details JSONB,
            ip_address TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created audit_logs table';
    END IF;
END$$;

-- Create featured_sections table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'featured_sections') THEN
        CREATE TABLE featured_sections (
            id SERIAL PRIMARY KEY,
            section_name TEXT UNIQUE NOT NULL,
            film_ids JSONB DEFAULT '[]',
            display_order JSONB DEFAULT '[]',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created featured_sections table';
    END IF;
END$$;

-- Now proceed with the regular schema fixes
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS movie_id TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS origin_name TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS thumb_url TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS trailer_url TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS time TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS quality TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS lang TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS episode_current TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS episode_total TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS year TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS view TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS actors TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS directors TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS categories TEXT[];
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS countries TEXT[];
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP DEFAULT NOW();
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add unique constraint to slug if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'movies_slug_key' AND conrelid = 'movies'::regclass
    ) THEN
        ALTER TABLE movies ADD CONSTRAINT movies_slug_key UNIQUE (slug);
        RAISE NOTICE 'Added unique constraint to slug column';
    END IF;
END$$;

-- Use a simpler approach to fix array columns
DO $$
BEGIN
    -- Fix categories column
    EXECUTE 'ALTER TABLE movies ALTER COLUMN categories TYPE TEXT[] USING 
        CASE 
            WHEN categories IS NULL THEN NULL::TEXT[] 
            WHEN categories::TEXT = ''{NULL}'' THEN NULL::TEXT[] 
            ELSE CASE 
                WHEN categories ~ E''^\\{.*\\}$'' THEN categories::TEXT[] 
                ELSE string_to_array(categories::TEXT, '','')
            END 
        END';
    RAISE NOTICE 'Fixed categories column';
    
    -- Fix countries column
    EXECUTE 'ALTER TABLE movies ALTER COLUMN countries TYPE TEXT[] USING 
        CASE 
            WHEN countries IS NULL THEN NULL::TEXT[] 
            WHEN countries::TEXT = ''{NULL}'' THEN NULL::TEXT[] 
            ELSE CASE 
                WHEN countries ~ E''^\\{.*\\}$'' THEN countries::TEXT[] 
                ELSE string_to_array(countries::TEXT, '','')
            END 
        END';
    RAISE NOTICE 'Fixed countries column';
END$$;

-- Create episodes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'episodes') THEN
        CREATE TABLE episodes (
            id SERIAL PRIMARY KEY,
            movie_slug TEXT,
            title TEXT,
            server_name TEXT,
            server_data JSONB,
            link_embed TEXT,
            link_m3u8 TEXT,
            episode_number INTEGER,
            season_number INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            modified_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created episodes table';
    ELSE
        RAISE NOTICE 'episodes table already exists';
    END IF;
    
    -- Add movie_slug column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'movie_slug'
    ) THEN
        ALTER TABLE episodes ADD COLUMN movie_slug TEXT;
        RAISE NOTICE 'Added movie_slug column to episodes table';
    ELSE
        RAISE NOTICE 'movie_slug column already exists in episodes table';
    END IF;
    
    -- Add foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'episodes_movie_slug_fkey' AND conrelid = 'episodes'::regclass
    ) THEN
        -- Make sure all existing movie_slug values exist in movies.slug
        DELETE FROM episodes WHERE movie_slug NOT IN (SELECT slug FROM movies WHERE slug IS NOT NULL);
        -- Add the foreign key constraint
        ALTER TABLE episodes ADD CONSTRAINT episodes_movie_slug_fkey 
            FOREIGN KEY (movie_slug) REFERENCES movies(slug) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to movie_slug column';
    END IF;
END$$;

-- Create more indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);
CREATE INDEX IF NOT EXISTS idx_movies_type ON movies(type);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);
CREATE INDEX IF NOT EXISTS idx_movies_modified_at ON movies(modified_at);
CREATE INDEX IF NOT EXISTS idx_episodes_movie_slug ON episodes(movie_slug);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_comments_movie_slug ON comments(movie_slug);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_view_history_user_id ON view_history(user_id);

-- Insert default permissions for the RBAC system
INSERT INTO permissions (name, description, module, action) VALUES 
-- User Management Permissions
('user.create', 'Create new users', 'user_management', 'create'),
('user.read', 'View user information', 'user_management', 'read'),
('user.update', 'Update user information', 'user_management', 'update'),
('user.delete', 'Delete users', 'user_management', 'delete'),
('user.manage_roles', 'Assign and modify user roles', 'user_management', 'manage_roles'),
('user.view_activity', 'View user activity logs', 'user_management', 'view_activity'),

-- Content Management Permissions
('content.create', 'Add new movies and content', 'content_management', 'create'),
('content.read', 'View content details', 'content_management', 'read'),
('content.update', 'Edit existing content', 'content_management', 'update'),
('content.delete', 'Remove content', 'content_management', 'delete'),
('content.approve', 'Approve pending content', 'content_management', 'approve'),
('content.reject', 'Reject submitted content', 'content_management', 'reject'),
('content.moderate', 'Moderate user comments and reviews', 'content_management', 'moderate'),

-- System Administration Permissions
('system.admin', 'Full system administration access', 'system', 'admin'),
('system.analytics', 'View analytics and reports', 'system', 'analytics'),
('system.settings', 'Modify system settings', 'system', 'settings'),
('system.api_keys', 'Manage API keys', 'system', 'api_keys'),
('system.audit_logs', 'View audit logs', 'system', 'audit_logs'),

-- Role Management Permissions
('role.create', 'Create new roles', 'role_management', 'create'),
('role.read', 'View role information', 'role_management', 'read'),
('role.update', 'Modify existing roles', 'role_management', 'update'),
('role.delete', 'Delete roles', 'role_management', 'delete'),
('role.assign_permissions', 'Assign permissions to roles', 'role_management', 'assign_permissions'),

-- Viewing Permissions
('content.view', 'View movies and content', 'viewing', 'view'),
('content.search', 'Search for content', 'viewing', 'search'),
('content.watchlist', 'Manage personal watchlist', 'viewing', 'watchlist'),
('content.comment', 'Comment on content', 'viewing', 'comment'),
('content.rate', 'Rate movies and content', 'viewing', 'rate')

ON CONFLICT (name) DO NOTHING;

-- Insert the three default roles
INSERT INTO roles (name, description) VALUES 
('Admin', 'Full administrative access to all system functions'),
('Content Manager', 'Manages content creation, editing, and moderation'),
('Viewer', 'Standard user with viewing and basic interaction capabilities')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to Admin role (full access)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Content Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Content Manager'
AND p.name IN (
    'content.create',
    'content.read', 
    'content.update',
    'content.delete',
    'content.approve',
    'content.reject',
    'content.moderate',
    'content.view',
    'content.search',
    'user.read',
    'user.view_activity',
    'system.analytics'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Viewer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Viewer'
AND p.name IN (
    'content.view',
    'content.search',
    'content.watchlist',
    'content.comment',
    'content.rate',
    'content.read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Add anime section to featured_sections table
INSERT INTO featured_sections (section_name, film_ids, display_order, created_at, updated_at)
VALUES ('anime', '[]', '[]', NOW(), NOW())
ON CONFLICT (section_name) DO NOTHING;

-- Create a default admin user if none exists
INSERT INTO users (username, email, password_hash, display_name, role, status, email_verified)
VALUES ('admin', 'admin@filmflex.local', '$2b$10$defaulthashedpassword', 'Administrator', 'Admin', 'active', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Insert audit log entry for this migration
INSERT INTO audit_logs (user_id, activity_type, details, ip_address)
VALUES (1, 'SYSTEM_MIGRATION', '{"migration": "final_deploy_schema_setup", "action": "Created complete database schema with RBAC system"}', '127.0.0.1');
EOSQL

# Execute SQL fix
log "Executing SQL fixes..."
if psql -f /tmp/db-fix.sql; then
    success "Database schema fix completed successfully"
else
    error "Database schema fix failed"
    exit 1
fi

# 1. Stop any existing processes
log "${BLUE}1. Stopping any existing FilmFlex processes...${NC}"
pm2 stop filmflex 2>/dev/null || true
pm2 delete filmflex 2>/dev/null || true

# 2. Create deployment directory if it doesn't exist
log "${BLUE}2. Setting up deployment directory...${NC}"
mkdir -p "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/client/dist"
mkdir -p "$DEPLOY_DIR/scripts/data"

# 3. Copy the source package.json and prepare it
log "${BLUE}3. Copying and preparing package.json...${NC}"
if [ -f "$SOURCE_DIR/package.json" ]; then
  cp "$SOURCE_DIR/package.json" "$DEPLOY_DIR/package.json"
  check_status "Package.json copy"
else
  # Fallback if package.json is not found
  log "Package.json not found in source, creating standard one..."
  cat > "$DEPLOY_DIR/package.json" << 'EOJSON'
{
  "name": "filmflex",
  "version": "1.0.0",
  "description": "FilmFlex Production Server",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "@neondatabase/serverless": "^0.7.2",
    "drizzle-orm": "^0.28.6"
  }
}
EOJSON
fi

# 4. Copy the source code
log "${BLUE}4. Copying server files...${NC}"
if [ -d "$SOURCE_DIR/server" ]; then
  mkdir -p "$DEPLOY_DIR/server"
  cp -r "$SOURCE_DIR/server"/* "$DEPLOY_DIR/server/"
  check_status "Server code copy"
else
  warning "Server source directory not found"
fi

if [ -d "$SOURCE_DIR/shared" ]; then
  mkdir -p "$DEPLOY_DIR/shared"
  cp -r "$SOURCE_DIR/shared"/* "$DEPLOY_DIR/shared/"
  check_status "Shared code copy"
else
  warning "Shared source directory not found"
fi

# 5. Create PM2 ecosystem config with production environment
log "${BLUE}5. Creating PM2 ecosystem config for production...${NC}"
cat > "$DEPLOY_DIR/ecosystem.config.cjs" << 'EOCONFIG'
module.exports = {
  apps: [
    {
      name: "filmflex",
      script: "dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        ALLOWED_ORIGINS: "*",
        CLIENT_URL: "*",
        DATABASE_URL: "postgresql://filmflex:filmflex2024@localhost:5432/filmflex",
        SESSION_SECRET: "5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61",
        DOMAIN: "phimgg.com",
        SERVER_IP: "154.205.142.255"
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/filmflex/error.log",
      out_file: "/var/log/filmflex/out.log",
      merge_logs: true,
      max_memory_restart: "500M"
    }
  ]
};
EOCONFIG

# 6. Fix node modules and install dependencies with proven fixes
log "${BLUE}6. Fixing node modules and installing dependencies...${NC}"
cd "$DEPLOY_DIR"

# Step 6a: Complete cleanup of corrupted dependencies
log "   🗑️  Cleaning up corrupted node_modules and package-lock.json..."
rm -rf node_modules
rm -rf package-lock.json
rm -rf ~/.npm/_cacache

log "   🧹 Clearing npm cache..."
npm cache clean --force

# Step 6b: Install dependencies with optional dependencies enabled
log "   📦 Installing dependencies with optional dependencies..."
if npm install --include=optional; then
    success "Base dependencies installed successfully"
else
    warning "Standard install failed, trying with legacy peer deps..."
    npm install --legacy-peer-deps --include=optional
    check_status "Dependencies installation with legacy peer deps"
fi

# Step 6c: Install platform-specific binaries that commonly cause issues
log "   🔧 Installing platform-specific binaries..."
npm install @esbuild/linux-x64 --save-dev 2>/dev/null || warning "esbuild binary install failed (might already exist)"
npm install @rollup/rollup-linux-x64-gnu --save-dev 2>/dev/null || warning "rollup binary install failed (might already exist)"

# Step 6d: Verify critical binaries are present
log "   🔍 Verifying critical binaries..."
if [ -f "node_modules/@esbuild/linux-x64/package.json" ]; then
    success "esbuild Linux x64 binary: FOUND"
else
    warning "esbuild Linux x64 binary: MISSING - attempting fix..."
    npm rebuild @esbuild/linux-x64 || npm install @esbuild/linux-x64 --force
fi

if [ -f "node_modules/@rollup/rollup-linux-x64-gnu/package.json" ]; then
    success "Rollup Linux x64 binary: FOUND"
else
    warning "Rollup Linux x64 binary: MISSING - attempting fix..."
    npm rebuild @rollup/rollup-linux-x64-gnu || npm install @rollup/rollup-linux-x64-gnu --force
fi

# Step 6e: Build application or copy pre-built files
log "   🏗️  Building application..."

# Try to build if we have the source files and build scripts
if [ -f "package.json" ] && grep -q "build:server" package.json; then
    log "Found build scripts, attempting ES module build with esbuild..."
    
    # Build server with esbuild (ES module compatible)
    if npm run build:server; then
        success "Server ES module build completed successfully"
        BUILD_METHOD="esbuild (ES modules)"
    else
        warning "Server build failed, will try copying pre-built files"
        BUILD_METHOD="fallback"
    fi
    
    # Build client if build script exists
    if grep -q "build:client" package.json && npm run build:client; then
        success "Client build completed successfully"
    else
        warning "Client build failed or not available, will try copying pre-built files"
    fi
else
    log "Build scripts not found, using pre-built approach..."
    BUILD_METHOD="pre-built"
fi

# Approach 1: Use pre-built files from source if available
if [ -d "$SOURCE_DIR/dist" ] && [ -f "$SOURCE_DIR/dist/index.js" ]; then
    log "Found pre-built server code, copying it..."
    mkdir -p "$DEPLOY_DIR/dist"
    cp -r "$SOURCE_DIR/dist"/* "$DEPLOY_DIR/dist/"
    success "Server code copied successfully from pre-built source"
else
    # Approach 2: Create a fallback server file
    warning "Pre-built server not found, creating fallback server file..."
    mkdir -p "$DEPLOY_DIR/dist"
      # Create an enhanced Express server with CORS support
    cat > "$DEPLOY_DIR/dist/index.js" << 'EOJS'
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

// Create Express app
const app = express();
const port = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://filmflex:filmflex2024@localhost:5432/filmflex'
});

// Enhanced CORS middleware for production
app.use((req, res, next) => {
  // Check for wildcard CORS setting - ALLOW ALL ORIGINS (for development/testing)
  if (process.env.ALLOWED_ORIGINS === '*' || process.env.CLIENT_URL === '*') {
    res.header('Access-Control-Allow-Origin', '*');
  } else {
    // Production CORS - allow specific origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : ['https://phimgg.com', 'http://154.205.142.255:5000'];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Middleware to parse JSON
app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    domain: process.env.DOMAIN || 'localhost',
    cors: process.env.ALLOWED_ORIGINS || 'default'
  });
});

// Test database connection
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
    res.json({ 
      status: 'ok', 
      database: 'connected', 
      time: result.rows[0].current_time,
      version: result.rows[0].postgres_version
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected', 
      error: error.message 
    });
  }
});

// Static files - serve the client build
app.use(express.static(path.join(__dirname, '../client/dist')));

// All other GET requests not handled before will return our React app
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../client/dist/index.html'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 FilmFlex Server running on port ${port}`);
  console.log(`📊 Database URL: ${process.env.DATABASE_URL || 'using default connection'}`);
  console.log(`🌐 Domain: ${process.env.DOMAIN || 'localhost'}`);
  console.log(`🔒 CORS: ${process.env.ALLOWED_ORIGINS || 'default settings'}`);
  console.log(`🌐 Access: http://localhost:${port}`);
  console.log(`🌐 Production: http://154.205.142.255:${port}`);
  console.log(`🌐 Domain: https://phimgg.com`);
});
EOJS
    success "Created enhanced production server file with CORS support"
    
    # Install minimal dependencies needed for the fallback server
    npm install express pg --save
    check_status "Installing minimal server dependencies"
fi

# Step 6f: Verify build outputs
log "   📊 Verifying build outputs..."
if [ -f "$DEPLOY_DIR/dist/index.js" ]; then
    SERVER_SIZE=$(du -h "$DEPLOY_DIR/dist/index.js" | cut -f1)
    success "Server bundle verified: $SERVER_SIZE"
else
    error "Server bundle missing after build process"
    exit 1
fi

# 7. Copy scripts directory
log "${BLUE}7. Copying scripts directory...${NC}"
log "   - Copying import scripts..."
mkdir -p "$DEPLOY_DIR/scripts/data"
if [ -d "$SOURCE_DIR/scripts/data" ]; then
    cp -r "$SOURCE_DIR/scripts/data"/* "$DEPLOY_DIR/scripts/data/" || warning "Failed to copy some data scripts"
    chmod +x "$DEPLOY_DIR/scripts/data"/*.sh 2>/dev/null || warning "Failed to make scripts executable"
else
    warning "Source scripts/data directory not found"
fi

# 8. Copy client
if [ -d "$SOURCE_DIR/client/dist" ]; then
  log "${BLUE}8. Copying client dist files...${NC}"
  cp -r "$SOURCE_DIR/client/dist"/* "$DEPLOY_DIR/client/dist/" || warning "Failed to copy client files"
else
  warning "Client dist directory not found at $SOURCE_DIR/client/dist"
  # Try to find it elsewhere
  if [ -d "$SOURCE_DIR/dist" ]; then
    log "Found client files at $SOURCE_DIR/dist, copying..."
    cp -r "$SOURCE_DIR/dist"/* "$DEPLOY_DIR/client/dist/" || warning "Failed to copy client files from alternate location"
  fi
fi

# 9. Set up production environment variables
log "${BLUE}9. Setting up production environment variables...${NC}"
cat > "$DEPLOY_DIR/.env" << 'EOENV'
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=*
CLIENT_URL=*
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
SESSION_SECRET=5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61
DOMAIN=phimgg.com
SERVER_IP=154.205.142.255
EOENV

# Create .env.production file for production-specific settings
cat > "$DEPLOY_DIR/.env.production" << 'EOENVPROD'
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=*
CLIENT_URL=*
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
SESSION_SECRET=5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61
DOMAIN=phimgg.com
SERVER_IP=154.205.142.255
EOENVPROD

# Create .env.local file as well for possible dotenv module usage
cp "$DEPLOY_DIR/.env" "$DEPLOY_DIR/.env.local"

# Create a module loader file for ESM environments that exports environment variables
log "Creating environment module for ESM compatibility..."
cat > "$DEPLOY_DIR/dist/env.js" << 'EOENV_MODULE'
// ESM environment module
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Default values
const defaults = {
  NODE_ENV: 'production',
  PORT: '5000',
  DATABASE_URL: 'postgresql://filmflex:filmflex2024@localhost:5432/filmflex',
  SESSION_SECRET: '5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61'
};

// Load from .env file
function loadEnv() {
  try {
    const envPath = path.join(rootDir, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = {};
      
      envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
            value = value.replace(/\\n/g, '\n');
            value = value.slice(1, -1);
          }
          envVars[key] = value;
        }
      });
      
      return envVars;
    }
  } catch (err) {
    console.error('Error loading .env file:', err);
  }
  return {};
}

// Combine environment variables from all sources, with priority:
// 1. Process environment variables
// 2. .env file variables
// 3. Default values
const envVars = { ...defaults, ...loadEnv(), ...process.env };

// Export all environment variables
export const NODE_ENV = envVars.NODE_ENV;
export const PORT = envVars.PORT;
export const DATABASE_URL = envVars.DATABASE_URL;
export const SESSION_SECRET = envVars.SESSION_SECRET;

// Export a function to get any env var with a default
export function getEnv(key, defaultValue = '') {
  return envVars[key] || defaultValue;
}

// Export the entire env object
export default envVars;
EOENV_MODULE

# 10. Check for processes using the port before killing them
log "${BLUE}10. Checking for processes using port 5000 before starting server...${NC}"
PROCESSES=$(lsof -i:5000 -t 2>/dev/null || ss -tulpn 2>/dev/null | grep ':5000 ' | awk '{print $7}' | cut -d= -f2 | cut -d, -f1)
if [ -n "$PROCESSES" ]; then
  log "   - Found processes using port 5000: $PROCESSES"
  log "   - Stopping these processes safely..."
  for PID in $PROCESSES; do
    log "     - Sending SIGTERM to process $PID"
    kill $PID 2>/dev/null || true
    sleep 1
    # Only use SIGKILL if process still exists
    if kill -0 $PID 2>/dev/null; then
      log "     - Process $PID still running, sending SIGKILL"
      kill -9 $PID 2>/dev/null || true
    fi
  done
  sleep 2
fi

# 10.5. Pre-deployment testing and verification
log "${BLUE}10.5. Pre-deployment testing and verification...${NC}"
cd "$DEPLOY_DIR"

# Test Node.js module loading
log "   🧪 Testing Node.js module loading..."
if node -e "console.log('Node.js basic test passed')" 2>/dev/null; then
    success "Node.js basic functionality test passed"
else
    error "Node.js basic functionality test failed"
    exit 1
fi

# Test if our server file can load without running
log "   📝 Testing server file syntax..."
if node -c dist/index.js 2>/dev/null; then
    success "Server file syntax check passed"
else
    error "Server file syntax check failed"
    exit 1
fi

# Test database connection
log "   🗄️  Testing database connection..."
if PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1;" > /dev/null 2>&1; then
    success "Database connection test passed"
else
    warning "Database connection test failed - continuing anyway"
fi

# Test package dependencies
log "   📦 Testing critical dependencies..."
node -e "
try {
  require('express');
  require('pg');
  console.log('✅ Critical dependencies test passed');
} catch (error) {
  console.error('❌ Critical dependencies test failed:', error.message);
  process.exit(1);
}
" || { error "Critical dependencies test failed"; exit 1; }

# Quick server startup test
log "   🚀 Testing server startup (10 second test)..."
timeout 10s node dist/index.js &
SERVER_PID=$!
sleep 5

# Test health endpoint
if curl -f -s http://localhost:5000/api/health > /dev/null 2>&1; then
    success "Health endpoint test passed"
    HEALTH_RESPONSE=$(curl -s http://localhost:5000/api/health)
    log "     Health response: $HEALTH_RESPONSE"
else
    warning "Health endpoint test failed - server might need more time to start"
fi

# Test database endpoint if available
if curl -f -s http://localhost:5000/api/db-test > /dev/null 2>&1; then
    success "Database endpoint test passed"
    DB_RESPONSE=$(curl -s http://localhost:5000/api/db-test)
    log "     Database response: $DB_RESPONSE"
else
    warning "Database endpoint test failed or not available"
fi

# Clean up test server
kill $SERVER_PID 2>/dev/null || true
sleep 2

# 11. Setup systemd service for PM2 and start server
log "${BLUE}11. Setting up PM2 startup service...${NC}"
cd "$DEPLOY_DIR"
pm2 startup systemd || warning "Failed to set up PM2 startup hook"

# Create an enhanced PM2 config file with production environment variables
log "Creating enhanced PM2 startup file with production environment..."
cat > "$DEPLOY_DIR/pm2.config.cjs" << 'EOPMConfig'
module.exports = {
  apps: [
    {
      name: "filmflex",
      script: "dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        ALLOWED_ORIGINS: "*",
        CLIENT_URL: "*",
        DATABASE_URL: "postgresql://filmflex:filmflex2024@localhost:5432/filmflex",
        SESSION_SECRET: "5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61",
        DOMAIN: "phimgg.com",
        SERVER_IP: "154.205.142.255"
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/filmflex/error.log",
      out_file: "/var/log/filmflex/out.log",
      merge_logs: true,
      max_memory_restart: "500M"
    }
  ]
};
EOPMConfig

# Start or restart the application with PM2
if pm2 list | grep -q "filmflex"; then
  log "Restarting application with PM2..."
  pm2 restart filmflex || { error "Failed to restart application"; exit 1; }
else
  log "Starting application with PM2..."
  pm2 start "$DEPLOY_DIR/pm2.config.cjs" || { 
    error "Failed to start with pm2.config.cjs, attempting direct start"    # Try direct start as fallback with production environment
    cd "$DEPLOY_DIR"
    export NODE_ENV="production"
    export ALLOWED_ORIGINS="*"
    export CLIENT_URL="*"
    export DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
    export SESSION_SECRET="5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61"
    export DOMAIN="phimgg.com"
    export SERVER_IP="154.205.142.255"
    pm2 start dist/index.js --name filmflex -- --env production || { error "All PM2 start methods failed"; exit 1; }
  }
fi

# Save PM2 process list
pm2 save || warning "Failed to save PM2 process list"

# 12. Set proper permissions for the deploy directory
log "${BLUE}12. Setting proper permissions...${NC}"
chown -R www-data:www-data "$DEPLOY_DIR" || warning "Failed to set permissions"

# 13. Check API response
log "${BLUE}13. Checking API response...${NC}"
sleep 3
API_RESPONSE=$(curl -s http://localhost:5000/api/health)
if [[ $API_RESPONSE == *"status"* ]]; then
  success "API is responding correctly: $API_RESPONSE"
else
  warning "API is not responding correctly: $API_RESPONSE"
  log "   - This might be a temporary issue, please try accessing the site manually"
fi

# 14. Reload Nginx
log "${BLUE}14. Reloading Nginx configuration...${NC}"
if nginx -t; then
  systemctl reload nginx
  success "Nginx configuration reloaded"
else
  error "Nginx configuration test failed"
fi

# Create an enhanced restart script for production
log "Creating enhanced restart script for production..."
cat > "$DEPLOY_DIR/restart.sh" << 'EORESTART'
#!/bin/bash
# FilmFlex Production Restart Script for phimgg.com
export NODE_ENV="production"
export PORT="5000"
export ALLOWED_ORIGINS="*"
export CLIENT_URL="*"
export DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
export SESSION_SECRET="5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61"
export DOMAIN="phimgg.com"
export SERVER_IP="154.205.142.255"

cd "$(dirname "$0")"

echo "🚀 Restarting FilmFlex for phimgg.com production..."
echo "📍 Production IP: 154.205.142.255"
echo "🌐 Domain: phimgg.com"

if pm2 list | grep -q "filmflex"; then
  echo "🔄 Restarting FilmFlex with PM2..."
  pm2 restart filmflex
else
  echo "▶️  Starting FilmFlex with PM2..."
  pm2 start pm2.config.cjs || pm2 start dist/index.js --name filmflex
fi

echo "⏳ Checking application status..."
sleep 3

echo "🏥 Health check:"
curl -s http://localhost:5000/api/health | head -c 200
echo ""

echo "🌐 Production URLs:"
echo "  • Local: http://localhost:5000"
echo "  • Production IP: http://154.205.142.255:5000"
echo "  • Domain: https://phimgg.com"
echo ""
echo "✅ Done! Check logs with: pm2 logs filmflex"
EORESTART

chmod +x "$DEPLOY_DIR/restart.sh"

# End deployment
log "${GREEN}===== FilmFlex Final Deployment Completed at $(date) =====${NC}"

# Final comprehensive verification
log ""
log "${BLUE}🔍 FINAL VERIFICATION${NC}"
log "===================="

# Check PM2 status
log "📋 PM2 Status:"
pm2 status

# Check if the application is responding
log ""
log "🌐 Application Response Tests:"
sleep 3

# Test health endpoint with enhanced checks
if curl -f -s http://localhost:5000/api/health > /dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s http://localhost:5000/api/health)
    success "Health endpoint: RESPONSIVE"
    log "   Response: $HEALTH_RESPONSE"
    
    # Test CORS headers
    CORS_RESPONSE=$(curl -s -I -H "Origin: https://phimgg.com" http://localhost:5000/api/health | grep -i "access-control-allow-origin" || echo "No CORS headers")
    log "   CORS: $CORS_RESPONSE"
else
    error "Health endpoint: NOT RESPONSIVE"
    log "   Checking PM2 logs for issues..."
    pm2 logs filmflex --lines 5
fi

# Test database endpoint if available
if curl -f -s http://localhost:5000/api/db-test > /dev/null 2>&1; then
    DB_RESPONSE=$(curl -s http://localhost:5000/api/db-test)
    success "Database endpoint: RESPONSIVE"
    log "   Response: $DB_RESPONSE"
else
    warning "Database endpoint: NOT AVAILABLE (might not be implemented)"
fi

# Test production IP accessibility
if command -v timeout >/dev/null 2>&1; then
    log "Testing production IP accessibility..."
    if timeout 10 curl -f -s http://154.205.142.255:5000/api/health > /dev/null 2>&1; then
        success "Production IP: ACCESSIBLE (154.205.142.255)"
    else
        warning "Production IP: NOT ACCESSIBLE (may need firewall configuration)"
    fi
fi

# Test main page
if curl -f -s http://localhost:5000 > /dev/null 2>&1; then
    success "Main page: ACCESSIBLE"
else
    warning "Main page: NOT ACCESSIBLE"
fi

# Show server resource usage
log ""
log "📊 Server Resource Usage:"
if command -v ps >/dev/null 2>&1; then
    FILMFLEX_PROCESSES=$(ps aux | grep filmflex | grep -v grep | wc -l)
    log "   FilmFlex processes: $FILMFLEX_PROCESSES"
    if [ "$FILMFLEX_PROCESSES" -gt 0 ]; then
        ps aux | grep filmflex | grep -v grep | head -3
    fi
fi

# Check disk usage
log ""
log "💾 Deployment Size:"
if [ -d "$DEPLOY_DIR" ]; then
    DEPLOY_SIZE=$(du -sh "$DEPLOY_DIR" | cut -f1)
    log "   Total deployment: $DEPLOY_SIZE"
fi
if [ -f "$DEPLOY_DIR/dist/index.js" ]; then
    SERVER_SIZE=$(du -h "$DEPLOY_DIR/dist/index.js" | cut -f1)
    log "   Server bundle: $SERVER_SIZE"
fi
if [ -d "$DEPLOY_DIR/client/dist" ]; then
    CLIENT_SIZE=$(du -sh "$DEPLOY_DIR/client/dist" | cut -f1)
    log "   Client bundle: $CLIENT_SIZE"
fi

log ""
log "${GREEN}🎉 DEPLOYMENT SUMMARY for phimgg.com${NC}"
log "======================================="
log "🕒 Deployment completed at: $(date)"
log "📁 Deployed to: $DEPLOY_DIR"
log "🏗️  Build method: ${BUILD_METHOD:-'standard'}"
log "🌐 Production Environment:"
log "   • Local URL: http://localhost:5000"
log "   • Production IP: http://154.205.142.255:5000"
log "   • Domain: https://phimgg.com (when DNS configured)"
log "   • Health Check: http://154.205.142.255:5000/api/health"
log "📊 Log file: $LOG_FILE"
log ""
log "${BLUE}📋 MANAGEMENT COMMANDS${NC}"
log "===================="
log "  • Check status: pm2 status filmflex"
log "  • View logs: pm2 logs filmflex"
log "  • Monitor: pm2 monit"
log "  • Restart: pm2 restart filmflex"
log "  • Stop: pm2 stop filmflex"
log "  • Quick restart: cd $DEPLOY_DIR && ./restart.sh"
log ""
log "${BLUE}🛠️  TROUBLESHOOTING${NC}"
log "=================="
log "  • If health check failed: pm2 logs filmflex"
log "  • If database issues: Check database connection in logs"
log "  • If CORS issues: Check ALLOWED_ORIGINS environment variable"
log "  • If node modules issues: Run this script again (it includes fixes)"
log "  • If port conflicts: Check what's using port 5000: lsof -i:5000"
log ""
log "${BLUE}🔒 SECURITY NOTES${NC}"
log "=================="
log "  • CORS currently set to wildcard (*) for development"
log "  • Review and tighten CORS settings for production security"
log "  • Consider implementing rate limiting and authentication"
log ""
log "${BLUE}📚 MOVIE IMPORT COMMANDS${NC}"
log "======================="
log ""
log "Movie import commands:"
log "  - Daily import: cd $DEPLOY_DIR/scripts/data && ./import-movies.sh"
log "  - Full import (resumable): cd $DEPLOY_DIR/scripts/data && ./import-all-movies-resumable.sh"
log "  - Set up cron jobs: cd $DEPLOY_DIR/scripts/data && sudo ./setup-cron.sh"
log ""
log "${BLUE}🌐 NEXT STEPS${NC}"
log "=============="
log "  1. Configure DNS for phimgg.com to point to 154.205.142.255"
log "  2. Set up SSL certificate for HTTPS"
log "  3. Configure proper CORS for production security"
log "  4. Set up monitoring and alerting"
log "  5. Configure backup procedures"
log ""
log "Need help or encountered issues?"
log "  To easily restart the server: cd $DEPLOY_DIR && ./restart.sh"
log "  The comprehensive database fix is built directly into this script."
log "  This script can be run again at any time to fix both deployment and database issues."
log "  Manual server start: cd $DEPLOY_DIR && NODE_ENV=production ALLOWED_ORIGINS=* node dist/index.js"