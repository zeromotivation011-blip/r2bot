-- First-party, cookieless, aggregate page-view counts (no IPs, no user ids).
CREATE TABLE IF NOT EXISTS public.page_view_daily (
  day   date    NOT NULL,
  path  text    NOT NULL,
  views integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path)
);
ALTER TABLE public.page_view_daily ENABLE ROW LEVEL SECURITY;  -- no policies: service role only

CREATE OR REPLACE FUNCTION public.increment_page_view(p_path text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.page_view_daily (day, path, views)
  VALUES ((now() AT TIME ZONE 'UTC')::date, left(p_path, 200), 1)
  ON CONFLICT (day, path) DO UPDATE SET views = public.page_view_daily.views + 1;
$$;
REVOKE ALL ON FUNCTION public.increment_page_view(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_page_view(text) TO service_role;
