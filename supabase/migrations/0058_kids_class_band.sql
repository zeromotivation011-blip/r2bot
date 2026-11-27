-- 0058_kids_class_band
--
-- R2BOT Kids Classroom: the teacher chooses which age band a child plays at
-- (roadmap #29, "teacher locks a child's band"), on top of 0054 and 0056.
--
--   1. kids_classes.band_locked: when true, every child in the class plays at
--      the class's band (kids_classes.band). Off by default: children keep the
--      band they chose, exactly as before.
--   2. kids_class_members.band_lock: an optional band for ONE child (e.g. a
--      younger reader in an older class, or a confident child who wants more
--      challenge). It wins over the class lock. NULL = follow the class.
--
-- The child's device follows the lock on its next sync: /api/kids/sync answers
-- with the band and the device sets it in its own progress store. A band is a
-- range (Explorers 5–7, Builders 8–10, Inventors 11–13, Engineers 14–17) —
-- never an age or a birthday. No child data is added: this is a setting the
-- TEACHER writes.
--
-- No new table and no new policy, consistent with 0054/0056: teachers read
-- their own classes and members through the existing select policies; every
-- write goes through app/api/kids/classroom/** with the service role after the
-- route has checked the signed-in teacher owns the class. Children never talk
-- to Supabase; anon has no grants. No policy uses `auth.uid() is null` (0051).
--
-- Code that depends on this file degrades safely until it runs:
--   - the class page reads the lock columns in a separate query; when they are
--     missing it hides the band controls behind "Band settings are being
--     switched on" and everything else works;
--   - /api/kids/sync answers with no lock, so children keep their own band;
--   - the PATCH that sets a lock answers 503 with a friendly message.
-- Run this file in the Supabase SQL editor after 0054–0057.

alter table public.kids_classes
  add column if not exists band_locked boolean not null default false;

alter table public.kids_class_members
  add column if not exists band_lock text
    check (band_lock is null or band_lock in ('explorers', 'builders', 'inventors', 'engineers'));

comment on column public.kids_classes.band_locked is
  'Roadmap #29: when true, children in the class play at kids_classes.band (their device follows on the next sync).';
comment on column public.kids_class_members.band_lock is
  'Roadmap #29: a band the teacher set for this one child; wins over the class lock. NULL = follow the class.';
