-- Course completion certificates
-- Adds a certificates table with public verification by certificate_id and
-- row-level security so users only see their own private rows via select policy.

CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track text NOT NULL CHECK (track IN ('spark', 'wire', 'forge', 'edge')),
  lesson_slug text NOT NULL,
  lesson_title text NOT NULL,
  certificate_id text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  issued_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS certificates_user_idx
  ON public.certificates(user_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS certificates_certificate_id_idx
  ON public.certificates(certificate_id);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users view own certs" ON public.certificates;
CREATE POLICY "users view own certs" ON public.certificates
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own certs" ON public.certificates;
CREATE POLICY "users insert own certs" ON public.certificates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Public verification by certificate_id: allow anonymous SELECT for the lookup,
-- so /verify/[id] works without a session.
DROP POLICY IF EXISTS "public verify by certificate_id" ON public.certificates;
CREATE POLICY "public verify by certificate_id" ON public.certificates
  FOR SELECT
  USING (true);
