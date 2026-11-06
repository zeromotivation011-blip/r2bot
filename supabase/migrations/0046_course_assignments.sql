-- Final activity (assignment) for video courses. One submission per learner per course; resubmitting updates it.
CREATE TABLE IF NOT EXISTS public.course_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug text NOT NULL,
  answer      text NOT NULL CHECK (char_length(answer) BETWEEN 30 AND 1500),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_slug)
);
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_assignments_owner_rw" ON public.course_assignments;
CREATE POLICY "course_assignments_owner_rw" ON public.course_assignments
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
