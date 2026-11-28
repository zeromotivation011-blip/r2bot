// lib/kids/code-lab/verify.ts
// Self-check: every mission's reference solution must WIN on every arena when
// run through the same interpreter the browser uses, on the cheapest robot
// that has the mission's capabilities. Also checks the solution fits the block
// budget, only uses palette blocks, and that every needed capability can be
// fitted to one robot. Since the Blockly port (roadmap #21) it also proves
// every reference solution is a VALID Blockly program (loaded into a headless
// Blockly with the real block definitions, saved back, read back) that still
// wins in the interpreter, and that drafts saved by the old tap editor convert
// to Blockly JSON without losing a block.
//
// Run:  npx tsx lib/kids/code-lab/verify.ts

import { readFileSync } from 'node:fs'
import * as Blockly from 'blockly/core'
import { join } from 'node:path'
import { capabilitiesOf, DEFAULT_DESIGN } from '../robot-design'
import { blockNeeds } from '../sim/program'
import { SENSOR_IDS } from '../sim/blockly-json'
import { BLOCK_INFO, BLOCK_NEEDS, countBlocks, usedTypes } from './blocks'
import { GRID_BLOCK_DEFS } from './blockly-defs'
import { DRAFT_FORMAT, GRID_TYPE, HAT, HAT_ID, programToWorkspace, readDraft, withProgram, workspaceToProgram, writeDraft, type BWorkspace } from './blockly-format'
import { CODE_LAB_TO_SHARED, SHARED_STYLE_COLOURS } from './shared-vocabulary'
import type { Block, BlockType } from './types'
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
  return [...issues, ...verifySharedVocabulary(), ...verifyBlocklyPort()]
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

// ── The Blockly port (roadmap #21) ─────────────────────────────────────────
/** Block ids differ after a round trip only if something was lost; compare everything. */
const same = (a: Block[], b: Block[]) => JSON.stringify(a) === JSON.stringify(b)

let blocklyReady = false
function headless(): Blockly.Workspace {
  if (!blocklyReady) {
    blocklyReady = true
    // The shared hat, exactly as the editor defines it (components/kids/sim/blockly-blocks.ts).
    Blockly.common.defineBlocksWithJsonArray([{ type: HAT, message0: '▶ when Run is pressed', nextStatement: null, style: 'hat_blocks' }])
    Blockly.common.defineBlocksWithJsonArray(GRID_BLOCK_DEFS)
  }
  return new Blockly.Workspace()
}

/** Load into a real (headless) Blockly and save back. Throws on anything Blockly refuses. */
function throughBlockly(ws: BWorkspace): BWorkspace {
  const w = headless()
  const warn = console.warn
  const warnings: string[] = []
  console.warn = (...a: unknown[]) => warnings.push(a.map(String).join(' '))
  try {
    Blockly.serialization.workspaces.load(JSON.parse(JSON.stringify(ws)) as object, w)
  } finally {
    console.warn = warn
  }
  if (warnings.length) throw new Error(`Blockly warned: ${warnings.join(' | ')}`)
  const out = Blockly.serialization.workspaces.save(w) as BWorkspace
  w.dispose()
  return out
}

export function verifyBlocklyPort(): VerifyIssue[] {
  const issues: VerifyIssue[] = []
  const add = (mission: string, problem: string) => issues.push({ mission, problem })

  // Definitions: one per Code Lab block, in the shared colour family, picture first, nothing to type.
  const defs = new Map(GRID_BLOCK_DEFS.map((d) => [d.type, d]))
  for (const t of Object.keys(BLOCK_INFO) as BlockType[]) {
    const d = defs.get(GRID_TYPE[t])
    if (!d) {
      add('blockly', `no Blockly definition for ${t}`)
      continue
    }
    if (d.style !== CODE_LAB_TO_SHARED[t].style) add('blockly', `${t} is drawn in ${d.style}, the shared block is ${CODE_LAB_TO_SHARED[t].style}`)
    if (!String(d.message0).startsWith(CODE_LAB_TO_SHARED[t].emoji)) add('blockly', `${t} does not start with its picture ${CODE_LAB_TO_SHARED[t].emoji}`)
  }
  const defText = JSON.stringify(GRID_BLOCK_DEFS)
  if (/field_input|field_number|field_multilinetext/.test(defText)) add('blockly', 'a Code Lab block has a typed field (children choose from dropdowns, they never type)')

  for (const m of MISSIONS) {
    for (const t of m.palette) if (!defs.has(GRID_TYPE[t])) add(m.id, `palette block ${t} has no Blockly definition`)
    const design = designWith(DEFAULT_DESIGN, m.needs)
    if (!design) continue
    const caps = capabilitiesOf(design)
    // 1. The reference solution is a valid Blockly program…
    let saved: BWorkspace
    try {
      saved = throughBlockly(programToWorkspace(m.solution))
    } catch (e) {
      add(m.id, `reference solution is not a valid Blockly program: ${(e as Error).message}`)
      continue
    }
    // 2. …that reads back as exactly the same program, block for block…
    const back = workspaceToProgram(saved)
    if (!same(back, m.solution)) add(m.id, 'reference solution changes on a Blockly round trip')
    if (countBlocks(back) !== countBlocks(m.solution)) add(m.id, 'block count changes on a Blockly round trip (stars would change)')
    // 3. …and still wins in the runtime, on every arena.
    if (!runMission(back, m, caps).won) add(m.id, 'reference solution, read back from Blockly, does not win')
    // 4. A draft saved by the OLD tap editor (a bare Block[]) converts on load, survives Blockly, and still wins.
    const legacy = readDraft(JSON.stringify(m.solution))
    if (!legacy || !legacy.migrated) add(m.id, 'an old-editor draft is not recognised')
    else {
      try {
        const migrated = workspaceToProgram(throughBlockly(legacy.workspace))
        if (!same(migrated, m.solution) || !runMission(migrated, m, caps).won) add(m.id, 'an old-editor draft loses blocks or stops winning when converted')
      } catch (e) {
        add(m.id, `an old-editor draft converts to an invalid Blockly program: ${(e as Error).message}`)
      }
    }
    // 5. The new draft format round-trips through storage.
    const stored = readDraft(writeDraft(saved))
    if (!stored || stored.migrated || !same(workspaceToProgram(stored.workspace), m.solution)) add(m.id, 'a Blockly draft does not round-trip through storage')
  }

  // Migration edge cases: an old draft with out-of-range numbers is clamped to what the dropdowns offer.
  const odd = readDraft(
    JSON.stringify([
      { id: 'a', type: 'forward', n: 0 },
      { id: 'b', type: 'repeat', n: 50, body: [{ id: 'c', type: 'forward', n: 12 }] },
      { id: 'd', type: 'ifColor', color: 'purple', body: [], elseBody: [] },
      { id: 'e', type: 'say', text: 'my name is Sam' },
    ]),
  )
  if (!odd) add('drafts', 'an old draft with odd values is dropped instead of converted')
  else {
    try {
      const p = workspaceToProgram(throughBlockly(odd.workspace))
      const ok =
        p.length === 4 &&
        p[0].type === 'forward' && p[0].n === 1 &&
        p[1].type === 'repeat' && p[1].n === 20 && p[1].body[0]?.type === 'forward' && (p[1].body[0] as { n: number }).n === 9 &&
        p[2].type === 'ifColor' && p[2].color === 'blue' &&
        p[3].type === 'say' && p[3].text === 'Hello!'
      if (!ok) add('drafts', `odd old draft converted wrongly: ${JSON.stringify(p)}`)
    } catch (e) {
      add('drafts', `odd old draft is not valid Blockly: ${(e as Error).message}`)
    }
  }
  // An empty old draft, junk and a foreign object never crash and never invent blocks.
  const empty = readDraft('[]')
  if (!empty || workspaceToProgram(empty.workspace).length !== 0) add('drafts', 'an empty old draft does not load as an empty program')
  for (const junk of ['', 'not json', '{"blocks":[1]}', '[{"type":"nope"}]', 'null', '42']) {
    if (readDraft(junk) !== null) add('drafts', `junk draft ${JSON.stringify(junk)} was accepted`)
  }
  // Loose blocks dragged aside do not run, and an edit made with the buttons keeps them.
  const loose: BWorkspace = { blocks: { languageVersion: 0, blocks: [...(programToWorkspace([{ id: 'x1', type: 'left' }]).blocks?.blocks ?? []), { type: GRID_TYPE.forward, id: 'loose1', x: 300, y: 300, fields: { N: '2' } }] } }
  if (workspaceToProgram(loose).length !== 1) add('drafts', 'a loose block was counted as part of the program')
  const edited = withProgram(loose, [{ id: 'x2', type: 'right' }])
  if (!edited.blocks?.blocks.some((b) => b.id === 'loose1') || workspaceToProgram(edited)[0]?.type !== 'right') add('drafts', 'an edit lost a loose block or did not change the program')
  // A stored workspace that lost its hat gets one back.
  const hatless = readDraft(JSON.stringify({ format: DRAFT_FORMAT, workspace: { blocks: { languageVersion: 0, blocks: [] } } }))
  if (!hatless || !hatless.workspace.blocks?.blocks.some((b) => b.type === HAT && b.id === HAT_ID)) add('drafts', 'a workspace without the start block is not repaired')
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
  console.log('✓ every reference solution wins on every arena, is a valid Blockly program that wins after a round trip, old drafts convert; Code Lab blocks match the shared block set')
}
