-- 0036: Append-only lead event log + richer lead records.
--
-- WHY: public.leads has a UNIQUE index on lower(email) — it is a "one row per
-- person" table. That is correct for the person, but it means every signal
-- after the first was being swallowed as a duplicate. If a visitor gives their
-- email to the popup on Monday and joins the ROS2 course waitlist on Friday,
-- we previously kept only the Monday row and lost the fact that they want ROS2.
--
-- lead_events is append-only: every submission is recorded, forever, with the
-- context that produced it. leads stays the deduplicated person record.

-- 1. Richer person record ---------------------------------------------------
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS name       text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS meta       jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_seen  timestamptz NOT NULL DEFAULT now();

-- 2. Append-only event log --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  name        text,
  phone       text,
  -- 'popup' | 'academy-waitlist' | 'schools-interest' | 'newsletter' | ...
  source      text NOT NULL DEFAULT 'popup',
  page        text,
  -- Free-form context: { courseId, courseSlug, schoolName, city, message, ... }
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_events_created_at_idx ON public.lead_events(created_at DESC);
CREATE INDEX IF NOT EXISTS lead_events_email_idx      ON public.lead_events(lower(email));
CREATE INDEX IF NOT EXISTS lead_events_source_idx     ON public.lead_events(source);

ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

-- Anonymous visitors may submit; nobody but an admin may read.
DROP POLICY IF EXISTS "lead_events_anon_insert" ON public.lead_events;
CREATE POLICY "lead_events_anon_insert" ON public.lead_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "lead_events_admin_select" ON public.lead_events;
CREATE POLICY "lead_events_admin_select" ON public.lead_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 3. NOTE ON ENRICHING AN EXISTING PERSON ROW -------------------------------
-- A returning lead's name/phone/last_seen should be refreshed rather than
-- dropped as a duplicate. We deliberately do NOT add an anonymous UPDATE
-- policy for this — `FOR UPDATE USING (true)` would let any visitor overwrite
-- any other person's row. The enrichment is done server-side in
-- app/api/leads/route.ts using the service-role client, which bypasses RLS.
-- Keep it that way.
