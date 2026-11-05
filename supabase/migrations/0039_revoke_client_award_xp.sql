-- 0039: close the XP-farming hole. APPLY THIS ONLY AFTER the code that calls
-- /api/academy/award-xp is deployed to production. Applying it earlier makes the
-- old browser-side XP award fail silently (lessons still complete; no XP is given).
--
-- Rollback: grant execute on function public.award_xp(integer) to authenticated;

revoke execute on function public.award_xp(integer) from public, anon, authenticated;
