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
-- Data for Name: watchlist; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.watchlist (id, user_id, movie_slug, added_at) VALUES (1, 3, 'anh-hung-dot-bien-x', '2025-05-28 17:05:52.403');
INSERT INTO public.watchlist (id, user_id, movie_slug, added_at) VALUES (2, 3, 'tay-nghiep-du', '2025-05-28 17:06:12.663');
INSERT INTO public.watchlist (id, user_id, movie_slug, added_at) VALUES (3, 3, 'quy-co-seon-ju-phuc-thu', '2025-05-28 17:25:51.014');
INSERT INTO public.watchlist (id, user_id, movie_slug, added_at) VALUES (4, 7, 'tay-nghiep-du', '2025-06-08 11:01:50.486');
INSERT INTO public.watchlist (id, user_id, movie_slug, added_at) VALUES (5, 1, 'ba-vuong-hoc-duong-phan-2', '2025-06-10 16:41:40.514');
INSERT INTO public.watchlist (id, user_id, movie_slug, added_at) VALUES (6, 1, 'hoa-giang-ho-chi-bat-luong-nhan-phan-7', '2025-06-10 16:43:21.205');
INSERT INTO public.watchlist (id, user_id, movie_slug, added_at) VALUES (7, 10, 'anh-hung-dot-bien-x', '2025-06-16 14:13:32.202');
INSERT INTO public.watchlist (id, user_id, movie_slug, added_at) VALUES (8, 10, 'doi-tac-dang-ngo-2025', '2025-06-16 14:13:45.811');


--
-- Name: watchlist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.watchlist_id_seq', 8, true);


--
-- PostgreSQL database dump complete
--

