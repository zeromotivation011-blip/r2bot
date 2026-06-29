-- 0017: schools registration + class codes

CREATE TABLE IF NOT EXISTS public.schools (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name text NOT NULL,
  city text,
  state text,
  board text,
  teacher_name text,
  teacher_email text,
  phone text,
  role text,
  grade_range text,
  student_count_estimate integer,
  status text NOT NULL DEFAULT 'pending', -- pending / active / suspended
  class_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schools_status_idx ON public.schools(status);
CREATE INDEX IF NOT EXISTS schools_city_idx ON public.schools(city);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schools_anon_insert" ON public.schools;
CREATE POLICY "schools_anon_insert" ON public.schools
  FOR INSERT WITH CHECK (true);

-- Only the registering teacher (matched by email) or an authenticated admin can read full rows.
-- For the listing on /schools page we expose a sanitised view.
CREATE OR REPLACE VIEW public.schools_public AS
SELECT
  id, school_name, city, state, board, status, created_at
FROM public.schools
WHERE status = 'active';

GRANT SELECT ON public.schools_public TO anon, authenticated;

-- Profiles: class_code (already may exist; idempotent)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_code text;
CREATE INDEX IF NOT EXISTS profiles_class_code_idx ON public.profiles(class_code);
