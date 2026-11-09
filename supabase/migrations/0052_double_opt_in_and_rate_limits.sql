-- 0052_double_opt_in_and_rate_limits
--
-- Three findings from the 9 Nov 2026 lead-capture audit.
--
-- 1. Double opt-in. captureLead() used to send a branded welcome to any address
--    POSTed to /api/leads, so anyone could sign up a stranger. A subscriber now
--    gets a short "confirm your email" message first and only joins the send
--    list (welcome series, nudges, Friday digest) after clicking it.
--      newsletter_subscribers.confirmed_at  — null until the link is clicked.
--    The existing per-row `unsubscribe_token` doubles as the confirmation
--    token: it is already a secret only the recipient sees, so no second token
--    is needed. Existing rows are backfilled as confirmed so nobody on the
--    current list is cut off. In code, a missing column (this migration not yet
--    applied) is treated as "confirmed", so the old behaviour continues until
--    Ravi runs this.
--
-- 2. Real rate limiting. The limiter was an in-memory Map per serverless
--    instance, which on Vercel resets on every cold start and is not shared
--    between instances. `rate_limit_hit` is a fixed-window counter in Postgres,
--    callable by the service role only. lib/rate-limit.ts falls back to the
--    in-memory limiter when the function does not exist yet.
--
-- 3. Atomic likes. /api/community/like/[id] did a read-then-write increment
--    with the service-role client. `increment_likes` does it in one statement.
--
-- Code that depends on this: lib/lead-capture.ts, lib/rate-limit.ts,
-- lib/email-automation.ts, app/api/confirm/route.ts, app/confirm/page.tsx,
-- app/api/community/like/[id]/route.ts — all written to work whether or not
-- this has run.

-- 1. Double opt-in --------------------------------------------------------------
alter table public.newsletter_subscribers
  add column if not exists confirmed_at timestamptz;

-- Everyone already on the list stays on it.
update public.newsletter_subscribers
  set confirmed_at = coalesce(subscribed_at, now())
  where confirmed_at is null;

-- Every row needs a token, since it is now also the confirmation token.
update public.newsletter_subscribers
  set unsubscribe_token = gen_random_uuid()::text
  where unsubscribe_token is null;

create index if not exists newsletter_subscribers_confirmed_idx
  on public.newsletter_subscribers (confirmed_at)
  where confirmed_at is not null;

-- 2. Rate limits ----------------------------------------------------------------
create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        integer not null default 0
);

alter table public.rate_limits enable row level security; -- service role only, no policies
revoke all on table public.rate_limits from public, anon, authenticated;

-- Fixed window. Returns true when this hit is over the limit (i.e. "blocked").
-- Keys are hashed by the caller (lib/rate-limit.ts) so no raw IP or email is
-- stored here.
create or replace function public.rate_limit_hit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set count        = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into v_count;

  -- Opportunistic sweep so the table does not grow forever: ~1 in 200 calls
  -- deletes windows that ended more than two days ago.
  if random() < 0.005 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_count > p_max;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- 3. Atomic like counter ---------------------------------------------------------
-- Returns the new count, or null when the build does not exist / is not published.
create or replace function public.increment_likes(p_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.community_builds
     set likes = coalesce(likes, 0) + 1
   where id = p_id and status = 'published'
  returning likes;
$$;

revoke all on function public.increment_likes(uuid) from public, anon, authenticated;
grant execute on function public.increment_likes(uuid) to service_role;
