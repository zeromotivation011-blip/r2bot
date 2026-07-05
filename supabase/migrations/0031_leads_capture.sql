-- 0031: Lead capture (email + phone) from the site-wide popup.
-- Feeds the admin leads dashboard and auto-subscribes leads to the weekly digest.

CREATE TABLE IF NOT EXISTS public.leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  phone       text NOT NULL,
  source      text DEFAULT 'popup',
  page        text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS leads_email_uidx ON public.leads(lower(email));

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous visitor) can submit the capture form.
DROP POLICY IF EXISTS "leads_anon_insert" ON public.leads;
CREATE POLICY "leads_anon_insert" ON public.leads
  FOR INSERT WITH CHECK (true);

-- Only admins can read the collected leads.
DROP POLICY IF EXISTS "leads_admin_select" ON public.leads;
CREATE POLICY "leads_admin_select" ON public.leads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
