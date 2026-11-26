'use client'

// components/kids/teach/ParentReportClient.tsx
//
// The weekly report for families, built ONLY from progress saved on this
// device (nothing is fetched about the child, nothing is sent). It covers the
// last 7 days: course sessions finished (with the curriculum's own words for
// what was learned), Skill Galaxy activities, badges, days explored, and next
// steps with a 5-minute activity to try at home. "Print this report" prints
// the report alone.
//
// Use the server wrapper <ParentReport /> (./ParentReport.tsx), which passes
// the session data; this file never imports the curriculum.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { KIDS_PROGRESS_EVENT, getProgress, type KidsProgress } from '@/lib/kids-progress'
import { getActivitiesDone, type ActivitiesDone } from '@/lib/kids/activities/progress'
import { getBadge, levelInfo } from '@/lib/kids/universe/rewards'

export interface ReportSession {
  id: string
  number: number
  title: string
  objective: string
  badgeId: string
  badgeName: string
  badgeIcon: string
  today: string
  tryAtHome: string
  askYourChild: string
}

const DAY = 86_400_000
const PRINT_CLASS = 'r2-print-parent-report'

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function inLastWeek(dateIso: string, now: number): boolean {
  const t = Date.parse(dateIso.length === 10 ? `${dateIso}T12:00:00Z` : dateIso)
  return Number.isFinite(t) && t > now - 7 * DAY && t <= now + DAY
}

interface Snapshot {
  p: KidsProgress
  acts: ActivitiesDone
  now: number
}

interface CatalogueActivity { id: string; title: string; track: string }

export function ParentReportClient({ sessions, className = '' }: { sessions: ReportSession[]; className?: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [titles, setTitles] = useState<Record<string, string>>({})

  useEffect(() => {
    const read = () => setSnap({ p: getProgress(), acts: getActivitiesDone(), now: Date.now() })
    read()
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    const after = () => document.body.classList.remove(PRINT_CLASS)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, read)
      window.removeEventListener('afterprint', after)
    }
  }, [])

  const report = useMemo(() => {
    if (!snap) return null
    const { p, acts, now } = snap
    const byBadge = new Map(sessions.map((s) => [s.badgeId, s]))
    const sessionsThisWeek: ReportSession[] = []
    const badgesThisWeek: { icon: string; name: string; why?: string }[] = []
    for (const [id, date] of Object.entries(p.badges ?? {})) {
      if (!inLastWeek(date, now)) continue
      const s = byBadge.get(id)
      if (s) {
        sessionsThisWeek.push(s)
        badgesThisWeek.push({ icon: s.badgeIcon, name: s.badgeName })
        continue
      }
      const ub = getBadge(id)
      if (ub) badgesThisWeek.push({ icon: ub.icon, name: ub.name, why: ub.earnedFor })
    }
    sessionsThisWeek.sort((a, b) => a.number - b.number)
    const activityIds = Object.entries(acts)
      .filter(([, r]) => r.at && inLastWeek(r.at, now))
      .sort((a, b) => b[1].at.localeCompare(a[1].at))
      .map(([id]) => id)
    const doneSessions = sessions.filter((s) => (p.sessionsDone?.[s.id] ?? 0) > 0)
    const nextSession = sessions.find((s) => !((p.sessionsDone?.[s.id] ?? 0) > 0)) ?? null
    const latest = sessionsThisWeek[sessionsThisWeek.length - 1] ?? doneSessions[doneSessions.length - 1] ?? null
    const days = (p.playDays ?? []).filter((d) => inLastWeek(d, now)).length
    return {
      name: p.explorerName || 'Your explorer',
      level: levelInfo(p.xp ?? 0),
      sessionsThisWeek,
      badgesThisWeek,
      activityIds,
      totalSessions: doneSessions.length,
      totalBadges: Object.keys(p.badges ?? {}).length,
      nextSession,
      latest,
      days,
      from: isoDay(new Date(now - 6 * DAY)),
      to: isoDay(new Date(now)),
    }
  }, [snap, sessions])

  // Activity titles live in the (cached) catalogue; fetch it only when needed.
  useEffect(() => {
    if (!report || report.activityIds.length === 0) return
    let alive = true
    fetch('/api/kids/classroom/catalogue')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { activities?: CatalogueActivity[] } | null) => {
        if (!alive || !d?.activities) return
        const map: Record<string, string> = {}
        for (const a of d.activities) map[a.id] = a.title
        setTitles(map)
      })
      .catch(() => undefined)
    return () => { alive = false }
  }, [report])

  function printReport() {
    document.body.classList.add(PRINT_CLASS)
    window.print()
    // Safari may not fire afterprint; clear on the next tick as a fallback.
    setTimeout(() => document.body.classList.remove(PRINT_CLASS), 1500)
  }

  const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  return (
    <section id="r2-parent-report" aria-labelledby="parent-report-h" className={`rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-7 ${className}`}>
      <style>{`
@media print {
  body.${PRINT_CLASS} * { visibility: hidden !important; }
  body.${PRINT_CLASS} #r2-parent-report, body.${PRINT_CLASS} #r2-parent-report * { visibility: visible !important; color: #111 !important; background: transparent !important; box-shadow: none !important; border-color: #c8cdd6 !important; }
  body.${PRINT_CLASS} #r2-parent-report { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; border: 0 !important; }
  body.${PRINT_CLASS} #r2-parent-report .pr-no-print { display: none !important; }
  body.${PRINT_CLASS} { background: #fff !important; }
}
`}</style>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-amber-300">Weekly report</p>
          <h2 id="parent-report-h" className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
            {report ? `${report.name}’s week in R2BOT Kids` : 'Your child’s week in R2BOT Kids'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {report ? `${fmt(report.from)} – ${fmt(report.to)} · from progress saved on this device` : 'From progress saved on this device'}
          </p>
        </div>
        <button type="button" onClick={printReport} className="pr-no-print inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-amber-500 px-5 font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M6 14h12v7H6z" /></svg>
          Print this report
        </button>
      </div>

      {!report ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-4" aria-hidden>
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-white/5" />)}
        </div>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Days explored', `${report.days} of 7`],
              ['Sessions this week', String(report.sessionsThisWeek.length)],
              ['Activities this week', String(report.activityIds.length)],
              ['Explorer level', `${report.level.level} · ${report.level.title}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{k}</dt>
                <dd className="mt-1 font-display text-xl font-bold text-white">{v}</dd>
              </div>
            ))}
          </dl>

          {report.sessionsThisWeek.length === 0 && report.activityIds.length === 0 && report.badgesThisWeek.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-5">
              <p className="font-display text-lg font-bold text-white">A quiet week — and that is fine.</p>
              <p className="mt-1 text-[15px] text-slate-300">
                {report.nextSession
                  ? <>A good place to pick up: <strong className="text-white">Session {report.nextSession.number}, “{report.nextSession.title}”</strong> — about 40 minutes, best done together the first time.</>
                  : 'Every Level 1 session is done. The Skill Galaxy has hundreds of short activities to explore next.'}
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {report.sessionsThisWeek.length > 0 && (
                <div>
                  <h3 className="font-display text-lg font-bold text-white">What {report.name} learned</h3>
                  <ul className="mt-2 space-y-3">
                    {report.sessionsThisWeek.map((s) => (
                      <li key={s.id} className="rounded-2xl bg-black/20 p-3">
                        <p className="font-bold text-white"><span aria-hidden>{s.badgeIcon} </span>Session {s.number}: {s.title}</p>
                        <p className="mt-1 text-[15px] leading-relaxed text-slate-300">{s.today}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-6">
                {report.badgesThisWeek.length > 0 && (
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">Badges earned</h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {report.badgesThisWeek.map((b) => (
                        <li key={b.name} className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-100" title={b.why}>
                          <span aria-hidden>{b.icon}</span>{b.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {report.activityIds.length > 0 && (
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">Skill Galaxy activities</h3>
                    <ul className="mt-2 space-y-1 text-[15px] text-slate-200">
                      {report.activityIds.slice(0, 10).map((id) => <li key={id}>✓ {titles[id] ?? 'A Skill Galaxy activity'}</li>)}
                      {report.activityIds.length > 10 && <li className="text-slate-400">and {report.activityIds.length - 10} more</li>}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-500/[0.07] p-4 sm:p-5">
            <h3 className="font-display text-lg font-bold text-white">Next steps</h3>
            <ul className="mt-2 space-y-2.5 text-[15px] leading-relaxed text-slate-200">
              {report.nextSession && (
                <li><strong className="text-amber-200">Next session:</strong> {report.nextSession.number}. {report.nextSession.title} — {report.nextSession.objective}</li>
              )}
              {report.latest && (
                <>
                  <li><strong className="text-amber-200">Try at home (5 minutes):</strong> {report.latest.tryAtHome}</li>
                  <li><strong className="text-amber-200">Ask {report.name === 'Your explorer' ? 'your child' : report.name}:</strong> “{report.latest.askYourChild}”</li>
                </>
              )}
              <li><strong className="text-amber-200">So far:</strong> {report.totalSessions} of {sessions.length} Level 1 sessions and {report.totalBadges} badges.</li>
            </ul>
            <p className="pr-no-print mt-3 text-sm">
              {report.nextSession && <Link href={`/kids/course/1/${report.nextSession.number}`} className="font-semibold text-amber-300 hover:underline">Open Session {report.nextSession.number} →</Link>}
            </p>
          </div>
          <p className="mt-4 text-xs text-slate-400">Progress lives on this device. If your child plays on another device, that device has its own report.</p>
        </>
      )}
    </section>
  )
}

export default ParentReportClient
