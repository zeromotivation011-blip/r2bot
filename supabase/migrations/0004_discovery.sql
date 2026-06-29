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
