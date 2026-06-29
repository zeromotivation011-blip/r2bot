-- 0023: R2BOT Academy v2 — courses, modules, lessons, content blocks, enrollments,
--                          progress, quiz attempts, projects, certificates, SR queue.
-- Idempotent: safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────
-- INSTRUCTORS (author/teacher profiles)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.instructors (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text NOT NULL,
  bio             text,
  credentials     text[] DEFAULT '{}',
  photo_url       text,
  linkedin_url    text,
  courses_count   integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "instructors_public_read" ON public.instructors;
CREATE POLICY "instructors_public_read" ON public.instructors
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "instructors_self_write" ON public.instructors;
CREATE POLICY "instructors_self_write" ON public.instructors
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────
-- COURSES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courses (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 text UNIQUE NOT NULL,
  title                text NOT NULL,
  subtitle             text,
  track                text NOT NULL,
  level                text NOT NULL,
  description          text,
  thumbnail_url        text,
  trailer_url          text,
  instructor_id        uuid REFERENCES public.instructors(id) ON DELETE SET NULL,
  price_inr            integer NOT NULL DEFAULT 0,
  is_free              boolean NOT NULL DEFAULT true,
  duration_hours       numeric(4,1),
  total_lessons        integer NOT NULL DEFAULT 0,
  total_xp             integer NOT NULL DEFAULT 0,
  tags                 text[] DEFAULT '{}',
  prerequisites        text[] DEFAULT '{}',
  certificate_template text,
  published_at         timestamptz,
  language             text NOT NULL DEFAULT 'en',
  cbse_aligned         boolean NOT NULL DEFAULT false,
  nep_aligned          boolean NOT NULL DEFAULT false,
  hardware_kit         text,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS courses_track_idx     ON public.courses(track);
CREATE INDEX IF NOT EXISTS courses_level_idx     ON public.courses(level);
CREATE INDEX IF NOT EXISTS courses_published_idx ON public.courses(published_at);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "courses_public_read" ON public.courses;
CREATE POLICY "courses_public_read" ON public.courses
  FOR SELECT USING (published_at IS NOT NULL OR auth.uid() = instructor_id);
DROP POLICY IF EXISTS "courses_instructor_write" ON public.courses;
CREATE POLICY "courses_instructor_write" ON public.courses
  FOR ALL USING (auth.uid() = instructor_id) WITH CHECK (auth.uid() = instructor_id);

-- ─────────────────────────────────────────────────────────────────────────
-- MODULES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.modules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  order_index     integer NOT NULL,
  title           text NOT NULL,
  description     text,
  unlock_after    uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  is_checkpoint   boolean NOT NULL DEFAULT false,
  duration_minutes integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, order_index)
);
CREATE INDEX IF NOT EXISTS modules_course_idx ON public.modules(course_id, order_index);
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "modules_public_read" ON public.modules;
CREATE POLICY "modules_public_read" ON public.modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = modules.course_id AND c.published_at IS NOT NULL
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- LESSONS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lessons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  order_index     integer NOT NULL,
  slug            text NOT NULL,
  title           text NOT NULL,
  lesson_type     text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 10,
  xp_reward       integer NOT NULL DEFAULT 100,
  is_free_preview boolean NOT NULL DEFAULT false,
  passing_score   integer NOT NULL DEFAULT 75,
  content_mdx     text,
  content_hi      text,
  objectives      text[] DEFAULT '{}',
  atlas_links     text[] DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, slug),
  UNIQUE (course_id, slug)
);
CREATE INDEX IF NOT EXISTS lessons_module_idx ON public.lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS lessons_course_idx ON public.lessons(course_id);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lessons_public_read" ON public.lessons;
CREATE POLICY "lessons_public_read" ON public.lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id AND c.published_at IS NOT NULL
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- CONTENT BLOCKS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_blocks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id       uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  order_index     integer NOT NULL,
  block_type      text NOT NULL,
  data            jsonb NOT NULL,
  is_required     boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, order_index)
);
CREATE INDEX IF NOT EXISTS content_blocks_lesson_idx ON public.content_blocks(lesson_id, order_index);
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_blocks_public_read" ON public.content_blocks;
CREATE POLICY "content_blocks_public_read" ON public.content_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = content_blocks.lesson_id AND c.published_at IS NOT NULL
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- ENROLLMENTS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enrollments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at     timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  progress_pct    numeric(5,2) NOT NULL DEFAULT 0,
  last_active_at  timestamptz NOT NULL DEFAULT now(),
  is_paid         boolean NOT NULL DEFAULT false,
  payment_id      text,
  UNIQUE (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS enrollments_user_idx   ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS enrollments_course_idx ON public.enrollments(course_id);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "enrollments_owner_rw" ON public.enrollments;
CREATE POLICY "enrollments_owner_rw" ON public.enrollments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- LESSON PROGRESS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id       uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  best_score      integer NOT NULL DEFAULT 0,
  attempts        integer NOT NULL DEFAULT 0,
  time_spent_sec  integer NOT NULL DEFAULT 0,
  xp_earned       integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS lesson_progress_user_idx    ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS lesson_progress_course_idx  ON public.lesson_progress(user_id, course_id);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lesson_progress_owner_rw" ON public.lesson_progress;
CREATE POLICY "lesson_progress_owner_rw" ON public.lesson_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- BLOCK PROGRESS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.block_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id        uuid NOT NULL REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  lesson_id       uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at    timestamptz NOT NULL DEFAULT now(),
  score           integer,
  response_data   jsonb,
  UNIQUE (user_id, block_id)
);
CREATE INDEX IF NOT EXISTS block_progress_user_lesson_idx ON public.block_progress(user_id, lesson_id);
ALTER TABLE public.block_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_progress_owner_rw" ON public.block_progress;
CREATE POLICY "block_progress_owner_rw" ON public.block_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- QUIZ ATTEMPTS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id       uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  block_id        uuid NOT NULL REFERENCES public.content_blocks(id) ON DELETE CASCADE,
  answers         jsonb NOT NULL,
  score           integer NOT NULL,
  passed          boolean NOT NULL,
  time_taken_sec  integer,
  attempted_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quiz_attempts_user_lesson_idx ON public.quiz_attempts(user_id, lesson_id);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quiz_attempts_owner_rw" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_owner_rw" ON public.quiz_attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- PROJECT SUBMISSIONS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id       uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  content         text,
  repo_url        text,
  demo_url        text,
  images          text[] DEFAULT '{}',
  status          text NOT NULL DEFAULT 'submitted',
  grade           integer,
  feedback        text,
  reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  reviewed_at     timestamptz
);
CREATE INDEX IF NOT EXISTS project_submissions_user_idx   ON public.project_submissions(user_id);
CREATE INDEX IF NOT EXISTS project_submissions_lesson_idx ON public.project_submissions(lesson_id);
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_submissions_owner_rw" ON public.project_submissions;
CREATE POLICY "project_submissions_owner_rw" ON public.project_submissions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "project_submissions_reviewer_read" ON public.project_submissions;
CREATE POLICY "project_submissions_reviewer_read" ON public.project_submissions
  FOR SELECT USING (auth.uid() = reviewed_by);

-- ─────────────────────────────────────────────────────────────────────────
-- COURSE CERTIFICATES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_certificates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_id         text UNIQUE NOT NULL,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_title    text NOT NULL,
  user_name       text NOT NULL,
  issued_at       timestamptz NOT NULL DEFAULT now(),
  pdf_url         text
);
CREATE INDEX IF NOT EXISTS course_certificates_user_idx ON public.course_certificates(user_id);
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_certificates_public_read" ON public.course_certificates;
CREATE POLICY "course_certificates_public_read" ON public.course_certificates
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "course_certificates_owner_write" ON public.course_certificates;
CREATE POLICY "course_certificates_owner_write" ON public.course_certificates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- SPACED REPETITION QUEUE
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.review_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id       uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  next_review_at  timestamptz NOT NULL,
  interval_days   integer NOT NULL DEFAULT 1,
  ease_factor     numeric(3,2) NOT NULL DEFAULT 2.5,
  repetitions     integer NOT NULL DEFAULT 0,
  last_score      integer,
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS review_queue_user_due_idx ON public.review_queue(user_id, next_review_at);
ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "review_queue_owner_rw" ON public.review_queue;
CREATE POLICY "review_queue_owner_rw" ON public.review_queue
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
