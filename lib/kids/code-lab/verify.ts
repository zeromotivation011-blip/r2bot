// lib/kids/code-lab/verify.ts
// Self-check: every mission's reference solution must WIN on every arena when
// run through the same interpreter the browser uses, on the cheapest robot
// that has the mission's capabilities. Also checks the solution fits the block
// budget, only uses palette blocks, and that every needed capability can be
// fitted to one robot.
//
// Run:  npx tsx lib/kids/code-lab/verify.ts

import { capabilitiesOf, DEFAULT_DESIGN } from '../robot-design'
import { BLOCK_NEEDS, countBlocks, usedTypes } from './blocks'
import { runMission } from './interpreter'
import { MISSIONS } from './missions'
import { designWith } from './parts'

export interface VerifyIssue {
  mission: string
  problem: string
}

export function verifyMissions(): VerifyIssue[] {
  const issues: VerifyIssue[] = []
  const ids = new Set<string>()
  for (const m of MISSIONS) {
    if (ids.has(m.id)) issues.push({ mission: m.id, problem: 'duplicate id' })
    ids.add(m.id)

    const design = designWith(DEFAULT_DESIGN, m.needs)
    if (!design) {
      issues.push({ mission: m.id, problem: `no single robot can have all of: ${m.needs.join(', ')}` })
      continue
    }
    const caps = capabilitiesOf(design)
    const result = runMission(m.solution, m, caps)
    if (!result.won) {
      const last = result.results[result.results.length - 1]
      issues.push({ mission: m.id, problem: `solution fails on arena ${result.results.length}: ${last?.message}` })
    }
    const blocks = countBlocks(m.solution)
    if (blocks > m.budget) issues.push({ mission: m.id, problem: `solution uses ${blocks} blocks, budget is ${m.budget}` })
    for (const t of usedTypes(m.solution)) {
      if (!m.palette.includes(t)) issues.push({ mission: m.id, problem: `solution uses “${t}” which is not in the palette` })
      const need = BLOCK_NEEDS[t]
      if (need && !m.needs.includes(need)) issues.push({ mission: m.id, problem: `block “${t}” needs ${need}, not declared in needs` })
    }
    if (m.hints.length < 2) issues.push({ mission: m.id, problem: 'needs at least two hints' })
    // A program with no blocks must never win.
    if (runMission([], m, caps).won) issues.push({ mission: m.id, problem: 'an empty program wins' })
  }
  const bands = new Map<string, number>()
  for (const m of MISSIONS) bands.set(m.band, (bands.get(m.band) ?? 0) + 1)
  if (MISSIONS.length < 20) issues.push({ mission: '*', problem: `only ${MISSIONS.length} missions (need 20+)` })
  return issues
}

// Run directly with tsx.
const isMain = typeof process !== 'undefined' && Array.isArray(process.argv) && /verify\.ts$/.test(process.argv[1] ?? '')
if (isMain) {
  const issues = verifyMissions()
  const counts: Record<string, number> = {}
  for (const m of MISSIONS) counts[m.band] = (counts[m.band] ?? 0) + 1
  console.log(`Code Lab missions: ${MISSIONS.length}`, counts)
  if (issues.length) {
    for (const i of issues) console.error(`✗ ${i.mission}: ${i.problem}`)
    process.exit(1)
  }
  console.log('✓ every reference solution wins on every arena')
}
