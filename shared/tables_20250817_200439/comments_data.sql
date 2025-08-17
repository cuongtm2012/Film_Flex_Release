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
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (1, 1, 'tay-nghiep-du', 'asdfasdf', 0, 0, '2025-06-08 10:57:22.042');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (2, 1, 'tay-nghiep-du', 'asdfasdf', 0, 0, '2025-06-08 10:57:26.043');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (3, 7, 'luyen-khi-muoi-van-nam', '234asdfasdfasdf', 0, 0, '2025-06-08 10:58:05.076');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (4, 7, 'luyen-khi-muoi-van-nam', 'asdf234sdfga324234234', 0, 0, '2025-06-08 10:58:10.463');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (5, 7, 'muon-duoc-o-gan-em', 'asdfasdf', 0, 0, '2025-06-08 11:00:52.191');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (6, 7, 'muon-duoc-o-gan-em', 'wsdgwert234234', 0, 0, '2025-06-08 11:01:00.895');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (7, 1, 'hoa-giang-ho-chi-bat-luong-nhan-phan-7', 'sdfasdfa sdasd fasd fa2323 23 32 23', 1, 0, '2025-06-10 16:43:35.292');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (8, 1, 'hoa-giang-ho-chi-bat-luong-nhan-phan-7', ' asdfa sdasd fas43345345345', 0, 1, '2025-06-10 16:43:43.375');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (9, 1, 'hoa-giang-ho-chi-bat-luong-nhan-phan-7', 'sdfgsdf@admin asdgasdfga s', 0, 0, '2025-06-10 16:43:54.303');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (10, 1, 'dich-vu-chia-tay', 'ádfasdf ádf ád', 0, 0, '2025-06-10 16:54:50.529');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (11, 1, 'dich-vu-chia-tay', '232 23. 3. 3. 3 ', 0, 0, '2025-06-10 16:54:55.849');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (12, 1, 'dich-vu-chia-tay', ' ádf ádf32434 34', 0, 0, '2025-06-10 16:54:59.658');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (13, 1, 'hoa-giang-ho-chi-bat-luong-nhan-phan-7', 'cccccccccccccc', 0, 0, '2025-06-15 17:17:44.819');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (14, 1, 'hoa-giang-ho-chi-bat-luong-nhan-phan-7', 'zxvzxv gẻty ẻty ẻt ', 0, 0, '2025-06-15 17:17:49.903');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (17, 10, 'circle-hoa-ky-phan-5', 'ityuityn tyui', 0, 1, '2025-06-16 15:06:17.502');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (16, 10, 'circle-hoa-ky-phan-5', 'mrtyuurtun ỷtny ủ', 1, 0, '2025-06-16 15:06:13.606');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (15, 10, 'circle-hoa-ky-phan-5', 'fgjhfgjfgj', 1, 0, '2025-06-16 15:06:10.464');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (18, 10, 'circle-hoa-ky-phan-5', 'tyuityuit @test123999 ', 0, 0, '2025-06-16 15:06:25.928');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (19, 10, 'thon-thien-ky', 'asdfasd fasdf asdf asdfasd fasdfa sdf', 0, 0, '2025-06-16 15:14:43.935');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (20, 10, 'thon-thien-ky', ' asdfasdf asdf asd', 0, 0, '2025-06-16 15:14:49.66');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (21, 10, 'thon-thien-ky', 'asdf asdfa asd asd asd @test123999 ', 0, 0, '2025-06-16 15:14:56.08');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (22, 10, 'thon-thien-ky', ' afsdf adasfas asdf as45646 ertaert ada dsasd', 0, 0, '2025-06-16 15:15:20.488');
INSERT INTO public.comments (id, user_id, movie_slug, content, likes, dislikes, created_at) VALUES (23, 10, 'thon-thien-ky', ' sdfg sdfgs dfgsd ', 0, 0, '2025-06-16 15:15:26.89');


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.comments_id_seq', 23, true);


--
-- PostgreSQL database dump complete
--

