-- 0041: remove the wide-open public INSERT policies (WITH CHECK (true)).
-- APPLY ONLY AFTER the code that writes these tables with the service role is deployed:
--   /api/robots/vote, /api/news/subscribe, /api/schools/register (and /api/leads, which already
--   uses the service role when SUPABASE_SERVICE_ROLE_KEY is set).
-- Applying earlier makes those public forms fail.
--
-- Rollback: re-create the policy, e.g.
--   create policy "leads_anon_insert" on public.leads for insert with check (true);

drop policy if exists "leads_anon_insert"            on public.leads;
drop policy if exists "lead_events_anon_insert"      on public.lead_events;
drop policy if exists "newsletter_anon_insert"       on public.newsletter_subscribers;
drop policy if exists "schools_anon_insert"          on public.schools;
drop policy if exists "robot_votes_anyone_can_insert" on public.robot_votes;
