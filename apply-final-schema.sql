-- Apply Final Schema to Production Database
-- This script will safely update the production database to match shared/schema_filmflex.sql

-- Start transaction
BEGIN;

-- Check if filename column exists in episodes table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'episodes' AND column_name = 'filename'
    ) THEN
        -- Add filename column if it doesn't exist
        ALTER TABLE episodes ADD COLUMN filename text;
        RAISE NOTICE 'Added filename column to episodes table';
    ELSE
        RAISE NOTICE 'filename column already exists in episodes table';
    END IF;
END $$;

-- Ensure all required tables exist with correct structure
-- Create any missing tables from the schema

-- Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
    id integer NOT NULL,
    user_id integer,
    event_type text NOT NULL,
    properties jsonb DEFAULT '{}'::jsonb,
    session_id text,
    ip_address text,
    user_agent text,
    referrer text,
    device_type text,
    browser text,
    operating_system text,
    screen_resolution text,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    key text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone,
    last_used_at timestamp without time zone,
    rate_limit integer DEFAULT 1000,
    request_count integer DEFAULT 0,
    ip_restrictions jsonb DEFAULT '[]'::jsonb
);

-- API Requests
CREATE TABLE IF NOT EXISTS api_requests (
    id integer NOT NULL,
    api_key_id integer,
    endpoint text NOT NULL,
    method text NOT NULL,
    status integer NOT NULL,
    response_time integer NOT NULL,
    ip_address text,
    user_agent text,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    activity_type text NOT NULL,
    target_id integer,
    details jsonb,
    ip_address text,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);

-- Content Approvals
CREATE TABLE IF NOT EXISTS content_approvals (
    id integer NOT NULL,
    movie_id integer NOT NULL,
    submitted_by_user_id integer NOT NULL,
    reviewed_by_user_id integer,
    status text DEFAULT 'pending'::text NOT NULL,
    submitted_at timestamp without time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp without time zone,
    comments text
);

-- Content Performance
CREATE TABLE IF NOT EXISTS content_performance (
    id integer NOT NULL,
    movie_id integer NOT NULL,
    views integer DEFAULT 0,
    unique_viewers integer DEFAULT 0,
    completion_rate integer DEFAULT 0,
    average_watch_time integer DEFAULT 0,
    likes integer DEFAULT 0,
    dislikes integer DEFAULT 0,
    shares integer DEFAULT 0,
    click_through_rate integer DEFAULT 0,
    bounce_rate integer DEFAULT 0,
    date timestamp without time zone DEFAULT now() NOT NULL
);

-- Permissions
CREATE TABLE IF NOT EXISTS permissions (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    module text NOT NULL,
    action text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

-- Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);

-- View History
CREATE TABLE IF NOT EXISTS view_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    movie_slug text NOT NULL,
    last_viewed_at timestamp without time zone DEFAULT now() NOT NULL,
    view_count integer DEFAULT 1,
    progress integer DEFAULT 0
);

-- Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
    id integer NOT NULL,
    user_id integer NOT NULL,
    movie_slug text NOT NULL,
    added_at timestamp without time zone DEFAULT now() NOT NULL
);

-- Create sequences for all tables if they don't exist
CREATE SEQUENCE IF NOT EXISTS analytics_events_id_seq AS integer;
CREATE SEQUENCE IF NOT EXISTS api_keys_id_seq AS integer;
CREATE SEQUENCE IF NOT EXISTS api_requests_id_seq AS integer;
CREATE SEQUENCE IF NOT EXISTS audit_logs_id_seq AS integer;
CREATE SEQUENCE IF NOT EXISTS content_approvals_id_seq AS integer;
CREATE SEQUENCE IF NOT EXISTS content_performance_id_seq AS integer;
CREATE SEQUENCE IF NOT EXISTS permissions_id_seq AS integer;
CREATE SEQUENCE IF NOT EXISTS roles_id_seq AS integer;
CREATE SEQUENCE IF NOT EXISTS role_permissions_id_seq AS integer;
CREATE SEQUENCE IF NOT EXISTS view_history_id_seq AS integer;
CREATE SEQUENCE IF NOT EXISTS watchlist_id_seq AS integer;

-- Set sequence ownership
ALTER SEQUENCE analytics_events_id_seq OWNED BY analytics_events.id;
ALTER SEQUENCE api_keys_id_seq OWNED BY api_keys.id;
ALTER SEQUENCE api_requests_id_seq OWNED BY api_requests.id;
ALTER SEQUENCE audit_logs_id_seq OWNED BY audit_logs.id;
ALTER SEQUENCE content_approvals_id_seq OWNED BY content_approvals.id;
ALTER SEQUENCE content_performance_id_seq OWNED BY content_performance.id;
ALTER SEQUENCE permissions_id_seq OWNED BY permissions.id;
ALTER SEQUENCE roles_id_seq OWNED BY roles.id;
ALTER SEQUENCE role_permissions_id_seq OWNED BY role_permissions.id;
ALTER SEQUENCE view_history_id_seq OWNED BY view_history.id;
ALTER SEQUENCE watchlist_id_seq OWNED BY watchlist.id;

-- Set default values for id columns
ALTER TABLE analytics_events ALTER COLUMN id SET DEFAULT nextval('analytics_events_id_seq'::regclass);
ALTER TABLE api_keys ALTER COLUMN id SET DEFAULT nextval('api_keys_id_seq'::regclass);
ALTER TABLE api_requests ALTER COLUMN id SET DEFAULT nextval('api_requests_id_seq'::regclass);
ALTER TABLE audit_logs ALTER COLUMN id SET DEFAULT nextval('audit_logs_id_seq'::regclass);
ALTER TABLE content_approvals ALTER COLUMN id SET DEFAULT nextval('content_approvals_id_seq'::regclass);
ALTER TABLE content_performance ALTER COLUMN id SET DEFAULT nextval('content_performance_id_seq'::regclass);
ALTER TABLE permissions ALTER COLUMN id SET DEFAULT nextval('permissions_id_seq'::regclass);
ALTER TABLE roles ALTER COLUMN id SET DEFAULT nextval('roles_id_seq'::regclass);
ALTER TABLE role_permissions ALTER COLUMN id SET DEFAULT nextval('role_permissions_id_seq'::regclass);
ALTER TABLE view_history ALTER COLUMN id SET DEFAULT nextval('view_history_id_seq'::regclass);
ALTER TABLE watchlist ALTER COLUMN id SET DEFAULT nextval('watchlist_id_seq'::regclass);

-- Add primary keys if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analytics_events_pkey') THEN
        ALTER TABLE analytics_events ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_pkey') THEN
        ALTER TABLE api_keys ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_requests_pkey') THEN
        ALTER TABLE api_requests ADD CONSTRAINT api_requests_pkey PRIMARY KEY (id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_pkey') THEN
        ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_approvals_pkey') THEN
        ALTER TABLE content_approvals ADD CONSTRAINT content_approvals_pkey PRIMARY KEY (id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_performance_pkey') THEN
        ALTER TABLE content_performance ADD CONSTRAINT content_performance_pkey PRIMARY KEY (id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'permissions_pkey') THEN
        ALTER TABLE permissions ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_pkey') THEN
        ALTER TABLE roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_pkey') THEN
        ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'view_history_pkey') THEN
        ALTER TABLE view_history ADD CONSTRAINT view_history_pkey PRIMARY KEY (id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'watchlist_pkey') THEN
        ALTER TABLE watchlist ADD CONSTRAINT watchlist_pkey PRIMARY KEY (id);
    END IF;
END $$;

-- Add unique constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_key_unique') THEN
        ALTER TABLE api_keys ADD CONSTRAINT api_keys_key_unique UNIQUE (key);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'permissions_name_unique') THEN
        ALTER TABLE permissions ADD CONSTRAINT permissions_name_unique UNIQUE (name);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_name_unique') THEN
        ALTER TABLE roles ADD CONSTRAINT roles_name_unique UNIQUE (name);
    END IF;
END $$;

-- Set table ownership to filmflex
ALTER TABLE IF EXISTS analytics_events OWNER TO filmflex;
ALTER TABLE IF EXISTS api_keys OWNER TO filmflex;
ALTER TABLE IF EXISTS api_requests OWNER TO filmflex;
ALTER TABLE IF EXISTS audit_logs OWNER TO filmflex;
ALTER TABLE IF EXISTS comments OWNER TO filmflex;
ALTER TABLE IF EXISTS content_approvals OWNER TO filmflex;
ALTER TABLE IF EXISTS content_performance OWNER TO filmflex;
ALTER TABLE IF EXISTS episodes OWNER TO filmflex;
ALTER TABLE IF EXISTS movies OWNER TO filmflex;
ALTER TABLE IF EXISTS permissions OWNER TO filmflex;
ALTER TABLE IF EXISTS roles OWNER TO filmflex;
ALTER TABLE IF EXISTS role_permissions OWNER TO filmflex;
ALTER TABLE IF EXISTS sessions OWNER TO filmflex;
ALTER TABLE IF EXISTS users OWNER TO filmflex;
ALTER TABLE IF EXISTS view_history OWNER TO filmflex;
ALTER TABLE IF EXISTS watchlist OWNER TO filmflex;

-- Set sequence ownership to filmflex
ALTER SEQUENCE IF EXISTS analytics_events_id_seq OWNER TO filmflex;
ALTER SEQUENCE IF EXISTS api_keys_id_seq OWNER TO filmflex;
ALTER SEQUENCE IF EXISTS api_requests_id_seq OWNER TO filmflex;
ALTER SEQUENCE IF EXISTS audit_logs_id_seq OWNER TO filmflex;
ALTER SEQUENCE IF EXISTS comments_id_seq OWNER TO filmflex;
ALTER SEQUENCE IF EXISTS content_approvals_id_seq OWNER TO filmflex;
ALTER SEQUENCE IF EXISTS content_performance_id_seq OWNER TO filmflex;
ALTER SEQUENCE IF EXISTS episodes_id_seq OWNER TO filmflex;
ALTER SEQUENCE IF EXISTS movies_id_seq OWNER TO filmflex;
ALTER SEQUENCE IF EXISTS permissions_id_seq OWNER TO filmflex;
ALTER SEQUENCE IF EXISTS roles_id_seq OWNER TO filmflex;
ALTER SEQUENCE IF EXISTS role_permissions_id_seq OWNER TO filmflex;
ALTER SEQUENCE IF EXISTS users_id_seq OWNER TO filmflex;
ALTER SEQUENCE IF EXISTS view_history_id_seq OWNER TO filmflex;
ALTER SEQUENCE IF EXISTS watchlist_id_seq OWNER TO filmflex;

-- Commit transaction
COMMIT;

RAISE NOTICE 'Schema migration completed successfully!';
