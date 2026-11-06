-- 0047: Email send log (prevents duplicate automated emails) + analytics events.
CREATE TABLE IF NOT EXISTS public.email_log (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email    text NOT NULL,
  kind     text NOT NULL,          -- welcome-2, welcome-3, nudge-2:<course>, cert:<id>, weekly:<date>
  sent_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, kind)
);
CREATE INDEX IF NOT EXISTS email_log_sent_idx ON public.email_log (sent_at DESC);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY; -- service role only (no policies)
