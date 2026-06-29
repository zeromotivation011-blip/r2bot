-- 0021: Newsletter subscribers (Pulse weekly digest).

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email          text UNIQUE NOT NULL,
  subscribed_at  timestamptz NOT NULL DEFAULT now(),
  source         text DEFAULT 'pulse'
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_source_idx ON public.newsletter_subscribers(source);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anonymous signup allowed.
DROP POLICY IF EXISTS "newsletter_anon_insert" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_anon_insert" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);
