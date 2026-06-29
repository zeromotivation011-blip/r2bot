-- Total XP for leaderboard. Stored on profiles for cheap top-N queries.
-- Increment is done client-side after a lesson completion via RPC or upsert
-- using a SECURITY DEFINER function (lesson XP value comes from frontmatter).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_xp integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS profiles_total_xp_idx
  ON public.profiles(total_xp DESC NULLS LAST);

-- A safe RPC for incrementing XP. Lets the client award lesson XP without
-- letting it set an arbitrary value.
CREATE OR REPLACE FUNCTION public.award_xp(amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF amount IS NULL OR amount < 0 OR amount > 1000 THEN
    RAISE EXCEPTION 'Invalid XP amount';
  END IF;
  UPDATE public.profiles
     SET total_xp = COALESCE(total_xp, 0) + amount
   WHERE id = auth.uid()
   RETURNING total_xp INTO new_total;
  RETURN new_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_xp(integer) TO authenticated;
