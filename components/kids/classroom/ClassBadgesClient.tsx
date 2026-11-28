'use client'

// components/kids/classroom/ClassBadgesClient.tsx
//
// Teacher: the course badges the class has earned, for ALL four levels (a mixed
// club or family class spans several). One <details> per level; each badge
// shows its icon, its name and the nicknames of the children who earned it, in
// roster order — never ranked. Evidence is the snapshot's sessionsDone (a
// finished session is its badge), so nothing new travels from the child.

import { useMemo } from 'react'
import { BAND_ORDER, getBand } from '@/lib/kids/bands'
import type { KidsMemberRow } from '@/lib/kids/classroom'
import { classCourseBadges, type InsightCatalogue } from '@/lib/kids/classroom-insights'

export function ClassBadgesClient({ members, catalogue }: { members: KidsMemberRow[]; catalogue: InsightCatalogue | null }) {
  const levels = useMemo(() => (catalogue ? classCourseBadges(members, catalogue) : null), [members, catalogue])
  const anyEarned = levels?.some((l) => l.earned.length > 0) ?? false
  // Open the level with the most badges (the class's main level); ties go to the lower level.
  const openLevel = levels?.reduce((best, l) => (l.earned.length > best.earned.length ? l : best), levels[0])?.level ?? 1

  return (
    <section aria-labelledby="badges-h" className="rounded-[28px] border border-white/10 bg-[#111C32] p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Course badges</p>
      <h2 id="badges-h" className="font-display text-2xl font-bold text-white">Badges the class has earned</h2>
      <p className="mt-1 max-w-3xl text-[15px] text-slate-300">
        Every course session ends with a badge. Here they are for all four levels, with who earned each one — in roster order, never ranked.
      </p>
      {!levels ? (
        <div className="mt-4 h-24 rounded-2xl bg-white/[0.03]" aria-hidden />
      ) : !anyEarned ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-sm text-slate-300">
          No course badges yet. They appear here as children finish sessions.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {levels.map((l) => {
            const band = getBand(BAND_ORDER[l.level - 1])
            return (
              <details key={l.level} className="group rounded-2xl border border-white/10 bg-black/30 open:bg-black/40" open={l.level === openLevel}>
                <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-2">
                  <span className="font-bold text-white">
                    Level {l.level}
                    {band ? <span className="font-normal text-slate-300"> · {band.emoji} {band.name}</span> : null}
                  </span>
                  <span className="flex items-center gap-2 text-sm text-slate-300">
                    {l.earned.length} of {l.total || 24} badges earned
                    <span aria-hidden className="text-slate-400 transition group-open:rotate-180 motion-reduce:transition-none">▾</span>
                  </span>
                </summary>
                {l.earned.length === 0 ? (
                  <p className="px-4 pb-4 text-sm text-slate-400">No Level {l.level} badges yet.</p>
                ) : (
                  <ul className="grid gap-2 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
                    {l.earned.map((b) => (
                      <li key={b.sessionId} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500/15 text-xl">{b.icon}</span>
                        <span className="min-w-0">
                          <span className="block font-bold text-white">{b.name}</span>
                          <span className="block text-xs text-slate-400">Session {b.n} · {b.earnedBy.length} {b.earnedBy.length === 1 ? 'child' : 'children'}</span>
                          <span className="mt-1 block text-sm text-slate-200 [overflow-wrap:anywhere]">{b.earnedBy.join(', ')}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default ClassBadgesClient
