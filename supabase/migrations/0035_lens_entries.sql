-- 0035: Curated Lens videos in the database (Content Manager · Lens).
-- Same pattern as atlas/blog: core columns + lossless jsonb frontmatter + body.
-- The /lens "editor's picks" section reads DB-first with an MDX fallback.

CREATE TABLE IF NOT EXISTS public.lens_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  title       text NOT NULL,
  summary     text NOT NULL DEFAULT '',
  topic       text,
  youtube_id  text,
  published_at date NOT NULL DEFAULT now(),
  status      text NOT NULL DEFAULT 'published',
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  body        text NOT NULL DEFAULT '',
  origin      text NOT NULL DEFAULT 'mdx',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lens_entries
  ADD COLUMN IF NOT EXISTS summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS youtube_id text,
  ADD COLUMN IF NOT EXISTS published_at date NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS body text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'mdx';

CREATE INDEX IF NOT EXISTS lens_entries_published_idx ON public.lens_entries(published_at DESC);

ALTER TABLE public.lens_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lens_public_read_published" ON public.lens_entries;
CREATE POLICY "lens_public_read_published" ON public.lens_entries
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "lens_admin_all" ON public.lens_entries;
CREATE POLICY "lens_admin_all" ON public.lens_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
