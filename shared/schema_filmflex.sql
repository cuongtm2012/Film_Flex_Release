--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.analytics_events (
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


ALTER TABLE public.analytics_events OWNER TO filmflex;

--
-- Name: analytics_events_id_seq; Type: SEQUENCE; Schema: public; Owner: filmflex
--

CREATE SEQUENCE public.analytics_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.analytics_events_id_seq OWNER TO filmflex;

--
-- Name: analytics_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: filmflex
--

ALTER SEQUENCE public.analytics_events_id_seq OWNED BY public.analytics_events.id;


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.api_keys (
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


ALTER TABLE public.api_keys OWNER TO filmflex;

--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: filmflex
--

CREATE SEQUENCE public.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_keys_id_seq OWNER TO filmflex;

--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: filmflex
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: api_requests; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.api_requests (
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


ALTER TABLE public.api_requests OWNER TO filmflex;

--
-- Name: api_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: filmflex
--

CREATE SEQUENCE public.api_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_requests_id_seq OWNER TO filmflex;

--
-- Name: api_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: filmflex
--

ALTER SEQUENCE public.api_requests_id_seq OWNED BY public.api_requests.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    activity_type text NOT NULL,
    target_id integer,
    details jsonb,
    ip_address text,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO filmflex;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: filmflex
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO filmflex;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: filmflex
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    movie_slug text NOT NULL,
    content text NOT NULL,
    likes integer DEFAULT 0,
    dislikes integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comments OWNER TO filmflex;

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: filmflex
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.comments_id_seq OWNER TO filmflex;

--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: filmflex
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: content_approvals; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.content_approvals (
    id integer NOT NULL,
    movie_id integer NOT NULL,
    submitted_by_user_id integer NOT NULL,
    reviewed_by_user_id integer,
    status text DEFAULT 'pending'::text NOT NULL,
    submitted_at timestamp without time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp without time zone,
    comments text
);


ALTER TABLE public.content_approvals OWNER TO filmflex;

--
-- Name: content_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: filmflex
--

CREATE SEQUENCE public.content_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.content_approvals_id_seq OWNER TO filmflex;

--
-- Name: content_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: filmflex
--

ALTER SEQUENCE public.content_approvals_id_seq OWNED BY public.content_approvals.id;


--
-- Name: content_performance; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.content_performance (
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


ALTER TABLE public.content_performance OWNER TO filmflex;

--
-- Name: content_performance_id_seq; Type: SEQUENCE; Schema: public; Owner: filmflex
--

CREATE SEQUENCE public.content_performance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.content_performance_id_seq OWNER TO filmflex;

--
-- Name: content_performance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: filmflex
--

ALTER SEQUENCE public.content_performance_id_seq OWNED BY public.content_performance.id;


--
-- Name: episodes; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.episodes (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    movie_slug text NOT NULL,
    server_name text NOT NULL,
    filename text,
    link_embed text NOT NULL,
    link_m3u8 text
);


ALTER TABLE public.episodes OWNER TO filmflex;

--
-- Name: episodes_id_seq; Type: SEQUENCE; Schema: public; Owner: filmflex
--

CREATE SEQUENCE public.episodes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.episodes_id_seq OWNER TO filmflex;

--
-- Name: episodes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: filmflex
--

ALTER SEQUENCE public.episodes_id_seq OWNED BY public.episodes.id;


--
-- Name: movies; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.movies (
    id integer NOT NULL,
    movie_id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    origin_name text,
    poster_url text,
    thumb_url text,
    year integer,
    type text,
    quality text,
    lang text,
    "time" text,
    view integer DEFAULT 0,
    description text,
    status text DEFAULT 'ongoing'::text,
    trailer_url text,
    section text,
    is_recommended boolean DEFAULT false,
    categories jsonb DEFAULT '[]'::jsonb,
    countries jsonb DEFAULT '[]'::jsonb,
    actors text,
    directors text,
    episode_current text,
    episode_total text,
    modified_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.movies OWNER TO filmflex;

--
-- Name: movies_id_seq; Type: SEQUENCE; Schema: public; Owner: filmflex
--

CREATE SEQUENCE public.movies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.movies_id_seq OWNER TO filmflex;

--
-- Name: movies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: filmflex
--

ALTER SEQUENCE public.movies_id_seq OWNED BY public.movies.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    module text NOT NULL,
    action text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.permissions OWNER TO filmflex;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: filmflex
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO filmflex;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: filmflex
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO filmflex;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: filmflex
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO filmflex;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: filmflex
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO filmflex;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: filmflex
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO filmflex;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: filmflex
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.sessions (
    sid text NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO filmflex;

--
-- Name: users; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'normal'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    last_login timestamp without time zone
);


ALTER TABLE public.users OWNER TO filmflex;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: filmflex
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO filmflex;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: filmflex
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: view_history; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.view_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    movie_slug text NOT NULL,
    last_viewed_at timestamp without time zone DEFAULT now() NOT NULL,
    view_count integer DEFAULT 1,
    progress integer DEFAULT 0
);


ALTER TABLE public.view_history OWNER TO filmflex;

--
-- Name: view_history_id_seq; Type: SEQUENCE; Schema: public; Owner: filmflex
--

CREATE SEQUENCE public.view_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.view_history_id_seq OWNER TO filmflex;

--
-- Name: view_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: filmflex
--

ALTER SEQUENCE public.view_history_id_seq OWNED BY public.view_history.id;


--
-- Name: watchlist; Type: TABLE; Schema: public; Owner: filmflex
--

CREATE TABLE public.watchlist (
    id integer NOT NULL,
    user_id integer NOT NULL,
    movie_slug text NOT NULL,
    added_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.watchlist OWNER TO filmflex;

--
-- Name: watchlist_id_seq; Type: SEQUENCE; Schema: public; Owner: filmflex
--

CREATE SEQUENCE public.watchlist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.watchlist_id_seq OWNER TO filmflex;

--
-- Name: watchlist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: filmflex
--

ALTER SEQUENCE public.watchlist_id_seq OWNED BY public.watchlist.id;


--
-- Name: analytics_events id; Type: DEFAULT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.analytics_events ALTER COLUMN id SET DEFAULT nextval('public.analytics_events_id_seq'::regclass);


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: api_requests id; Type: DEFAULT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.api_requests ALTER COLUMN id SET DEFAULT nextval('public.api_requests_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: content_approvals id; Type: DEFAULT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.content_approvals ALTER COLUMN id SET DEFAULT nextval('public.content_approvals_id_seq'::regclass);


--
-- Name: content_performance id; Type: DEFAULT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.content_performance ALTER COLUMN id SET DEFAULT nextval('public.content_performance_id_seq'::regclass);


--
-- Name: episodes id; Type: DEFAULT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.episodes ALTER COLUMN id SET DEFAULT nextval('public.episodes_id_seq'::regclass);


--
-- Name: movies id; Type: DEFAULT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.movies ALTER COLUMN id SET DEFAULT nextval('public.movies_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: view_history id; Type: DEFAULT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.view_history ALTER COLUMN id SET DEFAULT nextval('public.view_history_id_seq'::regclass);


--
-- Name: watchlist id; Type: DEFAULT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.watchlist ALTER COLUMN id SET DEFAULT nextval('public.watchlist_id_seq'::regclass);


--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_unique; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_unique UNIQUE (key);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: api_requests api_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.api_requests
    ADD CONSTRAINT api_requests_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: content_approvals content_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.content_approvals
    ADD CONSTRAINT content_approvals_pkey PRIMARY KEY (id);


--
-- Name: content_performance content_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.content_performance
    ADD CONSTRAINT content_performance_pkey PRIMARY KEY (id);


--
-- Name: episodes episodes_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.episodes
    ADD CONSTRAINT episodes_pkey PRIMARY KEY (id);


--
-- Name: episodes episodes_slug_unique; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.episodes
    ADD CONSTRAINT episodes_slug_unique UNIQUE (slug);


--
-- Name: movies movies_movie_id_unique; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.movies
    ADD CONSTRAINT movies_movie_id_unique UNIQUE (movie_id);


--
-- Name: movies movies_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.movies
    ADD CONSTRAINT movies_pkey PRIMARY KEY (id);


--
-- Name: movies movies_slug_unique; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.movies
    ADD CONSTRAINT movies_slug_unique UNIQUE (slug);


--
-- Name: permissions permissions_name_unique; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_unique UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: view_history view_history_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.view_history
    ADD CONSTRAINT view_history_pkey PRIMARY KEY (id);


--
-- Name: watchlist watchlist_pkey; Type: CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_pkey PRIMARY KEY (id);


--
-- Name: idx_movies_episode; Type: INDEX; Schema: public; Owner: filmflex
--

CREATE INDEX idx_movies_episode ON public.movies USING btree (episode_current, episode_total);


--
-- Name: analytics_events analytics_events_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: api_keys api_keys_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: api_requests api_requests_api_key_id_api_keys_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.api_requests
    ADD CONSTRAINT api_requests_api_key_id_api_keys_id_fk FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE CASCADE;


--
-- Name: content_performance content_performance_movie_id_movies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.content_performance
    ADD CONSTRAINT content_performance_movie_id_movies_id_fk FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_permissions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_permissions_id_fk FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: filmflex
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO filmflex;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO filmflex;


--
-- PostgreSQL database dump complete
--

