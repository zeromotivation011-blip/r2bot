-- Email preferences + per-user unsubscribe tokens for the weekly digest.
alter table public.profiles
  add column if not exists email_digest_enabled boolean not null default true,
  add column if not exists digest_unsubscribe_token text unique default gen_random_uuid()::text;

-- Backfill any rows missing a token (e.g. created before this column existed).
update public.profiles
  set digest_unsubscribe_token = gen_random_uuid()::text
  where digest_unsubscribe_token is null;
