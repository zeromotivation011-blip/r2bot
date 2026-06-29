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
