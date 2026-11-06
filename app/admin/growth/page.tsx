import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { listPublishedCourses } from '@/lib/courses'

export const metadata: Metadata = { title: 'Admin · Growth', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const OWNER_EMAILS = ['ravi6703@gmail.com']
const DAY = 86400000
const GOAL = 1000
const iso = (d: Date) => d.toISOString().slice(0, 10)

const card = { padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' } as const
const h3 = { color: '#fff', fontSize: 15, fontWeight: 800, margin: '0 0 10px' } as const
const muted = { color: '#94a3b8', fontSize: 13 } as const

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={card}>
      <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 30, fontWeight: 900, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Bar({ pct, label, value }: { pct: number; label: string; value: string | number }) {
  return (
    <div style={{ margin: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#cbd5e1', marginBottom: 3 }}>
        <span>{label}</span><b style={{ color: '#fff' }}>{value}</b>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ height: 8, borderRadius: 4, width: `${Math.min(100, Math.max(1, pct))}%`, background: '#FC6818' }} />
      </div>
    </div>
  )
}

export default async function GrowthPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/growth')
  if (!OWNER_EMAILS.includes((user.email ?? '').toLowerCase())) redirect('/dashboard')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if ((me?.role as string | undefined) !== 'admin') redirect('/dashboard')

  const admin = createSupabaseAdminClient()
  const now = Date.now()
  const since7 = iso(new Date(now - 6 * DAY))
  const since30 = new Date(now - 30 * DAY).toISOString()

  // Goal: average daily page views, last 7 days
  const pv = await admin.from('page_view_daily').select('day, views').gte('day', since7).limit(20000)
  const views7 = ((pv.data ?? []) as { views: number }[]).reduce((a, r) => a + r.views, 0)
  const avgDaily = Math.round(views7 / 7)

  // Newsletter
  const { data: subsAll } = await admin.from('newsletter_subscribers').select('email, source, subscribed_at, active').limit(50000)
  const subs = (subsAll ?? []) as { source: string | null; subscribed_at: string; active: boolean | null }[]
  const activeSubs = subs.filter((s) => s.active !== false).length
  const new7 = subs.filter((s) => now - new Date(s.subscribed_at).getTime() <= 7 * DAY).length
  const new30 = subs.filter((s) => now - new Date(s.subscribed_at).getTime() <= 30 * DAY).length
  const bySource: Record<string, number> = {}
  for (const s of subs) bySource[s.source ?? 'unknown'] = (bySource[s.source ?? 'unknown'] ?? 0) + 1
  const sources = Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 8)

  // Course funnel
  const courses = listPublishedCourses()
  const [watch, comps, assigns, certs] = await Promise.all([
    admin.from('video_watch').select('user_id, course_slug, updated_at').limit(50000),
    admin.from('lesson_completions').select('user_id, course_slug, completed_at').limit(50000),
    admin.from('course_assignments').select('user_id, course_slug').limit(50000),
    admin.from('certificates').select('user_id, lesson_slug').eq('track', 'video').limit(50000),
  ])
  const started: Record<string, Set<string>> = {}, finishedLessons: Record<string, Set<string>> = {}
  const assigned: Record<string, Set<string>> = {}, certified: Record<string, Set<string>> = {}
  const lastAct = new Map<string, number>()
  const add = (m: Record<string, Set<string>>, c: string, u: string) => { (m[c] ??= new Set()).add(u) }
  for (const r of (watch.data ?? []) as { user_id: string; course_slug: string; updated_at: string }[]) {
    add(started, r.course_slug, r.user_id); const k = `${r.user_id}|${r.course_slug}`; lastAct.set(k, Math.max(lastAct.get(k) ?? 0, +new Date(r.updated_at)))
  }
  for (const r of (comps.data ?? []) as { user_id: string; course_slug: string; completed_at: string }[]) {
    add(started, r.course_slug, r.user_id); add(finishedLessons, r.course_slug, r.user_id)
    const k = `${r.user_id}|${r.course_slug}`; lastAct.set(k, Math.max(lastAct.get(k) ?? 0, +new Date(r.completed_at)))
  }
  for (const r of (assigns.data ?? []) as { user_id: string; course_slug: string }[]) add(assigned, r.course_slug, r.user_id)
  for (const r of (certs.data ?? []) as { user_id: string; lesson_slug: string }[]) add(certified, r.lesson_slug.replace('course:', ''), r.user_id)
  let stalled = 0
  for (const [k, t] of lastAct) { const [u, c] = k.split('|'); if (!certified[c]?.has(u) && now - t >= 5 * DAY) stalled++ }

  // Emails sent
  const { data: logs, error: logErr } = await admin.from('email_log').select('kind, sent_at').gte('sent_at', since30).limit(20000)
  const byKind: Record<string, number> = {}
  for (const l of (logs ?? []) as { kind: string }[]) { const k = l.kind.split(':')[0]; byKind[k] = (byKind[k] ?? 0) + 1 }
  const kindLabel: Record<string, string> = { 'welcome-2': 'Welcome email 2', 'welcome-3': 'Welcome email 3', 'nudge-2': 'Course nudge (day 2)', 'nudge-5': 'Course nudge (day 5)', 'nudge-10': 'Course nudge (day 10)', cert: 'Certificate congratulations' }

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '100px 20px 80px' }}>
      <Link href="/admin" style={{ color: '#94a3b8', fontSize: 13 }}>← Admin</Link>
      <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '8px 0 4px' }}>Growth</h1>
      <p style={{ ...muted, margin: '0 0 24px' }}>Are we on track? Goal: {GOAL.toLocaleString()} visitors a day by the end of December.</p>

      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={h3}>Goal: page views per day (7-day average)</h3>
        <Bar pct={(avgDaily / GOAL) * 100} label={`${avgDaily} per day now`} value={`${Math.round((avgDaily / GOAL) * 100)}% of ${GOAL}`} />
        <p style={{ ...muted, margin: '8px 0 0' }}>Page views are not unique people, so real visitors are lower. Use this as a direction check.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
        <Stat label="Newsletter subscribers" value={activeSubs} sub="active, receiving the weekly email" />
        <Stat label="New this week" value={new7} sub={`${new30} in the last 30 days`} />
        <Stat label="Learners who stalled" value={stalled} sub="no activity for 5+ days, no certificate" />
        <Stat label="Certificates issued" value={Object.values(certified).reduce((a, s) => a + s.size, 0)} sub="video courses" />
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={h3}>Course funnel (people)</h3>
        {courses.map((c) => {
          const s = started[c.slug]?.size ?? 0
          const rows: [string, number][] = [['Started', s], ['Finished at least one lesson', finishedLessons[c.slug]?.size ?? 0], ['Submitted final activity', assigned[c.slug]?.size ?? 0], ['Got the certificate', certified[c.slug]?.size ?? 0]]
          return (
            <div key={c.slug} style={{ margin: '12px 0 18px' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{c.title}</div>
              {rows.map(([l, v]) => <Bar key={l} pct={s ? (v / s) * 100 : 0} label={l} value={v} />)}
            </div>
          )
        })}
        {courses.every((c) => !c.lessons.some((l) => l.youtubeId)) && <p style={muted}>No course videos are live yet, so numbers stay at zero until you add the YouTube links.</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <h3 style={h3}>Where subscribers come from</h3>
          {sources.length === 0 ? <p style={muted}>No subscribers yet.</p> : sources.map(([k, v]) => <Bar key={k} pct={(v / (sources[0][1] || 1)) * 100} label={k} value={v} />)}
        </div>
        <div style={card}>
          <h3 style={h3}>Automatic emails sent (last 30 days)</h3>
          {logErr ? <p style={muted}>Run migration 0047 in Supabase to start the email log.</p>
            : Object.keys(byKind).length === 0 ? <p style={muted}>None yet. They start after people subscribe and learn.</p>
            : Object.entries(byKind).map(([k, v]) => <Bar key={k} pct={(v / Math.max(...Object.values(byKind))) * 100} label={kindLabel[k] ?? k} value={v} />)}
        </div>
      </div>

      <div style={card}>
        <h3 style={h3}>Download lists (CSV)</h3>
        <p style={muted}>Opens in Excel or Google Sheets. Emails only, no phone numbers.</p>
        <p style={{ margin: '8px 0 0', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <a href="/api/admin/export?kind=subscribers" style={{ color: '#FC6818', fontWeight: 700 }}>Newsletter subscribers</a>
          <a href="/api/admin/export?kind=stalled" style={{ color: '#FC6818', fontWeight: 700 }}>Stalled learners</a>
        </p>
      </div>
    </main>
  )
}
