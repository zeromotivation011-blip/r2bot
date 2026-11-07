-- Retention measurement, without storing anything about a person.
--
-- The problem: /api/track records path, country, device and referrer, all
-- aggregate. That answers "how many views" and nothing about the metric the
-- whole plan is judged on — do people come back, and does a one-minute lesson
-- lead to a course? With no visitor dimension at all, returning-visitor rate
-- and the lesson→course funnel were unmeasurable.
--
-- The approach: the *browser* decides whether it has been here before (a
-- first-party localStorage flag) and sends one word, 'new' or 'returning'. No
-- identifier, no hash of an IP, no cookie, nothing that could be joined back to
-- a person ever leaves the device. The server only increments counters. This is
-- weaker than server-side identity — clearing storage reads as a new visitor —
-- and it is the right trade for a site that promises not to track people.
--
-- 'visit' rows: key is 'new' | 'returning'.
-- 'event' rows: key is a named milestone, e.g. 'lesson_quiz_correct'.
ALTER TABLE public.site_metric_daily DROP CONSTRAINT IF EXISTS site_metric_daily_kind_check;
ALTER TABLE public.site_metric_daily
  ADD CONSTRAINT site_metric_daily_kind_check
  CHECK (kind IN ('ref', 'country', 'device', 'visit', 'event'));

-- Replaces 0045's track_view, adding the visit dimension. Same name and same
-- SECURITY DEFINER / service-role-only grant, so nothing else has to change.
DROP FUNCTION IF EXISTS public.track_view(text, text, text, text);

CREATE OR REPLACE FUNCTION public.track_view(
  p_path text, p_country text, p_device text, p_ref text, p_visit text DEFAULT NULL
)
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
  IF p_visit IN ('new', 'returning') THEN
    INSERT INTO public.site_metric_daily (day, kind, key, views) VALUES (d, 'visit', p_visit, 1)
      ON CONFLICT (day, kind, key) DO UPDATE SET views = public.site_metric_daily.views + 1;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.track_view(text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_view(text, text, text, text, text) TO service_role;

-- Named funnel milestones: lesson watched, quiz answered, course lesson started,
-- email captured. One counter per day per event, nothing per person.
CREATE OR REPLACE FUNCTION public.track_event(p_event text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF coalesce(p_event, '') = '' THEN RETURN; END IF;
  INSERT INTO public.site_metric_daily (day, kind, key, views) VALUES (d, 'event', left(p_event, 60), 1)
    ON CONFLICT (day, kind, key) DO UPDATE SET views = public.site_metric_daily.views + 1;
END $$;
REVOKE ALL ON FUNCTION public.track_event(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_event(text) TO service_role;
