// lib/backup.ts
//
// Weekly snapshot of the tables that cannot be regenerated.
//
// Supabase's free plan takes no backups. The site now holds real learner
// progress, issued certificates and an email list, and one bad migration would
// end all three with nothing to restore from. This writes a JSON snapshot into
// a private Storage bucket once a week, from the existing daily cron — Vercel's
// Hobby plan allows only two cron jobs and both are already used.
//
// Deliberately not included: news, atlas_gaps, page_view_daily and
// site_metric_daily. News is re-fetched, metrics are aggregates, and a backup
// that copies everything is one nobody checks the size of.
//
// Restoring is a manual job: download the file from the bucket and insert the
// rows back. That is fine — the point is that the data still exists.

import { createSupabaseAdminClient } from '@/lib/supabase/server'

export const BACKUP_BUCKET = 'backups'

/** Tables worth keeping, with the column used to order rows. */
const TABLES = [
  'leads',
  'lead_events',
  'newsletter_subscribers',
  'profiles',
  'lesson_completions',
  'video_watch',
  'certificates',
  'course_assignments',
  'email_log',
] as const

const MAX_ROWS_PER_TABLE = 50_000

export interface BackupResult {
  ok: boolean
  skipped?: string
  path?: string
  tables?: Record<string, number>
  bytes?: number
  errors: string[]
}

/**
 * Runs on the first daily cron of each ISO week (Monday, UTC). Called every day
 * and returns early on the other six, so the caller does not need a schedule.
 */
export async function runWeeklyBackup(force = false): Promise<BackupResult> {
  const errors: string[] = []
  const now = new Date()
  if (!force && now.getUTCDay() !== 1) {
    return { ok: true, skipped: 'not Monday (UTC)', errors }
  }

  const sb = createSupabaseAdminClient()
  const snapshot: Record<string, unknown[]> = {}
  const counts: Record<string, number> = {}

  for (const table of TABLES) {
    const { data, error } = await sb.from(table).select('*').limit(MAX_ROWS_PER_TABLE)
    if (error) {
      // A table that does not exist yet (a migration not run) is not a failure.
      errors.push(`${table}: ${error.message}`)
      continue
    }
    snapshot[table] = data ?? []
    counts[table] = (data ?? []).length
    if ((data ?? []).length === MAX_ROWS_PER_TABLE) {
      errors.push(`${table}: hit the ${MAX_ROWS_PER_TABLE} row cap — the snapshot is truncated`)
    }
  }

  if (Object.keys(snapshot).length === 0) {
    return { ok: false, errors: errors.length ? errors : ['nothing could be read'] }
  }

  const body = JSON.stringify(
    { takenAt: now.toISOString(), rowCounts: counts, tables: snapshot },
    null,
    0,
  )
  const path = `r2bot-${now.toISOString().slice(0, 10)}.json`

  const { error: upErr } = await sb.storage
    .from(BACKUP_BUCKET)
    .upload(path, body, { contentType: 'application/json', upsert: true })

  if (upErr) {
    // The bucket is created by migration 0049. Say so plainly rather than
    // failing silently every Monday.
    errors.push(
      `upload failed (${upErr.message}). If the bucket is missing, run supabase/migrations/0049_backups_bucket.sql.`,
    )
    return { ok: false, tables: counts, errors }
  }

  // Keep eight weeks and delete the rest, so the bucket cannot grow forever.
  try {
    const { data: files } = await sb.storage.from(BACKUP_BUCKET).list('', { limit: 200 })
    const old = (files ?? [])
      .filter((f) => f.name.startsWith('r2bot-') && f.name.endsWith('.json'))
      .map((f) => f.name)
      .sort()
      .reverse()
      .slice(8)
    if (old.length) await sb.storage.from(BACKUP_BUCKET).remove(old)
  } catch (e) {
    errors.push(`prune: ${e instanceof Error ? e.message : String(e)}`)
  }

  return { ok: true, path, tables: counts, bytes: body.length, errors }
}
