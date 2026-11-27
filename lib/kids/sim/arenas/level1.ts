// lib/kids/sim/arenas/level1.ts
// The 24 Level 1 (Explorers, ages 5–7) CHALLENGE arenas, one per session, ids =
// the curriculum's session ids (L1-S01 … L1-S24). Each is built from the
// session's codeChallenge spec in lib/kids/curriculum/level1 (tiles, start,
// goal, obstacles, floors, objects, picture blocks, parts, success criteria),
// with a reference program a child could write with exactly those blocks, and
// the program that fails the way the session teaches.
//
// verify.ts runs every reference with the robot the curriculum says the child
// has at that session — with all four bodies, because the body is the child's
// choice — and checks every taught failure fails for the taught reason.
//
// Light on purpose: only the shared picture-block constants come from the
// curriculum (level1/shared.ts), never the ~250 KB session files, so a page
// that only plays a challenge does not ship the whole season. verify.ts checks
// that every palette here equals the session's allowedBlocks.
//
// Grid → world: tile (col, row) from the top-left; "up" the map is +z, the
// map's right is −x (the robot's right when it faces up). Heading: up 0,
// right 90, down 180, left 270 (compass).

import type { Capability, RobotDesign } from '../../robot-design'
import { getPart } from '../../robot-design'
import {
  BACK_OFF,
  BEEP,
  CREEP,
  HOP,
  HOP_BACK,
  IF_BUMP,
  LEFT,
  LIGHT_OFF,
  LIGHT_ON,
  PEN_DOWN,
  PEN_UP,
  REPEAT,
  RIGHT,
  SCOOP_UP,
  TILE_CM,
  TIP_OUT,
  UNTIL_BUMP,
  UNTIL_CLOSE,
  WAIT,
  WAIT_CLEAR,
  say,
} from '../../curriculum/level1/shared'
import type { AllowedBlock } from '../../curriculum/types'
import { inShape, type Arena, type Deck, type FloorRegion, type GuidePath, type Mover, type PickupObject, type Prop, type Ramp, type Shape2D, type Surface, type Vec2, type Wall } from '../arena'
import {
  countBlocks,
  flatten,
  pic,
  type Challenge,
  type Criterion,
  type PaletteBlock,
  type PartFit,
  type PicNode,
  type StarContext,
  type StartPose,
} from '../challenge'

export const L1_TILE = TILE_CM / 100
const T = L1_TILE

/** The Level 1 "Repeat lots of times" block (Session 20), as the curriculum defines it in act4.ts. */
export const REPEAT_LOTS: AllowedBlock = { id: 'repeat', label: 'Repeat lots of times', choices: { n: [10, 20, 40] } }

// ── Picture blocks → palette ──────────────────────────────────────────────

const ICON: Record<string, string> = {
  'Hop forward': '⬆️',
  'Hop back': '⬇️',
  'Creep forward': '🐢',
  'Back off a little': '↩️',
  'Turn left': '↰',
  'Turn right': '↱',
  Stop: '✋',
  Wait: '⏳',
  Beep: '🔔',
  Repeat: '🔁',
  'Repeat lots of times': '🔁',
  'Pen down (draw)': '🖊️',
  'Pen up (stop drawing)': '✋',
  'Scoop up': '🥄',
  'Tip out': '📥',
  'Light on': '💡',
  'Light off': '🌑',
  'Keep going until I feel a bump': '🛡️',
  'Keep going until something is close': '👀',
  'Wait until the path is clear': '🚦',
  'If I feel a bump…': '❓',
  Say: '💬',
}

const CONTAINERS = new Set(['repeat', 'repeat_until', 'if'])

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Picture block key used in reference programs. */
export const K = {
  hop: slug(HOP.label),
  hopBack: slug(HOP_BACK.label),
  creep: slug(CREEP.label),
  backOff: slug(BACK_OFF.label),
  left: slug(LEFT.label),
  right: slug(RIGHT.label),
  wait: slug(WAIT.label),
  beep: slug(BEEP.label),
  repeat: slug(REPEAT.label),
  repeatLots: slug(REPEAT_LOTS.label),
  penDown: slug(PEN_DOWN.label),
  penUp: slug(PEN_UP.label),
  scoop: slug(SCOOP_UP.label),
  tipOut: slug(TIP_OUT.label),
  lightOn: slug(LIGHT_ON.label),
  lightOff: slug(LIGHT_OFF.label),
  untilBump: slug(UNTIL_BUMP.label),
  untilClose: slug(UNTIL_CLOSE.label),
  waitClear: slug(WAIT_CLEAR.label),
  ifBump: slug(IF_BUMP.label),
  say: 'say',
} as const

export function toPalette(allowed: AllowedBlock[]): PaletteBlock[] {
  return allowed.map((a) => {
    const choiceEntry = Object.entries(a.choices ?? {})[0]
    return {
      key: a.id === 'say' ? 'say' : slug(a.label),
      label: a.label,
      icon: ICON[a.label] ?? '🧩',
      op: a.id === 'if_else' ? 'if' : (a.id as PaletteBlock['op']),
      fixed: { ...(a.fixed ?? {}) },
      ...(choiceEntry ? { choice: { param: choiceEntry[0], values: choiceEntry[1] } } : {}),
      container: CONTAINERS.has(a.id),
    }
  })
}

// ── Grid helpers ──────────────────────────────────────────────────────────

type Heading = 'up' | 'down' | 'left' | 'right'
export const HEADING_DEG: Record<Heading, number> = { up: 0, right: 90, down: 180, left: 270 }

interface Grid {
  cols: number
  rows: number
}

/** Centre of tile (col, row). */
function at(g: Grid, c: number, r: number): Vec2 {
  return [-(c - (g.cols - 1) / 2) * T, ((g.rows - 1) / 2 - r) * T]
}

/** A rectangle covering w × h tiles from (c, r) (top-left), shrunk by `inset` metres a side. */
function tiles(g: Grid, c: number, r: number, w = 1, h = 1, inset = 0): Shape2D {
  const a = at(g, c, r)
  const b = at(g, c + w - 1, r + h - 1)
  return { kind: 'rect', center: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], size: [w * T - 2 * inset, h * T - 2 * inset] }
}

/** Move a point `d` metres toward a compass heading. */
function ahead(p: Vec2, headingDeg: number, d: number): Vec2 {
  const h = (headingDeg * Math.PI) / 180
  return [p[0] - Math.sin(h) * d, p[1] + Math.cos(h) * d]
}

/** The two ends of tile (c, r)'s side, as a wall segment. `out` pushes it outward by half a thickness (its inner face on the tile edge). */
function side(g: Grid, c: number, r: number, s: Heading, length = 1, thickness = 0.02, height = 0.4, out = false): Wall {
  const [x, z] = at(g, c, r)
  const h = T / 2
  const o = out ? thickness / 2 : 0
  // The engine extends every wall by half its thickness at each end (to close corners). Trim that
  // back so a wall ends exactly on the tile corner and never pokes into the next corridor.
  const e = thickness / 2
  length -= 2 * e / T
  const s0 = e
  // Map right is −x, map up is +z.
  switch (s) {
    case 'up':
      return { from: [x + h - s0, z + h + o], to: [x + h - s0 - length * T, z + h + o], height, thickness }
    case 'down':
      return { from: [x + h - s0, z - h - o], to: [x + h - s0 - length * T, z - h - o], height, thickness }
    case 'left':
      return { from: [x + h + o, z + h - s0], to: [x + h + o, z + h - s0 - length * T], height, thickness }
    case 'right':
      return { from: [x - h - o, z + h - s0], to: [x - h - o, z + h - s0 - length * T], height, thickness }
  }
}

interface ArenaOpts {
  id: string
  title: string
  grid: Grid
  start: [number, number, Heading]
  goal: Shape2D
  /** Extra floor around the grid in tiles: [top, right, bottom, left]. */
  margin?: [number, number, number, number]
  floor?: Surface
  regions?: FloorRegion[]
  props?: Prop[]
  movers?: Mover[]
  walls?: Wall[]
  ramps?: Ramp[]
  decks?: Deck[]
  objects?: PickupObject[]
  guides?: GuidePath[]
  timeLimit?: number
  /** Shift the start inside its tile, metres (x, z). */
  startNudge?: Vec2
}

function l1Arena(o: ArenaOpts): Arena {
  const [mt, mr, mb, ml] = o.margin ?? [0, 0, 0, 0]
  const { cols, rows } = o.grid
  const [c, r, h] = o.start
  return {
    id: o.id,
    title: o.title,
    size: [(cols + ml + mr) * T, (rows + mt + mb) * T],
    center: [((ml - mr) / 2) * T, ((mt - mb) / 2) * T],
    floor: o.floor ?? 'tile',
    regions: o.regions ?? [],
    lines: [],
    walls: o.walls ?? [],
    ramps: o.ramps ?? [],
    boxes: [],
    objects: o.objects ?? [],
    start: { pos: [at(o.grid, c, r)[0] + (o.startNudge?.[0] ?? 0), at(o.grid, c, r)[1] + (o.startNudge?.[1] ?? 0)], headingDeg: HEADING_DEG[h] },
    goal: { kind: 'reach', zone: o.goal },
    timeLimit: o.timeLimit ?? 40,
    props: o.props ?? [],
    movers: o.movers ?? [],
    decks: o.decks ?? [],
    guides: o.guides ?? [],
    grid: { cols, rows, tile: T },
  }
}

const circle = (center: Vec2, radius: number): Shape2D => ({ kind: 'circle', center, radius })
const box = (center: Vec2, size: Vec2): Shape2D => ({ kind: 'rect', center, size })

function prop(id: string, kind: string, label: string, shape: Shape2D, height: number, color?: string, base?: number): Prop {
  return { id, kind, label, shape, height, ...(color ? { color } : {}), ...(base !== undefined ? { base } : {}) }
}

/** A person-sized thing (35 cm tall at least, so Distance Eyes find it). */
const PERSON_H = 0.45

// ── Robots, session by session ────────────────────────────────────────────

type SessionRobot = Challenge['robot']

/**
 * The curriculum's robot at each session (body is always the child's: box here, verify.ts runs all four).
 * Sessions 1–3 have no head yet: the sim needs one, so the Radio Antenna (no sensing, 50 g) stands in.
 * Session 1 has no drive yet: its challenge has no motion blocks, so the wheels never turn.
 */
function robotAt(n: number): SessionRobot {
  const drive = 'wheels2' as const
  const head = n <= 3 ? 'antenna' : n <= 20 ? 'screen' : 'distance'
  const tool = n <= 8 ? 'none' : n <= 12 ? 'pen' : n <= 16 ? 'scoop' : n === 17 ? 'light' : n === 18 ? 'scoop' : n <= 21 ? 'light' : n <= 23 ? 'scoop' : 'light'
  const sensor = n >= 19 ? 'bumper' : 'none'
  return { body: 'box', drive, head, tool, sensor }
}

/** The parts that give each required capability on this session's robot: what "Fit the part" puts on. */
function fitFor(robot: SessionRobot, requires: Capability[]): PartFit[] {
  const out: PartFit[] = []
  for (const cap of requires) {
    for (const slot of ['drive', 'head', 'tool', 'sensor'] as const) {
      const part = getPart(slot, robot[slot])
      if (part?.gives.includes(cap) && !out.some((o) => o.slot === slot)) out.push({ slot, id: robot[slot] })
    }
  }
  return out
}

// ── Star checks ───────────────────────────────────────────────────────────

const keys = (c: StarContext) => flatten(c.nodes).map((n) => n.key)
const has = (k: string) => (c: StarContext) => keys(c).includes(k)
const maxBlocks = (n: number) => (c: StarContext) => countBlocks(c.nodes) <= n
const saysText = (t: string) => (c: StarContext) => flatten(c.nodes).some((n) => n.key === 'say' && n.choice === t)
/** Changed something after testing: an earlier attempt exists and differs. */
const testedAndChanged = (c: StarContext) => c.history.some((h) => JSON.stringify(strip(h)) !== JSON.stringify(strip(c.nodes)))
const firstOrSecondGo = (c: StarContext) => c.history.length <= 1
function strip(nodes: PicNode[]): unknown {
  return nodes.map((n) => [n.key, n.choice ?? null, n.children ? strip(n.children) : null])
}
const lastIsSay = (c: StarContext) => c.nodes.length > 0 && c.nodes[c.nodes.length - 1].key === 'say'

// ── Shorthand for reference programs ──────────────────────────────────────

const hop = (s: number) => pic(K.hop, s)
const hopBack = () => pic(K.hopBack)
const left = () => pic(K.left)
const right = () => pic(K.right)
const creep = () => pic(K.creep)
const backOff = () => pic(K.backOff)
const wait = (s: number) => pic(K.wait, s)
const beep = () => pic(K.beep)
const sayP = (t: string) => pic(K.say, t)
const repeat = (n: number, body: PicNode[]) => pic(K.repeat, n, body)
const penDown = () => pic(K.penDown)
const penUp = () => pic(K.penUp)
const scoop = () => pic(K.scoop)
const tipOut = () => pic(K.tipOut)
const lightOn = () => pic(K.lightOn)
const lightOff = () => pic(K.lightOff)
const untilBump = (body: PicNode[]) => pic(K.untilBump, undefined, body)
const untilClose = (body: PicNode[]) => pic(K.untilClose, undefined, body)
const waitClear = () => pic(K.waitClear, undefined, [])
const ifBump = (body: PicNode[]) => pic(K.ifBump, undefined, body)

interface Def extends Omit<Challenge, 'palette' | 'robot' | 'fit' | 'starter'> {
  allowed: AllowedBlock[]
  starter?: PicNode[]
}

function challenge(d: Def): Challenge {
  const robot = robotAt(d.session)
  const { allowed, ...rest } = d
  return { ...rest, palette: toPalette(allowed), robot, fit: fitFor(robot, d.requires), starter: d.starter ?? [] }
}

const noWalls = (what = 'the edge of the mat'): Criterion => ({ kind: 'no-touch', ids: [], walls: true, what })

// ══════════════════════════════════════════════════════════════════════════
// The 24 challenges
// ══════════════════════════════════════════════════════════════════════════

const G33: Grid = { cols: 3, rows: 3 }
const G16: Grid = { cols: 1, rows: 6 }
const G15: Grid = { cols: 1, rows: 5 }
const G44: Grid = { cols: 4, rows: 4 }
const G55: Grid = { cols: 5, rows: 5 }

// ── Act 1 ─────────────────────────────────────────────────────────────────

const S01 = challenge({
  id: 'L1-S01',
  session: 1,
  title: 'Good Morning Song',
  mission: 'Make a wake-up song: beep, wait, beep, then say "Good morning!"',
  specArena: 'l1-workshop-table',
  arena: l1Arena({
    id: 'l1-workshop-table',
    title: 'Workshop table',
    grid: G33,
    start: [1, 1, 'down'],
    goal: tiles(G33, 1, 1),
    regions: [{ shape: tiles(G33, 0, 0, 3, 3), label: 'Workshop table' }],
    props: [
      prop('spark', 'person', 'Spark (asleep)', circle(at(G33, 0, 2), 0.07), 0.25, '#38BDF8'),
      prop('bolt', 'dog', 'Bolt (asleep)', circle(at(G33, 2, 2), 0.07), 0.18, '#F59E0B'),
    ],
    timeLimit: 20,
  }),
  allowed: [BEEP, WAIT, say('Good morning!', 'Hello!')],
  requires: [],
  criteria: [{ kind: 'sound-sequence', steps: [{ kind: 'beep' }, { kind: 'pause', seconds: 1 }, { kind: 'beep' }, { kind: 'say', text: 'Good morning!' }] }],
  stars: {
    two: { text: 'You used a Wait so the beeps are not squashed together.', check: has(K.wait) },
    three: { text: 'You added your own extra step at the end and said what it does.', check: (c) => countBlocks(c.nodes) >= 5 },
  },
  reference: [beep(), wait(1), beep(), sayP('Good morning!')],
  failures: [{ name: 'no wait: the beeps are squashed together', program: [beep(), beep(), sayP('Good morning!')], expect: 'order' }],
})

const S02 = challenge({
  id: 'L1-S02',
  session: 2,
  title: 'The First Light',
  mission: 'Drive down the garden path and stop right on the light. Don’t knock the flowerpot!',
  specArena: 'l1-garden-path',
  arena: l1Arena({
    id: 'l1-garden-path',
    title: 'Garden path',
    grid: G16,
    start: [0, 5, 'up'],
    goal: tiles(G16, 0, 1),
    regions: [{ shape: tiles(G16, 0, 1, 1, 1, 0.03), color: 'yellow', label: 'Light' }],
    props: [prop('flowerpot', 'flowers', 'flowerpot', circle(at(G16, 0, 0), 0.1), 0.25, '#EF4444')],
  }),
  allowed: [HOP, HOP_BACK],
  requires: ['move'],
  criteria: [
    { kind: 'stop-in-zone', zone: tiles(G16, 0, 1), label: 'the light' },
    { kind: 'no-touch', ids: ['flowerpot'], walls: false, what: 'the flowerpot' },
  ],
  stars: {
    two: { text: 'You stopped on the light without touching the flowerpot.', check: () => true },
    three: { text: 'You found a way using only 2 blocks (the biggest hop is 3).', check: maxBlocks(2) },
  },
  reference: [hop(2), hop(2)],
  failures: [{ name: 'one hop too many knocks the flowerpot', program: [hop(3), hop(2)], expect: 'collision' }],
})

const S03_GRID = G16
const S03 = challenge({
  id: 'L1-S03',
  session: 3,
  title: 'Morning Delivery',
  mission: 'Get past the cart to the bakery door, ring the bell with a beep, and say good morning.',
  specArena: 'l1-bakery-lane-long',
  arena: l1Arena({
    id: 'l1-bakery-lane-long',
    title: 'Bakery Lane (long)',
    grid: S03_GRID,
    margin: [0, 1.5, 0, 1.5],
    start: [0, 5, 'up'],
    goal: tiles(S03_GRID, 0, 1),
    regions: [
      { shape: tiles(S03_GRID, 0, 0, 1, 6), color: 'yellow', label: '' },
      { shape: tiles(S03_GRID, 0, 3), label: 'Cart crossing' },
    ],
    props: [prop('door', 'door', 'bakery door', box(ahead(at(S03_GRID, 0, 0), 0, 0.1), [0.3, 0.1]), 0.5, '#B45309')],
    // The bread cart crosses row 3 between 1 s and 3.5 s after Go (in the lane while |x| < 0.3 m).
    movers: [
      {
        id: 'cart',
        kind: 'cart',
        label: 'bread cart',
        size: [0.25, 0.25],
        height: 0.35,
        color: '#F59E0B',
        keys: [
          { t: 0, pos: [0.567, at(S03_GRID, 0, 3)[1]] },
          { t: 4.5, pos: [-0.567, at(S03_GRID, 0, 3)[1]] },
        ],
      },
    ],
  }),
  allowed: [HOP, WAIT, BEEP, say('Good morning!', 'Bread, please!')],
  requires: ['move'],
  criteria: [
    { kind: 'stop-in-zone', zone: tiles(S03_GRID, 0, 1), label: 'the door' },
    { kind: 'no-touch', ids: ['cart'], walls: false, what: 'the cart' },
    { kind: 'sounds-after-arrival', zone: tiles(S03_GRID, 0, 1), steps: [{ kind: 'beep' }, { kind: 'say', text: 'Good morning!' }] },
  ],
  stars: {
    two: { text: 'You beeped and spoke only after you arrived.', check: () => true },
    three: { text: 'You tried a different Wait number and explained what changed.', check: (c) => c.history.some((h) => flatten(h).some((n) => n.key === K.wait) && JSON.stringify(strip(h)) !== JSON.stringify(strip(c.nodes))) },
  },
  reference: [hop(1), wait(3), hop(3), beep(), sayP('Good morning!')],
  failures: [
    { name: 'no wait: straight into the cart', program: [hop(1), hop(3), beep(), sayP('Good morning!')], expect: 'collision' },
    { name: 'rings the bell before arriving', program: [beep(), hop(1), wait(3), hop(3), sayP('Good morning!')], expect: 'order' },
  ],
})

const S04 = challenge({
  id: 'L1-S04',
  session: 4,
  title: 'The Bread Basket Light',
  mission: 'Say "Excuse me!", drive to the bread baskets, beep, and say you found the light.',
  specArena: 'l1-bakery-baskets',
  arena: l1Arena({
    id: 'l1-bakery-baskets',
    title: 'Bakery baskets',
    grid: G15,
    margin: [0, 1, 0, 1],
    start: [0, 4, 'up'],
    goal: tiles(G15, 0, 1),
    regions: [{ shape: tiles(G15, 0, 0, 1, 5), color: 'yellow', label: '' }],
    props: [
      prop('baskets', 'basket', 'bread baskets', box(at(G15, 0, 0), [0.26, 0.24]), 0.2, '#D97706'),
      prop('customer-a', 'person', 'customer', circle(ahead(at(G15, 0, 2), 270, 0.36), 0.08), PERSON_H, '#22D3EE'),
      prop('customer-b', 'person', 'customer', circle(ahead(at(G15, 0, 3), 90, 0.36), 0.08), PERSON_H, '#F472B6'),
    ],
  }),
  allowed: [HOP, HOP_BACK, BEEP, say('Excuse me!', 'Found a light!', 'Thank you!')],
  requires: ['move'],
  criteria: [
    { kind: 'say-before-move', text: 'Excuse me!' },
    { kind: 'stop-in-zone', zone: tiles(G15, 0, 1), label: 'the baskets' },
    { kind: 'no-touch', ids: ['baskets', 'customer-a', 'customer-b'], walls: false, what: 'the baskets' },
  ],
  stars: {
    two: { text: 'You were polite first and stopped before the baskets.', check: () => true },
    three: { text: 'You said "Thank you!" to the baker at the end.', check: (c) => lastIsSay(c) && saysText('Thank you!')(c) },
  },
  reference: [sayP('Excuse me!'), hop(3), beep(), sayP('Found a light!')],
  failures: [{ name: 'drives off before being polite', program: [hop(3), sayP('Excuse me!'), beep(), sayP('Found a light!')], expect: 'order' }],
})

const S05 = challenge({
  id: 'L1-S05',
  session: 5,
  title: 'Over the Top',
  mission: 'Go all the way around the top of the fountain to the bench in the bottom-left corner.',
  specArena: 'l1-square-b',
  arena: l1Arena({
    id: 'l1-square-b',
    title: 'Town square (bench)',
    grid: G33,
    start: [2, 2, 'up'],
    goal: tiles(G33, 0, 2),
    regions: [{ shape: tiles(G33, 0, 2, 1, 1, 0.03), color: 'green', label: 'Bench' }],
    props: [
      prop('fountain', 'fountain', 'fountain', circle(at(G33, 1, 1), 0.13), 0.3, '#38BDF8'),
      prop('flowerbed', 'flowers', 'flower bed', box(at(G33, 1, 2), [0.26, 0.26]), 0.12, '#EC4899'),
    ],
  }),
  allowed: [HOP, HOP_BACK, LEFT, RIGHT],
  requires: ['move'],
  criteria: [
    { kind: 'stop-in-zone', zone: tiles(G33, 0, 2), label: 'the bench' },
    { kind: 'no-touch', ids: ['fountain', 'flowerbed'], walls: true, what: 'the edge of the square' },
  ],
  stars: {
    two: { text: 'You made both turns the right way.', check: (c) => keys(c).filter((k) => k === K.left).length === 2 && !keys(c).includes(K.right) },
    three: { text: 'You planned the path with your finger on the screen before building it.' },
  },
  reference: [hop(2), left(), hop(2), left(), hop(2)],
  failures: [{ name: 'turns right at the top: off the edge', program: [hop(2), right(), hop(2), left(), hop(2)], expect: 'collision' }],
})

const S06 = challenge({
  id: 'L1-S06',
  session: 6,
  title: 'Show Time!',
  mission: 'Finish your dance — at least five steps — and show it to the crowd. Can it end where it started?',
  specArena: 'l1-square-stage',
  arena: l1Arena({
    id: 'l1-square-stage',
    title: 'Square stage',
    grid: G33,
    start: [1, 1, 'up'],
    goal: tiles(G33, 1, 1),
    regions: [{ shape: tiles(G33, 1, 1, 1, 1, 0.06), color: 'yellow', label: '★' }],
  }),
  allowed: [HOP, HOP_BACK, LEFT, RIGHT, WAIT, BEEP, say('Hello, Lantern Hill!', 'Let’s dance!', 'Ta-da!')],
  requires: ['move'],
  criteria: [{ kind: 'blocks', minRun: 5 }, noWalls('the edge of the dance floor')],
  stars: {
    two: { text: 'Your dance ends back on the star square, facing up.', check: (c) => inShape(tiles(G33, 1, 1), c.result.end.x, c.result.end.z) && Math.min(c.result.end.headingDeg, 360 - c.result.end.headingDeg) < 30 },
    three: { text: 'You told the class one thing you changed after testing.' },
  },
  reference: [sayP('Let’s dance!'), hop(1), beep(), left(), left(), hop(1), left(), left(), sayP('Ta-da!')],
  failures: [{ name: 'a big hop dances off the floor', program: [sayP('Let’s dance!'), hop(3), beep(), left(), left(), sayP('Ta-da!')], expect: 'collision' }],
})

// ── Act 2 ─────────────────────────────────────────────────────────────────

const S07 = challenge({
  id: 'L1-S07',
  session: 7,
  title: 'The Back Way',
  mission: 'Ms Mei moved to the back. Plan a path with two turns, then drive there.',
  specArena: 'l1-market-b',
  arena: l1Arena({
    id: 'l1-market-b',
    title: 'Market back lane',
    grid: G44,
    margin: [0.6, 0, 0, 0],
    start: [0, 3, 'up'],
    goal: tiles(G44, 2, 0),
    regions: [{ shape: tiles(G44, 2, 0, 1, 1, 0.03), color: 'yellow', label: 'Ms Mei' }],
    props: [
      prop('pot-stall', 'stall', 'pot stall', tiles(G44, 0, 0, 1, 3, 0.035), 0.4, '#A16207'),
      prop('cloth-stall', 'stall', 'cloth stall', tiles(G44, 1, 0, 1, 3, 0.035), 0.4, '#0EA5E9'),
      prop('ms-mei', 'person', 'Ms Mei', circle(ahead(at(G44, 2, 0), 0, 0.32), 0.08), PERSON_H, '#F472B6'),
    ],
  }),
  allowed: [HOP, HOP_BACK, LEFT, RIGHT],
  requires: ['move'],
  criteria: [
    { kind: 'stop-in-zone', zone: tiles(G44, 2, 0), label: 'Ms Mei' },
    { kind: 'no-touch', walls: false, what: 'a stall' },
  ],
  stars: {
    two: { text: 'Your plan worked on the first or second Go.', check: firstOrSecondGo },
    three: { text: 'You split the path into "go" parts and "turn" parts out loud.' },
  },
  reference: [right(), hop(2), left(), hop(3)],
  failures: [{ name: 'the old way up the left lane runs into the pot stall', program: [hop(3), right(), hop(2)], expect: 'collision' }],
})

const S08_STARTER = [hop(3), right(), hop(3)]
const S08 = challenge({
  id: 'L1-S08',
  session: 8,
  title: 'The Marigold Light',
  mission: 'Spark’s program to the flower stall has a bug. The robot bumps the buckets. Fix it!',
  specArena: 'l1-flower-stall',
  arena: l1Arena({
    id: 'l1-flower-stall',
    title: 'Flower stall',
    grid: G44,
    start: [0, 3, 'up'],
    goal: tiles(G44, 3, 1),
    regions: [{ shape: tiles(G44, 3, 1, 1, 1, 0.03), color: 'yellow', label: 'Light' }],
    props: [
      ...[1, 2, 3].map((c) => prop(`bucket-${c}`, 'flowers', 'flower bucket', circle(at(G44, c, 0), 0.1), 0.3, '#F97316')),
      ...[1, 2].map((c) => prop(`crate-${c}`, 'crate', 'crate', box(at(G44, c, 2), [0.26, 0.26]), 0.25, '#92400E')),
    ],
  }),
  allowed: [HOP, HOP_BACK, LEFT, RIGHT, say('Found a light!')],
  starter: S08_STARTER,
  requires: ['move'],
  criteria: [
    { kind: 'stop-in-zone', zone: tiles(G44, 3, 1), label: 'the light' },
    { kind: 'no-touch', ids: ['bucket-1', 'bucket-2', 'bucket-3'], walls: false, what: 'a flower bucket' },
  ],
  stars: {
    two: { text: 'You found that the bug was a number, not a turn.', check: (c) => keys(c).filter((k) => k === K.right).length === 1 && !keys(c).includes(K.left) },
    three: { text: 'You added "Found a light!" at the end.', check: (c) => lastIsSay(c) && saysText('Found a light!')(c) },
  },
  reference: [hop(2), right(), hop(3), sayP('Found a light!')],
  failures: [{ name: 'Spark’s buggy program (one hop too many) bumps the buckets', program: [hop(3), right(), hop(3)], expect: 'collision' }],
})

const PEN_TOL = 0.07

const S09 = challenge({
  id: 'L1-S09',
  session: 9,
  title: 'The Way to School',
  mission: 'Draw the path to the school gate: up, then turn right, then along. Lift the pen at the gate.',
  specArena: 'l1-school-road',
  arena: l1Arena({
    id: 'l1-school-road',
    title: 'Road to school',
    grid: G33,
    start: [0, 2, 'up'],
    goal: tiles(G33, 2, 0),
    regions: [
      { shape: tiles(G33, 2, 0, 1, 1, 0.03), color: 'green', label: 'School gate' },
      { shape: tiles(G33, 1, 1, 1, 1, 0.02), color: 'blue', label: 'Puddle' },
    ],
    guides: [{ points: [at(G33, 0, 2), at(G33, 0, 0), at(G33, 2, 0)] }],
  }),
  allowed: [HOP, HOP_BACK, LEFT, RIGHT, PEN_DOWN, PEN_UP],
  requires: ['move', 'draw'],
  criteria: [
    { kind: 'draw-path', guide: [[at(G33, 0, 2), at(G33, 0, 0), at(G33, 2, 0)]], coverage: 0.9, tolerance: PEN_TOL, avoid: [tiles(G33, 1, 1, 1, 1, 0.02)] },
    { kind: 'stop-in-zone', zone: tiles(G33, 2, 0), label: 'the school gate' },
  ],
  stars: {
    two: { text: 'Your line follows the dotted path all the way.', check: () => true },
    three: { text: 'You planned it with arrows first.' },
  },
  reference: [penDown(), hop(2), right(), hop(2), penUp()],
  failures: [
    { name: 'forgot to put the pen down', program: [hop(2), right(), hop(2), penUp()], expect: 'drawing' },
    { name: 'the short cut through the puddle', program: [penDown(), hop(1), right(), hop(1), left(), hop(1), right(), hop(1), penUp()], expect: 'drawing' },
  ],
})

const square = [at(G55, 1, 3), at(G55, 1, 1), at(G55, 3, 1), at(G55, 3, 3), at(G55, 1, 3)]
const S10 = challenge({
  id: 'L1-S10',
  session: 10,
  title: 'The Big Game Square',
  mission: 'Draw a big square with sides of 2 squares, using Repeat. Use 4 blocks or fewer.',
  specArena: 'l1-playground-big',
  arena: l1Arena({
    id: 'l1-playground-big',
    title: 'Playground (big square)',
    grid: G55,
    start: [1, 3, 'up'],
    goal: tiles(G55, 1, 3),
    guides: [{ points: square }],
    props: [prop('slide', 'slide', 'slide', box(at(G55, 4, 4), [0.24, 0.24]), 0.3, '#22C55E')],
  }),
  allowed: [HOP, LEFT, RIGHT, PEN_DOWN, PEN_UP, REPEAT],
  requires: ['move', 'draw'],
  criteria: [
    { kind: 'draw-path', guide: [square], coverage: 0.9, tolerance: PEN_TOL },
    { kind: 'blocks', max: 4, needs: ['repeat'] },
  ],
  stars: {
    two: { text: 'You used Repeat and 4 blocks or fewer.', check: (c) => has(K.repeat)(c) && maxBlocks(4)(c) },
    three: { text: 'You said which number changed from the small square (the hop) and which did not (the 4).' },
  },
  reference: [penDown(), repeat(4, [hop(2), right()])],
  failures: [{ name: 'Repeat 3 leaves one side undrawn', program: [penDown(), repeat(3, [hop(2), right()])], expect: 'drawing' }],
})

const stairs: Vec2[] = [at(G55, 0, 4)]
for (let i = 0; i < 4; i++) stairs.push(at(G55, i, 3 - i), at(G55, i + 1, 3 - i))
const S11 = challenge({
  id: 'L1-S11',
  session: 11,
  title: 'The Tall Staircase',
  mission: 'The big library stairs have four steps. Draw them all with 6 blocks or fewer.',
  specArena: 'l1-library-tall',
  arena: l1Arena({
    id: 'l1-library-tall',
    title: 'Tall staircase plan',
    grid: G55,
    start: [0, 4, 'up'],
    goal: tiles(G55, 4, 0),
    regions: [{ shape: tiles(G55, 4, 0, 1, 1, 0.03), color: 'green', label: 'Library door' }],
    guides: [{ points: stairs }],
  }),
  allowed: [HOP, LEFT, RIGHT, PEN_DOWN, PEN_UP, REPEAT],
  requires: ['move', 'draw'],
  criteria: [
    { kind: 'draw-path', guide: [stairs], coverage: 0.9, tolerance: PEN_TOL },
    { kind: 'stop-in-zone', zone: tiles(G55, 4, 0), label: 'the library door' },
    { kind: 'blocks', max: 6 },
  ],
  stars: {
    two: { text: 'You changed only one number from the code task.', check: (c) => flatten(c.nodes).some((n) => n.key === K.repeat && n.choice === 4) },
    three: { text: 'You told a friend which part of the pattern repeats.' },
  },
  reference: [penDown(), repeat(4, [hop(1), right(), hop(1), left()])],
  failures: [{ name: 'Repeat 3 stops one step short', program: [penDown(), repeat(3, [hop(1), right(), hop(1), left()])], expect: 'drawing' }],
})

const G75: Grid = { cols: 7, rows: 5 }
const S12 = challenge({
  id: 'L1-S12',
  session: 12,
  title: 'My Banner Picture',
  mission: 'Finish your picture. Use at least one Repeat. Then show it to the town!',
  specArena: 'l1-banner',
  arena: l1Arena({ id: 'l1-banner', title: 'Festival banner', grid: G75, start: [0, 4, 'up'], goal: tiles(G75, 3, 2, 1, 1), timeLimit: 60 }),
  allowed: [HOP, HOP_BACK, LEFT, RIGHT, PEN_DOWN, PEN_UP, REPEAT, BEEP, say('Ta-da!', 'For Lantern Hill!')],
  requires: ['move', 'draw'],
  criteria: [{ kind: 'blocks', min: 5, needs: ['repeat'] }, noWalls('the edge of the banner')],
  stars: {
    two: { text: 'Your picture matches your plan.' },
    three: { text: 'You explained the repeating part to the class.' },
  },
  reference: [hop(2), right(), hop(3), left(), penDown(), repeat(4, [repeat(4, [hop(1), right()]), right()]), penUp(), sayP('Ta-da!')],
  failures: [{ name: 'a picture with no Repeat', program: [penDown(), hop(1), right(), hop(1), right(), penUp()], expect: 'blocks' }],
})

// ── Act 3 ─────────────────────────────────────────────────────────────────

const G35: Grid = { cols: 3, rows: 5 }
/** Where an object "on the tile in front, near edge" sits: 24 cm from the centre of the tile the robot scoops from. */
const SCOOP_AT = 0.24
const S13 = challenge({
  id: 'L1-S13',
  session: 13,
  title: 'Float to the Boat',
  mission: 'This float is further away. Bring it to the boat at the bottom of the dock.',
  specArena: 'l1-dock-b',
  arena: l1Arena({
    id: 'l1-dock-b',
    title: 'Long dock',
    grid: G35,
    start: [0, 4, 'up'],
    goal: tiles(G35, 1, 4),
    regions: [{ shape: tiles(G35, 1, 4, 1, 1, 0.02), color: 'blue', label: 'Boat' }],
    props: [2, 3].map((r) => prop(`crate-${r}`, 'crate', 'crate', box(at(G35, 2, r), [0.26, 0.26]), 0.3, '#92400E')),
    objects: [{ id: 'float', kind: 'ball', pos: ahead(at(G35, 1, 1), 90, SCOOP_AT), size: 0.04, mass: 0.1, color: '#5EEAD4' }],
  }),
  allowed: [HOP, HOP_BACK, LEFT, RIGHT, SCOOP_UP, TIP_OUT, say('Here you go!')],
  requires: ['move', 'grab'],
  criteria: [
    { kind: 'deliver', object: 'float', zone: tiles(G35, 1, 4), label: 'glass float' },
    { kind: 'no-touch', walls: false, what: 'a crate' },
  ],
  stars: {
    two: { text: 'The float arrived without touching a crate.', check: () => true },
    three: { text: 'You said "Here you go!" to the captain.', check: saysText('Here you go!') },
  },
  reference: [hop(3), right(), hop(1), scoop(), right(), hop(2), tipOut()],
  failures: [{ name: 'forgot to scoop it up', program: [hop(3), right(), hop(1), right(), hop(2), tipOut()], expect: 'not-delivered' }],
})

// Session 14: the slipway. Rows 4–2 are a 10° ramp (rise 18.5 cm), rows 0–1 a flat platform.
const S14_RISE = 3 * T * Math.tan((10 * Math.PI) / 180)
const S14 = challenge({
  id: 'L1-S14',
  session: 14,
  title: 'Up to the Lighthouse',
  mission: 'Scoop the iron lantern and carry it to the top of the ramp. Test, look, and fix your hops.',
  specArena: 'l1-slipway',
  arena: l1Arena({
    id: 'l1-slipway',
    title: 'Slipway',
    grid: G16,
    start: [0, 5, 'up'],
    goal: tiles(G16, 0, 0, 1, 2),
    ramps: [{ center: at(G16, 0, 3), size: [T, 3 * T], height: S14_RISE, riseHeadingDeg: 0 }],
    decks: [{ center: tiles(G16, 0, 0, 1, 2).center, size: [T, 2 * T], height: S14_RISE }],
    walls: [{ ...side(G16, 0, 0, 'up', 1, 0.03, S14_RISE + 0.3, true) }],
    regions: [{ shape: tiles(G16, 0, 0, 1, 2, 0.02), color: 'yellow', label: 'Platform' }],
    objects: [{ id: 'lantern', kind: 'cube', pos: ahead(at(G16, 0, 5), 0, SCOOP_AT), size: 0.04, mass: 0.8, color: '#475569', base: 0.012 }],
  }),
  allowed: [HOP, HOP_BACK, SCOOP_UP, TIP_OUT, say('Found a light!')],
  starter: [scoop()],
  requires: ['move', 'grab'],
  criteria: [
    { kind: 'deliver', object: 'lantern', zone: tiles(G16, 0, 0, 1, 2), label: 'iron lantern' },
    noWalls('the railing'),
  ],
  stars: {
    two: { text: 'You tested first, then added the hop that was missing.', check: testedAndChanged },
    three: { text: 'You said "heavy and uphill means less far".' },
  },
  reference: [scoop(), hop(3), hop(1), hop(1), tipOut(), sayP('Found a light!')],
  failures: [{ name: 'the flat-floor plan: Hop 3 comes up short with a heavy load uphill', program: [scoop(), hop(3), tipOut(), sayP('Found a light!')], expect: 'not-delivered' }],
  adaptations: [
    'Calibrated so Hop 3 with the lantern ends in row 3 or 2 (short of the platform) for every body, and the robot never reaches the railing. The spec’s single extra hop (Hop 3 + Hop 1) is enough for the light bug body; the heavier bodies need a second Hop 1, which testing shows — so the reference adds hops until the lantern lands on the platform: Hop 3, Hop 1, Hop 1. The motors now lose push as they speed up (back-EMF) and hold the robot on a slope when stopped.',
  ],
})

// Session 15: mat, ice, soft sand, stop zone, bridge line. The bridge (open water beyond) is a margin past row 0.
const G17: Grid = { cols: 1, rows: 7 }
const S15 = challenge({
  id: 'L1-S15',
  session: 15,
  title: 'Across the Fish Market',
  mission: 'Cross the mat, the ice and the sand to the bridge. Go slowly on the ice!',
  specArena: 'l1-fish-market',
  arena: l1Arena({
    id: 'l1-fish-market',
    title: 'Fish market to the beach',
    grid: G17,
    margin: [1, 1, 0, 1],
    start: [0, 6, 'up'],
    goal: tiles(G17, 0, 0),
    regions: [
      { shape: tiles(G17, 0, 3, 1, 2), surface: 'ice', label: 'Ice' },
      { shape: tiles(G17, 0, 1, 1, 2), surface: 'soft-sand', label: 'Sand' },
      { shape: tiles(G17, 0, 0, 1, 1, 0.02), color: 'yellow', label: 'Stop' },
      { shape: box(ahead(at(G17, 0, 0), 0, T), [3 * T, T]), color: 'blue', label: 'Bridge' },
    ],
    props: [
      prop('fish-box-l', 'crate', 'fish box', box(ahead(at(G17, 0, 3), 270, 0.33), [0.2, 0.5]), 0.25, '#0EA5E9'),
      prop('fish-box-r', 'crate', 'fish box', box(ahead(at(G17, 0, 4), 90, 0.33), [0.2, 0.5]), 0.25, '#0EA5E9'),
    ],
  }),
  allowed: [HOP, CREEP, HOP_BACK, REPEAT],
  requires: ['move'],
  criteria: [
    { kind: 'stop-in-zone', zone: tiles(G17, 0, 0), label: 'the stop zone' },
    { kind: 'stay-in', zone: box(tiles(G17, 0, 0, 1, 7).center, [3 * T, 7 * T]), what: 'the bridge line' },
    { kind: 'no-touch', walls: false, what: 'a fish box' },
  ],
  stars: {
    two: { text: 'You used Creep on the ice.', check: has(K.creep) },
    three: { text: 'You tested, looked and changed a number at least once.', check: testedAndChanged },
  },
  reference: [hop(1), repeat(5, [creep(), creep()]), hop(3), hop(3)],
  failures: [
    { name: 'the flat-mat plan (Hop 3 + Hop 3) comes up short: ice and sand slow it', program: [hop(3), hop(3)], expect: 'short' },
    { name: 'too much push: hopping on the ice and the sand rolls over the bridge line', program: [hop(2), hop(2), hop(3), hop(3)], expect: 'crossed' },
  ],
  adaptations: [
    'Calibrated so the spec’s floor order holds: the sim’s Level 1 soft sand halves a two-wheeler’s speed (16.5–17.3 cm/s at Hop power for every body), and ice robs a Hop of a fifth of its distance (wheelspin). The curriculum’s sample count “Repeat 5 { Creep }” (≈ 31 cm) cannot cross two tiles of ice (70 cm), so the reference creeps ten times as Repeat 5 { Creep, Creep } — still only the allowed blocks — and then pushes through the sand with two Hop 3s (the spec’s one Hop 3 covers only half of the sand at half speed). The taught mistakes: the flat-mat plan comes up short; hopping everywhere rolls past the bridge line.',
  ],
})

const G46: Grid = { cols: 4, rows: 6 }
/** Bridge timetable (seconds after Go), re-timed for the sim's quarter turn (1.1–1.5 s at 40 %, by body). */
const S16_A_DOWN: [number, number] = [3.7, 14]
const S16_B_DOWN: [number, number] = [13.3, 25]
const barrier = (id: string, label: string, pos: Vec2, size: Vec2, down: [number, number]): Mover => ({
  id,
  kind: 'barrier',
  label,
  size,
  height: 0.3,
  color: '#EF4444',
  keys: [
    { t: 0, pos, present: true },
    { t: down[0], pos, present: false },
    { t: down[1], pos, present: true },
  ],
})
const S16 = challenge({
  id: 'L1-S16',
  session: 16,
  title: 'Two Bridges',
  mission: 'A second, slower bridge is round the corner. Wait for both!',
  specArena: 'l1-two-bridges',
  arena: l1Arena({
    id: 'l1-two-bridges',
    title: 'Two bridges',
    grid: G46,
    start: [0, 5, 'up'],
    goal: tiles(G46, 3, 1),
    regions: [
      { shape: tiles(G46, 1, 2, 3, 4), color: 'blue', label: 'Water' },
      { shape: tiles(G46, 1, 0, 3, 1), color: 'blue', label: '' },
      { shape: tiles(G46, 0, 0, 1, 1), color: 'blue', label: '' },
      { shape: tiles(G46, 0, 2, 1, 2, 0.04), label: 'Bridge A' },
      { shape: tiles(G46, 1, 1, 2, 1, 0.04), label: 'Bridge B' },
      { shape: tiles(G46, 0, 1, 1, 1, 0.03), color: 'black', label: 'Rocks' },
      { shape: tiles(G46, 3, 1, 1, 1, 0.03), color: 'yellow', label: 'Light' },
    ],
    movers: [
      barrier('bridge-a', 'bridge A barrier', ahead(at(G46, 0, 4), 0, T / 2 + 0.02), [0.33, 0.04], S16_A_DOWN),
      barrier('bridge-b', 'bridge B barrier', ahead(at(G46, 0, 1), 90, T / 2 + 0.02), [0.04, 0.33], S16_B_DOWN),
    ],
  }),
  allowed: [HOP, WAIT, LEFT, RIGHT, say('Found a light!')],
  requires: ['move'],
  criteria: [
    { kind: 'stop-in-zone', zone: tiles(G46, 3, 1), label: 'the light' },
    { kind: 'no-touch', ids: ['bridge-a', 'bridge-b'], walls: false, what: 'a barrier' },
  ],
  stars: {
    two: { text: 'You waited for both bridges.', check: (c) => keys(c).filter((k) => k === K.wait).length >= 2 },
    three: { text: 'You explained why the second wait is longer.' },
  },
  reference: [hop(1), wait(3), hop(3), right(), wait(3), wait(2), hop(3), sayP('Found a light!')],
  failures: [
    { name: 'no wait at bridge A', program: [hop(1), hop(3), right(), wait(3), wait(2), hop(3)], expect: 'collision' },
    { name: 'the second wait is one second too short', program: [hop(1), wait(3), hop(3), right(), wait(3), wait(1), hop(3)], expect: 'collision' },
  ],
  adaptations: [
    'Bridge B is down from 13.3 s (the spec says 12.8 s), because the sim’s quarter turn at 40 % takes 1.1–1.5 s depending on the body, not 1 s. With waits 3 + 2 every body reaches bridge B 0.25 s or more after it is down; with 3 + 1 every body reaches it 0.35 s or more before (the spec asked to re-time if the turn changed).',
  ],
})

const G34: Grid = { cols: 3, rows: 4 }
const TUNNEL_H = 0.45
const S17 = challenge({
  id: 'L1-S17',
  session: 17,
  title: 'The Winding Tunnel',
  mission: 'This tunnel turns. Keep the light on in the dark part only, and don’t bump the walls.',
  specArena: 'l1-tunnel-winding',
  arena: l1Arena({
    id: 'l1-tunnel-winding',
    title: 'Winding tunnel',
    grid: G34,
    start: [0, 3, 'up'],
    goal: tiles(G34, 2, 1),
    regions: [
      { shape: tiles(G34, 0, 1, 1, 2), dark: true },
      { shape: tiles(G34, 1, 1), dark: true },
      { shape: tiles(G34, 2, 1, 1, 1, 0.03), color: 'white', label: 'Exit' },
      { shape: tiles(G34, 1, 2, 2, 2), color: 'black' },
      { shape: tiles(G34, 0, 0, 3, 1), color: 'black' },
    ],
    walls: [
      side(G34, 0, 2, 'right', 2, 0.03, TUNNEL_H, true),
      side(G34, 1, 1, 'down', 2, 0.03, TUNNEL_H, true),
      side(G34, 0, 1, 'up', 3, 0.03, TUNNEL_H, true),
    ],
  }),
  allowed: [HOP, LEFT, RIGHT, LIGHT_ON, LIGHT_OFF, say('Hello, glow-worms!')],
  requires: ['move', 'light'],
  criteria: [
    { kind: 'light-in-dark', offAtEnd: true },
    { kind: 'stop-in-zone', zone: tiles(G34, 2, 1), label: 'the tunnel exit' },
    noWalls('the tunnel wall'),
  ],
  stars: {
    two: { text: 'Light on in the dark, off at the end, no bumps.', check: () => true },
    three: { text: 'You said hello to the glow-worms on the way.', check: saysText('Hello, glow-worms!') },
  },
  reference: [lightOn(), hop(2), right(), hop(2), lightOff()],
  failures: [{ name: 'into the dark with the light off', program: [hop(2), right(), hop(2)], expect: 'dark' }],
})

const S18 = challenge({
  id: 'L1-S18',
  session: 18,
  title: 'My Helper at Work',
  mission: 'Finish your helper routine. It must use your tool, be polite, and not bump anything.',
  specArena: 'l1-home',
  arena: l1Arena({
    id: 'l1-home',
    title: 'Nana’s house',
    grid: G55,
    start: [0, 4, 'up'],
    goal: tiles(G55, 4, 0),
    regions: [
      { shape: tiles(G55, 0, 0, 2, 2), color: 'yellow', label: 'Kitchen' },
      { shape: tiles(G55, 3, 0, 2, 2), color: 'green', label: 'Living room' },
      { shape: tiles(G55, 0, 4, 5, 1), dark: true, label: 'Hallway' },
      { shape: tiles(G55, 4, 4, 1, 1, 0.04), color: 'blue', label: 'Bedroom' },
    ],
    props: [
      prop('table', 'table', 'kitchen table', box(at(G55, 1, 1), [0.27, 0.27]), 0.3, '#A16207'),
      prop('armchair', 'chair', 'armchair', box(ahead(at(G55, 4, 0), 0, 0.08), [0.3, 0.16]), 0.3, '#DB2777'),
      prop('sofa', 'sofa', 'sofa', box(at(G55, 3, 2), [0.25, 0.27]), 0.3, '#7C2D12'),
    ],
    objects: [{ id: 'tin', kind: 'cube', pos: ahead(at(G55, 0, 1), 0, SCOOP_AT), size: 0.035, mass: 0.15, color: '#60A5FA' }],
    timeLimit: 60,
  }),
  allowed: [HOP, HOP_BACK, LEFT, RIGHT, WAIT, REPEAT, SCOOP_UP, TIP_OUT, LIGHT_ON, LIGHT_OFF, PEN_DOWN, PEN_UP, BEEP, say('Here you go!', 'Good night!', 'Welcome home!', 'Excuse me!')],
  requires: ['move'],
  criteria: [
    { kind: 'deliver', object: 'tin', zone: tiles(G55, 4, 0), label: 'biscuit tin' },
    { kind: 'no-touch', walls: true, what: 'the wall' },
    { kind: 'blocks', needs: ['say', 'tool'] },
  ],
  stars: {
    two: { text: 'Your helper does its job without bumps.', check: () => true },
    three: { text: 'Your helper tells people what it is doing.', check: (c) => flatten(c.nodes).filter((n) => n.key === 'say').length >= 1 },
  },
  reference: [hop(3), scoop(), hopBack(), hopBack(), right(), hop(3), hop(1), left(), hop(2), tipOut(), sayP('Here you go!')],
  failures: [{ name: 'the short cut through the living room bumps the sofa', program: [hop(3), scoop(), hopBack(), right(), hop(3), hop(1), left(), hop(1), tipOut(), sayP('Here you go!')], expect: 'collision' }],
  adaptations: [
    'A “Make it yours” project: the challenge checks the scoop job from the spec’s example (tin tipped out on the armchair tile, a Say, no furniture touched). The player should let the child pick the light or pen job too; those use the same arena (dark hallway row 4, paper runner) and the no-touch + uses-tool + Say checks.',
  ],
})

// ── Act 4 ─────────────────────────────────────────────────────────────────

const G44W = G44
const S19 = challenge({
  id: 'L1-S19',
  session: 19,
  title: 'Feel Along to the Gate',
  mission: 'Light number ten is in the corner by the gate. Feel your way to the wall, back off a little, turn right, and feel your way to the corner.',
  specArena: 'l1-fog-garden',
  arena: l1Arena({
    id: 'l1-fog-garden',
    title: 'Foggy garden',
    grid: G44W,
    start: [0, 3, 'up'],
    goal: tiles(G44W, 3, 0),
    regions: [
      { shape: tiles(G44W, 0, 0, 4, 4), color: 'green' },
      { shape: tiles(G44W, 3, 0, 1, 1, 0.03), color: 'yellow', label: 'Gate' },
    ],
    timeLimit: 60,
  }),
  extraStarts: [{ pos: at(G44W, 0, 2), headingDeg: 0 }],
  allowed: [CREEP, BACK_OFF, LEFT, RIGHT, UNTIL_BUMP, say('Found it!')],
  requires: ['move', 'feel-bump'],
  criteria: [
    { kind: 'bumped-at-end' },
    { kind: 'stop-in-zone', zone: tiles(G44W, 3, 0), label: 'the corner by the gate' },
  ],
  stars: {
    two: { text: 'You backed off before turning.', check: (c) => {
      const k = c.nodes.map((n) => n.key)
      const b = k.indexOf(K.backOff)
      return b >= 0 && k.indexOf(K.right, b) > b
    } },
    three: { text: 'It worked from both starting places.', check: (c) => c.result.success },
  },
  reference: [untilBump([creep()]), backOff(), right(), untilBump([creep()]), sayP('Found it!')],
  failures: [{ name: 'turns left at the wall: the wrong corner', program: [untilBump([creep()]), backOff(), left(), untilBump([creep()]), sayP('Found it!')], expect: 'short' }],
  adaptations: ['The spec’s sample solution backs off with drive_for(−30, 0.5), but its Back off block is fixed at (−30 %, 1 s); the reference uses the block as offered. “Start row is random (2 or 3)” is run as two fixed starts, rows 3 and 2, and both must pass.'],
})

// Session 20: the hedge spiral. Thin hedges (1 cm, 35 cm tall) on tile edges.
const HEDGE_T = 0.01
const HEDGE_H = 0.35
/** The outside hedges stand this far outside the 3 × 3 grid (see the adaptation note). */
const HEDGE_OUT = 0.04
/** The hedge between (0,2) and (1,2) stands this far inside column 0. */
const HEDGE_IN = 0.05
const hedge = (c: number, r: number, s: Heading): Wall => side(G33, c, r, s, 1, HEDGE_T, HEDGE_H)
function s20Hedges(): Wall[] {
  const half = 1.5 * T + HEDGE_OUT
  const corners: Vec2[] = [[half, half], [-half, half], [-half, -half], [half, -half]]
  const outer: Wall[] = corners.map((a, i) => ({ from: a, to: corners[(i + 1) % 4], height: HEDGE_H, thickness: HEDGE_T }))
  // (0,2)|(1,2) stands 4 cm inside column 0, so a robot that bumps it and backs off is centred in column 1.
  const h02 = hedge(0, 2, 'right')
  const inner02: Wall = { ...h02, from: [h02.from[0] + HEDGE_IN, h02.from[1]], to: [h02.to[0] + HEDGE_IN, h02.to[1]] }
  return [...outer, inner02, hedge(0, 1, 'right'), hedge(1, 0, 'down'), hedge(2, 1, 'left')]
}
const S20 = challenge({
  id: 'L1-S20',
  session: 20,
  title: 'Find Bolt in the Maze',
  mission: 'Bolt is in the middle of the maze. You have no map. Use your one rule to find him.',
  specArena: 'l1-hedge-spiral',
  arena: l1Arena({
    id: 'l1-hedge-spiral',
    title: 'Hedge maze',
    grid: G33,
    start: [0, 2, 'up'],
    startNudge: [0.03, 0],
    goal: tiles(G33, 1, 1),
    margin: [HEDGE_OUT / T + 0.3, HEDGE_OUT / T + 0.3, HEDGE_OUT / T + 0.3, HEDGE_OUT / T + 0.3],
    regions: [{ shape: tiles(G33, 0, 0, 3, 3), color: 'green' }, { shape: tiles(G33, 1, 1, 1, 1, 0.03), color: 'yellow', label: 'Bolt' }],
    walls: s20Hedges(),
    props: [prop('bolt', 'dog', 'Bolt', circle(ahead(at(G33, 1, 1), 0, 0.1), 0.05), 0.15, '#F59E0B')],
    timeLimit: 90,
  }),
  allowed: [CREEP, BACK_OFF, RIGHT, LEFT, IF_BUMP, REPEAT_LOTS],
  requires: ['move', 'feel-bump'],
  criteria: [
    { kind: 'reach-zone', zone: tiles(G33, 1, 1), label: 'Bolt', endsRun: true },
    { kind: 'blocks', max: 6 },
  ],
  stars: {
    two: { text: 'You found Bolt with the same rule.', check: has(K.ifBump) },
    three: { text: 'You noticed your corner program needed only a bigger number.' },
  },
  reference: [pic(K.repeatLots, 10, [pic(K.repeatLots, 10, [creep(), ifBump([backOff(), right()])])])],
  failures: [{ name: 'Repeat 20 runs out before the middle', program: [pic(K.repeatLots, 20, [creep(), ifBump([backOff(), right()])])], expect: 'short' }],
  adaptations: [
    'The robot starts 3 cm toward the outside of its start tile, the outside hedges stand 4 cm outside the 3 × 3 grid, and the hedge between (0,2) and (1,2) stands 5 cm inside column 0. “Back off a little” (12.6 cm, set so the dome can turn) leaves a robot 3–6 cm off the middle of a 35 cm corridor; on the tile grid exactly, the dome (27 cm wide) then clipped the hedge ends at the inner turns. The corridors and the spiral are the spec’s.',
    'The spec’s Repeat(40) cannot reach Bolt: the spiral is about 2.9 m of creeping at 6.2 cm a creep, plus four back-offs, about 55 passes of the loop. The block set and the 6-block limit are kept; the reference nests the same “Repeat lots of times” block (10 × 10 = 100 passes — 5 blocks), and the run ends the moment the robot reaches Bolt. Alternative for the product: add 80 to the block’s chips.',
  ],
})

const S21 = challenge({
  id: 'L1-S21',
  session: 21,
  title: 'Round the Bandstand',
  mission: 'Light eleven is on the far side of the bandstand. Go until something is close, then turn left. Do that two times. Then ring the bell!',
  specArena: 'l1-bandstand',
  arena: l1Arena({
    id: 'l1-bandstand',
    title: 'The bandstand',
    grid: G44,
    start: [3, 3, 'up'],
    goal: tiles(G44, 0, 0),
    regions: [{ shape: tiles(G44, 0, 0, 1, 1, 0.03), color: 'yellow', label: 'Stop' }],
    props: [
      // The railing stands 6 cm inside its tiles: "until close" can stop a wide body's centre up to
      // 25.7 cm from the top wall, and the dome is 13.5 cm from centre to side.
      prop('bandstand', 'bandstand', 'bandstand', tiles(G44, 1, 1, 2, 2, 0.06), 0.45, '#F59E0B'),
      prop('bell', 'bell', 'bell', box(ahead(at(G44, 0, 1), 270, 0.1), [0.1, 0.12]), 0.4, '#FACC15'),
    ],
    walls: [side(G44, 0, 0, 'up', 4, 0.06, 0.5, true), side(G44, 0, 0, 'left', 4, 0.06, 0.5, true)],
  }),
  allowed: [CREEP, LEFT, RIGHT, UNTIL_CLOSE, REPEAT, say('Ding!')],
  requires: ['move', 'see-wall'],
  criteria: [
    { kind: 'no-touch', walls: true, what: 'a flower stand' },
    { kind: 'stop-in-zone', zone: tiles(G44, 0, 0), label: 'the bell corner', facingDeg: HEADING_DEG.down },
  ],
  stars: {
    two: { text: 'No touches at all.', check: () => true },
    three: { text: 'You used Repeat 2 because the two parts are the same.', check: (c) => flatten(c.nodes).some((n) => n.key === K.repeat && n.choice === 2) },
  },
  reference: [repeat(2, [untilClose([creep()]), left()]), sayP('Ding!')],
  failures: [{ name: 'turns right at the top: ends in the wrong corner', program: [repeat(2, [untilClose([creep()]), right()]), sayP('Ding!')], expect: 'short' }],
})

// Session 22: visitors cross on a fixed timetable ("random" in the spec; a fixed one makes runs repeatable).
const G44S = G44
const visitor = (id: string, color: string, keys: Mover['keys']): Mover => ({ id, kind: 'person', label: 'visitor', size: [0.16, 0.16], height: PERSON_H, color, keys })
const S22 = challenge({
  id: 'L1-S22',
  session: 22,
  title: 'The Lantern Delivery',
  mission: 'Carry light eleven in your scoop through the busy square to the tower door. Wait for people, turn right at the corner, and tip it out at the door.',
  specArena: 'l1-square-delivery',
  arena: l1Arena({
    id: 'l1-square-delivery',
    title: 'Festival square',
    grid: G44S,
    margin: [3, 3, 0, 1.5],
    start: [0, 3, 'up'],
    goal: tiles(G44S, 3, 0),
    regions: [
      { shape: tiles(G44S, 3, 0, 1, 1, 0.03), color: 'yellow', label: 'Tower door' },
      { shape: box(ahead(at(G44S, 3, 0), 90, T), [T, T]), color: 'black', label: 'Tower' },
    ],
    props: [prop('fountain', 'fountain', 'fountain', circle(at(G44S, 1, 1), 0.13), 0.3, '#38BDF8')],
    objects: [{ id: 'light11', kind: 'ball', pos: ahead(at(G44S, 0, 3), 0, 0.2), size: 0.03, mass: 0.05, color: '#FDE047' }],
    movers: [
      // Stands in row 2 at Go, then walks off to the left.
      visitor('visitor-1', '#F472B6', [
        { t: 0, pos: at(G44S, 0, 2) },
        { t: 2, pos: at(G44S, 0, 2) },
        { t: 3.5, pos: ahead(at(G44S, 0, 2), 270, 0.55) },
      ]),
      // Steps into row 1 while the robot hops into row 2, waits there, then walks off to the left.
      visitor('visitor-2', '#22D3EE', [
        { t: 0, pos: ahead(at(G44S, 0, 1), 270, 0.55) },
        { t: 2, pos: ahead(at(G44S, 0, 1), 270, 0.55) },
        { t: 3, pos: at(G44S, 0, 1) },
        { t: 6, pos: at(G44S, 0, 1) },
        { t: 7.5, pos: ahead(at(G44S, 0, 1), 270, 0.55) },
      ]),
      // Comes down into row 0 at column 1 while the robot turns at the corner, then hurries off the top.
      visitor('visitor-3', '#A3E635', [
        { t: 0, pos: ahead(at(G44S, 1, 0), 0, 0.7) },
        { t: 8, pos: ahead(at(G44S, 1, 0), 0, 0.7) },
        { t: 9, pos: at(G44S, 1, 0) },
        { t: 13, pos: at(G44S, 1, 0) },
        { t: 13.6, pos: ahead(at(G44S, 1, 0), 0, 0.7) },
      ]),
    ],
    timeLimit: 60,
  }),
  startHolding: 'light11',
  allowed: [HOP, LEFT, RIGHT, WAIT_CLEAR, REPEAT, TIP_OUT, say('Excuse me!', 'Thank you!')],
  requires: ['move', 'see-wall', 'grab'],
  criteria: [
    { kind: 'no-touch', walls: true, what: 'a stall' },
    { kind: 'deliver', object: 'light11', zone: tiles(G44S, 3, 0), label: 'light' },
  ],
  stars: {
    two: { text: 'You waited for people the whole way.', check: (c) => flatten(c.nodes).filter((n) => n.key === K.waitClear).length >= 2 },
    three: { text: 'You used Repeat for both parts.', check: (c) => c.nodes.filter((n) => n.key === K.repeat).length >= 2 },
  },
  reference: [repeat(3, [waitClear(), hop(1)]), right(), repeat(2, [waitClear(), hop(1)]), tipOut(), sayP('Thank you!')],
  failures: [{ name: 'no waiting: bumps a visitor', program: [repeat(3, [hop(1)]), right(), repeat(2, [hop(1)]), tipOut(), sayP('Thank you!')], expect: 'collision' }],
  adaptations: ['Visitors cross “at random times” in the spec; here they cross on a fixed timetable (each one steps into the very tile the robot would hop into next), so every run is repeatable and a program without waiting always fails the same way.'],
})

// Session 23: the clock tower — one helix of ramps and corner landings around a solid gear shaft.
const RAMP_RISE = 2 * T * Math.tan((10 * Math.PI) / 180) // ≈ 12.3 cm per side
const TOWER_WALL = 1.1
/**
 * The gear shaft stands this far inside its 2 × 2 tiles, and every ramp and landing is widened
 * inward to meet it: "until close" can leave a wide body's centre 8 cm past the middle of a
 * landing, and on the exact grid the dome's inner side then hit the shaft (see adaptations).
 */
const SHAFT_IN = 0.07
/** The clock face stands this far north of the clock-room landing's middle (see adaptations). */
const CLOCK_FACE = 0.285
/** Light 12 sits this far west of the landing's middle: where "until close" leaves a robot, on average. */
const COG_X = 0.045
function towerParts(): { ramps: Ramp[]; decks: Deck[]; walls: Wall[]; props: Prop[] } {
  const g = G44
  const h = (i: number) => i * RAMP_RISE
  const S = SHAFT_IN
  // Widen a footprint toward the middle of the tower by S (x toward 0 and/or z toward 0).
  const widen = (center: Vec2, size: Vec2, inX: boolean, inZ: boolean): { center: Vec2; size: Vec2 } => ({
    center: [center[0] - (inX ? Math.sign(center[0]) * (S / 2) : 0), center[1] - (inZ ? Math.sign(center[1]) * (S / 2) : 0)],
    size: [size[0] + (inX ? S : 0), size[1] + (inZ ? S : 0)],
  })
  const deck = (c: number, r: number, w: number, hh: number, inX: boolean, inZ: boolean, height: number, base?: number): Deck => {
    const t = tiles(g, c, r, w, hh) as Extract<Shape2D, { kind: 'rect' }>
    return { ...widen(t.center, t.size, inX, inZ), height, ...(base !== undefined ? { base } : {}) }
  }
  // Ramps: size is [across, along the slope]. Column ramps widen in x, row ramps in z.
  const ramp = (c: number, r: number, w: number, hh: number, rise: number, base: number): Ramp => {
    const t = tiles(g, c, r, w, hh) as Extract<Shape2D, { kind: 'rect' }>
    const alongZ = rise === 0 || rise === 180
    const wd = widen(t.center, t.size, alongZ, !alongZ)
    return { center: wd.center, size: alongZ ? [wd.size[0], wd.size[1]] : [wd.size[1], wd.size[0]], height: RAMP_RISE, riseHeadingDeg: rise, base }
  }
  const top = at(g, 3, 3)
  const ramps: Ramp[] = [
    ramp(3, 1, 1, 2, 0, 0), // up column 3, rising north from the ground
    ramp(1, 0, 2, 1, 270, h(1)), // along row 0, rising west (map left = +x)
    ramp(0, 1, 1, 2, 180, h(2)), // down column 0, rising south
    ramp(1, 3, 2, 1, 90, h(3)), // along row 3, rising east
  ]
  // Landings, and the solid under each raised ramp.
  const decks: Deck[] = [
    deck(3, 0, 1, 1, false, false, h(1)),
    deck(1, 0, 2, 1, false, true, h(1)),
    deck(0, 0, 1, 1, false, false, h(2)),
    deck(0, 1, 1, 2, true, false, h(2)),
    deck(0, 3, 1, 1, false, false, h(3)),
    deck(1, 3, 2, 1, false, true, h(3)),
  ]
  // The clock-room landing over the start tile: a 2 cm deck high above it (headroom about 47 cm),
  // reaching north to the clock face. (Corner landings are not widened: the shaft is diagonal to them.)
  decks.push({ center: [top[0], top[1] + (CLOCK_FACE - T / 2) / 2], size: [T, T / 2 + CLOCK_FACE], height: h(4), base: h(4) - 0.02 })
  const walls: Wall[] = [
    side(g, 0, 0, 'up', 4, 0.06, TOWER_WALL, true),
    side(g, 0, 0, 'left', 4, 0.06, TOWER_WALL, true),
    side(g, 3, 0, 'right', 4, 0.06, TOWER_WALL, true),
    side(g, 0, 3, 'down', 4, 0.06, TOWER_WALL, true),
  ]
  const props: Prop[] = [
    prop('shaft', 'tower', 'gear shaft', tiles(g, 1, 1, 2, 2, S), TOWER_WALL, '#64748B'),
    // The clock face: a wall on the north side of the clock-room landing.
    prop('clock-face', 'clock', 'clock face', box([top[0], top[1] + CLOCK_FACE + 0.02], [T, 0.04]), 0.5, '#FDE68A', h(4)),
    // The cog that holds light 12: a little shelf 3 cm out from the clock face, 6 cm up.
    prop('cog', 'cog', 'cog', box([top[0] + COG_X, top[1] + CLOCK_FACE - 0.015], [0.12, 0.03]), 0.06, '#B45309', h(4)),
  ]
  return { ramps, decks, walls, props }
}
const TOWER = towerParts()
const S23 = challenge({
  id: 'L1-S23',
  session: 23,
  title: 'To the Top!',
  mission: 'Climb all four ramps to the clock face. Then scoop up the twelfth light.',
  specArena: 'l1-tower-full',
  arena: l1Arena({
    id: 'l1-tower-full',
    title: 'Clock tower',
    grid: G44,
    start: [3, 3, 'up'],
    goal: tiles(G44, 3, 3),
    ramps: TOWER.ramps,
    decks: TOWER.decks,
    walls: TOWER.walls,
    props: TOWER.props,
    objects: [{ id: 'light12', kind: 'ball', pos: [at(G44, 3, 3)[0] + COG_X, at(G44, 3, 3)[1] + CLOCK_FACE - 0.015], size: 0.014, mass: 0.04, color: '#FDE047', base: 4 * RAMP_RISE + 0.06 }],
    timeLimit: 120,
  }),
  allowed: [CREEP, LEFT, RIGHT, UNTIL_CLOSE, REPEAT, SCOOP_UP, say('Twelve!')],
  requires: ['move', 'see-wall', 'grab'],
  criteria: [
    { kind: 'no-touch', ids: ['shaft', 'clock-face'], walls: true, what: 'a tower wall' },
    { kind: 'deliver', object: 'light12', held: true, label: 'twelfth light' },
    { kind: 'blocks', max: 7, needs: ['loop'] },
  ],
  stars: {
    two: { text: 'You climbed all four ramps without a bump.', check: () => true },
    three: { text: 'You used one loop for all four ramps.', check: (c) => flatten(c.nodes).some((n) => n.key === K.repeat && n.choice === 4) },
  },
  reference: [repeat(4, [untilClose([creep()]), left()]), scoop(), sayP('Twelve!')],
  failures: [{ name: 'Repeat 3 stops a floor short of the clock face', program: [repeat(3, [untilClose([creep()]), left()]), scoop(), sayP('Twelve!')], expect: 'not-delivered' }],
  adaptations: [
    'The clock face stands 28.5 cm north of the middle of the clock-room landing (the spec says about 17.5 cm from the robot) and the cog sticks out 3 cm (spec: about 6 cm). “Until close” leaves a robot 0.4–8.8 cm past the middle of each landing, so the robot drives along the last ramp up to 8.8 cm off-centre toward the clock face and then turns on the spot (the dome sweeps a 16.5 cm circle): any nearer, a wide body touches the clock face. Light 12 sits 4.5 cm west of the middle, where the robots stop on average; the scoop reaches it from every stopping place.',
    'The gear shaft stands 7 cm inside its 2 × 2 tiles and the ramps and landings are 7 cm wider toward it: “until close” leaves a robot’s centre up to 8 cm past the middle of a landing, so on the exact grid a wide body’s inner side scraped the shaft when it turned.',
  ],
})

const S24 = challenge({
  id: 'L1-S24',
  session: 24,
  title: 'Showtime!',
  mission: 'Finish your show. It must have a loop, a sensor block, your tool, and kind words. Then show everyone!',
  specArena: 'l1-festival-stage',
  arena: l1Arena({
    id: 'l1-festival-stage',
    title: 'Festival stage',
    grid: G55,
    start: [2, 4, 'up'],
    goal: tiles(G55, 2, 4),
    regions: [
      { shape: tiles(G55, 4, 0, 1, 2), dark: true, label: 'Dark corner' },
      { shape: tiles(G55, 1, 2, 3, 1, 0.03), color: 'white', label: 'Paper' },
    ],
    objects: [
      { id: 'basket-a', kind: 'cube', pos: at(G55, 0, 1), size: 0.035, mass: 0.1, color: '#F59E0B' },
      { id: 'basket-b', kind: 'cube', pos: at(G55, 4, 1), size: 0.035, mass: 0.1, color: '#F59E0B' },
    ],
    movers: [
      // A visitor steps onto the stage edge for a while.
      visitor('visitor', '#F472B6', [
        { t: 0, pos: ahead(at(G55, 4, 4), 180, 0.1), present: false },
        { t: 7, pos: ahead(at(G55, 4, 4), 180, 0.1), present: true },
        { t: 12, pos: ahead(at(G55, 4, 4), 180, 0.1), present: false },
      ]),
    ],
    timeLimit: 90,
  }),
  allowed: [HOP, HOP_BACK, CREEP, BACK_OFF, LEFT, RIGHT, WAIT, REPEAT, UNTIL_BUMP, UNTIL_CLOSE, WAIT_CLEAR, IF_BUMP, PEN_DOWN, PEN_UP, SCOOP_UP, TIP_OUT, LIGHT_ON, LIGHT_OFF, BEEP, say('Welcome!', 'Thank you!', 'Happy festival!', 'Excuse me!')],
  requires: ['move'],
  criteria: [
    { kind: 'uses-blocks', families: ['loop', 'sensor', 'tool', 'say'] },
    { kind: 'no-touch', walls: true, what: 'the fence' },
  ],
  stars: {
    two: { text: 'Your show has all four ingredients.', check: () => true },
    three: { text: 'You fixed at least one bug and can say what it was.', check: testedAndChanged },
  },
  reference: [sayP('Welcome!'), lightOn(), repeat(2, [untilClose([creep()]), beep(), left(), left()]), lightOff(), sayP('Happy festival!')],
  failures: [
    { name: 'a show with no sensor block', program: [sayP('Welcome!'), lightOn(), repeat(2, [beep()]), lightOff()], expect: 'blocks' },
    { name: 'big hops into the fence', program: [sayP('Welcome!'), lightOn(), repeat(2, [hop(3)]), lightOff(), untilClose([creep()])], expect: 'collision' },
  ],
  adaptations: [
    'The spec’s sample show drives round all four edges, but the lantern baskets at (0,1) and (4,1) sit on that route (“not obstacles”, yet touching one is a fault), so the sample would always knock a basket. The reference show keeps all four ingredients and goes up and back down the middle of the stage instead; the arena is as specified.',
  ],
})

export const LEVEL1_ARENAS: Challenge[] = [S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20, S21, S22, S23, S24]

const BY_ID = new Map(LEVEL1_ARENAS.map((a) => [a.id, a]))

/** The challenge arena for a Level 1 session ("L1-S07"), or null. Also accepts the session number. */
export function getLevel1Arena(sessionId: string | number): Challenge | null {
  const id = typeof sessionId === 'number' ? `L1-S${String(sessionId).padStart(2, '0')}` : sessionId
  return BY_ID.get(id) ?? null
}

/** The curriculum robot for a session, on the child's own design (their body, name and colours). */
/**
 * The session's robot: the child's body, name and colours with the session's parts. Workshop
 * upgrades (motors, pack, arm) are left off on purpose: each challenge is calibrated on the
 * starter drive (a hill a gear motor just climbs, sand that halves its speed), and an upgrade
 * would change the lesson. The Physics Lab and the Power Lab drive the upgraded robot.
 */
export function sessionDesign(ch: Challenge, mine: RobotDesign): RobotDesign {
  const d: RobotDesign = { ...mine, drive: ch.robot.drive, head: ch.robot.head, tool: ch.robot.tool, sensor: ch.robot.sensor }
  delete d.upgrades
  return d
}

export type { StartPose }
