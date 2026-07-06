-- 0034: Blog posts in the database (Content Manager · Blog).
-- Same pattern as atlas_entries: core columns for querying + lossless jsonb
-- frontmatter + body. Public reads published; admins write. The blog render
-- layer reads DB-first with an MDX fallback.

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  date        date NOT NULL DEFAULT now(),
  status      text NOT NULL DEFAULT 'published',   -- 'draft' | 'published'
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,   -- full frontmatter (lossless)
  body        text NOT NULL DEFAULT '',
  origin      text NOT NULL DEFAULT 'mdx',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS date date NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS body text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'mdx';

CREATE INDEX IF NOT EXISTS blog_posts_date_idx   ON public.blog_posts(date DESC);
CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON public.blog_posts(status);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_public_read_published" ON public.blog_posts;
CREATE POLICY "blog_public_read_published" ON public.blog_posts
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "blog_admin_all" ON public.blog_posts;
CREATE POLICY "blog_admin_all" ON public.blog_posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
