// lib/kids/activities/verify.ts
// Self-check for every Skill Galaxy activity (authored content + template
// samples). Runs the SAME pure logic the browser uses:
//   - id unique, kebab-case; track, band, template and difficulty valid
//   - intro ≤ 40 words, takeaway ≤ 30, realWorld ≤ 30
//   - the template's validate(params) returns no problems
//   - `solution`, when present, is accepted by check()
//   - every `after` id exists, is in the same track, and there are no cycles
//   - badge ids are known Universe badges (warning otherwise)
//   - every live activity names 1–3 known concepts (roadmap #27), and every
//     concept is practised by at least two templates (mastery needs two)
// Then prints a coverage table per track × band.
//
// Run:  npx tsx lib/kids/activities/verify.ts      (exit 1 on any ✗)

import { BAND_ORDER, type BandId } from '../bands'
import { getBadge } from '../universe/rewards'
import { CONCEPT_IDS, SECURE_TEMPLATES, isConceptId } from '../universe/mastery'
import { ALL_ACTIVITIES, CONTENT_ACTIVITIES, SAMPLE_ACTIVITIES } from './content'
import { TEMPLATE_LOGIC } from './logic-registry'
import { TRACKS, type Activity, type TrackId } from './types'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface VerifyIssue {
  activity: string
  problem: string
  level: 'error' | 'warning'
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function verifyActivities(list: Activity[] = ALL_ACTIVITIES): VerifyIssue[] {
  const issues: VerifyIssue[] = []
  const err = (a: string, problem: string) => issues.push({ activity: a, problem, level: 'error' })
  const warn = (a: string, problem: string) => issues.push({ activity: a, problem, level: 'warning' })

  // Duplicates inside authored content, and inside the samples.
  for (const [label, group] of [['content', CONTENT_ACTIVITIES], ['samples', SAMPLE_ACTIVITIES]] as const) {
    const seen = new Set<string>()
    for (const a of group) {
      if (seen.has(a.id)) err(a.id, `duplicate id in ${label}`)
      seen.add(a.id)
    }
  }
  const sampleIds = new Set(SAMPLE_ACTIVITIES.map((a) => a.id))
  for (const a of CONTENT_ACTIVITIES) if (sampleIds.has(a.id)) warn(a.id, 'replaces the template sample with the same id')

  const byId = new Map(list.map((a) => [a.id, a]))
  const trackIds = new Set<string>(TRACKS.map((t) => t.id))

  for (const a of list) {
    const id = a.id || '(no id)'
    if (!KEBAB.test(a.id)) err(id, 'id must be kebab-case (a-z, 0-9, -)')
    if (!a.title?.trim()) err(id, 'missing title')
    if (!trackIds.has(a.track)) err(id, `unknown track "${a.track}"`)
    if (!BAND_ORDER.includes(a.band)) err(id, `unknown band "${a.band}"`)
    if (![1, 2, 3, 4, 5].includes(a.difficulty)) err(id, `difficulty must be 1–5, got ${a.difficulty}`)
    if (!a.intro?.trim()) err(id, 'missing intro')
    else if (words(a.intro) > 40) err(id, `intro is ${words(a.intro)} words (max 40)`)
    if (!a.takeaway?.trim()) err(id, 'missing takeaway')
    else if (words(a.takeaway) > 30) err(id, `takeaway is ${words(a.takeaway)} words (max 30)`)
    if (a.realWorld !== undefined && words(a.realWorld) > 30) err(id, `realWorld is ${words(a.realWorld)} words (max 30)`)
    if (!a.realWorld) warn(id, 'no realWorld link (recommended)')

    const logic = TEMPLATE_LOGIC[a.template]
    if (!logic) {
      err(id, `unknown template "${a.template}"`)
    } else {
      let problems: string[] = []
      try {
        problems = logic.validate(a.params)
      } catch (e) {
        problems = [`validate() threw: ${(e as Error).message}`]
      }
      for (const p of problems) err(id, `params: ${p}`)
      if (a.solution === undefined) {
        warn(id, 'no solution: check() is not exercised')
      } else if (!problems.length) {
        try {
          const r = logic.check(a.params, a.solution)
          if (!r.correct) err(id, `solution is rejected by check(): ${r.feedback}`)
        } catch (e) {
          err(id, `check(solution) threw: ${(e as Error).message}`)
        }
      }
    }

    for (const dep of a.after ?? []) {
      const d = byId.get(dep)
      if (!d) err(id, `after: "${dep}" does not exist`)
      else if (d.track !== a.track) err(id, `after: "${dep}" is in track ${d.track}, not ${a.track}`)
      else if (dep === a.id) err(id, 'after: lists itself')
    }
    const live = !sampleIds.has(a.id) || CONTENT_ACTIVITIES.some((c) => c.id === a.id)
    if (!Array.isArray(a.concepts) || a.concepts.length === 0) {
      if (live) err(id, 'concepts: every live activity names 1–3 concepts (lib/kids/universe/mastery.ts CONCEPT_IDS)')
      else warn(id, 'concepts: none (fine for a sample; required before it goes live)')
    } else {
      if (a.concepts.length > 3) err(id, `concepts: ${a.concepts.length} listed (max 3, most important first)`)
      for (const c of a.concepts) if (!isConceptId(c)) err(id, `concepts: unknown concept "${String(c)}"`)
      if (new Set(a.concepts).size !== a.concepts.length) err(id, 'concepts: duplicate concept')
    }
    for (const b of a.badges ?? []) {
      if (!getBadge(b)) warn(id, `badge "${b}" is not a Universe badge (it will be recorded, but not celebrated)`)
    }
  }

  // Cycles in `after`.
  const state = new Map<string, 1 | 2>()
  const visit = (id: string, path: string[]): void => {
    const s = state.get(id)
    if (s === 2) return
    if (s === 1) {
      err(id, `after: cycle ${[...path, id].join(' → ')}`)
      return
    }
    state.set(id, 1)
    for (const dep of byId.get(id)?.after ?? []) if (byId.has(dep)) visit(dep, [...path, id])
    state.set(id, 2)
  }
  for (const a of list) visit(a.id, [])

  // Mastery needs first-try wins on two different templates: a concept that only
  // one template practises could never become secure.
  const live = list.filter((a) => CONTENT_ACTIVITIES.some((c) => c.id === a.id))
  for (const [c, row] of Object.entries(conceptCoverage(live))) {
    const all = new Set(Object.values(row).flat())
    if (all.size > 0 && all.size < SECURE_TEMPLATES) err(`concept:${c}`, `only ${all.size} template practises it; mastery needs ${SECURE_TEMPLATES}`)
    for (const b of BAND_ORDER) {
      const n = new Set(row[b]).size
      if (n > 0 && n < SECURE_TEMPLATES) warn(`concept:${c}`, `${b}: only ${n} template (a child in this band can only secure it with a neighbouring band's missions)`)
    }
  }

  return issues
}

/** Concept × band → the templates that practise it. */
export function conceptCoverage(list: Activity[] = ALL_ACTIVITIES): Record<string, Record<BandId, string[]>> {
  const out: Record<string, Record<BandId, string[]>> = {}
  for (const c of CONCEPT_IDS) out[c] = { explorers: [], builders: [], inventors: [], engineers: [] }
  for (const a of list) {
    for (const c of a.concepts ?? []) {
      const row = out[c]
      if (!row || !row[a.band]) continue
      if (!row[a.band].includes(a.template)) row[a.band].push(a.template)
    }
  }
  return out
}

export function coverage(list: Activity[] = ALL_ACTIVITIES): Record<TrackId, Record<BandId, number>> {
  const out = {} as Record<TrackId, Record<BandId, number>>
  for (const t of TRACKS) {
    out[t.id] = { explorers: 0, builders: 0, inventors: 0, engineers: 0 }
  }
  for (const a of list) if (out[a.track] && a.band in out[a.track]) out[a.track][a.band] += 1
  return out
}

// Run directly with tsx.
const isMain = typeof process !== 'undefined' && Array.isArray(process.argv) && /activities[\\/]verify\.ts$/.test(process.argv[1] ?? '')
if (isMain) {
  const issues = verifyActivities()
  // A 5-year-old who cannot read must hear AND see the goal of a 'missing card' number-box puzzle.
  {
    const nb = readFileSync(join(process.cwd(), 'components', 'kids', 'activities', 'templates', 'number-box', 'NumberBoxClient.tsx'), 'utf8')
    if (!/gap so the \$\{p\.box\.name\} ends with \$\{count\(p, end\)\}/.test(nb)) issues.push({ activity: 'number-box', problem: 'the read-aloud question of a missing-card puzzle must say the number the box ends with', level: 'error' })
    if (!/<Amount p=\{p\} n=\{end\} \/>/.test(nb)) issues.push({ activity: 'number-box', problem: 'the target of a missing-card puzzle must be drawn as pictures (<Amount>)', level: 'error' })
  }
  const cov = coverage()
  const pad = (s: string | number, n: number) => String(s).padStart(n)
  console.log(`Skill Galaxy activities: ${ALL_ACTIVITIES.length} (${CONTENT_ACTIVITIES.length} authored, ${ALL_ACTIVITIES.length - CONTENT_ACTIVITIES.length} template samples)`)
  console.log(`\n${'track'.padEnd(12)}${BAND_ORDER.map((b) => pad(b, 11)).join('')}${pad('total', 8)}`)
  for (const t of TRACKS) {
    const row = cov[t.id]
    const total = BAND_ORDER.reduce((s, b) => s + row[b], 0)
    console.log(`${t.id.padEnd(12)}${BAND_ORDER.map((b) => pad(row[b], 11)).join('')}${pad(total, 8)}`)
  }
  const cc = conceptCoverage()
  const used = (c: string, b: BandId) => ALL_ACTIVITIES.filter((a) => a.band === b && a.concepts?.includes(c as never)).length
  console.log(`\n${'concept (missions/templates)'.padEnd(30)}${BAND_ORDER.map((b) => pad(b, 11)).join('')}`)
  for (const c of CONCEPT_IDS) console.log(`${c.padEnd(30)}${BAND_ORDER.map((b) => pad(`${used(c, b)}/${cc[c][b].length}`, 11)).join('')}`)

  const empty = TRACKS.flatMap((t) => BAND_ORDER.filter((b) => cov[t.id][b] === 0).map((b) => `${t.id}×${b}`))
  if (empty.length) console.log(`\nEmpty cells (${empty.length}): ${empty.join(', ')}`)

  const warnings = issues.filter((i) => i.level === 'warning')
  const errors = issues.filter((i) => i.level === 'error')
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`)
    for (const w of warnings) console.log(`  ! ${w.activity}: ${w.problem}`)
  }
  if (errors.length) {
    console.error(`\n${errors.length} error(s):`)
    for (const e of errors) console.error(`  ✗ ${e.activity}: ${e.problem}`)
    process.exit(1)
  }
  console.log('\n✓ every activity is valid and every solution is accepted by its template')
}
