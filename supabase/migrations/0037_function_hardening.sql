-- 0037: function hardening (already applied to the live project on 2026-11-05).
-- Non-destructive: only changes EXECUTE grants and function search_path.
-- Idempotent: safe to re-run.
--
-- Why:
--  * handle_new_user() is a signup trigger. Nobody should be able to call it via the API.
--  * award_xp(integer) is SECURITY DEFINER; signed-out callers must not be able to execute it.
--    (It already raises for auth.uid() IS NULL, so this is defense in depth.)
--    Signed-in users keep EXECUTE because components/LessonComplete.tsx calls it from the
--    browser. See docs/OPERATIONS.md "Known issues" for the follow-up (server-side, once per lesson).
--  * Four helper functions had a mutable search_path (Supabase linter 0011).

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.award_xp(integer) from public, anon;
grant execute on function public.award_xp(integer) to authenticated;

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in (
        'set_updated_at',
        'match_atlas_entries',
        'projects_set_updated_at',
        'touch_atlas_updated_at'
      )
  loop
    execute format('alter function %s set search_path = public, extensions', r.sig);
  end loop;
end $$;
