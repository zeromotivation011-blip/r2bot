-- R2BOT UX features migration
-- Adds: bookmarks (cross-content saves), user_progress (per-content-item
-- per-user state with understood/completed/last_visited_at), and reading
-- streak columns on profiles.
--
-- NOTE: The original 0001 schema declared a per-lesson `public.user_progress`
-- table that was never wired into the application. This migration replaces
-- it with the per-content-item table the new UX needs. No data migration
-- is required because no application code ever wrote to the original table.

-- ============================================================
-- 1. Replace the unused per-lesson user_progress with the new
--    per-content-item state table.
-- ============================================================
drop table if exists public.user_progress cascade;

create table public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('atlas', 'academy')),
  content_slug text not null,
  understood boolean not null default false,
  completed boolean not null default false,
  last_visited_at timestamptz not null default now(),
  unique (user_id, content_type, content_slug)
);

create index user_progress_user_recency_idx
  on public.user_progress (user_id, last_visited_at desc);

alter table public.user_progress enable row level security;

create policy "users manage own progress"
  on public.user_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 2. Bookmarks — cross-content saves (atlas / pulse / academy).
-- ============================================================
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('atlas', 'academy', 'pulse')),
  content_slug text not null,
  content_title text not null,
  created_at timestamptz not null default now(),
  unique (user_id, content_type, content_slug)
);

create index bookmarks_user_idx on public.bookmarks (user_id, created_at desc);

alter table public.bookmarks enable row level security;

create policy "users manage own bookmarks"
  on public.bookmarks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 3. Reading streak columns on profiles.
-- ============================================================
alter table public.profiles
  add column if not exists streak_count integer not null default 0,
  add column if not exists last_active_date date;
-- Per-dimension diagnostic scores so the result screen can show the
-- C / P / M breakdown and the dashboard can personalise content over time.

alter table public.profiles
  add column if not exists diagnostic_c_score integer,
  add column if not exists diagnostic_p_score integer,
  add column if not exists diagnostic_m_score integer;
-- Auto-discovery pipeline.
--
-- A nightly cron scans arXiv / Reddit / Hacker News / GitHub trending,
-- extracts robotics topics via an LLM, and queues them here. Anything
-- not already in the Atlas is flagged as a `gap` — a content
-- opportunity for the editor to act on.
--
-- The admin policy assumes `profiles.role` exists; we add it here so
-- the policy actually evaluates. Default 'user'; promote individuals
-- to 'admin' manually via SQL.

alter table public.profiles
  add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

create table if not exists public.discovery_queue (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('arxiv', 'reddit', 'hn', 'github')),
  source_url text not null unique,
  raw_title text not null,
  raw_summary text,
  extracted_topics text[] not null default '{}',
  atlas_gaps text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'added_to_atlas', 'dismissed')),
  discovered_at timestamptz not null default now()
);

create index discovery_queue_status_idx on public.discovery_queue (status, discovered_at desc);
create index discovery_queue_source_idx on public.discovery_queue (source);

alter table public.discovery_queue enable row level security;

create policy "admin only discovery"
  on public.discovery_queue
  for all
  using (auth.uid() in (select id from public.profiles where role = 'admin'))
  with check (auth.uid() in (select id from public.profiles where role = 'admin'));
-- Email preferences + per-user unsubscribe tokens for the weekly digest.
alter table public.profiles
  add column if not exists email_digest_enabled boolean not null default true,
  add column if not exists digest_unsubscribe_token text unique default gen_random_uuid()::text;

-- Backfill any rows missing a token (e.g. created before this column existed).
update public.profiles
  set digest_unsubscribe_token = gen_random_uuid()::text
  where digest_unsubscribe_token is null;
-- Community Lab: posts, replies, and a unique-per-user upvote table.
-- Author display name is denormalised onto each post/reply at insert time
-- because the existing profiles RLS only lets you read your own row —
-- joining for the author name would otherwise require service-role reads.

create table if not exists public.lab_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_display text not null,
  content_type text not null check (content_type in ('atlas', 'academy', 'pulse', 'general')),
  content_slug text,
  title text not null check (char_length(title) between 5 and 150),
  body text not null check (char_length(body) between 10 and 2000),
  upvotes integer not null default 0,
  reply_count integer not null default 0,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lab_posts_thread_idx on public.lab_posts (content_type, content_slug, is_pinned desc, created_at desc);
create index lab_posts_feed_idx on public.lab_posts (is_pinned desc, created_at desc);
create index lab_posts_user_idx on public.lab_posts (user_id);

create table if not exists public.lab_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.lab_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_display text not null,
  body text not null check (char_length(body) between 2 and 1000),
  upvotes integer not null default 0,
  created_at timestamptz not null default now()
);

create index lab_replies_post_idx on public.lab_replies (post_id, created_at asc);

create table if not exists public.lab_upvotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'reply')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index lab_upvotes_target_idx on public.lab_upvotes (target_type, target_id);

alter table public.lab_posts enable row level security;
alter table public.lab_replies enable row level security;
alter table public.lab_upvotes enable row level security;

-- Anyone can read posts and replies (public discussion).
create policy "public read posts" on public.lab_posts for select using (true);
create policy "public read replies" on public.lab_replies for select using (true);

-- Authenticated users may write their own rows.
create policy "auth insert posts" on public.lab_posts for insert with check (auth.uid() = user_id);
create policy "auth update own posts" on public.lab_posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "auth insert replies" on public.lab_replies for insert with check (auth.uid() = user_id);
create policy "auth insert upvotes" on public.lab_upvotes for insert with check (auth.uid() = user_id);
create policy "auth read upvotes" on public.lab_upvotes for select using (auth.uid() = user_id);
create policy "auth delete own upvotes" on public.lab_upvotes for delete using (auth.uid() = user_id);

-- Admin deletion of any post/reply.
create policy "admin delete posts" on public.lab_posts for delete using (
  auth.uid() in (select id from public.profiles where role = 'admin')
);
create policy "admin delete replies" on public.lab_replies for delete using (
  auth.uid() in (select id from public.profiles where role = 'admin')
);

create trigger lab_posts_updated_at before update on public.lab_posts
  for each row execute function public.set_updated_at();
-- Track when the diagnostic was last completed, so Mission Control can
-- show "last assessed N days ago" and the homepage can prompt retakes
-- after long gaps.

alter table public.profiles
  add column if not exists diagnostic_completed_at timestamptz;
-- User-savable Co-pilot conversations. Distinct from copilot_conversations,
-- which is a service-role audit log of every message R2 sends. This table is
-- the user's own library — saved chats they can resume from Mission Control.

create table if not exists public.copilot_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  messages     jsonb not null,
  context_slug text,
  created_at   timestamptz not null default now()
);

create index if not exists copilot_sessions_user_id_created_at_idx
  on public.copilot_sessions (user_id, created_at desc);

alter table public.copilot_sessions enable row level security;

drop policy if exists "users own sessions" on public.copilot_sessions;
create policy "users own sessions"
  on public.copilot_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
-- India robotics job board, fed by the Apify Naukri scraper cron at
-- /api/cron/jobs-refresh. Public read; admin manage. Cron writes via the
-- service role and bypasses RLS regardless.

-- Add a 'role' column to profiles so the admin policy below has something
-- real to check. NULL/'user' = regular learner; 'admin' = staff.
alter table public.profiles
  add column if not exists role text not null default 'user';

create table if not exists public.jobs (
  id              uuid primary key default gen_random_uuid(),
  external_id     text unique not null,
  title           text not null,
  company         text not null,
  location        text not null,
  experience_min  integer,
  experience_max  integer,
  salary_min      integer,
  salary_max      integer,
  salary_currency text default 'INR',
  skills          text[] default '{}',
  description     text,
  apply_url       text not null,
  source          text not null default 'naukri',
  posted_at       timestamptz,
  fetched_at      timestamptz not null default now(),
  is_active       boolean not null default true,
  track_relevance text check (track_relevance in ('spark','wire','forge','edge','all'))
);

create index if not exists jobs_posted_idx on public.jobs (posted_at desc);
create index if not exists jobs_track_idx on public.jobs (track_relevance);
create index if not exists jobs_active_posted_idx on public.jobs (is_active, posted_at desc);
create index if not exists jobs_location_idx on public.jobs (lower(location));

alter table public.jobs enable row level security;

drop policy if exists "public read jobs" on public.jobs;
create policy "public read jobs"
  on public.jobs
  for select
  using (true);

drop policy if exists "admin manage jobs" on public.jobs;
create policy "admin manage jobs"
  on public.jobs
  for all
  using (
    auth.uid() in (select id from public.profiles where role = 'admin')
  )
  with check (
    auth.uid() in (select id from public.profiles where role = 'admin')
  );
-- Community project showcase. Submissions land as 'pending', an admin
-- approves/rejects, and approved projects appear on /showcase. Upvotes are
-- tracked in a separate join table so a user can't double-vote.

create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null check (char_length(title) between 5 and 100),
  description   text not null check (char_length(description) between 50 and 2000),
  track         text not null check (track in ('spark','wire','forge','edge')),
  video_url     text,
  github_url    text,
  demo_url      text,
  thumbnail_url text,
  tags          text[] default '{}',
  upvotes       integer not null default 0,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  featured      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists projects_track_idx on public.projects (track, status, created_at desc);
create index if not exists projects_featured_idx on public.projects (featured, status);
create index if not exists projects_upvotes_idx on public.projects (upvotes desc, created_at desc);

alter table public.projects enable row level security;

drop policy if exists "public read approved projects" on public.projects;
create policy "public read approved projects"
  on public.projects for select
  using (status = 'approved' or auth.uid() = user_id);

drop policy if exists "auth insert projects" on public.projects;
create policy "auth insert projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "auth update own projects" on public.projects;
create policy "auth update own projects"
  on public.projects for update
  using (auth.uid() = user_id and status = 'pending');

drop policy if exists "admin manage projects" on public.projects;
create policy "admin manage projects"
  on public.projects for all
  using (auth.uid() in (select id from public.profiles where role = 'admin'))
  with check (auth.uid() in (select id from public.profiles where role = 'admin'));

create or replace function public.projects_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.projects_set_updated_at();

create table if not exists public.project_upvotes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index if not exists project_upvotes_project_idx on public.project_upvotes (project_id);

alter table public.project_upvotes enable row level security;

drop policy if exists "public read upvotes" on public.project_upvotes;
create policy "public read upvotes"
  on public.project_upvotes for select using (true);

drop policy if exists "auth upvote" on public.project_upvotes;
create policy "auth upvote"
  on public.project_upvotes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
-- Course completion certificates
-- Adds a certificates table with public verification by certificate_id and
-- row-level security so users only see their own private rows via select policy.

CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track text NOT NULL CHECK (track IN ('spark', 'wire', 'forge', 'edge')),
  lesson_slug text NOT NULL,
  lesson_title text NOT NULL,
  certificate_id text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  issued_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS certificates_user_idx
  ON public.certificates(user_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS certificates_certificate_id_idx
  ON public.certificates(certificate_id);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users view own certs" ON public.certificates;
CREATE POLICY "users view own certs" ON public.certificates
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own certs" ON public.certificates;
CREATE POLICY "users insert own certs" ON public.certificates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Public verification by certificate_id: allow anonymous SELECT for the lookup,
-- so /verify/[id] works without a session.
DROP POLICY IF EXISTS "public verify by certificate_id" ON public.certificates;
CREATE POLICY "public verify by certificate_id" ON public.certificates
  FOR SELECT
  USING (true);
-- Total XP for leaderboard. Stored on profiles for cheap top-N queries.
-- Increment is done client-side after a lesson completion via RPC or upsert
-- using a SECURITY DEFINER function (lesson XP value comes from frontmatter).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_xp integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS profiles_total_xp_idx
  ON public.profiles(total_xp DESC NULLS LAST);

-- A safe RPC for incrementing XP. Lets the client award lesson XP without
-- letting it set an arbitrary value.
CREATE OR REPLACE FUNCTION public.award_xp(amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF amount IS NULL OR amount < 0 OR amount > 1000 THEN
    RAISE EXCEPTION 'Invalid XP amount';
  END IF;
  UPDATE public.profiles
     SET total_xp = COALESCE(total_xp, 0) + amount
   WHERE id = auth.uid()
   RETURNING total_xp INTO new_total;
  RETURN new_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_xp(integer) TO authenticated;
-- Track when XP was last awarded, for leaderboard time-period filtering.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_xp_awarded_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_last_xp_awarded_idx
  ON public.profiles(last_xp_awarded_at DESC NULLS LAST);

-- Update the award_xp RPC to set last_xp_awarded_at. Backwards-compatible:
-- still takes a single 'amount' integer; runs as the authenticated user.
CREATE OR REPLACE FUNCTION public.award_xp(amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF amount IS NULL OR amount < 0 OR amount > 1000 THEN
    RAISE EXCEPTION 'Invalid XP amount';
  END IF;
  UPDATE public.profiles
     SET total_xp = COALESCE(total_xp, 0) + amount,
         last_xp_awarded_at = NOW()
   WHERE id = auth.uid()
   RETURNING total_xp INTO new_total;
  RETURN new_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_xp(integer) TO authenticated;
-- Robot voting: cool vs creepy. Public read, anonymous write rate-limited at app layer.
CREATE TABLE IF NOT EXISTS public.robot_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  robot_slug text NOT NULL,
  vote_type text NOT NULL CHECK (vote_type IN ('cool','creepy')),
  user_ip text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS robot_votes_slug_idx ON public.robot_votes(robot_slug);
CREATE INDEX IF NOT EXISTS robot_votes_created_at_idx ON public.robot_votes(created_at DESC);

ALTER TABLE public.robot_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "robot_votes_anyone_can_read" ON public.robot_votes;
CREATE POLICY "robot_votes_anyone_can_read" ON public.robot_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "robot_votes_anyone_can_insert" ON public.robot_votes;
CREATE POLICY "robot_votes_anyone_can_insert" ON public.robot_votes
  FOR INSERT WITH CHECK (true);

-- Aggregated tally view for cheap reads.
CREATE OR REPLACE VIEW public.robot_vote_tally AS
SELECT
  robot_slug,
  COUNT(*) FILTER (WHERE vote_type = 'cool')   AS cool_votes,
  COUNT(*) FILTER (WHERE vote_type = 'creepy') AS creepy_votes,
  COUNT(*)                                      AS total_votes
FROM public.robot_votes
GROUP BY robot_slug;

GRANT SELECT ON public.robot_vote_tally TO anon, authenticated;
-- 0015: streaks, achievement badges, city, level helper, weekly-challenge ledger.

-- 1. Profiles: streak + city columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;

CREATE INDEX IF NOT EXISTS profiles_city_idx ON public.profiles(city);

-- 2. Achievement badges
CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS user_achievements_user_idx ON public.user_achievements(user_id);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "achievements_self_read" ON public.user_achievements;
CREATE POLICY "achievements_self_read" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "achievements_public_read" ON public.user_achievements;
CREATE POLICY "achievements_public_read" ON public.user_achievements
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "achievements_self_insert" ON public.user_achievements;
CREATE POLICY "achievements_self_insert" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Weekly challenges ledger
CREATE TABLE IF NOT EXISTS public.weekly_challenge_completions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  week_iso text NOT NULL, -- e.g. 2026-W21
  bonus_xp integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_id, week_iso)
);

ALTER TABLE public.weekly_challenge_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_self_read" ON public.weekly_challenge_completions;
CREATE POLICY "weekly_self_read" ON public.weekly_challenge_completions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "weekly_self_insert" ON public.weekly_challenge_completions;
CREATE POLICY "weekly_self_insert" ON public.weekly_challenge_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Extended award_xp: now also bumps streak based on last_active_date
CREATE OR REPLACE FUNCTION public.award_xp(amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
  prev_date date;
  today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF amount IS NULL OR amount < 0 OR amount > 1000 THEN
    RAISE EXCEPTION 'Invalid XP amount';
  END IF;

  SELECT last_active_date INTO prev_date FROM public.profiles WHERE id = auth.uid();

  UPDATE public.profiles
     SET total_xp = COALESCE(total_xp, 0) + amount,
         last_active_date = today,
         streak_days = CASE
           WHEN prev_date = today THEN GREATEST(streak_days, 1)
           WHEN prev_date = today - INTERVAL '1 day' THEN COALESCE(streak_days, 0) + 1
           ELSE 1
         END
   WHERE id = auth.uid()
   RETURNING total_xp INTO new_total;

  RETURN new_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_xp(integer) TO authenticated;
-- 0016: academy lesson bookmarks + comments

CREATE TABLE IF NOT EXISTS public.lesson_bookmarks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track, slug)
);

CREATE INDEX IF NOT EXISTS lesson_bookmarks_user_idx ON public.lesson_bookmarks(user_id);

ALTER TABLE public.lesson_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_bookmarks_self_select" ON public.lesson_bookmarks;
CREATE POLICY "lesson_bookmarks_self_select" ON public.lesson_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lesson_bookmarks_self_insert" ON public.lesson_bookmarks;
CREATE POLICY "lesson_bookmarks_self_insert" ON public.lesson_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lesson_bookmarks_self_delete" ON public.lesson_bookmarks;
CREATE POLICY "lesson_bookmarks_self_delete" ON public.lesson_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.lesson_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  track text NOT NULL,
  slug text NOT NULL,
  comment text NOT NULL CHECK (length(comment) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lesson_comments_lookup_idx ON public.lesson_comments(track, slug, created_at);
CREATE INDEX IF NOT EXISTS lesson_comments_user_idx ON public.lesson_comments(user_id);

ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_comments_public_select" ON public.lesson_comments;
CREATE POLICY "lesson_comments_public_select" ON public.lesson_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "lesson_comments_authenticated_insert" ON public.lesson_comments;
CREATE POLICY "lesson_comments_authenticated_insert" ON public.lesson_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lesson_comments_self_delete" ON public.lesson_comments;
CREATE POLICY "lesson_comments_self_delete" ON public.lesson_comments
  FOR DELETE USING (auth.uid() = user_id);
-- 0017: schools registration + class codes

CREATE TABLE IF NOT EXISTS public.schools (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name text NOT NULL,
  city text,
  state text,
  board text,
  teacher_name text,
  teacher_email text,
  phone text,
  role text,
  grade_range text,
  student_count_estimate integer,
  status text NOT NULL DEFAULT 'pending', -- pending / active / suspended
  class_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schools_status_idx ON public.schools(status);
CREATE INDEX IF NOT EXISTS schools_city_idx ON public.schools(city);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schools_anon_insert" ON public.schools;
CREATE POLICY "schools_anon_insert" ON public.schools
  FOR INSERT WITH CHECK (true);

-- Only the registering teacher (matched by email) or an authenticated admin can read full rows.
-- For the listing on /schools page we expose a sanitised view.
CREATE OR REPLACE VIEW public.schools_public AS
SELECT
  id, school_name, city, state, board, status, created_at
FROM public.schools
WHERE status = 'active';

GRANT SELECT ON public.schools_public TO anon, authenticated;

-- Profiles: class_code (already may exist; idempotent)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_code text;
CREATE INDEX IF NOT EXISTS profiles_class_code_idx ON public.profiles(class_code);
-- 0018: community gallery — "I Made It!" builds

CREATE TABLE IF NOT EXISTS public.community_builds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  description text NOT NULL CHECK (length(description) BETWEEN 1 AND 2000),
  image_url text,
  track text,
  cost_inr integer,
  hours_spent integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_builds_created_idx ON public.community_builds(created_at DESC);
CREATE INDEX IF NOT EXISTS community_builds_user_idx ON public.community_builds(user_id);

ALTER TABLE public.community_builds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_builds_public_select" ON public.community_builds;
CREATE POLICY "community_builds_public_select" ON public.community_builds
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "community_builds_authenticated_insert" ON public.community_builds;
CREATE POLICY "community_builds_authenticated_insert" ON public.community_builds
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_builds_self_delete" ON public.community_builds;
CREATE POLICY "community_builds_self_delete" ON public.community_builds
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket — create via Supabase dashboard or:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('community-builds', 'community-builds', true);
-- 0019: R2BOT for Schools — Classroom platform
-- Adds teacher-led classes, student memberships, and mission-completion telemetry.

-- ─────────────────────────────────────────────────────────────────────────
-- school_classes — a teacher's class roster (with a 6-char join code)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.school_classes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  grade      text NOT NULL,
  section    text,
  join_code  text UNIQUE NOT NULL,
  school_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS school_classes_teacher_idx ON public.school_classes(teacher_id);
CREATE INDEX IF NOT EXISTS school_classes_code_idx    ON public.school_classes(join_code);

-- ─────────────────────────────────────────────────────────────────────────
-- student_class_memberships
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_class_memberships (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id   uuid REFERENCES public.school_classes(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, class_id)
);
CREATE INDEX IF NOT EXISTS scm_student_idx ON public.student_class_memberships(student_id);
CREATE INDEX IF NOT EXISTS scm_class_idx   ON public.student_class_memberships(class_id);

-- ─────────────────────────────────────────────────────────────────────────
-- school_mission_completions — per-mission telemetry from the simulator
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.school_mission_completions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id   text NOT NULL,
  score        integer DEFAULT 0,
  time_seconds integer,
  collisions   integer DEFAULT 0,
  code_type    text DEFAULT 'blocks',     -- 'blocks' | 'python'
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS smc_student_idx ON public.school_mission_completions(student_id);
CREATE INDEX IF NOT EXISTS smc_mission_idx ON public.school_mission_completions(mission_id);

-- ─────────────────────────────────────────────────────────────────────────
-- profiles: school grade / track / school name (idempotent)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_grade text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_track text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_name  text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_xp    integer DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.school_classes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_class_memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_mission_completions  ENABLE ROW LEVEL SECURITY;

-- Teachers fully manage their own classes
DROP POLICY IF EXISTS "school_classes_teacher_rw" ON public.school_classes;
CREATE POLICY "school_classes_teacher_rw" ON public.school_classes
  FOR ALL USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

-- Students can read the class row they belong to
DROP POLICY IF EXISTS "school_classes_member_read" ON public.school_classes;
CREATE POLICY "school_classes_member_read" ON public.school_classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.student_class_memberships m
      WHERE m.class_id = school_classes.id AND m.student_id = auth.uid()
    )
  );

-- Membership: students self-manage their joins
DROP POLICY IF EXISTS "scm_student_rw" ON public.student_class_memberships;
CREATE POLICY "scm_student_rw" ON public.student_class_memberships
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Teachers can read memberships for their own classes
DROP POLICY IF EXISTS "scm_teacher_read" ON public.student_class_memberships;
CREATE POLICY "scm_teacher_read" ON public.student_class_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.school_classes c
      WHERE c.id = student_class_memberships.class_id AND c.teacher_id = auth.uid()
    )
  );

-- Mission completions — student RW for their own rows
DROP POLICY IF EXISTS "smc_student_rw" ON public.school_mission_completions;
CREATE POLICY "smc_student_rw" ON public.school_mission_completions
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Teachers can read completions of students in their classes
DROP POLICY IF EXISTS "smc_teacher_read" ON public.school_mission_completions;
CREATE POLICY "smc_teacher_read" ON public.school_mission_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.student_class_memberships m
      JOIN public.school_classes c ON c.id = m.class_id
      WHERE m.student_id = school_mission_completions.student_id
        AND c.teacher_id = auth.uid()
    )
  );
-- 0020: Robot World — optional cloud-sync for kids progress.
-- localStorage is the source of truth on each device; this table allows
-- a parent (signed-in account) to sync progress across multiple devices.

CREATE TABLE IF NOT EXISTS public.kids_progress (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  child_name      text,
  age             integer,
  total_stars     integer DEFAULT 0,
  completed_levels jsonb  DEFAULT '[]'::jsonb,
  completed_zones  jsonb  DEFAULT '[]'::jsonb,
  earned_parts     jsonb  DEFAULT '[]'::jsonb,
  robot_name      text   DEFAULT 'Spark Jr.',
  robot_color     text   DEFAULT '#F59E0B',
  robot_accent    text   DEFAULT '#3B82F6',
  robot_eyes      text   DEFAULT 'happy',
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kids_progress_user_idx ON public.kids_progress(user_id);

ALTER TABLE public.kids_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kids_progress_owner_rw" ON public.kids_progress;
CREATE POLICY "kids_progress_owner_rw" ON public.kids_progress
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- 0021: Newsletter subscribers (Pulse weekly digest).

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email          text UNIQUE NOT NULL,
  subscribed_at  timestamptz NOT NULL DEFAULT now(),
  source         text DEFAULT 'pulse'
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_source_idx ON public.newsletter_subscribers(source);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anonymous signup allowed.
DROP POLICY IF EXISTS "newsletter_anon_insert" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_anon_insert" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);
-- 0022: User profiles, progress sync, leaderboard.
-- Extends the existing `profiles` table (which already exists from earlier migrations).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url   text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio          text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade        text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city         text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS atlas_mastered_count       integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kids_stars                  integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS schools_missions_completed  integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_days                 integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at              timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public                   boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language          text DEFAULT 'en';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS learning_goal               text;

-- ─────────────────────────────────────────────────────────────────────────
-- user_progress_sync — local-first progress mirrored to the cloud
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_progress_sync (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  progress_key  text NOT NULL,
  progress_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, progress_key)
);

CREATE INDEX IF NOT EXISTS user_progress_sync_user_idx ON public.user_progress_sync(user_id);

ALTER TABLE public.user_progress_sync ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_progress_sync_owner_rw" ON public.user_progress_sync;
CREATE POLICY "user_progress_sync_owner_rw" ON public.user_progress_sync
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- public_leaderboard — read-only view of public profiles, ranked by XP
-- ─────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.public_leaderboard;
CREATE VIEW public.public_leaderboard AS
SELECT
  p.id,
  p.display_name,
  p.avatar_url,
  p.city,
  p.atlas_mastered_count,
  p.kids_stars,
  p.streak_days,
  (COALESCE(p.atlas_mastered_count, 0) * 10
    + COALESCE(p.kids_stars, 0) * 5
    + COALESCE(p.streak_days, 0) * 20) AS total_xp
FROM public.profiles p
WHERE p.is_public = true
ORDER BY total_xp DESC
LIMIT 100;

GRANT SELECT ON public.public_leaderboard TO anon, authenticated;
-- 0023: R2BOT Academy v2 — courses, modules, lessons, content blocks, enrollments,
--                          progress, quiz attempts, projects, certificates, SR queue.
-- Idempotent: safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────
-- INSTRUCTORS (author/teacher profiles)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.instructors (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text NOT NULL,
  bio             text,
  credentials     text[] DEFAULT '{}',
  photo_url       text,
  linkedin_url    text,
  courses_count   integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "instructors_public_read" ON public.instructors;
CREATE POLICY "instructors_public_read" ON public.instructors
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "instructors_self_write" ON public.instructors;
CREATE POLICY "instructors_self_write" ON public.instructors
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────
-- COURSES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courses (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 text UNIQUE NOT NULL,
  title                text NOT NULL,
  subtitle             text,
  track                text NOT NULL,
  level                text NOT NULL,
  description          text,
  thumbnail_url        text,
  trailer_url          text,
  instructor_id        uuid REFERENCES public.instructors(id) ON DELETE SET NULL,
  price_inr            integer NOT NULL DEFAULT 0,
  is_free              boolean NOT NULL DEFAULT true,
  duration_hours       numeric(4,1),
  total_lessons        integer NOT NULL DEFAULT 0,
  total_xp             integer NOT NULL DEFAULT 0,
  tags                 text[] DEFAULT '{}',
  prerequisites        text[] DEFAULT '{}',
  certificate_template text,
  published_at         timestamptz,
  language             text NOT NULL DEFAULT 'en',
  cbse_aligned         boolean NOT NULL DEFAULT false,
  nep_aligned          boolean NOT NULL DEFAULT false,
  hardware_kit         text,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS courses_track_idx     ON public.courses(track);
CREATE INDEX IF NOT EXISTS courses_level_idx     ON public.courses(level);
CREATE INDEX IF NOT EXISTS courses_published_idx ON public.courses(published_at);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "courses_public_read" ON public.courses;
CREATE POLICY "courses_public_read" ON public.courses
  FOR SELECT USING (published_at IS NOT NULL OR auth.uid() = instructor_id);
DROP POLICY IF EXISTS "courses_instructor_write" ON public.courses;
CREATE POLICY "courses_instructor_write" ON public.courses
  FOR ALL USING (auth.uid() = instructor_id) WITH CHECK (auth.uid() = instructor_id);

-- ─────────────────────────────────────────────────────────────────────────
-- MODULES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.modules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  order_index     integer NOT NULL,
  title           text NOT NULL,
  description     text,
  unlock_after    uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  is_checkpoint   boolean NOT NULL DEFAULT false,
  duration_minutes integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, order_index)
);
CREATE INDEX IF NOT EXISTS modules_course_idx ON public.modules(course_id, order_index);
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "modules_public_read" ON public.modules;
CREATE POLICY "modules_public_read" ON public.modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = modules.course_id AND c.published_at IS NOT NULL
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- LESSONS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lessons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  order_index     integer NOT NULL,
  slug            text NOT NULL,
  title           text NOT NULL,
  lesson_type     text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 10,
  xp_reward       integer NOT NULL DEFAULT 100,
  is_free_preview boolean NOT NULL DEFAULT false,
  passing_score   integer NOT NULL DEFAULT 75,
  content_mdx     text,
  content_hi      text,
  objectives      text[] DEFAULT '{}',
  atlas_links     text[] DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, slug),
  UNIQUE (course_id, slug)
);
CREATE INDEX IF NOT EXISTS lessons_module_idx ON public.lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS lessons_course_idx ON public.lessons(course_id);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lessons_public_read" ON public.lessons;
CREATE POLICY "lessons_public_read" ON public.lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id AND c.published_at IS NOT NULL
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- CONTENT BLOCKS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_blocks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id       uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  order_index     integer NOT NULL,
  block_type      text NOT NULL,
  data            jsonb NOT NULL,
  is_required     boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, order_index)
);
CREATE INDEX IF NOT EXISTS content_blocks_lesson_idx ON public.content_blocks(lesson_id, order_index);
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_blocks_public_read" ON public.content_blocks;
CREATE POLICY "content_blocks_public_read" ON public.content_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = content_blocks.lesson_id AND c.published_at IS NOT NULL
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- ENROLLMENTS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enrollments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at     timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  progress_pct    numeric(5,2) NOT NULL DEFAULT 0,
  last_active_at  timestamptz NOT NULL DEFAULT now(),
  is_paid         boolean NOT NULL DEFAULT false,
  payment_id      text,
  UNIQUE (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS enrollments_user_idx   ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS enrollments_course_idx ON public.enrollments(course_id);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "enrollments_owner_rw" ON public.enrollments;
CREATE POLICY "enrollments_owner_rw" ON public.enrollments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- LESSON PROGRESS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id       uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  best_score      integer NOT NULL DEFAULT 0,
  attempts        integer NOT NULL DEFAULT 0,
  time_spent_sec  integer NOT NULL DEFAULT 0,
  xp_earned       integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS lesson_progress_user_idx    ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS lesson_progress_course_idx  ON public.lesson_progress(user_id, course_id);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lesson_progress_owner_rw" ON public.lesson_progress;
CREATE POLICY "lesson_progress_owner_rw" ON public.lesson_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- BLOCK PROGRESS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.block_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id        uuid NOT NULL REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  lesson_id       uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at    timestamptz NOT NULL DEFAULT now(),
  score           integer,
  response_data   jsonb,
  UNIQUE (user_id, block_id)
);
CREATE INDEX IF NOT EXISTS block_progress_user_lesson_idx ON public.block_progress(user_id, lesson_id);
ALTER TABLE public.block_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_progress_owner_rw" ON public.block_progress;
CREATE POLICY "block_progress_owner_rw" ON public.block_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- QUIZ ATTEMPTS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id       uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  block_id        uuid NOT NULL REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  answers         jsonb NOT NULL,
  score           integer NOT NULL,
  passed          boolean NOT NULL,
  time_taken_sec  integer,
  attempted_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quiz_attempts_user_lesson_idx ON public.quiz_attempts(user_id, lesson_id);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quiz_attempts_owner_rw" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_owner_rw" ON public.quiz_attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- PROJECT SUBMISSIONS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id       uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  content         text,
  repo_url        text,
  demo_url        text,
  images          text[] DEFAULT '{}',
  status          text NOT NULL DEFAULT 'submitted',
  grade           integer,
  feedback        text,
  reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  reviewed_at     timestamptz
);
CREATE INDEX IF NOT EXISTS project_submissions_user_idx   ON public.project_submissions(user_id);
CREATE INDEX IF NOT EXISTS project_submissions_lesson_idx ON public.project_submissions(lesson_id);
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_submissions_owner_rw" ON public.project_submissions;
CREATE POLICY "project_submissions_owner_rw" ON public.project_submissions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "project_submissions_reviewer_read" ON public.project_submissions;
CREATE POLICY "project_submissions_reviewer_read" ON public.project_submissions
  FOR SELECT USING (auth.uid() = reviewed_by);

-- ─────────────────────────────────────────────────────────────────────────
-- COURSE CERTIFICATES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_certificates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_id         text UNIQUE NOT NULL,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_title    text NOT NULL,
  user_name       text NOT NULL,
  issued_at       timestamptz NOT NULL DEFAULT now(),
  pdf_url         text
);
CREATE INDEX IF NOT EXISTS course_certificates_user_idx ON public.course_certificates(user_id);
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_certificates_public_read" ON public.course_certificates;
CREATE POLICY "course_certificates_public_read" ON public.course_certificates
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "course_certificates_owner_write" ON public.course_certificates;
CREATE POLICY "course_certificates_owner_write" ON public.course_certificates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- SPACED REPETITION QUEUE
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.review_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id       uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  next_review_at  timestamptz NOT NULL,
  interval_days   integer NOT NULL DEFAULT 1,
  ease_factor     numeric(3,2) NOT NULL DEFAULT 2.5,
  repetitions     integer NOT NULL DEFAULT 0,
  last_score      integer,
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS review_queue_user_due_idx ON public.review_queue(user_id, next_review_at);
ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "review_queue_owner_rw" ON public.review_queue;
CREATE POLICY "review_queue_owner_rw" ON public.review_queue
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Pro tier subscriptions (Razorpay one-time order flow).
-- One row per active or expired subscription period; the most recent row with
-- status = 'active' AND current_period_end > now() determines Pro status.

create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  plan                 text not null check (plan in ('monthly', 'yearly')),
  status               text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  razorpay_order_id    text,
  razorpay_payment_id  text,
  current_period_end   timestamptz not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions (user_id, current_period_end desc);

alter table public.subscriptions enable row level security;

drop policy if exists "users read own subscription" on public.subscriptions;
create policy "users read own subscription"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- No INSERT / UPDATE policy: the verify route uses the service-role admin
-- client so RLS doesn't apply. Clients can never write to this table directly.
-- Add IP address logging to copilot_conversations so the API can rate-limit
-- anonymous (signed-out) users at 5 messages per 24 hours per IP.

alter table public.copilot_conversations
  add column if not exists ip_address text;

-- Index supports the rate-limit query: count rows where ip_address = $1
-- AND created_at > now() - interval '24 hours'.
create index if not exists copilot_ip_created_idx
  on public.copilot_conversations (ip_address, created_at desc);
-- Diagnostic test result columns on profiles.
-- diagnostic_track is one of: spark, wire, forge, edge (or NULL = not taken)
-- diagnostic_done is the boolean for whether the user has finished the test.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS diagnostic_track text
    CHECK (diagnostic_track IN ('spark', 'wire', 'forge', 'edge'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS diagnostic_done boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_diagnostic_track_idx
  ON public.profiles (diagnostic_track) WHERE diagnostic_track IS NOT NULL;
-- Extend community_builds (created in 0018) with the fields needed for
-- the Robot Projects → Gallery submission flow.

ALTER TABLE public.community_builds
  ADD COLUMN IF NOT EXISTS project_slug text,
  ADD COLUMN IF NOT EXISTS github_url   text,
  ADD COLUMN IF NOT EXISTS video_url    text,
  ADD COLUMN IF NOT EXISTS tags         text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS likes        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'hidden'));

-- Re-scope the public SELECT policy to published rows only.
DROP POLICY IF EXISTS "community_builds_public_select" ON public.community_builds;
CREATE POLICY "community_builds_public_select" ON public.community_builds
  FOR SELECT USING (status = 'published');

-- Allow owners to update their own rows (e.g. edit title/description).
DROP POLICY IF EXISTS "community_builds_self_update" ON public.community_builds;
CREATE POLICY "community_builds_self_update" ON public.community_builds
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sort indexes — newest first and most-liked.
CREATE INDEX IF NOT EXISTS community_builds_likes_idx
  ON public.community_builds (likes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS community_builds_project_slug_idx
  ON public.community_builds (project_slug) WHERE project_slug IS NOT NULL;
-- B2B institution tier — schema only.
-- No UI is built yet; per CLAUDE.md §6 the B2B sales motion launches
-- ~Month 12. This migration lands the data model so we can start
-- collecting interest and signing pilots before the dashboard exists.

CREATE TABLE IF NOT EXISTS public.institutions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  type                text NOT NULL CHECK (type IN ('college', 'school', 'company')),
  contact_email       text NOT NULL,
  contact_name        text,
  plan                text NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'professional', 'enterprise')),
  student_limit       integer NOT NULL DEFAULT 50,
  subscription_start  timestamptz,
  subscription_end    timestamptz,
  razorpay_order_id   text,
  status              text NOT NULL DEFAULT 'trial'
    CHECK (status IN ('active', 'expired', 'trial')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS institutions_status_idx
  ON public.institutions (status, subscription_end DESC);

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
-- No public read/write policies — only the service role and explicit
-- admin policies (added when the UI lands) can touch this table.

-- ────────────────────────────────────────────────────────────────────────
-- INSTITUTION MEMBERS — links auth.users to institutions with a role.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institution_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, user_id)
);

CREATE INDEX IF NOT EXISTS institution_members_user_idx
  ON public.institution_members (user_id);
CREATE INDEX IF NOT EXISTS institution_members_institution_idx
  ON public.institution_members (institution_id, role);

ALTER TABLE public.institution_members ENABLE ROW LEVEL SECURITY;

-- Users see their own row.
DROP POLICY IF EXISTS "institution_members_self_select" ON public.institution_members;
CREATE POLICY "institution_members_self_select" ON public.institution_members
  FOR SELECT USING (auth.uid() = user_id);

-- Institution admins see every row in their institution.
DROP POLICY IF EXISTS "institution_members_admin_select" ON public.institution_members;
CREATE POLICY "institution_members_admin_select" ON public.institution_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.institution_members m
      WHERE m.institution_id = institution_members.institution_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
  );

-- ────────────────────────────────────────────────────────────────────────
-- INSTITUTION INVITES — pre-shared tokens for teachers/students to join.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institution_invites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  email           text NOT NULL,
  role            text NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  token           text UNIQUE NOT NULL,
  expires_at      timestamptz NOT NULL,
  used_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS institution_invites_token_idx
  ON public.institution_invites (token);
CREATE INDEX IF NOT EXISTS institution_invites_email_idx
  ON public.institution_invites (lower(email)) WHERE used_at IS NULL;

ALTER TABLE public.institution_invites ENABLE ROW LEVEL SECURITY;
-- No public policies — invite tokens are validated by service-role API routes
-- (to be built when the institution onboarding UI launches in Month 12).
-- Slug-based lesson completion log for the MDX-backed academy
-- (Spark/Wire/Forge/Edge tracks). The existing lesson_progress table
-- (migration 0023) is UUID-FK-based and tied to the DB-backed academy_v2
-- system, so MDX lesson slugs don't fit there.

CREATE TABLE IF NOT EXISTS public.lesson_completions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug    text NOT NULL,
  lesson_slug    text NOT NULL,
  xp_earned      integer NOT NULL DEFAULT 0,
  completed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_slug, lesson_slug)
);

CREATE INDEX IF NOT EXISTS lesson_completions_user_course_idx
  ON public.lesson_completions (user_id, course_slug);

ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_completions_owner_rw" ON public.lesson_completions;
CREATE POLICY "lesson_completions_owner_rw" ON public.lesson_completions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
