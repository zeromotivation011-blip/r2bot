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
