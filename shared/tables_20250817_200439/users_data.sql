--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13 (Homebrew)
-- Dumped by pg_dump version 15.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, username, password, email, role, status, created_at, updated_at, last_login, google_id, avatar, display_name) VALUES (2, 'cuongtm2012', '33adcc417a6126a6bb3dac08612387894f47da93c23496c5d6075732dce1d893d10caeb586ad25be091597310733a9ee40b1114906df1ddb5d6926bbfb4da84b.10aad08eb91bd35e66777c2980e6dc33', 'cuongtm2012@gmail.com', 'normal', 'active', '2025-05-24 18:18:47.391', '2025-05-24 18:18:47.391', NULL, NULL, NULL, NULL);
INSERT INTO public.users (id, username, password, email, role, status, created_at, updated_at, last_login, google_id, avatar, display_name) VALUES (3, 'test1', '68aea9f77f42c935698c84f1e9ce67bf7f26142de81026f9d2530544d5a02623327924664afbe8b9466d4e9cc5bba313c9cd64f81ddff1e41abb6f6b3c605dfc.2117052221d616c2364f1be5d1c8b398', 'test1@gmail.com', 'normal', 'active', '2025-05-25 03:17:48.529', '2025-05-25 03:17:48.529', NULL, NULL, NULL, NULL);
INSERT INTO public.users (id, username, password, email, role, status, created_at, updated_at, last_login, google_id, avatar, display_name) VALUES (4, 'test6', '6a17e59227a825c80df2c0ec4f0684cd0c89bd9024da2ea35f98a2145d097e1ae75e34657b06f0a3b87c706784138d789885ca78d1facd7aa2fb9207e198b5e4.35d8d22d7ce58b379633679bdc5ad375', 'test8@gmail.com', 'normal', 'active', '2025-05-25 05:02:13.555', '2025-05-25 05:20:22.67', NULL, NULL, NULL, NULL);
INSERT INTO public.users (id, username, password, email, role, status, created_at, updated_at, last_login, google_id, avatar, display_name) VALUES (6, 'test12233', 'f9492e6758214966f0757d0fc6fb3f65dfa6547bdda5e62350bb4b3b3bec79339dda9c763d545d2a88521af812ba1f4156298eb4e88e606183c68f8d9bfc58f5.4f1c521c8cbcdeef614864a3d6c990c0', 'alsdkjf@gmail.com', 'normal', 'active', '2025-06-08 10:47:34.47', '2025-06-08 10:47:34.47', NULL, NULL, NULL, NULL);
INSERT INTO public.users (id, username, password, email, role, status, created_at, updated_at, last_login, google_id, avatar, display_name) VALUES (7, 'test123', '322a34e22505a85ebeacf69cbccad5446e368abc692b010b5c1d3c5bc6474f3ee79b0f1edbf1e098ac5f3f2e5014fa986c767d113e56b3a96fe9ed4b87e20369.ae0b674c5ec5f0180cc592b2420efca3', 'asdf@gmail.com', 'normal', 'active', '2025-06-08 10:57:52.597', '2025-06-08 11:05:51.76', NULL, NULL, NULL, 'asdfas2 213123 1 231 ');
INSERT INTO public.users (id, username, password, email, role, status, created_at, updated_at, last_login, google_id, avatar, display_name) VALUES (9, 'test123333', '51fc1dabf2f7694e1ada6b54c6a10271c014df6ed225f144e5ca9295019378c671948f96aacb5453a0a0e0f47f1f36a6eba5f81c894a72771403e5a6c50ba9ff.5e7a52cbb8d38df1264e21f254ad88df', 'asdfas33df@gmail.com', 'normal', 'inactive', '2025-06-10 16:07:27.895', '2025-06-10 16:17:20.475', NULL, NULL, NULL, NULL);
INSERT INTO public.users (id, username, password, email, role, status, created_at, updated_at, last_login, google_id, avatar, display_name) VALUES (8, 'test123324234', 'e4c8918f0a3c2d0af85c5a9a82693cb3c6dcb50fb2bca600ebf68c2bb069cdb26bd59b62c163b49161c67e15d76cdc92d864f691fedd800d05c3efb1a75b5fcb.6fba716aca777c4b8809d094d1898c62', 'asdfafasdf@gmail.com', 'moderator', 'active', '2025-06-10 16:02:40.954', '2025-06-10 16:17:27.288', NULL, NULL, NULL, NULL);
INSERT INTO public.users (id, username, password, email, role, status, created_at, updated_at, last_login, google_id, avatar, display_name) VALUES (1, 'admin', '1a1046863648f98385ed929dd7068fcfcb796dd305c3046eace85119c7f00f56d7a318b08909e43e5fd06844a388518deeb04adfa191f8414f01771eac907a4e.f0d750afba420a285f0450093d00a44f', 'admin@filmflex.example', 'admin', 'active', '2025-05-18 12:00:16.477045', '2025-06-10 16:41:07.242', '2025-05-24 18:19:54.227', NULL, NULL, 'AAAAAAAA123123123');
INSERT INTO public.users (id, username, password, email, role, status, created_at, updated_at, last_login, google_id, avatar, display_name) VALUES (10, 'test123999', 'f31e9448c566b356e1dd655a025d057b261d943bca97c921ad999f14d88b87421c5c419b33dff96723a525ebb5a3320733de04126214851d4a9a6d0cce8719c8.c379e29efee04bed1a09b685fa67a0e0', 'asdfa@gmail.com', 'normal', 'active', '2025-06-16 14:13:10.401', '2025-06-16 14:29:58.675', NULL, NULL, NULL, 'AAAAAAAAAA');


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 10, true);


--
-- PostgreSQL database dump complete
--

