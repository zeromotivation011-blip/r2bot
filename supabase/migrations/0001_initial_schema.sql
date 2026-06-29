-- R2BOT initial database schema
-- Apply once a Supabase project exists:
--   1. Create project at https://supabase.com (Mumbai region recommended)
--   2. Go to SQL Editor → New Query
--   3. Paste this file's contents → Run
--   4. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY to Vercel env

-- ============================================================
-- 1. Extensions
-- ============================================================
create extension if not exists "pgcrypto";
create extension if not exists "vector"; -- pgvector for R2 Co-pilot RAG

-- ============================================================
-- 2. ENUMs
-- ============================================================
create type atlas_type as enum ('concept', 'person', 'company', 'robot', 'paper');
create type course_track as enum ('spark', 'wire', 'forge', 'edge', 'tiny', 'launch');
create type progress_status as enum ('started', 'completed');

-- ============================================================
-- 3. Users (extends Supabase Auth's auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  avatar_url text,
  current_track course_track,
  diagnostic_score smallint,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index profiles_email_idx on public.profiles (email);

-- ============================================================
-- 4. Atlas entries (the encyclopedia)
-- ============================================================
create table public.atlas_entries (
  id uuid primary key default gen_random_uuid(),
  type atlas_type not null,
  slug text not null,
  title text not null,
  summary text not null,
  body_md text not null,
  see_also text[] default '{}',
  sources jsonb default '[]'::jsonb,
  tags text[] default '{}',
  embedding vector(1536), -- OpenAI text-embedding-3-small
  last_reviewed_at date default current_date not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (type, slug)
);

create index atlas_entries_type_idx on public.atlas_entries (type);
create index atlas_entries_slug_idx on public.atlas_entries (slug);
create index atlas_entries_tags_idx on public.atlas_entries using gin (tags);
create index atlas_entries_embedding_idx
  on public.atlas_entries using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ============================================================
-- 5. Pulse — daily robotics stories
-- ============================================================
create table public.pulse_articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text not null,
  body_md text not null,
  hero_image_url text,
  country text, -- 'usa' | 'china' | 'india' | etc.
  category text,
  source_url text,
  embedding vector(1536),
  published_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index pulse_published_idx on public.pulse_articles (published_at desc);
create index pulse_country_idx on public.pulse_articles (country);
create index pulse_embedding_idx
  on public.pulse_articles using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ============================================================
-- 6. Lens — curated videos
-- ============================================================
create table public.lens_videos (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary_md text not null,
  transcript text,
  topic_tag text,
  duration_seconds integer,
  youtube_id text,
  uploaded_url text,
  embedding vector(1536),
  published_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index lens_topic_idx on public.lens_videos (topic_tag);
create index lens_embedding_idx
  on public.lens_videos using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ============================================================
-- 7. Courses & lessons
-- ============================================================
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  track course_track not null,
  title text not null,
  description text not null,
  position smallint not null,
  is_published boolean default false not null,
  created_at timestamptz default now() not null
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null,
  title text not null,
  body_md text not null,
  video_url text,
  quiz jsonb default '[]'::jsonb,
  position smallint not null,
  created_at timestamptz default now() not null,
  unique (course_id, slug)
);

create index lessons_course_idx on public.lessons (course_id, position);

-- ============================================================
-- 8. User progress (for course completion tracking)
-- ============================================================
create table public.user_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status progress_status not null default 'started',
  started_at timestamptz default now() not null,
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

-- ============================================================
-- 9. R2 Co-pilot conversation logs (for analytics + atlas-gap detection)
-- ============================================================
create table public.copilot_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  messages jsonb not null,
  retrieved_entry_ids uuid[] default '{}',
  highest_similarity real, -- score of top retrieved chunk; low = atlas gap
  page_context text,
  created_at timestamptz default now() not null
);

create index copilot_user_idx on public.copilot_conversations (user_id);
create index copilot_created_idx on public.copilot_conversations (created_at desc);

-- ============================================================
-- 10. Atlas gaps — questions we couldn't answer well
-- ============================================================
create table public.atlas_gaps (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  frequency integer default 1 not null,
  first_seen_at timestamptz default now() not null,
  last_seen_at timestamptz default now() not null,
  status text default 'open' not null, -- 'open' | 'writing' | 'closed'
  notes text
);

create index atlas_gaps_freq_idx on public.atlas_gaps (frequency desc);

-- ============================================================
-- 11. Row-Level Security policies
-- ============================================================

-- Public read for content tables
alter table public.atlas_entries enable row level security;
alter table public.pulse_articles enable row level security;
alter table public.lens_videos enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;

create policy "Public read atlas" on public.atlas_entries for select using (true);
create policy "Public read pulse" on public.pulse_articles for select using (true);
create policy "Public read lens" on public.lens_videos for select using (true);
create policy "Public read courses" on public.courses for select using (is_published);
create policy "Public read lessons" on public.lessons for select using (
  exists (select 1 from public.courses c where c.id = lessons.course_id and c.is_published)
);

-- Profiles: users can read/edit only their own
alter table public.profiles enable row level security;
create policy "Read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- User progress: users see only their own
alter table public.user_progress enable row level security;
create policy "Read own progress" on public.user_progress for select using (auth.uid() = user_id);
create policy "Upsert own progress" on public.user_progress for all using (auth.uid() = user_id);

-- Copilot conversations: users see their own; service role bypasses RLS for logging
alter table public.copilot_conversations enable row level security;
create policy "Read own conversations" on public.copilot_conversations for select using (
  auth.uid() = user_id or auth.uid() is null
);

-- atlas_gaps is internal — no public policies (service role only)
alter table public.atlas_gaps enable row level security;

-- ============================================================
-- 12. Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 13. Auto-update updated_at columns
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger atlas_entries_updated_at before update on public.atlas_entries
  for each row execute function public.set_updated_at();
create trigger pulse_articles_updated_at before update on public.pulse_articles
  for each row execute function public.set_updated_at();
create trigger lens_videos_updated_at before update on public.lens_videos
  for each row execute function public.set_updated_at();

-- ============================================================
-- 14. Vector-search helper for R2 Co-pilot RAG
-- ============================================================
create or replace function public.match_atlas_entries(
  query_embedding vector(1536),
  match_threshold float default 0.70,
  match_count int default 8
) returns table (
  id uuid,
  type atlas_type,
  slug text,
  title text,
  summary text,
  body_md text,
  similarity float
)
language sql stable
as $$
  select
    ae.id, ae.type, ae.slug, ae.title, ae.summary, ae.body_md,
    1 - (ae.embedding <=> query_embedding) as similarity
  from public.atlas_entries ae
  where ae.embedding is not null
    and 1 - (ae.embedding <=> query_embedding) > match_threshold
  order by ae.embedding <=> query_embedding
  limit match_count;
$$;
