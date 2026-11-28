-- Explicit "Enroll" for video courses. Separate from video_watch/lesson_completions,
-- which only ever recorded *implicit* progress (opening a lesson). Ravi asked specifically
-- for an enroll signal he can count — "how many have enrolled" — distinct from "how many
-- have watched something." One row per learner per course, created the moment they press
-- Enroll on /courses/<slug>.
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug  text NOT NULL,
  enrolled_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_slug)
);
CREATE INDEX IF NOT EXISTS course_enrollments_course_idx ON public.course_enrollments (course_slug);
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_enrollments_owner_rw" ON public.course_enrollments;
CREATE POLICY "course_enrollments_owner_rw" ON public.course_enrollments
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- Backfill: anyone who already has a lesson_completions or video_watch row for a course
-- clearly started it before this table existed. Without this, Growth's new "Enrolled" bar
-- would read zero for every existing learner on launch day, which undercounts and looks
-- like a regression rather than a new, stricter metric.
INSERT INTO public.course_enrollments (user_id, course_slug, enrolled_at)
SELECT user_id, course_slug, min(ts) FROM (
  SELECT user_id, course_slug, completed_at AS ts FROM public.lesson_completions
  UNION ALL
  SELECT user_id, course_slug, updated_at AS ts FROM public.video_watch
) x
GROUP BY user_id, course_slug
ON CONFLICT (user_id, course_slug) DO NOTHING;
