-- 0038: server-side, once-per-key XP awards.
-- ADDITIVE and safe to apply at any time: it does not change award_xp(integer),
-- so the current client keeps working until 0039 is applied (after the code deploy).
--
-- Why: award_xp(amount) is callable by any signed-in user from the browser, up to 1000 XP
-- per call and unlimited calls, so XP/leaderboard can be farmed. The new flow is:
--   browser -> POST /api/academy/award-xp -> service role -> award_xp_once(user, key, amount)
-- where the server looks up the real XP for the lesson and each (user, key) pays once.

create table if not exists public.xp_awards (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  award_key  text        not null,
  amount     integer     not null check (amount between 0 and 1000),
  awarded_at timestamptz not null default now(),
  primary key (user_id, award_key)
);

-- RLS on with no policies: only the service role (which bypasses RLS) can read or write.
alter table public.xp_awards enable row level security;

create or replace function public.award_xp_once(p_user uuid, p_key text, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  prev_date date;
  today date := (now() at time zone 'Asia/Kolkata')::date;
  inserted_rows integer;
begin
  if p_user is null or p_key is null or length(p_key) = 0 or length(p_key) > 200 then
    raise exception 'Invalid award';
  end if;
  if p_amount is null or p_amount < 0 or p_amount > 1000 then
    raise exception 'Invalid XP amount';
  end if;

  insert into public.xp_awards (user_id, award_key, amount)
  values (p_user, p_key, p_amount)
  on conflict (user_id, award_key) do nothing;
  get diagnostics inserted_rows = row_count;
  if inserted_rows = 0 then
    return 0; -- already awarded for this key
  end if;

  select last_active_date into prev_date from public.profiles where id = p_user;
  update public.profiles
     set total_xp = coalesce(total_xp, 0) + p_amount,
         last_active_date = today,
         streak_days = case
           when prev_date = today then greatest(streak_days, 1)
           when prev_date = today - interval '1 day' then coalesce(streak_days, 0) + 1
           else 1
         end
   where id = p_user;
  return p_amount;
end;
$$;

-- Only the server (service role) may call it.
revoke all on function public.award_xp_once(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.award_xp_once(uuid, text, integer) to service_role;
