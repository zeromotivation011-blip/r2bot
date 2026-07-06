-- 0033: News archive + curation.
--
-- The /news feed is aggregated live from RSS. This table persists each fetch so
-- news becomes a browsable, SEO-indexable archive AND editable: admins can pin,
-- hide, or rewrite the summary of any story. getNewsData() applies these as an
-- overlay on the live feed (hide -> dropped, pin -> surfaced first).

CREATE TABLE IF NOT EXISTS public.news (
  url             text PRIMARY KEY,
  title           text NOT NULL DEFAULT '',
  source          text,
  topic           text,
  published_at    timestamptz,
  image_url       text,
  summary         text,          -- original description / ai summary at ingest
  article         jsonb NOT NULL DEFAULT '{}'::jsonb,  -- full enriched article
  pinned          boolean NOT NULL DEFAULT false,
  hidden          boolean NOT NULL DEFAULT false,
  curated_summary text,          -- admin override for the shown summary
  first_seen_at   timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS news_published_idx ON public.news(published_at DESC);
CREATE INDEX IF NOT EXISTS news_pinned_idx    ON public.news(pinned) WHERE pinned = true;

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Public can read the archive (curation overlay + browsing).
DROP POLICY IF EXISTS "news_public_read" ON public.news;
CREATE POLICY "news_public_read" ON public.news
  FOR SELECT USING (true);

-- Admins can curate (the cron writes via the service role, which bypasses RLS).
DROP POLICY IF EXISTS "news_admin_write" ON public.news;
CREATE POLICY "news_admin_write" ON public.news
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
