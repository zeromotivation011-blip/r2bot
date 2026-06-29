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
