// lib/kids/classroom-insights.ts
//
// Pure teacher maths for wave 2 (roadmap #13, #30, #31). Safe in the browser
// and on the server: no storage, no Supabase. Everything reads the compact
// class snapshot (lib/kids/classroom.ts) plus the public InsightCatalogue
// (built on the server by classroom-insights-server.ts).
//
//   gradebook()        children × concepts, from the mastery letters + evidence
//   cellEvidence()     what stands behind one cell (the click-through)
//   classMindMap()     misconceptions the class holds, grouped by concept, with
//                      the session guide's 5-minute reteach
//   stuckSignals()     course challenges, Galaxy activities by track, course
//                      checks and game tiers — only when 2+ children share it
//   gradebookCsv()     the grid as a spreadsheet
//
// Nothing here ranks children, totals a child's score against others, or sorts
// by attainment. Rows keep the roster's order; aggregates are per concept or
// per item, never per child.

import { CONCEPT_IDS, CONCEPT_INFO, STATUS_LABEL, parseConceptGridCode, type ConceptId, type ConceptStatus } from './universe/mastery'
import type { BandId } from './bands'
import type { KidsMemberRow } from './classroom'

// ── Catalogue (public course content, short keys keep the response small) ──

export interface InsightSession {
  /** Title. */
  t: string
  /** Concepts. */
  c: ConceptId[]
  /** Level 1–4. */
  l: number
  /** Session number. */
  n: number
}

export interface InsightMisconception {
  /** Session id, "L2-S04". */
  s: string
  /** The idea a child who picks it holds. */
  i: string
  /** The accurate idea. */
  k: string
  /** The 5-minute reteach (Levels 3–4 write one for every misconception). */
  r?: string
  /** The answer option that reveals it (course content, the same for every child). */
  a: string
}

export interface InsightCatalogue {
  v: 1
  sessions: Record<string, InsightSession>
  misconceptions: Record<string, InsightMisconception>
  activities: Record<string, { t: string; k: string; c: ConceptId[]; b: BandId; h: string }>
  tracks: Record<string, { n: string; e: string }>
  games: Record<string, { n: string; e: string; t: number }>
}

export const EMPTY_CATALOGUE: InsightCatalogue = { v: 1, sessions: {}, misconceptions: {}, activities: {}, tracks: {}, games: {} }

export function guideHref(sessionId: string): string | null {
  const m = /^L([1-4])-S(\d{2})$/.exec(sessionId)
  return m ? `/kids/teach/${m[1]}/${Number(m[2])}` : null
}

export function sessionLabel(sessionId: string, cat: InsightCatalogue): string {
  const s = cat.sessions[sessionId]
  const m = /^L([1-4])-S(\d{2})$/.exec(sessionId)
  const where = m ? `Level ${m[1]}, Session ${Number(m[2])}` : sessionId
  return s ? `${where}: ${s.t}` : where
}

// ── Gradebook ────────────────────────────────────────────────────────────────

export interface GradeCell {
  status: ConceptStatus
  needsHelp: boolean
  /** First-try wins on different activities in the last 21 days. */
  wins: number
  tries: number
  misses: number
  /** Days since the last first-try win, null when never. */
  daysSinceWin: number | null
}

export interface GradeRow {
  member: KidsMemberRow
  /** False when the child's browser has not sent wave-2 data yet (they need to play once on the new version). */
  hasData: boolean
  cells: Record<ConceptId, GradeCell>
}

function parseEvidence(code: string): Record<ConceptId, Omit<GradeCell, 'status' | 'needsHelp'>> {
  const parts = code ? code.split('|') : []
  const out = {} as Record<ConceptId, Omit<GradeCell, 'status' | 'needsHelp'>>
  CONCEPT_IDS.forEach((id, i) => {
    const [w, t, m, d] = (parts[i] ?? '0.0.0.-').split('.')
    out[id] = {
      wins: Number(w) || 0,
      tries: Number(t) || 0,
      misses: Number(m) || 0,
      daysSinceWin: d === undefined || d === '-' ? null : Number(d) || 0,
    }
  })
  return out
}

export function gradeRow(m: KidsMemberRow): GradeRow {
  const s = m.snapshot
  const letters = parseConceptGridCode(s.concepts)
  const ev = parseEvidence(s.conceptEvidence)
  const cells = {} as Record<ConceptId, GradeCell>
  for (const id of CONCEPT_IDS) cells[id] = { ...letters[id], ...ev[id] }
  return { member: m, hasData: s.concepts.length === 16, cells }
}

/** One row per child, in roster order. */
export function gradebook(members: readonly KidsMemberRow[]): GradeRow[] {
  return members.map(gradeRow)
}

/** Concepts at least one child has touched, in course order (an empty column helps nobody on a phone). */
export function activeConcepts(rows: readonly GradeRow[]): ConceptId[] {
  const used = CONCEPT_IDS.filter((id) => rows.some((r) => r.cells[id].status !== 'new'))
  return used.length ? used : CONCEPT_IDS.slice(0, 6)
}

/** Per concept: how many children are in each state (a column summary, never a ranking). */
export function conceptColumnCounts(rows: readonly GradeRow[], id: ConceptId): Record<ConceptStatus, number> & { help: number } {
  const out = { new: 0, learning: 0, secure: 0, fading: 0, help: 0 }
  for (const r of rows) {
    out[r.cells[id].status] += 1
    if (r.cells[id].needsHelp) out.help += 1
  }
  return out
}

export const STATUS_STYLE: Record<ConceptStatus, { letter: string; label: string; cls: string; pdf: [number, number, number] }> = {
  new: { letter: '·', label: STATUS_LABEL.new, cls: 'bg-white/[0.03] text-slate-500 border-white/10', pdf: [235, 238, 243] },
  learning: { letter: 'L', label: STATUS_LABEL.learning, cls: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30', pdf: [205, 240, 248] },
  secure: { letter: 'S', label: STATUS_LABEL.secure, cls: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40', pdf: [208, 245, 220] },
  fading: { letter: 'F', label: STATUS_LABEL.fading, cls: 'bg-amber-500/15 text-amber-200 border-amber-400/40', pdf: [255, 232, 214] },
}

// ── Evidence (click-through) ─────────────────────────────────────────────────

export interface EvidenceActivity {
  id: string
  title: string
  track: string
  stars: number | null
  attempts: number | null
  href: string | null
}

export interface CellEvidence {
  cell: GradeCell
  concept: { id: ConceptId; name: string; icon: string; kid: string }
  /** Finished Skill Galaxy activities that practise the concept. */
  activities: EvidenceActivity[]
  /** Galaxy activities on this concept the child has missed 2+ times. */
  stuckActivities: { id: string; title: string; misses: number }[]
  /** Course sessions finished that teach the concept. */
  sessions: { id: string; label: string; stars: number; href: string | null }[]
  /** Misconceptions the child's checks revealed in sessions on this concept. */
  misconceptions: { key: string; idea: string; times: number; session: string; href: string | null }[]
}

export function cellEvidence(row: GradeRow, id: ConceptId, cat: InsightCatalogue): CellEvidence {
  const s = row.member.snapshot
  const info = CONCEPT_INFO[id]
  const activities: EvidenceActivity[] = []
  s.activitiesDone.forEach((aid, i) => {
    const a = cat.activities[aid]
    if (!a || !a.c.includes(id)) return
    const pair = s.activityScores.slice(i * 2, i * 2 + 2)
    activities.push({
      id: aid,
      title: a.t,
      track: cat.tracks[a.k]?.n ?? a.k,
      stars: pair.length === 2 ? Number(pair[0]) : null,
      attempts: pair.length === 2 ? Number(pair[1]) : null,
      href: a.h,
    })
  })
  const stuckActivities = Object.entries(s.galaxyStuck)
    .filter(([aid]) => cat.activities[aid]?.c.includes(id))
    .map(([aid, misses]) => ({ id: aid, title: cat.activities[aid].t, misses }))
  const sessions = Object.entries(s.sessionsDone)
    .filter(([sid]) => cat.sessions[sid]?.c.includes(id))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([sid, stars]) => ({ id: sid, label: sessionLabel(sid, cat), stars, href: guideHref(sid) }))
  const misconceptions = Object.entries(s.misconceptions)
    .filter(([key]) => {
      const m = cat.misconceptions[key]
      return !!m && !!cat.sessions[m.s]?.c.includes(id)
    })
    .map(([key, times]) => {
      const m = cat.misconceptions[key]
      return { key, idea: m.i, times, session: sessionLabel(m.s, cat), href: guideHref(m.s) }
    })
  return {
    cell: row.cells[id],
    concept: { id, name: info.name, icon: info.icon, kid: info.kid },
    activities,
    stuckActivities,
    sessions,
    misconceptions,
  }
}

/** A teacher-facing sentence for one cell. */
export function cellSentence(c: GradeCell): string {
  if (c.status === 'new') return 'Not started: no Skill Galaxy runs on this concept yet.'
  const wins = `${c.wins} first-try win${c.wins === 1 ? '' : 's'} in the last 21 days`
  const tries = `${c.tries} tr${c.tries === 1 ? 'y' : 'ies'} logged, ${c.misses} not first time`
  const last = c.daysSinceWin === null ? 'no first-try win yet' : c.daysSinceWin === 0 ? 'last first-try win today' : `last first-try win ${c.daysSinceWin} day${c.daysSinceWin === 1 ? '' : 's'} ago`
  const head =
    c.status === 'secure' ? 'Secure' : c.status === 'fading' ? 'Needs a recharge (was secure, no first-try win for 21+ days)' : c.needsHelp ? 'Learning, and finding it hard' : 'Learning'
  return `${head}: ${wins}; ${tries}; ${last}.`
}

// ── Class Mind Map (roadmap #30) ─────────────────────────────────────────────

export interface MindMapItem {
  key: string
  sessionId: string
  session: string
  idea: string
  correction: string
  reteach: string | null
  answer: string
  /** Children who have picked it at least once. */
  children: number
  /** Children who have finished that session (context for "9 of 28"). */
  reached: number
  guide: string | null
}

export interface MindMapNode {
  concept: ConceptId
  name: string
  icon: string
  /** Children holding at least one misconception under this concept. */
  children: number
  items: MindMapItem[]
}

/**
 * Misconceptions held by 2+ children (a single child is never singled out on
 * a class view), grouped under the concepts of the session they came from.
 */
export function classMindMap(members: readonly KidsMemberRow[], cat: InsightCatalogue, minChildren = 2): MindMapNode[] {
  const holders = new Map<string, Set<string>>()
  for (const m of members) {
    for (const key of Object.keys(m.snapshot.misconceptions)) {
      if (!cat.misconceptions[key]) continue
      const set = holders.get(key) ?? new Set<string>()
      set.add(m.id)
      holders.set(key, set)
    }
  }
  const items: MindMapItem[] = []
  for (const [key, set] of holders) {
    if (set.size < minChildren) continue
    const mc = cat.misconceptions[key]
    const reached = members.filter((m) => (m.snapshot.sessionsDone[mc.s] ?? 0) > 0 || set.has(m.id)).length
    items.push({
      key,
      sessionId: mc.s,
      session: sessionLabel(mc.s, cat),
      idea: mc.i,
      correction: mc.k,
      reteach: mc.r ?? null,
      answer: mc.a,
      children: set.size,
      reached,
      guide: guideHref(mc.s),
    })
  }
  items.sort((a, b) => b.children - a.children || a.key.localeCompare(b.key))
  const nodes = new Map<ConceptId, MindMapNode>()
  for (const it of items) {
    const concepts = cat.sessions[it.sessionId]?.c ?? []
    const first = concepts[0]
    if (!first) continue
    const node = nodes.get(first) ?? { concept: first, name: CONCEPT_INFO[first].name, icon: CONCEPT_INFO[first].icon, children: 0, items: [] }
    node.items.push(it)
    nodes.set(first, node)
  }
  for (const node of nodes.values()) {
    const keys = new Set(node.items.map((i) => i.key))
    node.children = members.filter((m) => Object.keys(m.snapshot.misconceptions).some((k) => keys.has(k))).length
  }
  return [...nodes.values()].sort((a, b) => b.children - a.children || CONCEPT_IDS.indexOf(a.concept) - CONCEPT_IDS.indexOf(b.concept))
}

/** "9 of 28 think a bigger driven gear goes faster: run the 5-minute reteach in the Session 14 guide." */
export function mindMapHeadline(it: MindMapItem, classSize: number): string {
  const idea = it.idea.replace(/\.$/, '')
  const lower = idea.charAt(0).toLowerCase() + idea.slice(1)
  const m = /Session (\d+)/.exec(it.session)
  const where = m ? `the Session ${m[1]} guide` : 'the session guide'
  return `${it.children} of ${classSize} think “${lower}”: run the ${it.reteach ? '5-minute reteach' : 'correction'} in ${where}.`
}

// ── Stuck signals (roadmap #13) ──────────────────────────────────────────────

export interface StuckSignal {
  key: string
  label: string
  /** Children sharing it (always 2+). */
  children: number
  detail: string
  href: string | null
}

export interface StuckSignals {
  course: StuckSignal[]
  galaxy: { track: string; icon: string; items: StuckSignal[] }[]
  checks: StuckSignal[]
  games: { id: string; name: string; emoji: string; tiers: number; reached: number[] }[]
}

function aggregate(members: readonly KidsMemberRow[], pick: (m: KidsMemberRow) => Record<string, number>): Map<string, { children: number; total: number }> {
  const agg = new Map<string, { children: number; total: number }>()
  for (const m of members) {
    for (const [k, v] of Object.entries(pick(m))) {
      const cur = agg.get(k) ?? { children: 0, total: 0 }
      cur.children += 1
      cur.total += v
      agg.set(k, cur)
    }
  }
  return agg
}

export function stuckSignals(members: readonly KidsMemberRow[], cat: InsightCatalogue, limit = 4): StuckSignals {
  const course = [...aggregate(members, (m) => m.snapshot.courseStuck)]
    .filter(([, a]) => a.children >= 2)
    .sort((a, b) => b[1].children - a[1].children || b[1].total - a[1].total)
    .slice(0, limit)
    .map(([sid, a]) => ({
      key: sid,
      label: sessionLabel(sid, cat),
      children: a.children,
      detail: `${a.children} children have tried the challenge ${a.total} times without a star yet`,
      href: guideHref(sid),
    }))

  const byTrack = new Map<string, StuckSignal[]>()
  for (const [aid, a] of aggregate(members, (m) => m.snapshot.galaxyStuck)) {
    if (a.children < 2) continue
    const act = cat.activities[aid]
    const track = act?.k ?? 'other'
    const list = byTrack.get(track) ?? []
    list.push({
      key: aid,
      label: act?.t ?? aid,
      children: a.children,
      detail: `${a.children} children, ${a.total} misses, no first-try win yet`,
      href: act?.h ?? null,
    })
    byTrack.set(track, list)
  }
  const galaxy = [...byTrack.entries()]
    .map(([track, items]) => ({
      track: cat.tracks[track]?.n ?? track,
      icon: cat.tracks[track]?.e ?? '🌌',
      items: items.sort((a, b) => b.children - a.children).slice(0, limit),
    }))
    .sort((a, b) => b.items[0].children - a.items[0].children)

  // Course checks: sessions whose check revealed misconceptions in 2+ children.
  const perSession = new Map<string, Set<string>>()
  for (const m of members) {
    for (const key of Object.keys(m.snapshot.misconceptions)) {
      const sid = key.split('.')[0]
      const set = perSession.get(sid) ?? new Set<string>()
      set.add(m.id)
      perSession.set(sid, set)
    }
  }
  const checks = [...perSession.entries()]
    .filter(([, set]) => set.size >= 2)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, limit)
    .map(([sid, set]) => ({
      key: sid,
      label: sessionLabel(sid, cat),
      children: set.size,
      detail: `${set.size} children chose an answer that reveals a misconception`,
      href: guideHref(sid),
    }))

  const games = Object.entries(cat.games)
    .map(([id, g]) => {
      const reached = Array.from({ length: g.t }, (_, i) => members.filter((m) => (m.snapshot.gameTiers[id] ?? 0) >= i + 1).length)
      return { id, name: g.n, emoji: g.e, tiers: g.t, reached }
    })
    .filter((g) => g.reached[0] > 0)
    .sort((a, b) => b.reached[0] - a.reached[0])

  return { course, galaxy, checks, games }
}

// ── CSV ──────────────────────────────────────────────────────────────────────

function csvCell(v: string | number): string {
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** The gradebook as CSV: one row per child, two columns per concept (status, evidence). */
export function gradebookCsv(rows: readonly GradeRow[]): string {
  const header = ['Nickname', ...CONCEPT_IDS.flatMap((id) => [`${CONCEPT_INFO[id].name} (status)`, `${CONCEPT_INFO[id].name} (evidence)`]), 'Course sessions finished', 'Skill Galaxy activities finished']
  const lines = rows.map((r) => {
    const cells = CONCEPT_IDS.flatMap((id) => {
      const c = r.cells[id]
      const status = r.hasData ? `${STATUS_LABEL[c.status]}${c.needsHelp ? ' (needs help)' : ''}` : 'No data yet'
      // Words, not "3/5/2": spreadsheets read slash-separated numbers as a date.
      return [status, r.hasData ? `${c.wins} wins · ${c.tries} tries · ${c.misses} misses` : '']
    })
    return [r.member.nickname, ...cells, Object.keys(r.member.snapshot.sessionsDone).length, r.member.snapshot.activitiesDone.length].map(csvCell).join(',')
  })
  return [header.map(csvCell).join(','), ...lines].join('\n')
}
