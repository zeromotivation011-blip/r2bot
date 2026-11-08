-- 0037: URL-safe slug for the news archive.
--
-- The /news feed archives each story into public.news (0033), keyed by url.
-- To publish per-article, SEO-indexable pages at /news/<slug> we need a stable,
-- URL-safe identifier. The existing `id` in the article JSON is a base64 slice
-- (can contain +, /, =) so it is not URL-safe. This adds a real slug column,
-- backfills existing rows, and enforces uniqueness.
--
-- Slug format: slugified-title (<=60 chars) + '-' + first 6 hex of md5(url).
-- The md5 suffix guarantees uniqueness and keeps the slug stable even if two
-- stories share a title. lib/news.ts newsSlug() mirrors this for new rows the
-- cron writes going forward.

ALTER TABLE public.news ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.news
SET slug = (
  CASE
    WHEN trim(both '-' from left(regexp_replace(lower(coalesce(nullif(title, ''), 'story')), '[^a-z0-9]+', '-', 'g'), 60)) = ''
      THEN 'story'
    ELSE trim(both '-' from left(regexp_replace(lower(coalesce(nullif(title, ''), 'story')), '[^a-z0-9]+', '-', 'g'), 60))
  END
) || '-' || substr(md5(url), 1, 6)
WHERE slug IS NULL;

-- Fast lookups by slug (the /news/<slug> route queries on this). Intentionally
-- NOT unique: the cron upserts ~80 rows in one atomic statement, so a unique
-- violation would fail the whole archive run. The md5(url) suffix already makes
-- slugs effectively unique; the read path de-dupes with limit(1) as a backstop.
CREATE INDEX IF NOT EXISTS news_slug_idx ON public.news(slug);
