-- Slug-based lesson completion log for the MDX-backed academy
-- (Spark/Wire/Forge/Edge tracks). The existing lesson_progress table
-- (migration 0023) is UUID-FK-based and tied to the DB-backed academy_v2
-- system, so MDX lesson slugs don't fit there.

CREATE TABLE IF NOT EXISTS public.lesson_completions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug    text NOT NULL,
  lesson_slug    text NOT NULL,
  xp_earned      integer NOT NULL DEFAULT 0,
  completed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_slug, lesson_slug)
);

CREATE INDEX IF NOT EXISTS lesson_completions_user_course_idx
  ON public.lesson_completions (user_id, course_slug);

ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_completions_owner_rw" ON public.lesson_completions;
CREATE POLICY "lesson_completions_owner_rw" ON public.lesson_completions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
