-- 0019: R2BOT for Schools — Classroom platform
-- Adds teacher-led classes, student memberships, and mission-completion telemetry.

-- ─────────────────────────────────────────────────────────────────────────
-- school_classes — a teacher's class roster (with a 6-char join code)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.school_classes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  grade      text NOT NULL,
  section    text,
  join_code  text UNIQUE NOT NULL,
  school_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS school_classes_teacher_idx ON public.school_classes(teacher_id);
CREATE INDEX IF NOT EXISTS school_classes_code_idx    ON public.school_classes(join_code);

-- ─────────────────────────────────────────────────────────────────────────
-- student_class_memberships
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_class_memberships (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id   uuid REFERENCES public.school_classes(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, class_id)
);
CREATE INDEX IF NOT EXISTS scm_student_idx ON public.student_class_memberships(student_id);
CREATE INDEX IF NOT EXISTS scm_class_idx   ON public.student_class_memberships(class_id);

-- ─────────────────────────────────────────────────────────────────────────
-- school_mission_completions — per-mission telemetry from the simulator
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.school_mission_completions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id   text NOT NULL,
  score        integer DEFAULT 0,
  time_seconds integer,
  collisions   integer DEFAULT 0,
  code_type    text DEFAULT 'blocks',     -- 'blocks' | 'python'
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS smc_student_idx ON public.school_mission_completions(student_id);
CREATE INDEX IF NOT EXISTS smc_mission_idx ON public.school_mission_completions(mission_id);

-- ─────────────────────────────────────────────────────────────────────────
-- profiles: school grade / track / school name (idempotent)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_grade text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_track text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_name  text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_xp    integer DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.school_classes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_class_memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_mission_completions  ENABLE ROW LEVEL SECURITY;

-- Teachers fully manage their own classes
DROP POLICY IF EXISTS "school_classes_teacher_rw" ON public.school_classes;
CREATE POLICY "school_classes_teacher_rw" ON public.school_classes
  FOR ALL USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

-- Students can read the class row they belong to
DROP POLICY IF EXISTS "school_classes_member_read" ON public.school_classes;
CREATE POLICY "school_classes_member_read" ON public.school_classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.student_class_memberships m
      WHERE m.class_id = school_classes.id AND m.student_id = auth.uid()
    )
  );

-- Membership: students self-manage their joins
DROP POLICY IF EXISTS "scm_student_rw" ON public.student_class_memberships;
CREATE POLICY "scm_student_rw" ON public.student_class_memberships
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Teachers can read memberships for their own classes
DROP POLICY IF EXISTS "scm_teacher_read" ON public.student_class_memberships;
CREATE POLICY "scm_teacher_read" ON public.student_class_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.school_classes c
      WHERE c.id = student_class_memberships.class_id AND c.teacher_id = auth.uid()
    )
  );

-- Mission completions — student RW for their own rows
DROP POLICY IF EXISTS "smc_student_rw" ON public.school_mission_completions;
CREATE POLICY "smc_student_rw" ON public.school_mission_completions
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Teachers can read completions of students in their classes
DROP POLICY IF EXISTS "smc_teacher_read" ON public.school_mission_completions;
CREATE POLICY "smc_teacher_read" ON public.school_mission_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.student_class_memberships m
      JOIN public.school_classes c ON c.id = m.class_id
      WHERE m.student_id = school_mission_completions.student_id
        AND c.teacher_id = auth.uid()
    )
  );
