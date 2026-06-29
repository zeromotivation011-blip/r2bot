-- Track when XP was last awarded, for leaderboard time-period filtering.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_xp_awarded_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_last_xp_awarded_idx
  ON public.profiles(last_xp_awarded_at DESC NULLS LAST);

-- Update the award_xp RPC to set last_xp_awarded_at. Backwards-compatible:
-- still takes a single 'amount' integer; runs as the authenticated user.
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
     SET total_xp = COALESCE(total_xp, 0) + amount,
         last_xp_awarded_at = NOW()
   WHERE id = auth.uid()
   RETURNING total_xp INTO new_total;
  RETURN new_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_xp(integer) TO authenticated;
