-- B2B institution tier — schema only.
-- No UI is built yet; per CLAUDE.md §6 the B2B sales motion launches
-- ~Month 12. This migration lands the data model so we can start
-- collecting interest and signing pilots before the dashboard exists.

CREATE TABLE IF NOT EXISTS public.institutions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  type                text NOT NULL CHECK (type IN ('college', 'school', 'company')),
  contact_email       text NOT NULL,
  contact_name        text,
  plan                text NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'professional', 'enterprise')),
  student_limit       integer NOT NULL DEFAULT 50,
  subscription_start  timestamptz,
  subscription_end    timestamptz,
  razorpay_order_id   text,
  status              text NOT NULL DEFAULT 'trial'
    CHECK (status IN ('active', 'expired', 'trial')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS institutions_status_idx
  ON public.institutions (status, subscription_end DESC);

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
-- No public read/write policies — only the service role and explicit
-- admin policies (added when the UI lands) can touch this table.

-- ────────────────────────────────────────────────────────────────────────
-- INSTITUTION MEMBERS — links auth.users to institutions with a role.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institution_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, user_id)
);

CREATE INDEX IF NOT EXISTS institution_members_user_idx
  ON public.institution_members (user_id);
CREATE INDEX IF NOT EXISTS institution_members_institution_idx
  ON public.institution_members (institution_id, role);

ALTER TABLE public.institution_members ENABLE ROW LEVEL SECURITY;

-- Users see their own row.
DROP POLICY IF EXISTS "institution_members_self_select" ON public.institution_members;
CREATE POLICY "institution_members_self_select" ON public.institution_members
  FOR SELECT USING (auth.uid() = user_id);

-- Institution admins see every row in their institution.
DROP POLICY IF EXISTS "institution_members_admin_select" ON public.institution_members;
CREATE POLICY "institution_members_admin_select" ON public.institution_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.institution_members m
      WHERE m.institution_id = institution_members.institution_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
  );

-- ────────────────────────────────────────────────────────────────────────
-- INSTITUTION INVITES — pre-shared tokens for teachers/students to join.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institution_invites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  email           text NOT NULL,
  role            text NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  token           text UNIQUE NOT NULL,
  expires_at      timestamptz NOT NULL,
  used_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS institution_invites_token_idx
  ON public.institution_invites (token);
CREATE INDEX IF NOT EXISTS institution_invites_email_idx
  ON public.institution_invites (lower(email)) WHERE used_at IS NULL;

ALTER TABLE public.institution_invites ENABLE ROW LEVEL SECURITY;
-- No public policies — invite tokens are validated by service-role API routes
-- (to be built when the institution onboarding UI launches in Month 12).
