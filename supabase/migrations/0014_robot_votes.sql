-- Robot voting: cool vs creepy. Public read, anonymous write rate-limited at app layer.
CREATE TABLE IF NOT EXISTS public.robot_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  robot_slug text NOT NULL,
  vote_type text NOT NULL CHECK (vote_type IN ('cool','creepy')),
  user_ip text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS robot_votes_slug_idx ON public.robot_votes(robot_slug);
CREATE INDEX IF NOT EXISTS robot_votes_created_at_idx ON public.robot_votes(created_at DESC);

ALTER TABLE public.robot_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "robot_votes_anyone_can_read" ON public.robot_votes;
CREATE POLICY "robot_votes_anyone_can_read" ON public.robot_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "robot_votes_anyone_can_insert" ON public.robot_votes;
CREATE POLICY "robot_votes_anyone_can_insert" ON public.robot_votes
  FOR INSERT WITH CHECK (true);

-- Aggregated tally view for cheap reads.
CREATE OR REPLACE VIEW public.robot_vote_tally AS
SELECT
  robot_slug,
  COUNT(*) FILTER (WHERE vote_type = 'cool')   AS cool_votes,
  COUNT(*) FILTER (WHERE vote_type = 'creepy') AS creepy_votes,
  COUNT(*)                                      AS total_votes
FROM public.robot_votes
GROUP BY robot_slug;

GRANT SELECT ON public.robot_vote_tally TO anon, authenticated;
