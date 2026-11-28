-- 0059_kids_class_kind
--
-- R2BOT Kids Classroom: the kind of group a class is (roadmap #84), on top of
-- 0054, 0056 and 0058.
--
--   kids_classes.kind: 'school' (default — every class made before this file
--   ran stays a school class), 'club', 'family' or 'library'. A club, family
--   class or library group is MIXED-AGE: every child keeps the band they chose,
--   kids_classes.band is only the youngest band (for the shared hook), and the
--   whole-class band lock (0058, band_locked) does not apply — the routes refuse
--   to switch it on and lift it when a class becomes mixed. A leader can still
--   set ONE child's band (kids_class_members.band_lock).
--
-- No child data is added: the kind is a word the ADULT chooses.
--
-- No new table and no new policy, consistent with 0054/0056/0058: teachers read
-- and update their own classes through the existing kids_classes policies
-- (auth.uid() = teacher_id); every write goes through
-- app/api/kids/classroom/** with the service role after the route has checked
-- the signed-in teacher owns the class. Children never talk to Supabase; anon
-- has no grants. No policy uses `auth.uid() is null` (0051).
--
-- Code that depends on this file degrades safely until it runs:
--   - the class list, class page, join and sync read the kind in a separate
--     query; when the column is missing every class reads as 'school';
--   - creating a club/family/library class retries without the column and the
--     leader's device keeps the kind (lib/kids/classroom-kind-store.ts); once
--     this file has run, the class page sends that kept kind to the server;
--   - the PATCH that changes the kind answers 503 with a friendly message, and
--     the leader's device keeps the choice.
-- Run this file in the Supabase SQL editor after 0054–0058.

alter table public.kids_classes
  add column if not exists kind text not null default 'school';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'kids_classes_kind_check' and conrelid = 'public.kids_classes'::regclass
  ) then
    alter table public.kids_classes
      add constraint kids_classes_kind_check check (kind in ('school', 'club', 'family', 'library'));
  end if;
end $$;

-- A mixed class never keeps a whole-class band lock (0058). Nothing is mixed
-- yet when this first runs, so this only guards a re-run; skipped if 0058 has
-- not run.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'kids_classes' and column_name = 'band_locked'
  ) then
    update public.kids_classes set band_locked = false where kind <> 'school' and band_locked;
  end if;
end $$;

comment on column public.kids_classes.kind is
  'Roadmap #84: school (one band) or club / family / library (mixed ages: each child keeps their own band; band is the youngest, for the shared hook).';
