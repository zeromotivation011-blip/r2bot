-- Extend community_builds (created in 0018) with the fields needed for
-- the Robot Projects → Gallery submission flow.

ALTER TABLE public.community_builds
  ADD COLUMN IF NOT EXISTS project_slug text,
  ADD COLUMN IF NOT EXISTS github_url   text,
  ADD COLUMN IF NOT EXISTS video_url    text,
  ADD COLUMN IF NOT EXISTS tags         text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS likes        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'hidden'));

-- Re-scope the public SELECT policy to published rows only.
DROP POLICY IF EXISTS "community_builds_public_select" ON public.community_builds;
CREATE POLICY "community_builds_public_select" ON public.community_builds
  FOR SELECT USING (status = 'published');

-- Allow owners to update their own rows (e.g. edit title/description).
DROP POLICY IF EXISTS "community_builds_self_update" ON public.community_builds;
CREATE POLICY "community_builds_self_update" ON public.community_builds
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sort indexes — newest first and most-liked.
CREATE INDEX IF NOT EXISTS community_builds_likes_idx
  ON public.community_builds (likes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS community_builds_project_slug_idx
  ON public.community_builds (project_slug) WHERE project_slug IS NOT NULL;
