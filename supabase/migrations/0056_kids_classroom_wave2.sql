-- 0056_kids_classroom_wave2
--
-- R2BOT Kids Classroom, wave 2 (roadmap #13, #30, #31, #40), on top of 0054.
--
--   1. kids_classes.goal: the Class Power-Up, ONE co-operative goal per class
--      ({ v, title, target, start, end, theme }, validated by parseGoal() in
--      lib/kids/classroom-goal.ts). The class total is worked out from the
--      members' snapshots; nothing per child is stored for it.
--   2. kids_class_members.snapshot may grow from 8 KB to 16 KB. Wave 2 adds
--      COUNTS only — the 16-letter concept grid and the numbers behind it,
--      stars/attempts per Skill Galaxy activity, which misconceptions a
--      child's checks revealed and how many times ("L2-S04.taller-is-stronger":
--      2), game tiers reached, and one number per day for the class goal.
--      Never a raw answer, a free-text field, a time of day or minutes played.
--
-- No new table, no new policy. The 0054 RLS stays as it is: teachers read only
-- the members of their own classes, children never talk to Supabase (every
-- child read/write goes through app/api/kids/** with the member token), and
-- anon has no grants. No policy uses `auth.uid() is null` (see 0051).
--
-- Code that depends on this file degrades safely until it runs:
--   - the sync route tries the 16 KB limit and, on a CHECK violation, trims
--     the snapshot to 8 KB and saves again (the concept grid, misconceptions
--     and diary are kept first), so the class view keeps working;
--   - the class page shows the Power-Up panel with the goal kept on the
--     TEACHER's device (projector included); children's home cards stay
--     hidden because /api/kids/classroom/power-up answers 503;
--   - nothing else changes.
-- Run this file in the Supabase SQL editor after 0054 and 0055.

alter table public.kids_classes
  add column if not exists goal jsonb
    check (goal is null or (jsonb_typeof(goal) = 'object' and octet_length(goal::text) <= 1024));

-- The snapshot limit: replace the 0054 inline CHECK (Postgres named it
-- kids_class_members_snapshot_check) with a 16 KB one.
alter table public.kids_class_members
  drop constraint if exists kids_class_members_snapshot_check;

alter table public.kids_class_members
  add constraint kids_class_members_snapshot_check
    check (octet_length(snapshot::text) <= 16384);

comment on column public.kids_classes.goal is
  'Class Power-Up goal (roadmap #40): {v,title,target,start,end,theme}. Progress is summed from member snapshots; no per-child data is stored for it.';
