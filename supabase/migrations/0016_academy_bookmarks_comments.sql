-- 0016: academy lesson bookmarks + comments

CREATE TABLE IF NOT EXISTS public.lesson_bookmarks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track, slug)
);

CREATE INDEX IF NOT EXISTS lesson_bookmarks_user_idx ON public.lesson_bookmarks(user_id);

ALTER TABLE public.lesson_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_bookmarks_self_select" ON public.lesson_bookmarks;
CREATE POLICY "lesson_bookmarks_self_select" ON public.lesson_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lesson_bookmarks_self_insert" ON public.lesson_bookmarks;
CREATE POLICY "lesson_bookmarks_self_insert" ON public.lesson_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lesson_bookmarks_self_delete" ON public.lesson_bookmarks;
CREATE POLICY "lesson_bookmarks_self_delete" ON public.lesson_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.lesson_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  track text NOT NULL,
  slug text NOT NULL,
  comment text NOT NULL CHECK (length(comment) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lesson_comments_lookup_idx ON public.lesson_comments(track, slug, created_at);
CREATE INDEX IF NOT EXISTS lesson_comments_user_idx ON public.lesson_comments(user_id);

ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_comments_public_select" ON public.lesson_comments;
CREATE POLICY "lesson_comments_public_select" ON public.lesson_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "lesson_comments_authenticated_insert" ON public.lesson_comments;
CREATE POLICY "lesson_comments_authenticated_insert" ON public.lesson_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lesson_comments_self_delete" ON public.lesson_comments;
CREATE POLICY "lesson_comments_self_delete" ON public.lesson_comments
  FOR DELETE USING (auth.uid() = user_id);
