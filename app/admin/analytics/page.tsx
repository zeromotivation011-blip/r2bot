import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Admin · Analytics', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// Analytics is restricted to the site owner only, regardless of other admin roles.
const OWNER_EMAILS = ['ravi6703@gmail.com']

const DAY = 86400000
const iso = (d: Date) => d.toISOString().slice(0, 10)

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/analytics')
  if (!OWNER_EMAILS.includes((user.email ?? '').toLowerCase())) redirect('/dashboard')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if ((me?.role as string | undefined) !== 'admin') redirect('/dashboard')

  const admin = createSupabaseAdminClient()
  const now = Date.now()
  const since30 = iso(new Date(now - 29 * DAY))
  const since7 = iso(new Date(now - 6 * DAY))

  // Accounts (auth.users)
  const users: { created_at: string; last_sign_in_at?: string | null }[] = []
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    const batch = data?.users ?? []
    users.push(...batch.map((u) => ({ created_at: u.created_at, last_sign_in_at: u.last_sign_in_at })))
    if (batch.length < 1000) break
  }
  const active = (days: number) => users.filter((u) => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() <= days * DAY).length
  const signupsByDay: Record<string, number> = {}
  for (const u of users) { const d = u.created_at.slice(0, 10); if (d >= since30) signupsByDay[d] = (signupsByDay[d] ?? 0) + 1 }
  const days30 = Array.from({ length: 30 }, (_, i) => iso(new Date(now - (29 - i) * DAY)))
  const maxSignup = Math.max(1, ...days30.map((d) => signupsByDay[d] ?? 0))

  // Page views (needs migration 0044; shows a hint until then)
  const pv = await admin.from('page_view_daily').select('day, path, views').gte('day', since30).limit(20000)
  const pvRows = (pv.data ?? []) as { day: string; path: string; views: number }[]
  const pvReady = !pv.error
  const byPath = (from: string) => {
    const m: Record<string, number> = {}
    for (const r of pvRows) if (r.day >= from) m[r.path] = (m[r.path] ?? 0) + r.views
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 15)
  }
  const viewsByDay: Record<string, number> = {}
  for (const r of pvRows) viewsByDay[r.day] = (viewsByDay[r.day] ?? 0) + r.views
  const maxViews = Math.max(1, ...days30.map((d) => viewsByDay[d] ?? 0))
  const total30 = pvRows.reduce((a, r) => a + r.views, 0)
  const total7 = pvRows.filter((r) => r.day >= since7).reduce((a, r) => a + r.views, 0)

  // Other counts
  const count = async (table: string) => (await admin.from(table).select('*', { count: 'exact', head: true })).count ?? 0
  const [subs, leads, convs, completions, certs] = await Promise.all([
    count('newsletter_subscribers'), count('leads'), count('copilot_conversations'), count('lesson_completions'), count('certificates'),
  ])

  const card = (label: string, value: number | string, sub?: string) => (
    <div style={{ padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 30, fontWeight: 900, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  )
  const bars = (vals: number[], max: number) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
      {vals.map((v, i) => <div key={i} title={String(v)} style={{ flex: 1, height: `${Math.max(3, (v / max) * 100)}%`, background: v ? '#FC6818' : 'rgba(255,255,255,0.08)', borderRadius: 2 }} />)}
    </div>
  )
  const topTable = (title: string, rows: [string, number][]) => (
    <div style={{ padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: '0 0 10px' }}>{title}</h3>
      {rows.length === 0 ? <p style={{ color: '#64748b', fontSize: 13 }}>No data yet.</p> : rows.map(([p, v]) => (
        <div key={p} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '4px 0', color: '#cbd5e1' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</span><b style={{ color: '#fff' }}>{v}</b>
        </div>
      ))}
    </div>
  )

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '100px 20px 80px' }}>
      <Link href="/admin" style={{ color: '#94a3b8', fontSize: 13 }}>← Admin</Link>
      <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '8px 0 4px' }}>Analytics</h1>
      <p style={{ color: '#94a3b8', margin: '0 0 24px' }}>Anonymous and aggregate. No cookies, no IPs.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {card('Accounts', users.length, 'total sign-ups')}
        {card('Active 7 days', active(7), 'signed in')}
        {card('Active 30 days', active(30), 'signed in')}
        {card('Newsletter', subs)}
        {card('Leads', leads)}
        {card('Co-pilot chats', convs)}
        {card('Lessons done', completions)}
        {card('Certificates', certs)}
      </div>

      <h2 style={{ color: '#fff', fontSize: 18, margin: '28px 0 8px' }}>New accounts, last 30 days</h2>
      {bars(days30.map((d) => signupsByDay[d] ?? 0), maxSignup)}

      <h2 style={{ color: '#fff', fontSize: 18, margin: '28px 0 8px' }}>Page views</h2>
      {!pvReady ? (
        <p style={{ color: '#fbbf24', fontSize: 14 }}>Page-view tracking is not switched on yet: run migration 0044_page_views.sql in the Supabase SQL editor. Counting starts right after.</p>
      ) : (
        <>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 8px' }}>{total7} in the last 7 days · {total30} in the last 30 days</p>
          {bars(days30.map((d) => viewsByDay[d] ?? 0), maxViews)}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginTop: 20 }}>
            {topTable('Most viewed, 7 days', byPath(since7))}
            {topTable('Most viewed, 30 days', byPath(since30))}
          </div>
        </>
      )}
    </main>
  )
}
