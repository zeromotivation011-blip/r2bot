-- 0055_kids_schools
--
-- R2BOT Kids for schools, on top of 0054 (kids_classes, kids_class_members):
--   1. Schools: a teacher creates a school and invites co-teachers with an
--      8-character school code. The creator is the school admin and sees every
--      class in the school with a school-wide summary.
--   2. Assignments: a teacher assigns a course session, a Skill Galaxy activity
--      or a game to a class, with an optional due date. Children see them as
--      "From your teacher" missions; completion is derived from the progress
--      snapshot each child already syncs (no new child data).
--
-- Teachers are signed-in R2BOT users. Children still have NO account: they
-- read their class's assignments through /api/kids/missions with the member
-- token from 0054, via the service-role client. Nothing here stores anything
-- about a child.
--
-- Code that depends on this file degrades safely until it runs:
--   - /api/kids/classroom/school and the assignment routes answer 503
--     "being switched on", and the dashboard shows a friendly notice in place
--     of the School and Assignments panels;
--   - creating a class works exactly as before (no school_id is written);
--   - /api/kids/missions answers 503 and the child's "From your teacher" card
--     stays hidden; the progress sync ignores the missing table.
-- Run this file in the Supabase SQL editor after 0054; nothing else is needed.

create extension if not exists pgcrypto;

-- ── Schools ──────────────────────────────────────────────────────────────
create table if not exists public.kids_schools (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null check (char_length(name) between 2 and 100),
  -- Same unambiguous alphabet as class codes, but 8 characters so a school
  -- code can never be mistaken for (or typed into) a class join code.
  school_code  text        not null unique check (school_code ~ '^[A-HJKMNP-Z2-9]{8}$'),
  created_by   uuid        not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.kids_school_teachers (
  school_id     uuid        not null references public.kids_schools (id) on delete cascade,
  teacher_id    uuid        not null references auth.users (id) on delete cascade,
  role          text        not null default 'teacher' check (role in ('admin', 'teacher')),
  -- How colleagues see this teacher on the school page ("Ms Rao").
  display_name  text        check (display_name is null or char_length(display_name) <= 40),
  joined_at     timestamptz not null default now(),
  primary key (school_id, teacher_id)
);

-- One school per teacher keeps "my school" unambiguous.
create unique index if not exists kids_school_teachers_teacher_uq on public.kids_school_teachers (teacher_id);

alter table public.kids_classes
  add column if not exists school_id uuid references public.kids_schools (id) on delete set null;

create index if not exists kids_classes_school_idx on public.kids_classes (school_id) where school_id is not null;

-- ── Assignments ──────────────────────────────────────────────────────────
create table if not exists public.kids_assignments (
  id          uuid        primary key default gen_random_uuid(),
  class_id    uuid        not null references public.kids_classes (id) on delete cascade,
  kind        text        not null check (kind in ('session', 'activity', 'game')),
  -- session: "L1-S05"; activity: a Skill Galaxy id; game: a game id.
  item_id     text        not null check (item_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  -- Copied at assignment time, so the child's card needs no catalogue lookup.
  title       text        not null check (char_length(title) between 1 and 120),
  note        text        check (note is null or char_length(note) <= 200),
  due_date    date,
  created_by  uuid        not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (class_id, kind, item_id)
);

create index if not exists kids_assignments_class_idx on public.kids_assignments (class_id, created_at desc);

-- ── Helper functions (security definer: avoid recursive RLS lookups) ─────
create or replace function public.kids_school_role(p_school uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.kids_school_teachers
  where school_id = p_school and teacher_id = auth.uid()
$$;

revoke all on function public.kids_school_role(uuid) from public, anon;
grant execute on function public.kids_school_role(uuid) to authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Every route uses the service-role client after checking the signed-in
-- teacher; these policies are the second lock. None uses `auth.uid() is null`.
alter table public.kids_schools         enable row level security;
alter table public.kids_school_teachers enable row level security;
alter table public.kids_assignments     enable row level security;

-- Schools: members read their school; the admin may rename it. Creating and
-- deleting schools, and changing codes, happen only through the service role.
drop policy if exists "kids_schools_member_select" on public.kids_schools;
create policy "kids_schools_member_select" on public.kids_schools
  for select to authenticated
  using (public.kids_school_role(id) is not null);

drop policy if exists "kids_schools_admin_update" on public.kids_schools;
create policy "kids_schools_admin_update" on public.kids_schools
  for update to authenticated
  using (public.kids_school_role(id) = 'admin')
  with check (public.kids_school_role(id) = 'admin');

-- School teachers: members see their colleagues. A teacher may leave; the
-- admin may remove a teacher. Joining happens only through the service role
-- (it needs the school code).
drop policy if exists "kids_school_teachers_member_select" on public.kids_school_teachers;
create policy "kids_school_teachers_member_select" on public.kids_school_teachers
  for select to authenticated
  using (public.kids_school_role(school_id) is not null);

drop policy if exists "kids_school_teachers_delete" on public.kids_school_teachers;
create policy "kids_school_teachers_delete" on public.kids_school_teachers
  for delete to authenticated
  using (teacher_id = auth.uid() or public.kids_school_role(school_id) = 'admin');

-- Classes: the school admin may READ every class in the school (0054 already
-- lets a teacher manage their own).
drop policy if exists "kids_classes_school_admin_select" on public.kids_classes;
create policy "kids_classes_school_admin_select" on public.kids_classes
  for select to authenticated
  using (school_id is not null and public.kids_school_role(school_id) = 'admin');

-- Assignments: the class's teacher manages them; the school admin reads them.
drop policy if exists "kids_assignments_teacher_all" on public.kids_assignments;
create policy "kids_assignments_teacher_all" on public.kids_assignments
  for all to authenticated
  using (exists (
    select 1 from public.kids_classes c
    where c.id = kids_assignments.class_id and c.teacher_id = auth.uid()
  ))
  with check (
    created_by = auth.uid() and exists (
      select 1 from public.kids_classes c
      where c.id = kids_assignments.class_id and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "kids_assignments_school_admin_select" on public.kids_assignments;
create policy "kids_assignments_school_admin_select" on public.kids_assignments
  for select to authenticated
  using (exists (
    select 1 from public.kids_classes c
    where c.id = kids_assignments.class_id
      and c.school_id is not null
      and public.kids_school_role(c.school_id) = 'admin'
  ));

-- The anon role gets nothing at all (children go through the routes).
revoke all on public.kids_schools         from anon;
revoke all on public.kids_school_teachers from anon;
revoke all on public.kids_assignments     from anon;
