-- 0032: Atlas content in the database (Content Manager foundation).
--
-- Existing 265 MDX files are migrated in via scripts/migrate-atlas-to-db.ts.
-- Queryable fields are columns; the full frontmatter is preserved in `data`
-- (jsonb) so nothing is lost and new fields never require a schema change.
-- The Atlas render layer will read from here (Stage 2); the admin CMS writes here.

CREATE TABLE IF NOT EXISTS public.atlas_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL,
  slug        text NOT NULL,
  title       text NOT NULL,
  summary     text NOT NULL DEFAULT '',
  category    text,
  status      text NOT NULL DEFAULT 'published',  -- 'draft' | 'published'
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,  -- full frontmatter (lossless)
  body        text NOT NULL DEFAULT '',            -- markdown body
  origin      text NOT NULL DEFAULT 'mdx',         -- 'mdx' (migrated) | 'cms' (created in admin)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, slug)
);

CREATE INDEX IF NOT EXISTS atlas_entries_type_idx   ON public.atlas_entries(type);
CREATE INDEX IF NOT EXISTS atlas_entries_status_idx ON public.atlas_entries(status);
CREATE INDEX IF NOT EXISTS atlas_entries_updated_idx ON public.atlas_entries(updated_at DESC);

ALTER TABLE public.atlas_entries ENABLE ROW LEVEL SECURITY;

-- Anyone may read PUBLISHED entries (public content pages).
DROP POLICY IF EXISTS "atlas_public_read_published" ON public.atlas_entries;
CREATE POLICY "atlas_public_read_published" ON public.atlas_entries
  FOR SELECT USING (status = 'published');

-- Admins can read everything (incl. drafts) and write.
DROP POLICY IF EXISTS "atlas_admin_all" ON public.atlas_entries;
CREATE POLICY "atlas_admin_all" ON public.atlas_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Keep updated_at fresh on every write.
CREATE OR REPLACE FUNCTION public.touch_atlas_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_atlas_touch ON public.atlas_entries;
CREATE TRIGGER trg_atlas_touch BEFORE UPDATE ON public.atlas_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_atlas_updated_at();
