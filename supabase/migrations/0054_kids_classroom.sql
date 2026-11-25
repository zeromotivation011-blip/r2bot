-- 0054_kids_classroom
--
-- R2BOT Kids Classroom: a teacher creates a class, children join it with a
-- 6-character code and a NICKNAME ONLY, and the teacher sees each child's
-- progress. Parents see what is shared on /kids/join and can leave the class.
--
-- Why new tables and not public.school_classes (0019):
--   - school_classes belongs to the older /schools product. Its students are
--     signed-in auth users (school_class_members.student_id -> auth.users), and
--     its policies are built around that. Kids here have NO account by design
--     (COPPA / GDPR-K): a child is a random token held in their browser.
--   - Its join codes share one namespace with /schools. A kids code typed into
--     the old student page (or the reverse) would find the wrong product.
--   - The old /schools teacher dashboard lists every school_classes row for the
--     teacher; kids classes would appear there with no way to use them.
--   Separate tables keep both products honest and either can be retired alone.
--
-- Children never talk to Supabase. Every child write (join, progress sync,
-- leave) goes through app/api/kids/** with the service-role client after the
-- route has verified the join code or the member token. The token itself is
-- never stored: only its SHA-256 (token_hash).
--
-- Teachers also go through route handlers (app/api/kids/classroom/**), which
-- check the signed-in user owns the class. The RLS policies below are defence
-- in depth: a teacher's own session can read only their own classes and the
-- members of those classes. No policy uses `auth.uid() is null` (see 0051).
--
-- Code that depends on this file degrades safely until it runs:
--   - POST /api/kids/join answers 503 "Classrooms are being switched on";
--   - /kids/classroom shows a friendly "being switched on" notice;
--   - the progress sync stays quiet; nothing else on /kids is touched.
-- Run this file in the Supabase SQL editor; nothing else is needed.

create extension if not exists pgcrypto;

-- ── Classes ──────────────────────────────────────────────────────────────
create table if not exists public.kids_classes (
  id            uuid        primary key default gen_random_uuid(),
  teacher_id    uuid        not null references auth.users (id) on delete cascade,
  class_name    text        not null check (char_length(class_name) between 1 and 60),
  -- What children see: "You joined Ms Rao's class!" Chosen by the teacher.
  teacher_name  text        check (teacher_name is null or char_length(teacher_name) <= 40),
  school_name   text        check (school_name is null or char_length(school_name) <= 100),
  band          text        not null check (band in ('explorers', 'builders', 'inventors', 'engineers')),
  -- Unambiguous alphabet: no I, L, O, 0 or 1.
  join_code     text        not null unique check (join_code ~ '^[A-HJKMNP-Z2-9]{6}$'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists kids_classes_teacher_idx on public.kids_classes (teacher_id, created_at desc);

-- ── Members (children) ───────────────────────────────────────────────────
create table if not exists public.kids_class_members (
  id              uuid        primary key default gen_random_uuid(),
  class_id        uuid        not null references public.kids_classes (id) on delete cascade,
  nickname        text        not null check (char_length(nickname) between 2 and 20),
  -- SHA-256 hex of the random member token. The token lives only in the
  -- child's browser; losing it means re-joining, which is fine.
  token_hash      text        not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  -- Compact progress snapshot (validated + capped by the route; capped here too).
  snapshot        jsonb       not null default '{}'::jsonb
                  check (octet_length(snapshot::text) <= 8192),
  created_at      timestamptz not null default now(),
  last_active_at  timestamptz not null default now()
);

create index if not exists kids_class_members_class_idx on public.kids_class_members (class_id, created_at);
-- One "Aarav" per class, so the roster is readable. A second one adds a letter.
create unique index if not exists kids_class_members_nick_uq
  on public.kids_class_members (class_id, lower(nickname));

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.kids_classes       enable row level security;
alter table public.kids_class_members enable row level security;

-- Teachers manage their own classes.
drop policy if exists "kids_classes_teacher_select" on public.kids_classes;
create policy "kids_classes_teacher_select" on public.kids_classes
  for select to authenticated
  using (auth.uid() = teacher_id);

drop policy if exists "kids_classes_teacher_insert" on public.kids_classes;
create policy "kids_classes_teacher_insert" on public.kids_classes
  for insert to authenticated
  with check (auth.uid() = teacher_id);

drop policy if exists "kids_classes_teacher_update" on public.kids_classes;
create policy "kids_classes_teacher_update" on public.kids_classes
  for update to authenticated
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

drop policy if exists "kids_classes_teacher_delete" on public.kids_classes;
create policy "kids_classes_teacher_delete" on public.kids_classes
  for delete to authenticated
  using (auth.uid() = teacher_id);

-- Teachers read and remove the members of their own classes. No INSERT or
-- UPDATE policy: members are created and updated only by the service role.
drop policy if exists "kids_class_members_teacher_select" on public.kids_class_members;
create policy "kids_class_members_teacher_select" on public.kids_class_members
  for select to authenticated
  using (exists (
    select 1 from public.kids_classes c
    where c.id = kids_class_members.class_id and c.teacher_id = auth.uid()
  ));

drop policy if exists "kids_class_members_teacher_delete" on public.kids_class_members;
create policy "kids_class_members_teacher_delete" on public.kids_class_members
  for delete to authenticated
  using (exists (
    select 1 from public.kids_classes c
    where c.id = kids_class_members.class_id and c.teacher_id = auth.uid()
  ));

-- The anon role gets nothing at all.
revoke all on public.kids_classes       from anon;
revoke all on public.kids_class_members from anon;
