-- Diagnostic test result columns on profiles.
-- diagnostic_track is one of: spark, wire, forge, edge (or NULL = not taken)
-- diagnostic_done is the boolean for whether the user has finished the test.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS diagnostic_track text
    CHECK (diagnostic_track IN ('spark', 'wire', 'forge', 'edge'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS diagnostic_done boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_diagnostic_track_idx
  ON public.profiles (diagnostic_track) WHERE diagnostic_track IS NOT NULL;
