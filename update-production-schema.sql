-- FilmFlex Production Database Schema Update Script
-- This script updates your production database to match the complete local schema
-- Run this on your production server: PGPASSWORD="filmflex2024" psql -U filmflex -h localhost -d filmflex -f update-schema.sql

\echo 'Starting FilmFlex database schema update...'
\echo ''

-- Create analytics_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    event_type TEXT NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    device_type TEXT,
    browser TEXT,
    operating_system TEXT,
    screen_resolution TEXT,
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);
\echo 'Analytics events table created/verified'

-- Create api_keys table if it doesn't exist
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active' NOT NULL,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    rate_limit INTEGER DEFAULT 1000,
    request_count INTEGER DEFAULT 0,
    ip_restrictions JSONB DEFAULT '[]'::jsonb
);
\echo 'API keys table created/verified'

-- Create api_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS api_requests (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status INTEGER NOT NULL,
    response_time INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);
\echo 'API requests table created/verified'

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    activity_type TEXT NOT NULL,
    target_id INTEGER,
    details JSONB,
    ip_address TEXT,
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);
\echo 'Audit logs table created/verified'

-- Create comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    movie_slug TEXT NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
\echo 'Comments table created/verified'

-- Create content_approvals table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_approvals (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL,
    submitted_by_user_id INTEGER NOT NULL,
    reviewed_by_user_id INTEGER,
    status TEXT DEFAULT 'pending' NOT NULL,
    submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
    reviewed_at TIMESTAMP,
    comments TEXT
);
\echo 'Content approvals table created/verified'

-- Create content_performance table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_performance (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    completion_rate INTEGER DEFAULT 0,
    average_watch_time INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    click_through_rate INTEGER DEFAULT 0,
    bounce_rate INTEGER DEFAULT 0,
    date TIMESTAMP DEFAULT NOW() NOT NULL
);
\echo 'Content performance table created/verified'

-- Update movies table with missing columns
\echo 'Updating movies table with missing columns...'
ALTER TABLE movies ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS countries JSONB DEFAULT '[]'::jsonb;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS actors TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS directors TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS episode_current TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS episode_total TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP DEFAULT NOW() NOT NULL;
\echo 'Movies table updated'

-- Update episodes table with missing columns
\echo 'Updating episodes table with missing columns...'
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS link_m3u8 TEXT;
\echo 'Episodes table updated'

-- Create permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
\echo 'Permissions table created/verified'

-- Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
\echo 'Roles table created/verified'

-- Create role_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE
);
\echo 'Role permissions table created/verified'

-- Create sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);
\echo 'Sessions table created/verified'

-- Update users table with missing columns
\echo 'Updating users table with missing columns...'
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
\echo 'Users table updated'

-- Create view_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS view_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    movie_slug TEXT NOT NULL,
    last_viewed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    view_count INTEGER DEFAULT 1,
    progress INTEGER DEFAULT 0
);
\echo 'View history table created/verified'

-- Create watchlist table if it doesn't exist
CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    movie_slug TEXT NOT NULL,
    added_at TIMESTAMP DEFAULT NOW() NOT NULL
);
\echo 'Watchlist table created/verified'

-- Create missing indexes
\echo 'Creating missing indexes...'
CREATE INDEX IF NOT EXISTS idx_movies_episode ON movies(episode_current, episode_total);
CREATE INDEX IF NOT EXISTS idx_movies_section ON movies(section);
CREATE INDEX IF NOT EXISTS idx_movies_is_recommended ON movies(is_recommended);
CREATE INDEX IF NOT EXISTS idx_movies_modified_at ON movies(modified_at);
CREATE INDEX IF NOT EXISTS idx_episodes_movie_slug ON episodes(movie_slug);
\echo 'Indexes created'

-- Insert default roles if they don't exist
\echo 'Setting up default roles...'
INSERT INTO roles (name, description) VALUES 
('admin', 'Administrator with full access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES 
('moderator', 'Moderator with content management access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES 
('normal', 'Normal user with basic access')
ON CONFLICT (name) DO NOTHING;
\echo 'Default roles created'

-- Insert default permissions if they don't exist
\echo 'Setting up default permissions...'
INSERT INTO permissions (name, description, module, action) VALUES 
('manage_users', 'Manage user accounts', 'users', 'manage'),
('manage_content', 'Manage movie content', 'movies', 'manage'),
('view_analytics', 'View system analytics', 'analytics', 'view'),
('moderate_comments', 'Moderate user comments', 'comments', 'moderate'),
('create_api_keys', 'Create and manage API keys', 'api', 'manage'),
('approve_content', 'Approve pending content', 'content', 'approve')
ON CONFLICT (name) DO NOTHING;
\echo 'Default permissions created'

-- Set up role-permission relationships
\echo 'Setting up role-permission relationships...'
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'moderator' AND p.name IN ('manage_content', 'moderate_comments', 'approve_content')
ON CONFLICT DO NOTHING;
\echo 'Role-permission relationships created'

-- Grant ownership to filmflex user
\echo 'Setting table ownership...'
ALTER TABLE analytics_events OWNER TO filmflex;
ALTER TABLE api_keys OWNER TO filmflex;
ALTER TABLE api_requests OWNER TO filmflex;
ALTER TABLE audit_logs OWNER TO filmflex;
ALTER TABLE comments OWNER TO filmflex;
ALTER TABLE content_approvals OWNER TO filmflex;
ALTER TABLE content_performance OWNER TO filmflex;
ALTER TABLE permissions OWNER TO filmflex;
ALTER TABLE roles OWNER TO filmflex;
ALTER TABLE role_permissions OWNER TO filmflex;
ALTER TABLE sessions OWNER TO filmflex;
ALTER TABLE view_history OWNER TO filmflex;
ALTER TABLE watchlist OWNER TO filmflex;
\echo 'Table ownership set'

-- Display summary
\echo ''
\echo '=== FilmFlex Database Schema Update Summary ==='
\echo 'Tables in database:'
\dt

\echo ''
\echo 'Movies table structure:'
\d movies

\echo ''
\echo 'Episodes table structure:'
\d episodes

\echo ''
\echo 'Users table structure:'
\d users

\echo ''
\echo '✅ FilmFlex database schema update completed successfully!'
\echo 'Your production database now matches your local schema.'
\echo ''
