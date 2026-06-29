-- Per-dimension diagnostic scores so the result screen can show the
-- C / P / M breakdown and the dashboard can personalise content over time.

alter table public.profiles
  add column if not exists diagnostic_c_score integer,
  add column if not exists diagnostic_p_score integer,
  add column if not exists diagnostic_m_score integer;
