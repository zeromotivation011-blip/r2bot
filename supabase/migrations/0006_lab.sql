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
