-- Aggregate traffic dimensions (no IPs, no user ids): referrer source, country, device.
CREATE TABLE IF NOT EXISTS public.site_metric_daily (
  day   date    NOT NULL,
  kind  text    NOT NULL CHECK (kind IN ('ref', 'country', 'device')),
  key   text    NOT NULL,
  views integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind, key)
);
ALTER TABLE public.site_metric_daily ENABLE ROW LEVEL SECURITY;  -- service role only

CREATE OR REPLACE FUNCTION public.track_view(p_path text, p_country text, p_device text, p_ref text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  INSERT INTO public.page_view_daily (day, path, views) VALUES (d, left(p_path, 200), 1)
    ON CONFLICT (day, path) DO UPDATE SET views = public.page_view_daily.views + 1;
  IF coalesce(p_country, '') <> '' THEN
    INSERT INTO public.site_metric_daily (day, kind, key, views) VALUES (d, 'country', left(p_country, 8), 1)
      ON CONFLICT (day, kind, key) DO UPDATE SET views = public.site_metric_daily.views + 1;
  END IF;
  IF coalesce(p_device, '') <> '' THEN
    INSERT INTO public.site_metric_daily (day, kind, key, views) VALUES (d, 'device', left(p_device, 16), 1)
      ON CONFLICT (day, kind, key) DO UPDATE SET views = public.site_metric_daily.views + 1;
  END IF;
  IF coalesce(p_ref, '') <> '' THEN
    INSERT INTO public.site_metric_daily (day, kind, key, views) VALUES (d, 'ref', left(p_ref, 60), 1)
      ON CONFLICT (day, kind, key) DO UPDATE SET views = public.site_metric_daily.views + 1;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.track_view(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_view(text, text, text, text) TO service_role;
