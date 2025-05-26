#!/usr/bin/env pwsh

# Update Production Database Script
# This script connects to the production server and updates the database schema

param(
    [string]$ServerIP = "38.54.115.156",
    [string]$Username = "root",
    [switch]$Help
)

if ($Help) {
    Write-Host @"
FilmFlex Production Database Update

This script connects to your production server and updates the database schema to match your local database.

Usage:
    .\update-production-db.ps1 [-ServerIP <IP>] [-Username <username>] [-Help]

Parameters:
    -ServerIP   : Production server IP address (default: 38.54.115.156)
    -Username   : SSH username (default: root)
    -Help       : Show this help message

Examples:
    .\update-production-db.ps1
    .\update-production-db.ps1 -ServerIP "38.54.115.156" -Username "root"
"@
    exit 0
}

# Define colors
$Red = [System.ConsoleColor]::Red
$Green = [System.ConsoleColor]::Green
$Yellow = [System.ConsoleColor]::Yellow
$Blue = [System.ConsoleColor]::Blue
$Cyan = [System.ConsoleColor]::Cyan

function Write-ColorOutput {
    param(
        [string]$Message,
        [System.ConsoleColor]$ForegroundColor = [System.ConsoleColor]::White
    )
    $currentColor = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $Host.UI.RawUI.ForegroundColor = $currentColor
}

function Write-Banner {
    Write-ColorOutput "" $Cyan
    Write-ColorOutput "===========================================" $Cyan
    Write-ColorOutput "    FilmFlex Production Database Update" $Cyan
    Write-ColorOutput "===========================================" $Cyan
    Write-ColorOutput "" $Cyan
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "🔄 $Message" $Blue
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" $Green
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️  $Message" $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" $Red
}

# Main execution
Write-Banner

Write-Step "Preparing database update for production server: $Username@$ServerIP"
Write-ColorOutput "You will be prompted for the server password (Cuongtm2012$)" $Yellow
Write-ColorOutput ""

# Check if SSH is available
try {
    $sshVersion = ssh -V 2>&1
    Write-Success "SSH client found: $sshVersion"
} catch {
    Write-Error "SSH client not found. Please install OpenSSH or use PuTTY."
    exit 1
}

Write-ColorOutput ""
Write-Step "Connecting to server and updating database schema..."
Write-ColorOutput ""

# Create the SSH command sequence for database update
$sshCommands = @"
echo "🔗 Connected to production server successfully!"
echo ""
echo "📋 Current directory: \$(pwd)"
echo ""

# Create database backup before update
echo "📦 Creating database backup..."
pg_dump -U filmflex -h localhost filmflex > /tmp/filmflex_backup_\$(date +%Y%m%d_%H%M%S).sql
if [ \$? -eq 0 ]; then
    echo "✅ Database backup created successfully"
else
    echo "⚠️  Warning: Backup creation failed, but continuing..."
fi

echo ""
echo "🔄 Updating database schema..."

# Create the complete schema update script
cat > /tmp/update_schema.sql << 'EOSQL'
-- FilmFlex Database Schema Update Script
-- This script updates the production database to match the local schema

\echo 'Starting FilmFlex database schema update...'

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

-- Update movies table with missing columns
ALTER TABLE movies ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS countries JSONB DEFAULT '[]'::jsonb;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS actors TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS directors TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS episode_current TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS episode_total TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP DEFAULT NOW() NOT NULL;

-- Update episodes table with missing columns
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS link_m3u8 TEXT;

-- Create permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create role_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE
);

-- Create sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

-- Update users table with missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Create view_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS view_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    movie_slug TEXT NOT NULL,
    last_viewed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    view_count INTEGER DEFAULT 1,
    progress INTEGER DEFAULT 0
);

-- Create watchlist table if it doesn't exist
CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    movie_slug TEXT NOT NULL,
    added_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_movies_episode ON movies(episode_current, episode_total);
CREATE INDEX IF NOT EXISTS idx_movies_section ON movies(section);
CREATE INDEX IF NOT EXISTS idx_movies_is_recommended ON movies(is_recommended);
CREATE INDEX IF NOT EXISTS idx_movies_modified_at ON movies(modified_at);
CREATE INDEX IF NOT EXISTS idx_episodes_movie_slug ON episodes(movie_slug);

-- Insert default roles if they don't exist
INSERT INTO roles (name, description) VALUES 
('admin', 'Administrator with full access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES 
('moderator', 'Moderator with content management access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES 
('normal', 'Normal user with basic access')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions if they don't exist
INSERT INTO permissions (name, description, module, action) VALUES 
('manage_users', 'Manage user accounts', 'users', 'manage'),
('manage_content', 'Manage movie content', 'movies', 'manage'),
('view_analytics', 'View system analytics', 'analytics', 'view'),
('moderate_comments', 'Moderate user comments', 'comments', 'moderate')
ON CONFLICT (name) DO NOTHING;

-- Grant ownership to filmflex user
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

\echo 'FilmFlex database schema update completed successfully!'
EOSQL

# Execute the schema update
echo "🚀 Executing database schema update..."
echo "Database: filmflex"
echo "User: filmflex"
echo ""

if PGPASSWORD="filmflex2024" psql -U filmflex -h localhost -d filmflex -f /tmp/update_schema.sql; then
    echo ""
    echo "✅ Database schema updated successfully!"
    echo ""
    echo "📊 Current database structure:"
    PGPASSWORD="filmflex2024" psql -U filmflex -h localhost -d filmflex -c "\dt"
    echo ""
    echo "🎯 Movie table structure:"
    PGPASSWORD="filmflex2024" psql -U filmflex -h localhost -d filmflex -c "\d movies"
else
    echo ""
    echo "❌ Database schema update failed!"
    echo "Check the error messages above for details."
    exit 1
fi

echo ""
echo "🔄 Restarting FilmFlex application to apply changes..."
pm2 restart filmflex

echo ""
echo "✅ Database update completed!"
echo "🌐 Your application should now be running with the updated schema."
echo ""
echo "Test the API: curl http://localhost:5000/api/health"
"@

try {
    # Execute SSH connection with the commands
    Write-ColorOutput "Connecting via SSH..." $Blue
    Write-ColorOutput "Password: Cuongtm2012$" $Yellow
    Write-ColorOutput ""
    
    # Use SSH to connect and execute the database update
    $sshCommands | ssh $Username@$ServerIP
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput ""
        Write-Success "Database update completed successfully!"
        Write-ColorOutput ""
        Write-ColorOutput "🎯 Your production database now matches your local schema!" $Green
        Write-ColorOutput ""
        Write-ColorOutput "📋 Next steps:" $Yellow
        Write-ColorOutput "1. Test your application: http://$ServerIP" $Cyan
        Write-ColorOutput "2. Import movie data if needed" $Cyan
        Write-ColorOutput "3. Check application logs: ssh $Username@$ServerIP" $Cyan
        Write-ColorOutput "   Then run: pm2 logs filmflex" $Cyan
    } else {
        Write-Warning "Database update may have encountered issues. Check the output above."
    }
    
} catch {
    Write-Error "Failed to connect to server: $($_.Exception.Message)"
    Write-ColorOutput ""
    Write-ColorOutput "Troubleshooting:" $Yellow
    Write-ColorOutput "1. Verify server IP: $ServerIP" $Cyan
    Write-ColorOutput "2. Verify username: $Username" $Cyan
    Write-ColorOutput "3. Verify password: Cuongtm2012$" $Cyan
    Write-ColorOutput "4. Check network connectivity" $Cyan
    Write-ColorOutput "5. Ensure SSH and PostgreSQL services are running" $Cyan
}

Write-ColorOutput ""
Write-ColorOutput "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
