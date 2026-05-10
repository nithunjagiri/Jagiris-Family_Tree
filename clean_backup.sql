--
-- PostgreSQL database dump
--

\restrict gkgDyUAtPou6cMqB8bTCRgjf2z1hKXGh7OexBbIsP4hKuieG8pAr71kpSmuUfLC

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    username character varying(255),
    action character varying(64) NOT NULL,
    entity_type character varying(64),
    entity_id integer,
    summary text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id integer NOT NULL,
    title character varying(200),
    event_date date,
    description text,
    family_id integer
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: families; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.families (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.families OWNER TO postgres;

--
-- Name: families_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.families_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.families_id_seq OWNER TO postgres;

--
-- Name: families_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.families_id_seq OWNED BY public.families.id;


--
-- Name: family_members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.family_members_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.family_members_id_seq OWNER TO postgres;

--
-- Name: family_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.family_members (
    id integer DEFAULT nextval('public.family_members_id_seq'::regclass) NOT NULL,
    name character varying(100),
    surname character varying(50),
    relation character varying(50),
    date_of_birth date,
    phone character varying(20),
    profile_photo text,
    father_id integer,
    mother_id integer,
    spouse_id integer,
    gender character varying(10),
    email character varying(100),
    birth_place character varying(100),
    occupation character varying(100),
    notes text,
    date_of_death date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_alive character varying(3) DEFAULT 'Yes'::character varying NOT NULL,
    birth_place_id integer,
    residence_place_id integer,
    education_level character varying(40),
    educational_qualification text,
    marital_status character varying(30),
    anniversary_date date,
    blood_group character varying(8),
    emergency_contact_name character varying(255),
    emergency_contact_phone character varying(32),
    privacy_level character varying(20),
    preferred_language character varying(64),
    biography text,
    instagram_id character varying(255),
    facebook_id character varying(255),
    created_by character varying(255),
    updated_by character varying(255),
    family_id integer,
    whatsapp_number character varying(32),
    residence_place character varying(500),
    CONSTRAINT family_members_is_alive_check CHECK (((is_alive)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying])::text[]))),
    CONSTRAINT family_members_marital_status_check CHECK (((marital_status IS NULL) OR ((marital_status)::text = ANY ((ARRAY['single'::character varying, 'married'::character varying, 'widowed'::character varying, 'divorced'::character varying, 'separated'::character varying, 'other'::character varying])::text[])))),
    CONSTRAINT family_members_privacy_level_check CHECK (((privacy_level IS NULL) OR ((privacy_level)::text = ANY ((ARRAY['public'::character varying, 'family'::character varying, 'admin_only'::character varying])::text[]))))
);


ALTER TABLE public.family_members OWNER TO postgres;

--
-- Name: family_memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.family_memberships (
    user_id integer NOT NULL,
    family_id integer NOT NULL,
    role character varying(32) DEFAULT 'member'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.family_memberships OWNER TO postgres;

--
-- Name: password_reset_otp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_otp (
    id integer NOT NULL,
    user_id integer NOT NULL,
    otp_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    attempts_remaining smallint DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.password_reset_otp OWNER TO postgres;

--
-- Name: password_reset_otp_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_otp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_otp_id_seq OWNER TO postgres;

--
-- Name: password_reset_otp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_otp_id_seq OWNED BY public.password_reset_otp.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO postgres;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: photos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.photos (
    id integer NOT NULL,
    title character varying(200),
    image_path text,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    family_id integer
);


ALTER TABLE public.photos OWNER TO postgres;

--
-- Name: photos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.photos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.photos_id_seq OWNER TO postgres;

--
-- Name: photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.photos_id_seq OWNED BY public.photos.id;


--
-- Name: places; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.places (
    id integer NOT NULL,
    name character varying(500) NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    family_id integer
);


ALTER TABLE public.places OWNER TO postgres;

--
-- Name: places_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.places_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.places_id_seq OWNER TO postgres;

--
-- Name: places_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.places_id_seq OWNED BY public.places.id;


--
-- Name: user_privacy_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_privacy_settings (
    user_id integer NOT NULL,
    privacy_notice_read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_privacy_settings OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    is_admin boolean DEFAULT false,
    first_name character varying(120),
    last_name character varying(120),
    gender character varying(32),
    phone character varying(64),
    date_of_birth date,
    is_active boolean DEFAULT true,
    city_village character varying(255),
    city character varying(255),
    village character varying(255)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: families id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.families ALTER COLUMN id SET DEFAULT nextval('public.families_id_seq'::regclass);


--
-- Name: password_reset_otp id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_otp ALTER COLUMN id SET DEFAULT nextval('public.password_reset_otp_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: photos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photos ALTER COLUMN id SET DEFAULT nextval('public.photos_id_seq'::regclass);


--
-- Name: places id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.places ALTER COLUMN id SET DEFAULT nextval('public.places_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.audit_logs VALUES (1, 1, 'nithun', 'place.create', 'place', 1, 'Marripally', '2026-04-19 00:55:59.513963+05:30');
INSERT INTO public.audit_logs VALUES (2, 1, 'nithun', 'member.update', 'family_member', 72, 'Shravya Sudhagoni', '2026-04-19 00:58:59.389517+05:30');
INSERT INTO public.audit_logs VALUES (3, 1, 'nithun', 'member.update', 'family_member', 71, 'Sowmya', '2026-04-19 00:59:23.992693+05:30');
INSERT INTO public.audit_logs VALUES (4, 1, 'nithun', 'place.create', 'place', 2, 'Vemulawada', '2026-04-19 01:05:20.239393+05:30');
INSERT INTO public.audit_logs VALUES (5, 1, 'nithun', 'account.privacy_ack', 'user', 1, 'Privacy notice acknowledged', '2026-04-19 01:06:57.449735+05:30');
INSERT INTO public.audit_logs VALUES (6, 1, 'nithun', 'member.update', 'family_member', 17, 'Shreyanvi Theegala', '2026-04-25 13:54:16.468632+05:30');
INSERT INTO public.audit_logs VALUES (7, 1, 'nithun', 'member.create', 'family_member', 73, 'Rajaiah Jagiri', '2026-04-25 14:25:12.910594+05:30');
INSERT INTO public.audit_logs VALUES (8, 1, 'nithun', 'member.create', 'family_member', 74, 'Chinna Mallamma Jagiri', '2026-04-25 14:26:09.679132+05:30');
INSERT INTO public.audit_logs VALUES (9, 1, 'nithun', 'member.create', 'family_member', 75, 'Eeraiah Jagiri', '2026-04-25 14:29:02.743145+05:30');
INSERT INTO public.audit_logs VALUES (10, 1, 'nithun', 'member.create', 'family_member', 76, 'Bathkavva Jagiri', '2026-04-25 14:29:58.679089+05:30');
INSERT INTO public.audit_logs VALUES (11, 1, 'nithun', 'member.update', 'family_member', 7, 'Narsaiah Jagiri', '2026-04-25 14:31:27.489269+05:30');
INSERT INTO public.audit_logs VALUES (12, 1, 'nithun', 'member.update', 'family_member', 73, 'Rajaiah Jagiri', '2026-04-25 14:32:19.331725+05:30');
INSERT INTO public.audit_logs VALUES (13, 1, 'nithun', 'member.update', 'family_member', 74, 'Chinna Mallamma Jagiri', '2026-04-25 14:32:57.432909+05:30');
INSERT INTO public.audit_logs VALUES (14, 2, 'sowmya', 'member.create', 'family_member', 77, 'Sowmya Jagiri', '2026-04-25 15:53:08.70293+05:30');
INSERT INTO public.audit_logs VALUES (15, 1, 'nithun', 'member.create', 'family_member', 78, 'Thapasvi Burra', '2026-04-25 16:29:06.5039+05:30');
INSERT INTO public.audit_logs VALUES (16, 1, 'nithun', 'member.create', 'family_member', 79, 'Manith Burra', '2026-04-25 16:30:21.853548+05:30');
INSERT INTO public.audit_logs VALUES (17, 1, 'nithun', 'member.create', 'family_member', 80, 'Harni Burra', '2026-04-25 16:32:30.580277+05:30');
INSERT INTO public.audit_logs VALUES (18, 1, 'nithun', 'member.create', 'family_member', 81, 'Advitha Burra', '2026-04-25 16:33:36.44498+05:30');
INSERT INTO public.audit_logs VALUES (19, 1, 'nithun', 'member.create', 'family_member', 82, 'Shiva kumar Burra', '2026-04-25 16:34:53.656838+05:30');
INSERT INTO public.audit_logs VALUES (20, 1, 'nithun', 'member.create', 'family_member', 83, 'Aadhya Burra', '2026-04-25 16:36:25.597536+05:30');
INSERT INTO public.audit_logs VALUES (21, 1, 'nithun', 'member.create', 'family_member', 84, 'Mounika Nerella', '2026-04-25 16:41:06.987515+05:30');
INSERT INTO public.audit_logs VALUES (22, 1, 'nithun', 'member.create', 'family_member', 85, 'Manasa Nerella', '2026-04-25 16:42:37.447494+05:30');
INSERT INTO public.audit_logs VALUES (23, 1, 'nithun', 'member.create', 'family_member', 86, 'Raju Nerella', '2026-04-25 16:43:44.045556+05:30');
INSERT INTO public.audit_logs VALUES (24, 1, 'nithun', 'member.update', 'family_member', 1, 'Nithun Jagiri', '2026-04-25 22:36:13.388191+05:30');
INSERT INTO public.audit_logs VALUES (25, 1, 'nithun', 'member.update', 'family_member', 3, 'Nihaan Sownith Jagiri', '2026-04-25 23:26:36.801022+05:30');
INSERT INTO public.audit_logs VALUES (26, 1, 'nithun', 'member.update', 'family_member', 2, 'Sowmya Jagiri', '2026-04-25 23:27:32.044698+05:30');
INSERT INTO public.audit_logs VALUES (27, 1, 'nithun', 'member.update', 'family_member', 4, 'Vrindha Vihari Jagiri', '2026-04-25 23:28:15.658934+05:30');
INSERT INTO public.audit_logs VALUES (28, 1, 'nithun', 'account.profile_update', 'user', 1, 'Profile updated', '2026-04-26 16:09:02.133729+05:30');
INSERT INTO public.audit_logs VALUES (29, 1, 'nithun', 'account.privacy_ack', 'user', 1, 'Privacy notice acknowledged', '2026-04-26 16:09:18.4275+05:30');
INSERT INTO public.audit_logs VALUES (30, 1, 'nithun', 'account.profile_update', 'user', 1, 'Profile updated', '2026-04-26 17:08:27.430255+05:30');
INSERT INTO public.audit_logs VALUES (31, 2, 'sowmya', 'account.profile_update', 'user', 2, 'Profile updated', '2026-04-26 17:11:42.619381+05:30');


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.events VALUES (1, 'Wedding Day', '2020-08-13', 'Wedding Celebration', 4);
INSERT INTO public.events VALUES (2, '1st Wedding Anniversary', '2021-08-13', 'Anniversary celebration', 4);
INSERT INTO public.events VALUES (3, '2nd Wedding Anniversary', '2022-08-13', 'Anniversary celebration', 4);
INSERT INTO public.events VALUES (4, 'Nihaan 2nd Birthday', '2024-04-19', 'Birthday celebration', 4);
INSERT INTO public.events VALUES (5, 'Nihaan Birthday', '2026-04-19', NULL, 4);


--
-- Data for Name: families; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.families VALUES (1, 'sowmya''s Family', 2, '2026-04-25 15:36:07.445524+05:30');
INSERT INTO public.families VALUES (2, 'dbg78433''s Family', 3, '2026-04-25 15:36:07.445524+05:30');
INSERT INTO public.families VALUES (3, 'dbg78069''s Family', 4, '2026-04-25 15:36:07.445524+05:30');
INSERT INTO public.families VALUES (4, 'nithun''s Family', 1, '2026-04-25 15:36:07.445524+05:30');


--
-- Data for Name: family_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.family_members VALUES (77, 'Sowmya', 'Jagiri', 'Self', '1996-10-17', '8185059184', NULL, NULL, NULL, NULL, 'Female', 'sowmyachitty20@gmail.com', 'Vallampatla', 'House wife', NULL, NULL, '2026-04-25 15:53:08.620541', '2026-04-25 15:53:08.620541', 'Yes', NULL, NULL, 'M.Sc Mathematics', NULL, 'married', '2020-08-13', 'O+ve', NULL, NULL, 'family', NULL, NULL, NULL, NULL, '2', '2', 1, NULL, NULL);
INSERT INTO public.family_members VALUES (81, 'Advitha', 'Burra', 'Niece', NULL, NULL, NULL, 52, 53, NULL, 'Female', NULL, 'Bollaram', NULL, NULL, NULL, '2026-04-25 16:33:36.385835', '2026-04-25 16:33:36.385835', 'Yes', NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '1', 4, NULL, NULL);
INSERT INTO public.family_members VALUES (85, 'Manasa', 'Nerella', 'Niece', NULL, NULL, NULL, 43, 31, NULL, 'Female', NULL, 'Jayaram', NULL, NULL, NULL, '2026-04-25 16:42:37.386272', '2026-04-25 16:42:37.386272', 'Yes', NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '1', 4, NULL, NULL);
INSERT INTO public.family_members VALUES (3, 'Nihaan Sownith', 'Jagiri', 'Son', '2022-04-19', '8247369705', '/uploads/profiles/1773493107752-xmotpp9l8za.jpg', 1, 2, NULL, 'Male', NULL, 'Marripally', 'student', NULL, NULL, '2026-03-14 19:39:01.632855', '2026-04-25 23:26:36.602362', 'Yes', 1, NULL, NULL, 'Nursery', 'single', NULL, 'O+', NULL, NULL, 'public', NULL, NULL, NULL, NULL, NULL, '1', 4, NULL, NULL);
INSERT INTO public.family_members VALUES (1, 'Nithun', 'Jagiri', 'Self', '1990-09-26', '9912200704', '/uploads/profiles/1773492768431-nu3ym2n4xsr.jpg', 5, 6, 2, 'Male', 'nithun018@gmail.com', 'Marripally', 'Software Developer', NULL, NULL, '2026-03-14 19:39:01.632855', '2026-04-25 23:27:31.823773', 'Yes', 1, NULL, NULL, 'M.Tech', 'married', '2020-08-13', 'O+', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', 4, NULL, NULL);
INSERT INTO public.family_members VALUES (4, 'Vrindha Vihari', 'Jagiri', 'Daughter', '2024-07-21', NULL, '/uploads/profiles/1773493197961-2i109cd1qxh.jpg', 1, 2, NULL, 'Female', NULL, 'Marripally', NULL, NULL, NULL, '2026-03-14 19:39:01.632855', '2026-04-25 23:28:15.588788', 'Yes', 1, NULL, NULL, NULL, 'single', NULL, 'O+', NULL, NULL, 'public', NULL, NULL, NULL, NULL, NULL, '1', 4, NULL, NULL);
INSERT INTO public.family_members VALUES (37, 'Jyothi', 'Nerella', 'Cousin', '1985-07-04', '9492805253', NULL, NULL, NULL, 36, 'Female', NULL, 'Kodimunja', 'Housewife', NULL, NULL, '2026-04-05 22:11:12.077684', '2026-04-18 16:39:22.0235', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (14, 'Aadhya', 'Jagiri', NULL, '2018-09-14', NULL, NULL, 11, 12, NULL, 'Female', NULL, 'Marripally', 'Student', NULL, NULL, '2026-03-14 23:56:20.711149', '2026-03-14 23:57:10.746883', 'Yes', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (13, 'Hardhik', 'Jagiri', NULL, '2014-02-12', NULL, NULL, 11, 12, NULL, 'Male', NULL, 'Marripally', NULL, NULL, NULL, '2026-03-14 23:55:02.433452', '2026-03-14 23:55:02.433452', 'Yes', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (11, 'Vinay', 'Jagiri', 'Brother', '1992-08-30', NULL, NULL, 5, 6, 12, 'Male', NULL, 'Marripally', 'Software Developer', NULL, NULL, '2026-03-14 23:53:02.591694', '2026-03-14 23:54:04.421991', 'Yes', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (5, 'Satyanarayana Goud', 'Jagiri', 'Father', '1969-08-09', '8187034882', NULL, 7, 8, 6, 'Male', NULL, 'Marripally', 'Politician', NULL, '2022-11-04', '2026-03-14 20:00:37.858523', '2026-03-14 22:00:07.543783', 'No', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (7, 'Narsaiah', 'Jagiri', 'Grand Father', NULL, NULL, NULL, 73, 74, 8, 'Male', NULL, 'Marripally', 'Farmer', NULL, '2008-04-16', '2026-03-14 21:57:59.075987', '2026-04-25 14:31:27.434794', 'No', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (30, 'Venkatesham', 'Nerella', 'Brother-in-law', '1968-12-31', NULL, NULL, 20, 19, 31, 'Male', NULL, 'Vemulawada', 'Private Job', NULL, NULL, '2026-04-05 21:54:12.723368', '2026-04-05 22:15:10.670372', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (8, 'Veeravva', 'Jagiri', 'Grand Mother', NULL, NULL, NULL, NULL, NULL, 7, 'Female', NULL, 'Vemulawada', 'Business', NULL, '2007-11-05', '2026-03-14 21:59:14.070362', '2026-04-25 14:31:27.434794', 'No', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (39, 'Pavani', 'Nerella', 'Cousin', '1986-12-31', NULL, NULL, NULL, NULL, 38, 'Female', NULL, 'Vemulawada', 'House wife', NULL, NULL, '2026-04-05 22:14:23.904195', '2026-04-18 16:47:29.649607', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (6, 'Jyothi', 'Jagiri', 'Mother', '1976-01-01', '9515752067', NULL, NULL, NULL, 5, 'Female', NULL, 'Malkapur', 'Politician', NULL, NULL, '2026-03-14 20:00:37.858523', NULL, 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (9, 'Rajesham', 'Nayini', 'Uncle', NULL, NULL, NULL, NULL, NULL, NULL, 'Male', NULL, 'Vallampatla', 'Farmer', NULL, NULL, '2026-03-14 22:02:20.623539', '2026-03-14 22:02:20.623539', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (10, 'Latha', 'Nayini', 'Aunty', NULL, NULL, NULL, NULL, NULL, 9, 'Female', NULL, 'Vallampatla', 'Tailer', NULL, NULL, '2026-03-14 22:02:59.153423', '2026-03-14 23:51:13.253134', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (12, 'Shravanthi', 'Jagiri', 'Cousin', '1993-09-15', NULL, NULL, NULL, NULL, 11, 'Female', NULL, 'Kadapa', 'House wife', NULL, NULL, '2026-03-14 23:53:54.628899', '2026-03-14 23:53:54.628899', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (78, 'Thapasvi', 'Burra', 'Niece', NULL, NULL, NULL, 50, 51, NULL, 'Female', NULL, 'Bollaram', NULL, NULL, NULL, '2026-04-25 16:29:06.427726', '2026-04-25 16:29:06.427726', 'Yes', NULL, 2, NULL, NULL, 'single', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '1', 4, NULL, NULL);
INSERT INTO public.family_members VALUES (82, 'Shiva kumar', 'Burra', 'Nephew', NULL, NULL, NULL, 52, 53, NULL, 'Male', NULL, 'Bollaram', NULL, NULL, NULL, '2026-04-25 16:34:53.595123', '2026-04-25 16:34:53.595123', 'Yes', NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '1', 4, NULL, NULL);
INSERT INTO public.family_members VALUES (86, 'Raju', 'Nerella', 'Nephew', NULL, NULL, NULL, 44, 45, NULL, 'Female', NULL, 'Jayaram', NULL, NULL, NULL, '2026-04-25 16:43:43.984406', '2026-04-25 16:43:43.984406', 'Yes', NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '1', 4, NULL, NULL);
INSERT INTO public.family_members VALUES (2, 'Sowmya', 'Jagiri', 'Wife', '1996-10-15', '8185089184', '/uploads/profiles/1773492813024-rg8xyxqebt.jpg', 9, 10, 1, 'Female', 'sowmyachitty20@gmail.com', 'Vallampatla', 'House Wife', NULL, NULL, '2026-03-14 19:39:01.632855', '2026-04-25 23:27:31.823773', 'Yes', NULL, NULL, NULL, 'M.Sc', 'married', '1996-10-17', 'O+', NULL, NULL, 'public', NULL, NULL, NULL, NULL, NULL, '1', 4, NULL, NULL);
INSERT INTO public.family_members VALUES (16, 'Srinivas', 'Theegala', 'Cousin', '1989-12-21', '9885318528', NULL, NULL, NULL, 15, 'Male', NULL, 'Aashireddypalle', 'Mechanical Engineer', NULL, NULL, '2026-03-14 23:59:16.605545', '2026-03-14 23:59:16.605545', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (27, 'Laxmirajam', 'Burra', 'Uncle', '1960-01-01', '9603261262', NULL, NULL, NULL, 26, 'Male', NULL, 'Bollaram', 'Agriculture', NULL, NULL, '2026-04-05 21:22:41.150781', '2026-04-05 21:22:41.150781', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (29, 'Sattaiah', 'Merugu', 'Uncle', '1965-01-01', NULL, NULL, NULL, NULL, 28, 'Male', NULL, 'Anupuram', 'Daily wager', NULL, NULL, '2026-04-05 21:26:10.529343', '2026-04-05 21:26:10.529343', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (53, 'Laxmi', 'Burra', 'Cousin', NULL, NULL, NULL, NULL, NULL, 52, 'Female', NULL, 'Baswapuram', 'House wife', NULL, NULL, '2026-04-18 17:14:44.101101', '2026-04-18 17:14:44.101101', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (25, 'Balaiah', 'Nerella', 'Uncle', '1954-12-29', NULL, NULL, NULL, NULL, 24, 'Male', NULL, 'Jayavaram', NULL, NULL, NULL, '2026-04-05 21:18:28.621865', '2026-04-18 02:43:52.672658', 'No', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (43, 'Rajesham', NULL, 'Cousin', NULL, NULL, NULL, NULL, NULL, 42, 'Male', NULL, 'Lingampeta', 'Agriculture', NULL, NULL, '2026-04-18 16:12:50.219036', '2026-04-18 16:12:50.219036', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (42, 'Padma', NULL, 'Sister-in-law', NULL, NULL, NULL, 25, 24, 43, 'Female', NULL, 'Jayavaram', 'House wife', NULL, NULL, '2026-04-18 16:11:31.004182', '2026-04-18 16:13:38.410507', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (45, 'Swapna', 'Nerella', 'Cousin', NULL, NULL, NULL, NULL, NULL, 44, 'Female', NULL, 'Bollaram', 'House wife', NULL, NULL, '2026-04-18 16:31:04.837851', '2026-04-18 16:31:04.837851', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (18, 'Thakshvi', 'Theegala', 'Niece', '2024-01-05', NULL, NULL, 16, 15, NULL, 'Female', NULL, 'Hyderabad', NULL, NULL, NULL, '2026-03-15 00:02:00.251857', '2026-04-18 16:49:05.346478', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (35, 'Srinivas', 'Sudhagoni', 'Cousin', '1971-12-31', NULL, NULL, NULL, NULL, 34, 'Male', NULL, 'Thangalapally', 'Business', NULL, NULL, '2026-04-05 22:07:21.335984', '2026-04-18 16:49:37.735743', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (47, 'Ramesh', 'Palli', 'Cousin', NULL, '9392734064', NULL, NULL, NULL, 46, 'Male', NULL, 'Enuganti', 'Agriculture', NULL, NULL, '2026-04-18 16:57:43.982449', '2026-04-18 16:57:43.982449', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (49, 'Saritha', 'Nerella', 'Cousin', NULL, NULL, NULL, NULL, NULL, 48, 'Female', NULL, 'Vanthadupula', 'House wife', NULL, NULL, '2026-04-18 17:02:04.482214', '2026-04-18 17:02:04.482214', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (48, 'Mahesh', 'Nerella', 'Brother-in-law', NULL, '9959724932', NULL, 25, 24, 49, 'Male', NULL, 'Jayavaram', 'Agriculture', NULL, NULL, '2026-04-18 17:00:39.148391', '2026-04-18 17:02:30.296989', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (44, 'Venkatesham', 'Nerella', 'Brother-in-law', NULL, '9491243443', NULL, 25, 24, 45, 'Male', NULL, 'Jayavaram', 'Agriculture', NULL, NULL, '2026-04-18 16:19:14.854735', '2026-04-18 17:03:09.31721', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (46, 'Rajamani', 'Palli', 'Sister-in-law', NULL, NULL, NULL, 25, 24, 47, 'Female', NULL, 'Jayavaram', 'Agriculture', NULL, NULL, '2026-04-18 16:55:22.691481', '2026-04-18 17:04:00.159194', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (51, 'Uma', 'Burra', 'Cousin', NULL, NULL, NULL, NULL, NULL, 50, 'Female', NULL, 'Konraopet', 'Agriculture', NULL, NULL, '2026-04-18 17:09:51.100458', '2026-04-18 17:09:51.100458', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (50, 'Srinivas', 'Burra', 'Brother-in-law', NULL, '9010844279', NULL, 27, 26, 51, 'Male', NULL, 'Bollaram', 'Agriculture', NULL, NULL, '2026-04-18 17:07:12.268331', '2026-04-18 17:10:21.950226', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (52, 'Suresh', 'Burra', 'Brother-in-law', NULL, '9959626348', NULL, 27, 26, 53, 'Male', NULL, 'Bollaram', 'Business', NULL, NULL, '2026-04-18 17:13:08.893824', '2026-04-18 17:15:06.33685', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (55, 'Mamatha', 'Burra', 'Cousin', NULL, NULL, NULL, NULL, NULL, 54, 'Female', NULL, 'Nizamabad', 'House wife', NULL, NULL, '2026-04-18 17:17:34.947396', '2026-04-18 17:17:34.947396', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (54, 'Prashanth', 'Burra', 'Brother-in-law', NULL, '9866569856', NULL, 27, 26, 55, 'Male', NULL, 'Bollaram', 'Agriculture', NULL, NULL, '2026-04-18 17:16:35.524208', '2026-04-18 17:18:04.094888', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (57, 'Kiran', NULL, 'Cousin', NULL, NULL, NULL, NULL, NULL, 56, 'Male', NULL, 'Namilikonda', NULL, NULL, NULL, '2026-04-18 17:20:32.908613', '2026-04-18 17:20:32.908613', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (56, 'Padma', NULL, 'Sister-in-law', NULL, NULL, NULL, 29, 28, 57, 'Female', NULL, 'Anupuram', 'House wife', NULL, NULL, '2026-04-18 17:19:45.47349', '2026-04-18 17:20:58.124792', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (59, 'Vanaja', 'Merugu', 'Cousin', NULL, NULL, NULL, NULL, NULL, 58, 'Female', NULL, NULL, 'Beedi worker', NULL, NULL, '2026-04-18 17:23:31.932666', '2026-04-18 17:23:31.932666', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (61, 'Vaishnavi', 'Merugu', 'Cousin', NULL, NULL, NULL, NULL, NULL, 60, 'Female', NULL, 'Nukalamarry', 'House wife', NULL, NULL, '2026-04-18 17:25:53.624498', '2026-04-18 17:25:53.624498', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (79, 'Manith', 'Burra', 'Nephew', NULL, NULL, NULL, 50, 51, NULL, 'Male', NULL, 'Bollaram', NULL, NULL, NULL, '2026-04-25 16:30:21.680243', '2026-04-25 16:30:21.680243', 'Yes', NULL, 2, NULL, NULL, 'single', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '1', 4, NULL, NULL);
INSERT INTO public.family_members VALUES (83, 'Aadhya', 'Burra', 'Niece', NULL, NULL, NULL, 54, 55, NULL, 'Female', NULL, 'Bollaram', NULL, NULL, NULL, '2026-04-25 16:36:25.536871', '2026-04-25 16:36:25.536871', 'Yes', NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '1', 4, NULL, NULL);
INSERT INTO public.family_members VALUES (60, 'Naresh', 'Merugu', 'Brother-in-law', NULL, '6281432195', NULL, 29, 28, 61, 'Male', NULL, 'Anupuram', NULL, NULL, NULL, '2026-04-18 17:25:05.02289', '2026-04-18 17:26:19.34872', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (58, 'Srinivas', 'Merugu', 'Brother-in-law', NULL, NULL, NULL, 29, 28, 59, 'Male', NULL, 'Anupuram', 'Gulf', NULL, NULL, '2026-04-18 17:22:13.022229', '2026-04-18 17:26:34.039412', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (63, 'Harish', 'Palakurthi', 'Niece-in-law', NULL, '9676226280', NULL, NULL, NULL, 62, 'Male', NULL, 'Sarampally', 'Business', NULL, NULL, '2026-04-18 22:28:11.756084', '2026-04-18 22:28:11.756084', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (65, 'Sowmya', 'Nerella', 'Nephew-In_law', NULL, NULL, NULL, NULL, NULL, 64, 'Female', NULL, 'Thangalapally', 'House wife', NULL, NULL, '2026-04-18 22:38:23.722868', '2026-04-18 22:38:23.722868', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (72, 'Shravya', 'Sudhagoni', 'Others', NULL, NULL, NULL, 35, 34, NULL, 'Female', NULL, 'Thangalapally', 'Student', NULL, NULL, '2026-04-19 00:20:10.075442', '2026-04-19 00:58:59.376708', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (71, 'Sowmya', NULL, NULL, NULL, '8522060951', NULL, 35, 34, NULL, 'Female', NULL, 'Thangalapally', 'Private Job', NULL, NULL, '2026-04-19 00:19:06.228396', '2026-04-19 00:59:23.983322', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (17, 'Shreyanvi', 'Theegala', 'Niece', '2019-07-21', NULL, NULL, 16, 15, NULL, 'Female', NULL, 'Hyderabad', 'Student', NULL, NULL, '2026-03-15 00:01:06.347697', '2026-04-25 13:54:16.398091', 'Yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (73, 'Rajaiah', 'Jagiri', 'Great Grandfather', NULL, NULL, NULL, 75, 76, 74, 'Male', NULL, 'Marripally', 'Agriculture/Toddy Topper', NULL, NULL, '2026-04-25 14:25:12.831377', '2026-04-25 14:32:57.374878', 'No', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (31, 'Padma', 'Nerella', 'Cousin', '1971-12-31', NULL, NULL, NULL, NULL, 30, 'Female', NULL, 'Marripally', 'House wife', NULL, NULL, '2026-04-05 21:57:20.75983', '2026-04-18 16:46:51.871906', 'Yes', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (76, 'Bathkavva', 'Jagiri', 'Great Great Grandmother', NULL, NULL, NULL, NULL, NULL, 75, 'Female', NULL, NULL, 'Agriculture', NULL, NULL, '2026-04-25 14:29:58.606941', '2026-04-25 14:29:58.606941', 'No', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (74, 'Chinna Mallamma', 'Jagiri', 'Great Grandmother', NULL, NULL, NULL, NULL, NULL, 73, 'Female', NULL, NULL, 'Agriculture', NULL, NULL, '2026-04-25 14:26:09.605196', '2026-04-25 14:32:57.374878', 'No', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (75, 'Eeraiah', 'Jagiri', 'Great Great Grandfather', NULL, NULL, NULL, NULL, NULL, 76, 'Male', NULL, 'Marripally', 'Agriculture/Toddy Topper', NULL, NULL, '2026-04-25 14:29:02.686167', '2026-04-25 14:29:58.606941', 'No', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (21, 'Ellavva', 'Sandragiri', 'Aunty', '1951-12-30', NULL, NULL, 7, 8, 22, 'Female', NULL, 'Marripally', NULL, NULL, NULL, '2026-04-05 21:11:12.436766', '2026-04-18 02:44:57.787944', 'No', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (23, 'Devaiah', 'Jagiri', 'Uncle', '1955-12-31', NULL, NULL, 7, 8, NULL, 'Male', NULL, 'Marripally', NULL, NULL, NULL, '2026-04-05 21:16:15.229915', '2026-04-18 02:44:48.247587', 'No', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (26, 'Gouravva', 'Burra', 'Aunty', '1961-12-31', '9951725530', NULL, 7, 8, 27, 'Female', NULL, 'Marripally', NULL, NULL, NULL, '2026-04-05 21:21:21.898529', '2026-04-18 02:19:31.573903', 'Yes', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (28, 'Laxmi', 'Merugu', 'Aunty', '1966-12-31', NULL, NULL, 7, 8, 29, 'Female', NULL, 'Marripally', 'Daily wager', NULL, NULL, '2026-04-05 21:25:15.523609', '2026-04-05 21:26:28.580174', 'Yes', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (24, 'Chandravva', 'Nerella', 'Aunty', '1959-12-31', '7032317246', NULL, 7, 8, 25, 'Female', NULL, 'Marripally', NULL, NULL, NULL, '2026-04-05 21:17:42.386509', '2026-04-05 21:18:38.384384', 'Yes', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (19, 'Rajavva', 'Nerella', 'Aunty', '1945-12-31', NULL, NULL, 7, 8, 20, 'Female', NULL, 'Marripally', NULL, NULL, NULL, '2026-04-05 16:35:15.983453', '2026-04-05 21:09:00.310227', 'Yes', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (15, 'Nivya', 'Jagiri', 'Sister', '1994-08-08', '9912200705', NULL, 5, 6, 16, 'Female', NULL, 'Marripally', 'Medical Coder', NULL, NULL, '2026-03-14 23:58:05.498005', '2026-03-14 23:59:32.163331', 'Yes', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (70, 'Aarush', 'Nerella', 'Nephew', '2022-08-04', NULL, NULL, 36, 37, NULL, 'Male', NULL, 'Vemulawada', 'Student', NULL, NULL, '2026-04-19 00:16:15.165315', '2026-04-19 00:16:15.165315', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (69, 'Mammulu', 'Nerella', 'Niece', NULL, NULL, NULL, 32, 33, NULL, 'Female', NULL, 'Vemulawada', 'Student', NULL, NULL, '2026-04-19 00:14:36.023144', '2026-04-19 00:14:36.023144', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (67, 'Pradeep', 'Nerella', 'Nephew', NULL, '8977737100', NULL, 32, 33, NULL, 'Male', NULL, 'Vemulawada', 'Photographer', NULL, NULL, '2026-04-19 00:11:54.369545', '2026-04-19 00:13:44.581257', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (68, 'Binnu', 'Nerella', 'Nephew', NULL, '8688236600', NULL, 32, 33, NULL, 'Male', NULL, 'Vemulawada', 'Private Job', NULL, NULL, '2026-04-19 00:13:13.843806', '2026-04-19 00:13:13.843806', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (66, 'Akhil', 'Nerella', 'Nephew', '1994-07-21', '8125691173', NULL, 30, 31, NULL, 'Male', NULL, 'Vemulawada', 'Business', NULL, NULL, '2026-04-18 23:24:52.48795', '2026-04-18 23:24:52.48795', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (64, 'Arun', 'Nerella', 'Nephew', NULL, '8179528163', NULL, 30, 31, 65, 'Male', NULL, 'Vemulawada', 'Reporter', NULL, NULL, '2026-04-18 22:36:33.831208', '2026-04-18 22:39:30.051002', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (62, 'Latha Sri', 'Palakurthi', 'Niece', '1990-09-02', '9959967053', NULL, 30, 31, 63, 'Female', NULL, 'Vemulawada', 'Private job', NULL, NULL, '2026-04-18 22:23:30.171664', '2026-04-18 22:32:57.507633', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (36, 'Shekar', 'Nerella', 'Brother-in-law', '1978-12-30', NULL, NULL, 20, 19, 37, 'Male', NULL, 'Vemulawada', 'Business', NULL, NULL, '2026-04-05 22:09:23.093043', '2026-04-18 16:48:31.896939', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (38, 'Raju', 'Nerella', 'Brother-in-law', '1981-12-30', '9848688585', NULL, 20, 19, 39, 'Male', NULL, 'Vemulawada', 'Busniess', NULL, NULL, '2026-04-05 22:13:08.733337', '2026-04-18 16:48:14.454438', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (33, 'Renuka', 'Nerella', 'Cousin', '1974-12-31', NULL, NULL, NULL, NULL, 32, 'Female', NULL, 'Vemulawada', 'house wife', NULL, NULL, '2026-04-05 22:00:57.833527', '2026-04-18 16:47:55.844552', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (34, 'Kala', 'Sudhagoni', 'Sister-in-law', '1974-12-30', NULL, NULL, 20, 19, 35, 'Female', NULL, 'Vemulawada', 'Hosue wife', NULL, NULL, '2026-04-05 22:04:24.504468', '2026-04-18 16:46:19.025716', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (32, 'Nalgondu', 'Nerella', 'Brother-in-law', '1969-12-30', NULL, NULL, 20, 19, 33, 'Male', NULL, 'Vemulawada', 'bussiness', NULL, NULL, '2026-04-05 21:59:44.632845', '2026-04-18 16:46:04.386963', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (40, 'Malleshwari', 'Sudagoni', 'Sister-in-law', NULL, '7036320059', NULL, 22, 21, NULL, 'Female', NULL, 'Vemulawada', 'Beedi worker', NULL, NULL, '2026-04-18 16:06:11.614002', '2026-04-18 16:08:43.985688', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (41, 'Mallesham', 'Sandragiri', 'Brother-in-law', NULL, NULL, NULL, 22, 21, NULL, 'Male', NULL, 'Vemulawada', 'Toddy Topper', NULL, NULL, '2026-04-18 16:08:08.752588', '2026-04-18 16:08:08.752588', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (20, 'Mallaiah', 'Nerella', 'Uncle', '1939-12-31', NULL, NULL, NULL, NULL, 19, 'Male', NULL, 'Vemulawada', NULL, NULL, NULL, '2026-04-05 21:08:27.052013', '2026-04-18 02:45:21.045192', 'No', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (22, 'Rajesham', 'Sandragiri', 'Uncle', '1950-01-01', NULL, NULL, NULL, NULL, 21, 'Male', NULL, 'Vemulawada', NULL, NULL, NULL, '2026-04-05 21:14:21.716474', '2026-04-05 21:14:21.716474', 'Yes', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL);
INSERT INTO public.family_members VALUES (80, 'Harni', 'Burra', 'Niece', NULL, NULL, NULL, 52, 53, NULL, 'Female', NULL, 'Bollaram', NULL, NULL, NULL, '2026-04-25 16:32:30.503087', '2026-04-25 16:32:30.503087', 'Yes', NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '1', 4, NULL, NULL);
INSERT INTO public.family_members VALUES (84, 'Mounika', 'Nerella', 'Niece', NULL, NULL, NULL, 43, 31, NULL, 'Female', NULL, 'Jayaram', NULL, NULL, NULL, '2026-04-25 16:41:06.928299', '2026-04-25 16:41:06.928299', 'Yes', NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1', '1', 4, NULL, NULL);


--
-- Data for Name: family_memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.family_memberships VALUES (2, 1, 'owner', '2026-04-25 15:36:07.45084+05:30');
INSERT INTO public.family_memberships VALUES (3, 2, 'owner', '2026-04-25 15:36:07.45084+05:30');
INSERT INTO public.family_memberships VALUES (4, 3, 'owner', '2026-04-25 15:36:07.45084+05:30');
INSERT INTO public.family_memberships VALUES (1, 4, 'owner', '2026-04-25 15:36:07.45084+05:30');
INSERT INTO public.family_memberships VALUES (2, 4, 'member', '2026-04-25 15:41:59.690503+05:30');
INSERT INTO public.family_memberships VALUES (3, 4, 'member', '2026-04-25 15:41:59.690503+05:30');
INSERT INTO public.family_memberships VALUES (4, 4, 'member', '2026-04-25 15:41:59.690503+05:30');


--
-- Data for Name: password_reset_otp; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.password_reset_otp VALUES (6, 1, 'dcac0e0cb280a17431027e7daa8de9135fcbaedff2f38c7dfc5ef3c9ce5e6080', '2026-04-26 16:05:48.093+05:30', 5, '2026-04-26 15:50:48.098622+05:30');


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.password_reset_tokens VALUES (2, 2, 'a1e77036db04de1011c268b7103d99f5264d0d9be295dfe9f3eb042de873874d', '2026-04-26 15:52:55.941+05:30', '2026-04-26 14:52:55.95966+05:30');


--
-- Data for Name: photos; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.photos VALUES (1, 'Family Trip', '/uploads/trip.jpg', '2026-03-14 16:46:33.361841', 4);
INSERT INTO public.photos VALUES (2, 'Birthday Celebration', '/uploads/birthday.jpg', '2026-03-14 16:46:33.361841', 4);


--
-- Data for Name: places; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.places VALUES (1, 'Marripally', 18.51487, 78.83096, NULL, '2026-04-19 00:55:59.500102+05:30', 4);
INSERT INTO public.places VALUES (2, 'Vemulawada', 18.47098, 78.86527, NULL, '2026-04-19 01:05:20.227004+05:30', 4);


--
-- Data for Name: user_privacy_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.user_privacy_settings VALUES (1, '2026-04-26 16:09:18.423981+05:30', '2026-04-19 01:06:57.43958+05:30', '2026-04-26 16:09:18.423981+05:30');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users VALUES (3, 'dbg78433', 'dbg78433@test.local', '$2a$10$cwhwNFCmjo2cr5IJ356WZeDiQUcTRvOxxSXCcpW6qOKj65b.ato0i', '2026-04-25 15:21:52.498688', false, NULL, NULL, NULL, NULL, NULL, true, NULL, NULL, NULL);
INSERT INTO public.users VALUES (4, 'dbg78069', 'dbg78069@test.local', '$2a$10$zZDX/D24i4xvwHfZ3DY05.bwpu5oiuTx2s4VnJM3K4jg.AOXwZ9dC', '2026-04-25 15:22:29.914509', false, NULL, NULL, NULL, NULL, NULL, true, NULL, NULL, NULL);
INSERT INTO public.users VALUES (2, 'sowmya', 'sowmyachitty20@gmail.com', '$2a$10$BXpqVE.6zPKi5x1Z/rLNDeR98brXhAl97ldjNt/JHDIxNNOAWrTMq', '2026-04-25 14:40:42.69064', false, 'Sowmya', 'Jagiri', 'female', '8185089184', '1996-10-17', true, NULL, 'Vemulawada', 'Marripally');
INSERT INTO public.users VALUES (1, 'nithun', 'nithun018@gmail.com', '$2a$10$YlSkDihOptrvv0HlAj9J6.Cpt0QC.DOPJdvlw8xyicNJZdLm9Caka', '2026-03-14 18:21:11.721776', true, 'Nithun', 'Jagiri', 'male', '8247369705', '1990-09-26', true, NULL, 'Vemulawada', 'Marripally');


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 31, true);


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.events_id_seq', 5, true);


--
-- Name: families_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.families_id_seq', 4, true);


--
-- Name: family_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.family_members_id_seq', 86, true);


--
-- Name: password_reset_otp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_reset_otp_id_seq', 7, true);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 2, true);


--
-- Name: photos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.photos_id_seq', 2, true);


--
-- Name: places_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.places_id_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: families families_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.families
    ADD CONSTRAINT families_pkey PRIMARY KEY (id);


--
-- Name: family_members family_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_members
    ADD CONSTRAINT family_members_pkey PRIMARY KEY (id);


--
-- Name: family_memberships family_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_memberships
    ADD CONSTRAINT family_memberships_pkey PRIMARY KEY (user_id, family_id);


--
-- Name: password_reset_otp password_reset_otp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_otp
    ADD CONSTRAINT password_reset_otp_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- Name: places places_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.places
    ADD CONSTRAINT places_pkey PRIMARY KEY (id);


--
-- Name: user_privacy_settings user_privacy_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_privacy_settings
    ADD CONSTRAINT user_privacy_settings_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_families_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_families_created_by ON public.families USING btree (created_by);


--
-- Name: idx_family_members_birth_place_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_family_members_birth_place_id ON public.family_members USING btree (birth_place_id);


--
-- Name: idx_family_members_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_family_members_created_by ON public.family_members USING btree (created_by);


--
-- Name: idx_family_members_residence_place_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_family_members_residence_place_id ON public.family_members USING btree (residence_place_id);


--
-- Name: idx_family_members_updated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_family_members_updated_by ON public.family_members USING btree (updated_by);


--
-- Name: idx_family_memberships_family_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_family_memberships_family_id ON public.family_memberships USING btree (family_id);


--
-- Name: idx_password_reset_otp_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_otp_expires ON public.password_reset_otp USING btree (expires_at);


--
-- Name: idx_password_reset_otp_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_otp_user_id ON public.password_reset_otp USING btree (user_id);


--
-- Name: idx_password_reset_token_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_token_hash ON public.password_reset_tokens USING btree (token_hash);


--
-- Name: idx_password_reset_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_places_lat_lng; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_places_lat_lng ON public.places USING btree (latitude, longitude);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: events events_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: families families_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.families
    ADD CONSTRAINT families_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: family_members family_members_birth_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_members
    ADD CONSTRAINT family_members_birth_place_id_fkey FOREIGN KEY (birth_place_id) REFERENCES public.places(id) ON DELETE SET NULL;


--
-- Name: family_members family_members_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_members
    ADD CONSTRAINT family_members_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: family_members family_members_residence_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_members
    ADD CONSTRAINT family_members_residence_place_id_fkey FOREIGN KEY (residence_place_id) REFERENCES public.places(id) ON DELETE SET NULL;


--
-- Name: family_memberships family_memberships_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_memberships
    ADD CONSTRAINT family_memberships_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: family_memberships family_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_memberships
    ADD CONSTRAINT family_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: family_members fk_father; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_members
    ADD CONSTRAINT fk_father FOREIGN KEY (father_id) REFERENCES public.family_members(id);


--
-- Name: family_members fk_mother; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_members
    ADD CONSTRAINT fk_mother FOREIGN KEY (mother_id) REFERENCES public.family_members(id);


--
-- Name: family_members fk_spouse; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_members
    ADD CONSTRAINT fk_spouse FOREIGN KEY (spouse_id) REFERENCES public.family_members(id);


--
-- Name: password_reset_otp password_reset_otp_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_otp
    ADD CONSTRAINT password_reset_otp_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: photos photos_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: places places_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.places
    ADD CONSTRAINT places_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: user_privacy_settings user_privacy_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_privacy_settings
    ADD CONSTRAINT user_privacy_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict gkgDyUAtPou6cMqB8bTCRgjf2z1hKXGh7OexBbIsP4hKuieG8pAr71kpSmuUfLC

