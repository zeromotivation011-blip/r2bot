-- 0018: community gallery — "I Made It!" builds

CREATE TABLE IF NOT EXISTS public.community_builds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  description text NOT NULL CHECK (length(description) BETWEEN 1 AND 2000),
  image_url text,
  track text,
  cost_inr integer,
  hours_spent integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_builds_created_idx ON public.community_builds(created_at DESC);
CREATE INDEX IF NOT EXISTS community_builds_user_idx ON public.community_builds(user_id);

ALTER TABLE public.community_builds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_builds_public_select" ON public.community_builds;
CREATE POLICY "community_builds_public_select" ON public.community_builds
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "community_builds_authenticated_insert" ON public.community_builds;
CREATE POLICY "community_builds_authenticated_insert" ON public.community_builds
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_builds_self_delete" ON public.community_builds;
CREATE POLICY "community_builds_self_delete" ON public.community_builds
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket — create via Supabase dashboard or:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('community-builds', 'community-builds', true);
