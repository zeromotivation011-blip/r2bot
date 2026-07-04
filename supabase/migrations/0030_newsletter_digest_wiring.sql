-- 0030: Wire public newsletter signups into the weekly digest.
--
-- The homepage / News subscribe form writes to newsletter_subscribers, but the
-- weekly-digest cron previously only emailed registered profiles. These columns
-- let the cron email anonymous subscribers too, with a one-click unsubscribe.

ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribe_token text UNIQUE DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;

-- Backfill tokens for any pre-existing rows.
UPDATE public.newsletter_subscribers
  SET unsubscribe_token = gen_random_uuid()::text
  WHERE unsubscribe_token IS NULL;

CREATE INDEX IF NOT EXISTS newsletter_subscribers_active_idx
  ON public.newsletter_subscribers(active);
