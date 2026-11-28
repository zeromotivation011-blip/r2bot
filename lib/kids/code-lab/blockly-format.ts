// lib/kids/code-lab/blockly-format.ts
//
// ONE BLOCK LANGUAGE (roadmap #21): Code Lab programs live in Blockly's JSON
// serialization (Blockly.serialization.workspaces), the same format and the
// same "▶ when Run is pressed" hat as the Physics Lab (lib/kids/sim/blockly-json.ts).
// Pure data in and out — no Blockly import — so verify.ts runs it headless and
// the stored draft never depends on the editor library.
//
// The grid blocks (`grid_*`) are the tile-sized versions of shared blocks
// (shared-vocabulary.ts names which). Their numbers, colours and phrases are
// DROPDOWNS, never typed fields: a 5-year-old taps, and no child can type free
// text into a program.
//
// Drafts: the old tap editor stored a bare `Block[]` under
// `r2bot_kids_codelab_draft_<mission>`. The key base is unchanged (per child via
// profileKey(), prefix in PROFILE_KEY_PREFIXES); the value is now
// `{ format: 'codelab-blockly-1', workspace }`. `readDraft` accepts both and
// converts the old one on load, so no child loses a half-built program.

import { HAT, type BBlock, type BWorkspace } from '../sim/blockly-json'
import { SAY_PHRASES, TILE_COLORS } from './blocks'
import { isValidProgram } from './tree'
import type { Block, BlockType, TileColor } from './types'

export type { BBlock, BWorkspace }
export { HAT }

/** Blockly block type for each Code Lab block. */
export const GRID_TYPE: Record<BlockType, string> = {
  forward: 'grid_forward',
  left: 'grid_left',
  right: 'grid_right',
  repeat: 'grid_repeat',
  repeatUntil: 'grid_repeat_until',
  ifWall: 'grid_if_wall',
  ifColor: 'grid_if_color',
  ifLine: 'grid_if_line',
  pickup: 'grid_pickup',
  drop: 'grid_drop',
  penDown: 'grid_pen_down',
  penUp: 'grid_pen_up',
  lightOn: 'grid_light_on',
  say: 'grid_say',
}
export const FROM_GRID_TYPE: Record<string, BlockType> = Object.fromEntries(Object.entries(GRID_TYPE).map(([k, v]) => [v, k as BlockType]))

export const FORWARD_MAX = 9
export const REPEAT_MAX = 20
/** The hat's id: fixed so the "running" highlight and tests can find it. */
export const HAT_ID = 'codelab_start'
export const DRAFT_FORMAT = 'codelab-blockly-1'

export interface CodeLabDraft {
  format: typeof DRAFT_FORMAT
  workspace: BWorkspace
}

const clampInt = (v: unknown, lo: number, hi: number, dflt: number): number => {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt
}
const asColor = (v: unknown): TileColor => (TILE_COLORS.includes(v as TileColor) ? (v as TileColor) : 'blue')
const asPhrase = (v: unknown): string => ((SAY_PHRASES as readonly string[]).includes(String(v)) ? String(v) : SAY_PHRASES[0])

// ── Code Lab program → Blockly JSON ────────────────────────────────────────
function blockToB(b: Block): BBlock {
  const out: BBlock = { type: GRID_TYPE[b.type], id: b.id }
  switch (b.type) {
    case 'forward':
      out.fields = { N: String(clampInt(b.n, 1, FORWARD_MAX, 1)) }
      break
    case 'repeat':
      out.fields = { TIMES: String(clampInt(b.n, 1, REPEAT_MAX, 2)) }
      out.inputs = stackInput('DO', b.body)
      break
    case 'repeatUntil':
      out.inputs = stackInput('DO', b.body)
      break
    case 'ifColor':
      out.fields = { COLOR: asColor(b.color) }
      out.inputs = { ...stackInput('DO', b.body), ...stackInput('ELSE', b.elseBody) }
      break
    case 'ifWall':
    case 'ifLine':
      out.inputs = { ...stackInput('DO', b.body), ...stackInput('ELSE', b.elseBody) }
      break
    case 'say':
      out.fields = { TEXT: asPhrase(b.text) }
      break
    default:
      break
  }
  return out
}

/** The list as a chain of `next` blocks; null when empty. */
function chain(list: Block[]): BBlock | null {
  let head: BBlock | null = null
  for (let i = list.length - 1; i >= 0; i--) {
    const b = blockToB(list[i])
    if (head) b.next = { block: head }
    head = b
  }
  return head
}

function stackInput(name: string, list: Block[] | undefined): Record<string, { block: BBlock }> {
  const c = chain(Array.isArray(list) ? list : [])
  return c ? { [name]: { block: c } } : {}
}

export function hatBlock(program: Block[]): BBlock {
  const hat: BBlock = { type: HAT, id: HAT_ID, x: 24, y: 24, deletable: false }
  const c = chain(program)
  if (c) hat.next = { block: c }
  return hat
}

export function programToWorkspace(program: Block[]): BWorkspace {
  return { blocks: { languageVersion: 0, blocks: [hatBlock(program)] } }
}

// ── Blockly JSON → Code Lab program ────────────────────────────────────────
let fresh = 0
const freshId = () => `cl${(++fresh).toString(36)}`

function readChain(b: BBlock | undefined): Block[] {
  const out: Block[] = []
  let cur: BBlock | undefined = b
  let guard = 0
  while (cur && guard++ < 2000) {
    const blk = bToBlock(cur)
    if (blk) out.push(blk)
    cur = cur.next?.block
  }
  return out
}

function isDisabled(b: BBlock): boolean {
  if (b.enabled === false) return true
  return Array.isArray(b.disabledReasons) && b.disabledReasons.length > 0
}

function bToBlock(b: BBlock): Block | null {
  const t = FROM_GRID_TYPE[b.type]
  // An unknown block (or one switched off) never runs. Blockly greys it out too.
  if (!t || isDisabled(b)) return null
  const id = typeof b.id === 'string' && b.id ? b.id : freshId()
  const f = b.fields ?? {}
  const body = () => readChain(b.inputs?.DO?.block)
  const elseBody = () => readChain(b.inputs?.ELSE?.block)
  switch (t) {
    case 'forward':
      return { id, type: t, n: clampInt(f.N, 1, FORWARD_MAX, 1) }
    case 'repeat':
      return { id, type: t, n: clampInt(f.TIMES, 1, REPEAT_MAX, 2), body: body() }
    case 'repeatUntil':
      return { id, type: t, body: body() }
    case 'ifWall':
    case 'ifLine':
      return { id, type: t, body: body(), elseBody: elseBody() }
    case 'ifColor':
      return { id, type: t, color: asColor(f.COLOR), body: body(), elseBody: elseBody() }
    case 'say':
      return { id, type: t, text: asPhrase(f.TEXT) }
    default:
      return { id, type: t }
  }
}

function topBlocks(ws: BWorkspace | null | undefined): BBlock[] {
  const list = ws?.blocks?.blocks
  return Array.isArray(list) ? list : []
}

/** The program a workspace runs: the stack under the hat. Loose blocks (not attached) do not run. */
export function workspaceToProgram(ws: BWorkspace | null | undefined): Block[] {
  const hat = topBlocks(ws).find((b) => b && b.type === HAT)
  return hat ? readChain(hat.next?.block) : []
}

/**
 * Replace the program under the hat and keep every loose block where it is
 * (a child who dragged a block aside and then tapped "add" must not lose it).
 */
export function withProgram(ws: BWorkspace | null | undefined, program: Block[]): BWorkspace {
  const tops = topBlocks(ws)
  const oldHat = tops.find((b) => b && b.type === HAT)
  const hat = hatBlock(program)
  if (oldHat && typeof oldHat.x === 'number' && typeof oldHat.y === 'number') {
    hat.x = oldHat.x
    hat.y = oldHat.y
  }
  const loose = tops.filter((b) => b && b.type !== HAT)
  return { ...(ws ?? {}), blocks: { languageVersion: 0, blocks: [hat, ...loose] } }
}

// ── Drafts ──────────────────────────────────────────────────────────────────
function isWorkspace(x: unknown): x is BWorkspace {
  if (!x || typeof x !== 'object') return false
  const blocks = (x as BWorkspace).blocks
  if (blocks === undefined) return true // an empty workspace saves without `blocks`
  return !!blocks && typeof blocks === 'object' && Array.isArray(blocks.blocks)
}

export interface LoadedDraft {
  workspace: BWorkspace
  /** True when the draft was in the old tap-editor format and has been converted. */
  migrated: boolean
}

/** Read a stored draft in either format. Returns null for nothing or junk (the editor then starts empty). */
export function readDraft(raw: string | null | undefined): LoadedDraft | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (isValidProgram(parsed)) return { workspace: programToWorkspace(parsed), migrated: true }
  if (parsed && typeof parsed === 'object' && (parsed as CodeLabDraft).format === DRAFT_FORMAT && isWorkspace((parsed as CodeLabDraft).workspace)) {
    const ws = (parsed as CodeLabDraft).workspace
    // A workspace whose hat went missing gets it back, so the program always has a start.
    if (!topBlocks(ws).some((b) => b && b.type === HAT)) return { workspace: withProgram(ws, []), migrated: false }
    return { workspace: ws, migrated: false }
  }
  return null
}

export function writeDraft(ws: BWorkspace): string {
  const d: CodeLabDraft = { format: DRAFT_FORMAT, workspace: ws }
  return JSON.stringify(d)
}
