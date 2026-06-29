-- 0022: User profiles, progress sync, leaderboard.
-- Extends the existing `profiles` table (which already exists from earlier migrations).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url   text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio          text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade        text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city         text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS atlas_mastered_count       integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kids_stars                  integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS schools_missions_completed  integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_days                 integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at              timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public                   boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language          text DEFAULT 'en';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS learning_goal               text;

-- ─────────────────────────────────────────────────────────────────────────
-- user_progress_sync — local-first progress mirrored to the cloud
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_progress_sync (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  progress_key  text NOT NULL,
  progress_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, progress_key)
);

CREATE INDEX IF NOT EXISTS user_progress_sync_user_idx ON public.user_progress_sync(user_id);

ALTER TABLE public.user_progress_sync ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_progress_sync_owner_rw" ON public.user_progress_sync;
CREATE POLICY "user_progress_sync_owner_rw" ON public.user_progress_sync
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- public_leaderboard — read-only view of public profiles, ranked by XP
-- ─────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.public_leaderboard;
CREATE VIEW public.public_leaderboard AS
SELECT
  p.id,
  p.display_name,
  p.avatar_url,
  p.city,
  p.atlas_mastered_count,
  p.kids_stars,
  p.streak_days,
  (COALESCE(p.atlas_mastered_count, 0) * 10
    + COALESCE(p.kids_stars, 0) * 5
    + COALESCE(p.streak_days, 0) * 20) AS total_xp
FROM public.profiles p
WHERE p.is_public = true
ORDER BY total_xp DESC
LIMIT 100;

GRANT SELECT ON public.public_leaderboard TO anon, authenticated;
