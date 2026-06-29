-- 0015: streaks, achievement badges, city, level helper, weekly-challenge ledger.

-- 1. Profiles: streak + city columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;

CREATE INDEX IF NOT EXISTS profiles_city_idx ON public.profiles(city);

-- 2. Achievement badges
CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS user_achievements_user_idx ON public.user_achievements(user_id);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "achievements_self_read" ON public.user_achievements;
CREATE POLICY "achievements_self_read" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "achievements_public_read" ON public.user_achievements;
CREATE POLICY "achievements_public_read" ON public.user_achievements
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "achievements_self_insert" ON public.user_achievements;
CREATE POLICY "achievements_self_insert" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Weekly challenges ledger
CREATE TABLE IF NOT EXISTS public.weekly_challenge_completions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  week_iso text NOT NULL, -- e.g. 2026-W21
  bonus_xp integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_id, week_iso)
);

ALTER TABLE public.weekly_challenge_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_self_read" ON public.weekly_challenge_completions;
CREATE POLICY "weekly_self_read" ON public.weekly_challenge_completions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "weekly_self_insert" ON public.weekly_challenge_completions;
CREATE POLICY "weekly_self_insert" ON public.weekly_challenge_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Extended award_xp: now also bumps streak based on last_active_date
CREATE OR REPLACE FUNCTION public.award_xp(amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
  prev_date date;
  today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF amount IS NULL OR amount < 0 OR amount > 1000 THEN
    RAISE EXCEPTION 'Invalid XP amount';
  END IF;

  SELECT last_active_date INTO prev_date FROM public.profiles WHERE id = auth.uid();

  UPDATE public.profiles
     SET total_xp = COALESCE(total_xp, 0) + amount,
         last_active_date = today,
         streak_days = CASE
           WHEN prev_date = today THEN GREATEST(streak_days, 1)
           WHEN prev_date = today - INTERVAL '1 day' THEN COALESCE(streak_days, 0) + 1
           ELSE 1
         END
   WHERE id = auth.uid()
   RETURNING total_xp INTO new_total;

  RETURN new_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_xp(integer) TO authenticated;
