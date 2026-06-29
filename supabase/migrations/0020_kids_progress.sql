-- 0020: Robot World — optional cloud-sync for kids progress.
-- localStorage is the source of truth on each device; this table allows
-- a parent (signed-in account) to sync progress across multiple devices.

CREATE TABLE IF NOT EXISTS public.kids_progress (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  child_name      text,
  age             integer,
  total_stars     integer DEFAULT 0,
  completed_levels jsonb  DEFAULT '[]'::jsonb,
  completed_zones  jsonb  DEFAULT '[]'::jsonb,
  earned_parts     jsonb  DEFAULT '[]'::jsonb,
  robot_name      text   DEFAULT 'Spark Jr.',
  robot_color     text   DEFAULT '#F59E0B',
  robot_accent    text   DEFAULT '#3B82F6',
  robot_eyes      text   DEFAULT 'happy',
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kids_progress_user_idx ON public.kids_progress(user_id);

ALTER TABLE public.kids_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kids_progress_owner_rw" ON public.kids_progress;
CREATE POLICY "kids_progress_owner_rw" ON public.kids_progress
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
