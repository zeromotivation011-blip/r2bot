-- Private Storage bucket for the weekly data snapshot (lib/backup.ts).
--
-- Supabase's free plan takes no backups, and the site now holds learner
-- progress, issued certificates and an email list. The daily cron writes a JSON
-- snapshot here every Monday and keeps the last eight.
--
-- Private on purpose: the snapshot contains email addresses, so only the
-- service role may read or write it. No RLS policies are added for anon or
-- authenticated — their absence is the policy.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('backups', 'backups', false, 52428800)   -- 50 MB ceiling per file
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800;
