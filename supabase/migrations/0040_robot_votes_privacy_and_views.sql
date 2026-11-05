-- 0040: stop leaking voter IPs; make the three flagged views run with the caller's rights.
-- SAFE TO APPLY ANY TIME (compatible with the code that is currently live).
--
-- Problem: robot_votes has a "anyone can read" policy, so anyone with the public anon key could
-- download every row including user_ip and user_id. The tally view only needs robot_slug/vote_type.
-- Fix: column-level privileges. The public API can read only non-identifying columns; the view
-- then works with security_invoker = true (no more SECURITY DEFINER view lint error).
-- public_leaderboard and schools_public are not used by any code today; invoker mode means they
-- can never expose more than the table's own RLS allows.
--
-- Rollback:
--   grant select on public.robot_votes to anon, authenticated;
--   alter view public.robot_vote_tally    set (security_invoker = false);
--   alter view public.public_leaderboard  set (security_invoker = false);
--   alter view public.schools_public      set (security_invoker = false);

revoke select on public.robot_votes from anon, authenticated;
grant select (id, robot_slug, vote_type, created_at) on public.robot_votes to anon, authenticated;

alter view public.robot_vote_tally   set (security_invoker = true);
alter view public.public_leaderboard set (security_invoker = true);
alter view public.schools_public     set (security_invoker = true);
