import type { NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OWNER_EMAILS = ['ravi6703@gmail.com']
const DAY = 86400000
const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !OWNER_EMAILS.includes((user.email ?? '').toLowerCase())) return new Response('Forbidden', { status: 403 })
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if ((me?.role as string | undefined) !== 'admin') return new Response('Forbidden', { status: 403 })

  const admin = createSupabaseAdminClient()
  const kind = new URL(req.url).searchParams.get('kind')
  let rows: string[][] = []

  if (kind === 'subscribers') {
    const { data } = await admin.from('newsletter_subscribers').select('email, source, subscribed_at, active').order('subscribed_at', { ascending: false }).limit(50000)
    rows = [['email', 'source', 'joined', 'active'], ...(data ?? []).map((r) => [r.email, r.source ?? '', r.subscribed_at, r.active === false ? 'no' : 'yes'])]
  } else if (kind === 'stalled') {
    const [w, c, ce] = await Promise.all([
      admin.from('video_watch').select('user_id, course_slug, updated_at').limit(50000),
      admin.from('lesson_completions').select('user_id, course_slug, completed_at').limit(50000),
      admin.from('certificates').select('user_id, lesson_slug').eq('track', 'video').limit(50000),
    ])
    const last = new Map<string, number>(); const done = new Map<string, number>()
    for (const r of w.data ?? []) { const k = `${r.user_id}|${r.course_slug}`; last.set(k, Math.max(last.get(k) ?? 0, +new Date(r.updated_at))) }
    for (const r of c.data ?? []) { const k = `${r.user_id}|${r.course_slug}`; last.set(k, Math.max(last.get(k) ?? 0, +new Date(r.completed_at))); done.set(k, (done.get(k) ?? 0) + 1) }
    const certified = new Set((ce.data ?? []).map((r) => `${r.user_id}|${String(r.lesson_slug).replace('course:', '')}`))
    const stalled = [...last].filter(([k, t]) => !certified.has(k) && Date.now() - t >= 5 * DAY)
    const ids = [...new Set(stalled.map(([k]) => k.split('|')[0]))]
    const { data: profs } = ids.length ? await admin.from('profiles').select('id, email').in('id', ids) : { data: [] }
    const email = new Map((profs ?? []).map((p) => [String(p.id), String(p.email ?? '')]))
    rows = [['email', 'course', 'lessons_done', 'days_idle'], ...stalled.map(([k, t]) => { const [u, cs] = k.split('|'); return [email.get(u) ?? '', cs, String(done.get(k) ?? 0), String(Math.floor((Date.now() - t) / DAY))] })]
  } else {
    return new Response('Unknown kind', { status: 400 })
  }

  return new Response(rows.map((r) => r.map(cell).join(',')).join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="r2bot-${kind}-${new Date().toISOString().slice(0, 10)}.csv"` },
  })
}
