'use client'

// components/kids/classroom/ClassMindMapClient.tsx
//
// Teacher: the Class Mind Map (roadmap #30) and "Where to help next" (#13).
//
// Mind Map: every wrong check answer names the misconception behind it, and
// the class receives only COUNTS ("L2-S04.taller-is-stronger": 2). Here they
// become "9 of 28 think a taller robot carries more without tipping: run the
// 5-minute reteach in the Session 4 guide", grouped under the concept they
// belong to. Shown only when 2+ children share it.
//
// Where to help next: course challenges, Skill Galaxy activities by track,
// course checks, Spark Trail levels, Code Lab one-star solves, game tiers and
// who has not played for a week. Each item only when 2+ children share it.
// `projector` hides names (nothing that singles out a child is put on a wall).

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { KidsMemberRow } from '@/lib/kids/classroom'
import { classMindMap, mindMapHeadline, stuckSignals, type InsightCatalogue } from '@/lib/kids/classroom-insights'
import { hardestMissions, stuckLevels } from '@/lib/kids/classroom-stats'

export interface ClassMindMapProps {
  members: KidsMemberRow[]
  catalogue: InsightCatalogue | null
  /** Projector: bigger type, no child names. */
  projector?: boolean
}

export function ClassMindMapClient({ members, catalogue, projector = false }: ClassMindMapProps) {
  const nodes = useMemo(() => (catalogue ? classMindMap(members, catalogue) : []), [members, catalogue])
  const [openKey, setOpenKey] = useState<string | null>(null)
  const size = members.length

  return (
    <section aria-labelledby="mindmap-h" className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Class Mind Map</p>
      <h2 id="mindmap-h" className={`font-display font-bold text-white ${projector ? 'text-4xl' : 'text-2xl'}`}>What the class is thinking</h2>
      <p className={`mt-1 max-w-3xl text-slate-300 ${projector ? 'text-lg' : 'text-[15px]'}`}>
        Every wrong answer in a course check names the idea behind it. Only counts reach you, never a child’s answers, and an idea appears here once two or more children share it.
      </p>

      {!catalogue ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-hidden>
          {[0, 1].map((i) => <div key={i} className="h-28 animate-pulse rounded-[20px] bg-white/[0.04] motion-reduce:animate-none" />)}
        </div>
      ) : nodes.length === 0 ? (
        <div className="mt-4 rounded-[20px] border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
          <p className="text-slate-200">No shared misconceptions yet.</p>
          <p className="mt-1 text-sm text-slate-400">They appear after course sessions’ three-question checks (Levels 2–4), once two children choose the same idea.</p>
        </div>
      ) : (
        <ol className="mt-5 grid gap-4 lg:grid-cols-2">
          {nodes.map((n) => (
            <li key={n.concept} className="relative rounded-[20px] border border-cyan-400/20 bg-[#0A1120]/60 p-4">
              <div className="flex items-center gap-3">
                <span aria-hidden className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-500/15 text-2xl">{n.icon}</span>
                <div>
                  <h3 className={`font-display font-bold text-white ${projector ? 'text-2xl' : 'text-lg'}`}>{n.name}</h3>
                  <p className="text-sm text-slate-400">{n.children} of {size} children hold an idea to revisit</p>
                </div>
              </div>
              <ul className="mt-3 space-y-3 border-l-2 border-cyan-400/30 pl-4">
                {n.items.map((it) => {
                  const expanded = openKey === it.key
                  return (
                    <li key={it.key}>
                      <p className={`text-slate-100 ${projector ? 'text-xl' : 'text-[15px]'}`}>{mindMapHeadline(it, size)}</p>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
                        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.round((it.children / Math.max(1, size)) * 100)}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{it.reached} have reached {it.session}. The answer that reveals it: “{it.answer}”.</p>
                      {!projector && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() => setOpenKey(expanded ? null : it.key)}
                            className="inline-flex min-h-[44px] items-center rounded-xl bg-cyan-500/15 px-3 text-sm font-bold text-cyan-100 hover:bg-cyan-500/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                          >
                            {expanded ? 'Hide the reteach' : it.reteach ? 'Show the 5-minute reteach' : 'Show the correction'}
                          </button>
                          {it.guide && (
                            <Link href={it.guide} className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 px-3 text-sm font-bold text-slate-100 hover:bg-white/5">
                              Open the session guide
                            </Link>
                          )}
                        </div>
                      )}
                      {(expanded || projector) && (
                        <div className="mt-2 rounded-2xl bg-white/[0.04] p-3 text-[15px] leading-relaxed text-slate-200">
                          <p><strong className="text-white">The accurate idea:</strong> {it.correction}</p>
                          {it.reteach && !projector && <p className="mt-2"><strong className="text-white">5-minute reteach:</strong> {it.reteach}</p>}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/** "Where to help next": every surface, only items 2+ children share. */
export function WhereToHelpClient({ members, catalogue }: { members: KidsMemberRow[]; catalogue: InsightCatalogue | null }) {
  const signals = useMemo(() => (catalogue ? stuckSignals(members, catalogue) : null), [members, catalogue])
  const trail = useMemo(() => stuckLevels(members), [members])
  const code = useMemo(() => hardestMissions(members), [members])
  const idle = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000
    return members.filter((m) => Date.parse(m.lastActiveAt) < weekAgo).map((m) => m.nickname)
  }, [members])

  const blocks: { title: string; tip: string; items: { key: string; label: string; detail: string; href: string | null }[] }[] = []
  if (signals?.course.length) blocks.push({ title: 'Course challenges', tip: 'Run the challenge together on the board, then let pairs retry.', items: signals.course })
  for (const g of signals?.galaxy ?? []) {
    blocks.push({ title: `${g.icon} Skill Galaxy · ${g.track}`, tip: 'The hint ladder offers a solved twin after a miss: show the class how to use it.', items: g.items })
  }
  if (signals?.checks.length) blocks.push({ title: 'Course checks', tip: 'See the Class Mind Map above for the exact ideas and reteaches.', items: signals.checks })
  if (trail.length) blocks.push({ title: 'Spark Trail', tip: 'A good one to work through together.', items: trail.map((s) => ({ key: s.key, label: s.label, detail: `${s.children} children, ${s.attempts} tries`, href: null })) })
  if (code.length) blocks.push({ title: 'Code Lab: solved, but only just', tip: 'One star usually means a long program. Ask: “can a loop make it shorter?”', items: code.map((h) => ({ key: h.id, label: h.label, detail: `${h.oneStar} of ${h.solved} with one star`, href: null })) })

  const games = signals?.games ?? []
  if (!blocks.length && !games.length && !idle.length) return null

  return (
    <section aria-labelledby="help-h" className="rounded-[28px] border border-white/10 bg-[#111C32] p-5 sm:p-6">
      <h2 id="help-h" className="font-display text-2xl font-bold text-white">Where to help next</h2>
      <p className="mt-1 text-[15px] text-slate-300">Across the whole Universe. Something appears only when two or more children share it.</p>
      <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {blocks.map((b) => (
          <div key={b.title}>
            <h3 className="text-sm font-bold text-amber-300">{b.title}</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
              {b.items.map((it) => (
                <li key={it.key}>
                  {it.href ? <Link href={it.href} className="inline-flex min-h-[44px] items-center font-bold text-white underline underline-offset-2 hover:text-amber-200">{it.label}</Link> : <strong className="text-white">{it.label}</strong>} — {it.detail}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-400">{b.tip}</p>
          </div>
        ))}
        {games.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-amber-300">Game tiers reached</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
              {games.slice(0, 6).map((g) => (
                <li key={g.id}>
                  <span aria-hidden>{g.emoji}</span> <strong className="text-white">{g.name}</strong> — {g.reached.map((n, i) => `tier ${i + 1}: ${n}`).join(' · ')}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-400">Children counted at each tier they have a personal best in. Assign a game from the panel below.</p>
          </div>
        )}
        {idle.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-amber-300">Not played for a week</h3>
            <p className="mt-2 text-sm text-slate-200">{idle.slice(0, 12).join(', ')}{idle.length > 12 ? ` and ${idle.length - 12} more` : ''}</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default ClassMindMapClient
