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
