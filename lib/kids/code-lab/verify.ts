// lib/kids/code-lab/verify.ts
// Self-check: every mission's reference solution must WIN on every arena when
// run through the same interpreter the browser uses, on the cheapest robot
// that has the mission's capabilities. Also checks the solution fits the block
// budget, only uses palette blocks, and that every needed capability can be
// fitted to one robot.
//
// Run:  npx tsx lib/kids/code-lab/verify.ts

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { capabilitiesOf, DEFAULT_DESIGN } from '../robot-design'
import { blockNeeds } from '../sim/program'
import { SENSOR_IDS } from '../sim/blockly-json'
import { BLOCK_INFO, BLOCK_NEEDS, countBlocks, usedTypes } from './blocks'
import { CODE_LAB_TO_SHARED, SHARED_STYLE_COLOURS } from './shared-vocabulary'
import type { BlockType } from './types'
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
  return [...issues, ...verifySharedVocabulary()]
}

/**
 * One block language (roadmap #21, shared-vocabulary.ts): every Code Lab block
 * names a real shared-set block, the same part locks it in both editors, it is
 * drawn in the shared colour with the shared emoji, and the shared colours
 * still match the Blockly theme in components/kids/sim/blockly-blocks.ts.
 */
export function verifySharedVocabulary(): VerifyIssue[] {
  const issues: VerifyIssue[] = []
  const add = (problem: string) => issues.push({ mission: 'vocabulary', problem })
  // Statement and sensor ids of the shared set, read from the Blockly definitions (no Blockly import in Node).
  let blocklySrc = ''
  try {
    blocklySrc = readFileSync(join(process.cwd(), 'components/kids/sim/blockly-blocks.ts'), 'utf8')
  } catch {
    add('cannot read components/kids/sim/blockly-blocks.ts (run from the repo root)')
    return issues
  }
  const definedIds = new Set<string>()
  for (const m of blocklySrc.matchAll(/(?:type:\s*'|stmt\('[a-z_]+',\s*'|reporter\(')([a-z_]+)'/g)) definedIds.add(m[1])
  for (const [style, hex] of Object.entries(SHARED_STYLE_COLOURS)) {
    const m = new RegExp(`${style}:\\s*'(#[0-9A-Fa-f]{6})'`).exec(blocklySrc)
    if (!m) add(`style ${style} missing from the Blockly theme`)
    else if (m[1].toUpperCase() !== hex.toUpperCase()) add(`style ${style} is ${m[1]} in Blockly but ${hex} in Code Lab`)
  }
  // Every sensor of the shared set (SENSOR_IDS: reflectance and battery % included, Wave 3) is a
  // defined Blockly reporter and sits in the Sense toolbox group, so the Physics Lab can offer it.
  const senseGroup = /name: '👀 Sense'[^\n]*/.exec(blocklySrc)?.[0] ?? ''
  for (const sid of SENSOR_IDS) {
    if (!definedIds.has(sid)) add(`shared sensor “${sid}” has no Blockly reporter`)
    if (!senseGroup.includes(`'${sid}'`)) add(`shared sensor “${sid}” is missing from the 👀 Sense toolbox group`)
  }
  for (const t of Object.keys(BLOCK_INFO) as BlockType[]) {
    const ref = CODE_LAB_TO_SHARED[t]
    if (!definedIds.has(ref.stmt)) add(`${t} → shared block “${ref.stmt}” is not defined in the Blockly set`)
    if (ref.sensor && !definedIds.has(ref.sensor)) add(`${t} → shared sensor “${ref.sensor}” is not defined in the Blockly set`)
    // Same part, same lock: the Code Lab block needs what the shared block (or its sensor) needs. `move` is every robot.
    const mine = BLOCK_NEEDS[t] ?? null
    const shared = blockNeeds(ref.sensor ?? ref.stmt)
    if ((mine === 'move' ? null : mine) !== shared) add(`${t} needs ${mine ?? 'nothing'} in Code Lab but ${shared ?? 'nothing'} as ${ref.sensor ?? ref.stmt}`)
    if (BLOCK_INFO[t].emoji !== ref.emoji) add(`${t} emoji ${BLOCK_INFO[t].emoji} differs from the shared ${ref.emoji}`)
    if (!BLOCK_INFO[t].tone.includes(SHARED_STYLE_COLOURS[ref.style])) add(`${t} chip is not drawn in the shared ${ref.style} colour`)
    // The picture must mean the same thing in both editors: the shared block's label carries the emoji,
    // or its toolbox group does (🚗 Move). "Turn left" shows ↺, the mirror of the shared turn's ↻.
    const id = ref.sensor ?? ref.stmt
    const def = new RegExp(`(?:'${id}',\\s*'([^']*)'|type: '${id}',\\s*message0: '([^']*)')`).exec(blocklySrc)
    const label = def ? (def[1] ?? def[2] ?? '') : ''
    const group = new RegExp(`name: '([^']*)'[^\\n]*'${id}'`).exec(blocklySrc)?.[1] ?? ''
    const same = label.includes(ref.emoji) || group.startsWith(ref.emoji) || (t === 'left' && label.includes('↻'))
    if (!same) add(`${t}: ${ref.emoji} is neither on the shared block ${id} (“${label}”) nor on its group (“${group}”)`)
  }
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
  console.log('✓ every reference solution wins on every arena; Code Lab blocks match the shared block set')
}
