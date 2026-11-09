-- 0051_security_hardening
--
-- Four findings from the 9 Nov 2026 security audit, all confirmed against the
-- live project before this migration was written.
--
-- 1. copilot_conversations: the SELECT policy from 0001 read
--      auth.uid() = user_id OR auth.uid() IS NULL
--    so every anonymous request could read every conversation, including the
--    ip_address column added in 0025. Probed live: 266 rows readable with the
--    public anon key. The clause existed only so the anonymous per-IP rate
--    limit in app/api/copilot/route.ts could count rows; that count now runs
--    on the service-role client instead.
--
-- 2. profiles: "Update own profile" had no column restriction and the table
--    also carries `role`, which every admin gate in the app and every admin
--    RLS policy trusts. A signed-in user could PATCH their own row to
--    role='admin'. A trigger now refuses changes to role and email from
--    anything that is not the service role or the database owner.
--
-- 3. certificates: users could INSERT their own rows directly (policy from
--    0011), i.e. mint certificates without completing anything, and the
--    "public verify" policy exposed every row (user_id included) to anon.
--    Certificates are now written only by the server with the service-role
--    client, and /verify/<id> reads with the service-role client too, so the
--    anon SELECT policy is no longer needed.
--
-- 4. lesson_completions: the owner policy was FOR ALL, so users could insert
--    fake completions and skip the server-graded quiz. Owners keep SELECT;
--    writes go through /api/courses/complete on the service-role client.
--
-- Code that depends on this: app/api/copilot/route.ts, app/api/certificates/
-- route.ts, app/api/courses/complete/route.ts, app/verify/[id]/page.tsx — all
-- updated in the same commit and working whether or not this has run.

-- 1. Co-pilot transcripts -----------------------------------------------------
drop policy if exists "Read own conversations" on public.copilot_conversations;
create policy "Read own conversations" on public.copilot_conversations
  for select using ((select auth.uid()) = user_id);

-- 2. Privilege escalation via profiles.role ----------------------------------
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service-role requests and the database owner may change anything.
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception 'profiles.role can only be changed by the server' using errcode = '42501';
  end if;
  if new.email is distinct from old.email then
    raise exception 'profiles.email can only be changed by the server' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_columns on public.profiles;
create trigger protect_profile_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- 3. Certificates --------------------------------------------------------------
drop policy if exists "users insert own certs" on public.certificates;
drop policy if exists "public verify by certificate_id" on public.certificates;
-- "users view own certs" (SELECT, auth.uid() = user_id) stays.

-- 4. Lesson completions --------------------------------------------------------
drop policy if exists lesson_completions_owner_rw on public.lesson_completions;
create policy lesson_completions_owner_read on public.lesson_completions
  for select using ((select auth.uid()) = user_id);
