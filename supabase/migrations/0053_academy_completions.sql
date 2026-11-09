-- 0053_academy_completions
--
-- One finding from the 9 Nov 2026 certificate review.
--
-- POST /api/certificates issued an Academy certificate for any {track, lesson}
-- the caller named. The only "completion" record was user_progress, which the
-- browser writes directly (owners have INSERT/UPDATE on it), so a signed-in
-- visitor could mint a certificate for every lesson without opening one.
--
-- academy_completions is the server-owned record that a lesson was finished:
--   - written ONLY by the service role from POST /api/academy/complete, after
--     the lesson is confirmed to exist and any quiz is graded on the server;
--   - readable by the owner (so the lesson page can show "completed" and
--     enable the certificate button);
--   - no INSERT / UPDATE / DELETE policy for authenticated users at all —
--     the same shape as lesson_completions and certificates since 0051.
--
-- Code that depends on this: app/api/academy/complete/route.ts,
-- app/api/certificates/route.ts, components/LessonComplete.tsx,
-- components/LessonCertificate.tsx. All written to work before this runs:
--   - /api/academy/complete answers 200 {recorded:false} when the table is
--     missing (Postgres 42P01) and the UI still marks the lesson done;
--   - /api/certificates degrades OPEN with a console.warn until the table
--     exists, then requires a row and answers 403 "Complete the lesson first"
--     without one;
--   - the lesson page falls back to user_progress for the "completed" badge.
-- Run this file in the Supabase SQL editor; nothing else is needed.

create table if not exists public.academy_completions (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  track        text        not null,
  lesson_slug  text        not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, track, lesson_slug)
);

alter table public.academy_completions enable row level security;

-- Owners may read their own rows. Nothing else: writes come from the service
-- role, which bypasses RLS.
drop policy if exists "academy_completions_owner_select" on public.academy_completions;
create policy "academy_completions_owner_select"
  on public.academy_completions
  for select
  to authenticated
  using (auth.uid() = user_id);

create index if not exists academy_completions_user_idx
  on public.academy_completions (user_id, completed_at desc);
