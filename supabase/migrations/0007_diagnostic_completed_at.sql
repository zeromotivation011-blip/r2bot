-- Track when the diagnostic was last completed, so Mission Control can
-- show "last assessed N days ago" and the homepage can prompt retakes
-- after long gaps.

alter table public.profiles
  add column if not exists diagnostic_completed_at timestamptz;
