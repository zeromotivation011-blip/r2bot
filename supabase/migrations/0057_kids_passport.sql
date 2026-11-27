-- 0057_kids_passport
--
-- R2BOT Kids Robot Passport (roadmap #12): a child keeps their progress on the
-- server under a few friendly words (e.g. MAGNET-OTTER-NOVA-7) and restores it
-- on any device, with no account, email or other personal data.
--
-- What a row holds, and nothing else:
--   code_hash     SHA-256 (hex) of the canonical words. The words themselves are
--                 never sent to the database; losing them means the passport is
--                 gone (a grown-up can print them as a card).
--   backup        the same backup code the Garage already offers offline
--                 (R2K1.<z|j>.<base64url>.<checksum>): progress, the explorer and
--                 robot nicknames. Validated by the route with readProgressCode.
--   summary       counters only ({xp, badges, sessions}) so a restore can say
--                 what it found.
--   created_at, updated_at, last_used_at.
--
-- Children never talk to Supabase. Every read and write goes through
-- app/api/kids/passport with the service-role client, rate limited per address
-- (lib/rate-limit.ts). RLS is ON with NO policies, and anon/authenticated have
-- no grants: nothing but the service role can see a row. No policy uses
-- `auth.uid() is null` (see 0051).
--
-- Expiry (GDPR-K / DPDP / COPPA "keep no longer than needed"): a passport not
-- opened or updated for 400 days is deleted. The route does this
-- opportunistically on every new passport; kids_passports_purge() is here for a
-- scheduled job or a manual run. A parent can delete one at any time from the
-- Garage ("Delete my Passport").
--
-- Code that depends on this file degrades safely until it runs: the route
-- answers 503 `passport_not_ready`, the Garage says "being switched on" and
-- keeps offering the offline backup code. Run this file in the Supabase SQL
-- editor; nothing else is needed.

create table if not exists public.kids_passports (
  code_hash     text        primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  backup        text        not null
                check (char_length(backup) <= 60000 and backup ~ '^R2K1\.[zj]\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$'),
  summary       jsonb       not null default '{}'::jsonb
                check (jsonb_typeof(summary) = 'object' and octet_length(summary::text) <= 256),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_used_at  timestamptz not null default now()
);

create index if not exists kids_passports_last_used_idx on public.kids_passports (last_used_at);

alter table public.kids_passports enable row level security;
-- Deliberately no policies: only the service role (which bypasses RLS) reads or writes.
revoke all on table public.kids_passports from anon, authenticated;

create or replace function public.kids_passports_purge(p_days integer default 400)
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (
    delete from public.kids_passports
    where last_used_at < now() - make_interval(days => greatest(p_days, 30))
    returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function public.kids_passports_purge(integer) from public, anon, authenticated;

comment on table public.kids_passports is
  'R2BOT Kids Robot Passport: progress backup codes keyed by SHA-256 of friendly words. No personal data. Service role only.';
