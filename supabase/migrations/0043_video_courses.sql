-- Video courses: resume/watch tracking + allow 'video' certificates.
-- Completion itself reuses public.lesson_completions (course_slug = course, lesson_slug = lesson id).

CREATE TABLE IF NOT EXISTS public.video_watch (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug text NOT NULL,
  lesson_slug text NOT NULL,
  position_s  integer NOT NULL DEFAULT 0,
  max_pct     real NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_slug, lesson_slug)
);
CREATE INDEX IF NOT EXISTS video_watch_user_course_idx ON public.video_watch (user_id, course_slug);
ALTER TABLE public.video_watch ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "video_watch_owner_rw" ON public.video_watch;
CREATE POLICY "video_watch_owner_rw" ON public.video_watch
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- Allow certificates for video courses.
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS certificates_track_check;
ALTER TABLE public.certificates
  ADD CONSTRAINT certificates_track_check CHECK (track IN ('spark', 'wire', 'forge', 'edge', 'video'));
