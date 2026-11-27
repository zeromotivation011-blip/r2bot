// lib/kids/robot-design.ts
// The robot a child builds in the 3D Workshop. One shape, used everywhere:
//   - the Workshop renders it in 3D and lets the child change every slot;
//   - the Code Lab drives it and reads its CAPABILITIES (a robot without a
//     distance sensor cannot use the "wall ahead?" block — that is the lesson);
//   - the Classroom shows it on the teacher's roster.
//
// Every part carries plain-language "what it does", "with it" and "without it"
// so a 7-year-old learns why a part exists by what breaks when it is missing.

export type BodyId = 'box' | 'dome' | 'tall' | 'bug'
export type DriveId = 'wheels2' | 'wheels4' | 'tracks' | 'legs'
export type HeadId = 'camera' | 'distance' | 'antenna' | 'screen'
export type ToolId = 'none' | 'gripper' | 'scoop' | 'pen' | 'light'
export type SensorId = 'none' | 'line' | 'color' | 'bumper'

export type Slot = 'body' | 'drive' | 'head' | 'tool' | 'sensor'

/** What the robot can do in the Code Lab. Derived from its parts, never stored. */
export type Capability =
  | 'move' // every robot that has a drive
  | 'see-wall' // distance sensor or camera: "wall ahead?" block
  | 'see-color' // colour sensor or camera: "on colour?" block
  | 'follow-line' // line sensor: "on the line?" block
  | 'feel-bump' // bumper (no Code Lab block uses it yet; the part still teaches touch sensing)
  | 'grab' // gripper or scoop: pick up / drop
  | 'draw' // pen: leaves a trail
  | 'light' // light: lights up dark tiles
  | 'rough-ground' // tracks or legs: can cross sand/rocks
  | 'show-face' // screen head: shows emotions

export interface RobotPart {
  id: string
  slot: Slot
  name: string
  emoji: string
  /** One sentence a child understands. */
  what: string
  /** What becomes possible with it. */
  withIt: string
  /** What goes wrong without it. */
  withoutIt: string
  /** A real robot that uses this. */
  realWorld: string
  gives: Capability[]
}

export const ROBOT_PARTS_3D: RobotPart[] = [
  // ── Bodies ───────────────────────────────────────────────────────────────
  {
    id: 'box', slot: 'body', name: 'Box Body', emoji: '📦',
    what: 'A strong square body with lots of room inside for batteries and the brain.',
    withIt: 'Your robot can carry a big battery and drive for a long time.',
    withoutIt: 'There is nowhere safe to put the brain and batteries — they would fall out!',
    realWorld: 'Warehouse robots that carry shelves are big boxes on wheels.',
    gives: [],
  },
  {
    id: 'dome', slot: 'body', name: 'Dome Body', emoji: '🛸',
    what: 'A round, low body that slides around furniture without getting stuck.',
    withIt: 'Corners and table legs cannot catch your robot.',
    withoutIt: 'A boxy robot can wedge itself into a corner and get stuck.',
    realWorld: 'Robot vacuum cleaners are round for exactly this reason.',
    gives: [],
  },
  {
    id: 'tall', slot: 'body', name: 'Tall Tower', emoji: '🗼',
    what: 'A tall body that lifts the head up high, like a person.',
    withIt: 'The camera can see over tables and talk to people face to face.',
    withoutIt: 'A short robot only sees feet and chair legs.',
    realWorld: 'Hospital and hotel delivery robots are tall so people notice them.',
    gives: [],
  },
  {
    id: 'bug', slot: 'body', name: 'Bug Body', emoji: '🐞',
    what: 'A small, light body shaped like a beetle.',
    withIt: 'Light robots use less battery and fit into tiny spaces.',
    withoutIt: 'A heavy robot needs bigger motors and drains its battery faster.',
    realWorld: 'Tiny inspection robots crawl inside pipes and jet engines.',
    gives: [],
  },
  // ── Drives ───────────────────────────────────────────────────────────────
  {
    id: 'wheels2', slot: 'drive', name: 'Two Wheels + Caster', emoji: '🛞',
    what: 'Two motor wheels and a little ball that rolls along at the back.',
    withIt: 'Spin one wheel faster and the robot curves. Spin the wheels opposite ways and it turns on the spot.',
    withoutIt: 'With no wheels or legs, a robot is a statue — it cannot go anywhere.',
    realWorld: 'Most robot vacuums and school robot kits drive this way.',
    gives: ['move'],
  },
  {
    id: 'wheels4', slot: 'drive', name: 'Four Wheels', emoji: '🚙',
    what: 'Four wheels like a toy car — steady and fast.',
    withIt: 'Your robot is very stable and will not tip over when it carries things.',
    withoutIt: 'Fewer wheels means a wobblier ride with heavy loads.',
    realWorld: 'Mars rovers and delivery robots on footpaths use several wheels.',
    gives: ['move'],
  },
  {
    id: 'tracks', slot: 'drive', name: 'Tank Tracks', emoji: '🪖',
    what: 'Rubber belts that wrap around the wheels, like a bulldozer.',
    withIt: 'Your robot can roll over sand, rocks and bumps.',
    withoutIt: 'Small wheels sink into sand and get stuck on rocks.',
    realWorld: 'Rescue robots climb rubble on tracks after earthquakes.',
    gives: ['move', 'rough-ground'],
  },
  {
    id: 'legs', slot: 'drive', name: 'Walking Legs', emoji: '🦿',
    what: 'Legs that step one at a time, like an animal.',
    withIt: 'Your robot can step over rocks and climb where wheels cannot.',
    withoutIt: 'Wheels cannot climb stairs or step over a big rock.',
    realWorld: 'Robot dogs walk on four legs to inspect factories and tunnels.',
    gives: ['move', 'rough-ground'],
  },
  // ── Heads ────────────────────────────────────────────────────────────────
  {
    id: 'distance', slot: 'head', name: 'Distance Eyes', emoji: '👀',
    what: 'Two "eyes" that shout a sound too high for us to hear and listen for the echo.',
    withIt: 'Your robot knows a wall is ahead before it crashes — like a bat.',
    withoutIt: 'Your robot is blind. It drives straight into walls.',
    realWorld: 'Car parking sensors beep using the same echo trick.',
    gives: ['see-wall'],
  },
  {
    id: 'camera', slot: 'head', name: 'Camera Eye', emoji: '📷',
    what: 'A tiny camera, like the one in a phone, that sees colours and shapes.',
    withIt: 'Your robot can see walls AND tell red from green.',
    withoutIt: 'Your robot cannot see anything — not walls, not colours.',
    realWorld: 'Self-driving cars use many cameras to read signs and lanes.',
    gives: ['see-wall', 'see-color'],
  },
  {
    id: 'antenna', slot: 'head', name: 'Radio Antenna', emoji: '📡',
    what: 'An antenna that talks to other robots and to you by radio.',
    withIt: 'You can send your robot new orders from far away.',
    withoutIt: 'Once the robot drives off, nobody can talk to it.',
    realWorld: 'Mars rovers get their orders from Earth by radio.',
    gives: [],
  },
  {
    id: 'screen', slot: 'head', name: 'Face Screen', emoji: '🙂',
    what: 'A little screen that shows a face, so people know how the robot "feels".',
    withIt: 'People can see if your robot is happy, busy or needs help.',
    withoutIt: 'People cannot tell what the robot is about to do — that can be scary.',
    realWorld: 'Friendly robots in airports and shops show faces on screens.',
    gives: ['show-face'],
  },
  // ── Tools ────────────────────────────────────────────────────────────────
  {
    id: 'none', slot: 'tool', name: 'No Tool', emoji: '✋',
    what: 'No arm or tool — just a robot that drives.',
    withIt: 'Lighter, simpler and cheaper.',
    withoutIt: '—',
    realWorld: 'Security patrol robots only need to drive and look.',
    gives: [],
  },
  {
    id: 'gripper', slot: 'tool', name: 'Gripper Claw', emoji: '🦾',
    what: 'A claw with two fingers that opens and closes.',
    withIt: 'Your robot can pick things up and put them down somewhere else.',
    withoutIt: 'Your robot can only push things around, never carry them.',
    realWorld: 'Factory robot arms pick up phone parts with grippers.',
    gives: ['grab'],
  },
  {
    id: 'scoop', slot: 'tool', name: 'Scoop', emoji: '🥄',
    what: 'A shovel at the front that scoops things up.',
    withIt: 'Great for collecting sand, balls or rocks.',
    withoutIt: 'Loose things like sand slip through a claw.',
    realWorld: 'Mars rovers scoop soil to study it.',
    gives: ['grab'],
  },
  {
    id: 'pen', slot: 'tool', name: 'Drawing Pen', emoji: '🖊️',
    what: 'A pen under the robot that draws wherever it drives.',
    withIt: 'Your robot draws shapes — and you can SEE where your program went.',
    withoutIt: 'You only see where the robot ended, not the path it took.',
    realWorld: 'Line-marking robots paint sports fields.',
    gives: ['draw'],
  },
  {
    id: 'light', slot: 'tool', name: 'Headlight', emoji: '🔦',
    what: 'A bright light so the robot can work in the dark.',
    withIt: 'Your robot can explore caves and dark rooms.',
    withoutIt: 'A camera sees nothing in the dark.',
    realWorld: 'Underwater robots carry lights to explore the deep sea.',
    gives: ['light'],
  },
  // ── Floor sensors ────────────────────────────────────────────────────────
  {
    id: 'none', slot: 'sensor', name: 'No Floor Sensor', emoji: '➖',
    what: 'Nothing underneath the robot.',
    withIt: 'Simpler robot.',
    withoutIt: '—',
    realWorld: 'Many simple toys have no sensors at all.',
    gives: [],
  },
  {
    id: 'line', slot: 'sensor', name: 'Line Sensor', emoji: '〰️',
    what: 'Little lights under the robot that see if the floor is dark or bright.',
    withIt: 'Your robot can follow a black line painted on the floor.',
    withoutIt: 'The robot cannot tell it has drifted off the path.',
    realWorld: 'Hospital and factory robots follow lines on the floor.',
    gives: ['follow-line'],
  },
  {
    id: 'color', slot: 'sensor', name: 'Colour Sensor', emoji: '🎨',
    what: 'A sensor that looks down and tells which colour the floor is.',
    withIt: 'Your robot can stop on red, go on green, and sort things by colour.',
    withoutIt: 'Every tile looks the same to your robot.',
    realWorld: 'Sorting machines split red and green apples by colour.',
    gives: ['see-color'],
  },
  {
    id: 'bumper', slot: 'sensor', name: 'Bumper Switch', emoji: '🛡️',
    what: 'A soft bumper with a switch that clicks when it touches something.',
    withIt: 'Your robot knows it touched something and can back away.',
    withoutIt: 'The robot keeps pushing against the wall, wasting battery.',
    realWorld: 'Robot vacuums have a bumper that clicks when they hit a sofa.',
    gives: ['feel-bump'],
  },
]

export interface RobotDesign {
  name: string
  body: BodyId
  drive: DriveId
  head: HeadId
  tool: ToolId
  sensor: SensorId
  primary: string
  accent: string
  /** Bumped when the shape changes so stored designs can be migrated. */
  v: 1
}

export const ROBOT_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#94A3B8', '#FACC15', '#14B8A6', '#F97316'] as const

export const DEFAULT_DESIGN: RobotDesign = {
  name: 'Sparky',
  body: 'box',
  drive: 'wheels2',
  head: 'distance',
  tool: 'none',
  sensor: 'none',
  primary: '#F59E0B',
  accent: '#3B82F6',
  v: 1,
}

export function partsForSlot(slot: Slot): RobotPart[] {
  return ROBOT_PARTS_3D.filter((p) => p.slot === slot)
}

export function getPart(slot: Slot, id: string): RobotPart | undefined {
  return ROBOT_PARTS_3D.find((p) => p.slot === slot && p.id === id)
}

export function capabilitiesOf(d: RobotDesign): Set<Capability> {
  const caps = new Set<Capability>()
  for (const slot of ['body', 'drive', 'head', 'tool', 'sensor'] as Slot[]) {
    const part = getPart(slot, d[slot])
    part?.gives.forEach((c) => caps.add(c))
  }
  return caps
}

/** Human description of a missing capability, for "your robot can't do that yet" messages. */
export const CAPABILITY_NEEDS: Record<Capability, string> = {
  move: 'wheels, tracks or legs',
  'see-wall': 'Distance Eyes or a Camera Eye',
  'see-color': 'a Colour Sensor or a Camera Eye',
  'follow-line': 'a Line Sensor',
  'feel-bump': 'a Bumper Switch',
  grab: 'a Gripper Claw or a Scoop',
  draw: 'a Drawing Pen',
  light: 'a Headlight',
  'rough-ground': 'Tank Tracks or Walking Legs',
  'show-face': 'a Face Screen',
}

// ── Storage ────────────────────────────────────────────────────────────────
const KEY = 'r2bot_kids_robot_v1'
export const ROBOT_CHANGED_EVENT = 'r2bot:kids-robot'

function isDesign(x: unknown): x is RobotDesign {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return o.v === 1 && typeof o.body === 'string' && typeof o.drive === 'string' && typeof o.head === 'string'
}

export function loadDesign(): RobotDesign {
  if (typeof window === 'undefined') return { ...DEFAULT_DESIGN }
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_DESIGN }
    const parsed: unknown = JSON.parse(raw)
    if (!isDesign(parsed)) return { ...DEFAULT_DESIGN }
    // Validate each slot against the catalogue so a stale id never breaks rendering.
    const d = { ...DEFAULT_DESIGN, ...parsed }
    for (const slot of ['body', 'drive', 'head', 'tool', 'sensor'] as Slot[]) {
      if (!getPart(slot, d[slot])) (d as Record<Slot, string>)[slot] = DEFAULT_DESIGN[slot]
    }
    return d
  } catch {
    return { ...DEFAULT_DESIGN }
  }
}

export function saveDesign(d: RobotDesign): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(d))
    window.dispatchEvent(new CustomEvent(ROBOT_CHANGED_EVENT))
  } catch {
    /* storage full or blocked — the design simply is not remembered */
  }
}

/** Short shareable code for a design (no server needed): e.g. "box.tracks.camera.gripper.line.F59E0B.3B82F6.Sparky" */
export function encodeDesign(d: RobotDesign): string {
  const name = d.name.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 20)
  return [d.body, d.drive, d.head, d.tool, d.sensor, d.primary.slice(1), d.accent.slice(1), encodeURIComponent(name)].join('.')
}

export function decodeDesign(s: string): RobotDesign | null {
  const p = s.split('.')
  if (p.length < 8) return null
  // The name is percent-encoded; a truncated or edited link can leave a broken
  // escape ("Robo%2"), and decodeURIComponent throws on that. Treat it as not a
  // design, and keep only the characters encodeDesign() itself allows.
  let name: string
  try {
    name = decodeURIComponent(p.slice(7).join('.'))
  } catch {
    return null
  }
  name = name.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 20)
  const d: RobotDesign = {
    v: 1,
    body: p[0] as BodyId,
    drive: p[1] as DriveId,
    head: p[2] as HeadId,
    tool: p[3] as ToolId,
    sensor: p[4] as SensorId,
    primary: /^[0-9A-Fa-f]{6}$/.test(p[5]) ? `#${p[5]}` : DEFAULT_DESIGN.primary,
    accent: /^[0-9A-Fa-f]{6}$/.test(p[6]) ? `#${p[6]}` : DEFAULT_DESIGN.accent,
    name: name || DEFAULT_DESIGN.name,
  }
  for (const slot of ['body', 'drive', 'head', 'tool', 'sensor'] as Slot[]) {
    if (!getPart(slot, d[slot])) return null
  }
  return d
}

// ── Spark Trail parts → Workshop parts (additive, 27 Nov 2026) ──────────────
// Finishing a Spark Trail zone earns a part (`earnedParts` in lib/kids-progress.ts,
// ids from ROBOT_PARTS in lib/kids-world-data.ts). There is only one robot, so
// each earned part FITS a real slot on the RobotDesign: "Fit it" in the Garage
// (/kids/hangar) puts that Workshop part on the robot, and every surface that
// draws or drives the robot (Workshop, Code Lab, AR, Classroom) follows.
// `slot: null` = a Garage add-on with no engineering effect (the Rocket Booster
// is drawn in the Hangar bay only; real ground robots do not fly on rockets).
export interface TrailPartFit {
  slot: Slot | null
  /** The RobotDesign part id it fits, when `slot` is set. */
  part: string | null
}

export const TRAIL_PART_FITS: Record<string, TrailPartFit> = {
  'robot-head': { slot: 'head', part: 'camera' },
  'robot-body': { slot: 'body', part: 'box' },
  'robot-arm': { slot: 'tool', part: 'gripper' },
  'robot-legs': { slot: 'drive', part: 'wheels2' },
  'robot-sensor-pack': { slot: 'sensor', part: 'color' },
  'robot-rocket-pack': { slot: null, part: null },
}

/** True when the design already wears the Workshop part this trail part fits. */
export function isTrailPartFitted(d: RobotDesign, trailPartId: string): boolean {
  const fit = TRAIL_PART_FITS[trailPartId]
  return Boolean(fit && fit.slot && fit.part && d[fit.slot] === fit.part)
}

/** The design with the trail part's Workshop part fitted (unchanged for add-ons or unknown ids). */
export function fitTrailPart(d: RobotDesign, trailPartId: string): RobotDesign {
  const fit = TRAIL_PART_FITS[trailPartId]
  if (!fit || !fit.slot || !fit.part || !getPart(fit.slot, fit.part)) return d
  return { ...d, [fit.slot]: fit.part }
}
