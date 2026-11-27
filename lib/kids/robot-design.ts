// lib/kids/robot-design.ts
// The robot a child builds in the 3D Workshop. One shape, used everywhere:
//   - the Workshop renders it in 3D and lets the child change every slot;
//   - the Code Lab drives it and reads its CAPABILITIES (a robot without a
//     distance sensor cannot use the "wall ahead?" block — that is the lesson);
//   - the Classroom shows it on the teacher's roster.
//
// Every part carries plain-language "what it does", "with it" and "without it"
// so a 7-year-old learns why a part exists by what breaks when it is missing.

import { namespacedKey, profileKey } from './profiles'

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
  /**
   * Upgrade slots the child unlocks by playing (roadmap #33): power pack, motor
   * type, a second sensor, a jointed arm and a World form. Optional, so every
   * design saved before them (and every surface that never reads them) works
   * unchanged; a missing slot means the starter part (`UPGRADE_DEFAULT`).
   */
  upgrades?: RobotUpgrades
  /** Bumped when the shape changes so stored designs can be migrated. */
  v: 1
}

// ── Upgrade slots (27 Nov 2026, roadmap #33: a robot that grows with the child) ──
// Five more slots, unlocked by play (rules in lib/kids/robot-growth.ts). Kept
// apart from `Slot` so the Code Lab, the simulator's physics and the Garage —
// which work on the five base slots — need no change. A second floor sensor
// DOES add its capabilities (two sensors = two blocks), so a line + bumper robot
// can follow a line and feel a wall.

export type UpgradeSlot = 'power' | 'motor' | 'sensor2' | 'arm' | 'chassis'
export type PowerId = 'aa' | 'lipo' | 'bigpack' | 'solar'
export type MotorId = 'gear' | 'speedy' | 'torque' | 'brushless'
export type ArmId = 'none' | 'arm2' | 'arm3'
/** The robot's World form. 'ground' is the everyday robot; the others are earned in a World. */
export type ChassisId = 'ground' | 'drone' | 'sub' | 'humanoid'

export interface RobotUpgrades {
  power?: PowerId
  motor?: MotorId
  sensor2?: SensorId
  arm?: ArmId
  chassis?: ChassisId
}

export const UPGRADE_SLOTS: UpgradeSlot[] = ['power', 'motor', 'sensor2', 'arm', 'chassis']

export const UPGRADE_DEFAULT: Required<RobotUpgrades> = { power: 'aa', motor: 'gear', sensor2: 'none', arm: 'none', chassis: 'ground' }

export const UPGRADE_SLOT_LABEL: Record<UpgradeSlot, string> = {
  power: 'Power',
  motor: 'Motors',
  sensor2: '2nd sensor',
  arm: 'Arm',
  chassis: 'World form',
}

export interface UpgradePart {
  id: string
  slot: UpgradeSlot
  name: string
  emoji: string
  what: string
  withIt: string
  withoutIt: string
  realWorld: string
  /** Capabilities it adds (only the second sensor adds any). */
  gives: Capability[]
}

export const UPGRADE_PARTS: UpgradePart[] = [
  // ── Power packs ──────────────────────────────────────────────────────────
  {
    id: 'aa', slot: 'power', name: 'AA Battery Box', emoji: '🔋',
    what: 'Four rechargeable AA batteries in a little box: 4.8 volts.',
    withIt: 'Easy to find and safe to swap. Enough energy for a long play.',
    withoutIt: 'With no battery the brain and the motors get no electricity at all.',
    realWorld: 'School robot kits and TV remotes run on AA batteries.',
    gives: [],
  },
  {
    id: 'lipo', slot: 'power', name: 'Lithium Pack', emoji: '⚡',
    what: 'A flat lithium battery (7.4 volts) that holds much more energy for its weight.',
    withIt: 'More energy and more push, without making the robot heavy.',
    withoutIt: 'AA batteries are heavier for the same energy, so the robot runs out sooner.',
    realWorld: 'Phones, drones and robot vacuums all use lithium batteries.',
    gives: [],
  },
  {
    id: 'bigpack', slot: 'power', name: 'Big Power Pack', emoji: '🔌',
    what: 'A large 11.1-volt lithium pack with three cells in a row.',
    withIt: 'Hours of driving — but it is heavy, and weight costs energy too.',
    withoutIt: 'A small battery means short missions and a trip back to the charger.',
    realWorld: 'Delivery and warehouse robots carry big packs to work a whole shift.',
    gives: [],
  },
  {
    id: 'solar', slot: 'power', name: 'Solar + Lithium', emoji: '☀️',
    what: 'A lithium pack topped up by a solar panel on the robot’s back.',
    withIt: 'In sunshine the panel pays for the brain and sensors, so the battery lasts longer.',
    withoutIt: 'Out in a field, far from a plug, the robot has to come home to charge.',
    realWorld: 'Farm robots and Mars rovers charge from the Sun while they work.',
    gives: [],
  },
  // ── Motors ───────────────────────────────────────────────────────────────
  {
    id: 'gear', slot: 'motor', name: 'Gear Motors', emoji: '⚙️',
    what: 'Small motors with gears that trade some speed for strength.',
    withIt: 'A good balance: not too fast, not too weak.',
    withoutIt: 'Without gears a little motor spins fast but cannot push the robot.',
    realWorld: 'Almost every toy and school robot uses gear motors.',
    gives: [],
  },
  {
    id: 'speedy', slot: 'motor', name: 'Speedy Motors', emoji: '🏎️',
    what: 'Motors geared for speed: the wheels turn faster but push less hard.',
    withIt: 'A faster robot on flat floors.',
    withoutIt: 'A race takes longer — but speedy motors struggle up ramps and with heavy loads.',
    realWorld: 'Racing robots and line-following competitions use fast motors.',
    gives: [],
  },
  {
    id: 'torque', slot: 'motor', name: 'Torque Motors', emoji: '🐂',
    what: 'Motors geared for strength (torque): slow, but they can push hard.',
    withIt: 'Pushes heavy boxes and climbs ramps without stalling.',
    withoutIt: 'A weaker motor stalls when the load is heavy.',
    realWorld: 'Sumo robots and tractors are slow and strong.',
    gives: [],
  },
  {
    id: 'brushless', slot: 'motor', name: 'Brushless Motors', emoji: '🌀',
    what: 'Motors with no rubbing brushes inside, run by a clever controller.',
    withIt: 'Fast AND strong, and they waste less energy as heat.',
    withoutIt: 'Brushed motors wear out and turn more of the battery into heat.',
    realWorld: 'Every drone and electric car uses brushless motors.',
    gives: [],
  },
  // ── Second floor sensor (same parts as the first) ────────────────────────
  {
    id: 'none', slot: 'sensor2', name: 'No 2nd Sensor', emoji: '➖',
    what: 'Just one floor sensor.',
    withIt: 'Simpler wiring and a lighter robot.',
    withoutIt: '—',
    realWorld: 'Many simple robots manage with one sensor.',
    gives: [],
  },
  {
    id: 'line', slot: 'sensor2', name: 'Extra Line Sensor', emoji: '〰️',
    what: 'A second row of little lights that see dark and bright floor.',
    withIt: 'Pair it with a bumper or colour sensor and your robot can follow lines AND do the other job.',
    withoutIt: 'One sensor means choosing: follow lines OR see colours OR feel bumps.',
    realWorld: 'Factory robots follow floor lines and also feel for obstacles.',
    gives: ['follow-line'],
  },
  {
    id: 'color', slot: 'sensor2', name: 'Extra Colour Sensor', emoji: '🎨',
    what: 'A second sensor that looks down and names the floor colour.',
    withIt: 'Your robot can follow a line and still stop on a red square.',
    withoutIt: 'A line-follower with one sensor cannot also read colour signals.',
    realWorld: 'Sorting robots read colours while they move along a track.',
    gives: ['see-color'],
  },
  {
    id: 'bumper', slot: 'sensor2', name: 'Extra Bumper', emoji: '🛡️',
    what: 'A soft bumper with a switch, fitted as a second sensor.',
    withIt: 'If every other sensor misses something, the bumper still feels it.',
    withoutIt: 'A robot that trusts one sensor can crash when that sensor is fooled.',
    realWorld: 'Robot vacuums use cliff sensors, bumpers and more — never just one.',
    gives: ['feel-bump'],
  },
  // ── Arm ──────────────────────────────────────────────────────────────────
  {
    id: 'none', slot: 'arm', name: 'No Arm', emoji: '✋',
    what: 'No jointed arm — the tool sits on the front of the body.',
    withIt: 'Light and simple.',
    withoutIt: '—',
    realWorld: 'Most robot vacuums have no arm at all.',
    gives: [],
  },
  {
    id: 'arm2', slot: 'arm', name: 'Two-Joint Arm', emoji: '💪',
    what: 'An arm with a shoulder and an elbow, like yours.',
    withIt: 'Your robot can reach up onto a shelf and further in front.',
    withoutIt: 'The robot can only reach what is right at its front edge.',
    realWorld: 'Mobile robots in warehouses carry arms to pick from shelves.',
    gives: [],
  },
  {
    id: 'arm3', slot: 'arm', name: 'Three-Joint Arm', emoji: '🦾',
    what: 'A longer arm with a shoulder, an elbow and a wrist.',
    withIt: 'The wrist turns the tool to the right angle before it grabs.',
    withoutIt: 'Without a wrist the claw has to approach from one direction only.',
    realWorld: 'The space station’s robot arm has joints like a giant human arm.',
    gives: [],
  },
  // ── World forms ──────────────────────────────────────────────────────────
  {
    id: 'ground', slot: 'chassis', name: 'Ground Robot', emoji: '🤖',
    what: 'Your everyday robot that drives on the floor.',
    withIt: 'Drives and works in the Code Lab and the Physics Lab.',
    withoutIt: '—',
    realWorld: 'Most robots that work with people drive on the ground.',
    gives: [],
  },
  {
    id: 'drone', slot: 'chassis', name: 'Farm Drone', emoji: '🚁',
    what: 'Four spinning rotors lift your robot into the air.',
    withIt: 'Flies over a whole field in minutes to check the crops.',
    withoutIt: 'A ground robot has to drive down every row.',
    realWorld: 'Farmers use drones to spot thirsty or sick plants from above.',
    gives: [],
  },
  {
    id: 'sub', slot: 'chassis', name: 'Ocean Sub', emoji: '🐠',
    what: 'A waterproof hull with floats and a propeller.',
    withIt: 'Dives under the sea where people cannot easily go.',
    withoutIt: 'Water would get into the electronics of a land robot.',
    realWorld: 'Underwater robots explore shipwrecks and study the deep ocean.',
    gives: [],
  },
  {
    id: 'humanoid', slot: 'chassis', name: 'Space Humanoid', emoji: '🧑‍🚀',
    what: 'Two legs and two arms, shaped like a person.',
    withIt: 'Can use tools and handles that were made for people.',
    withoutIt: 'A wheeled robot cannot climb a ladder or turn a valve made for hands.',
    realWorld: 'Robonaut 2 worked on the International Space Station with astronauts.',
    gives: [],
  },
]

export function upgradesForSlot(slot: UpgradeSlot): UpgradePart[] {
  return UPGRADE_PARTS.filter((p) => p.slot === slot)
}

export function getUpgrade(slot: UpgradeSlot, id: string): UpgradePart | undefined {
  return UPGRADE_PARTS.find((p) => p.slot === slot && p.id === id)
}

/** Every upgrade slot filled in (missing → the starter part). */
export function upgradesOf(d: RobotDesign): Required<RobotUpgrades> {
  return { ...UPGRADE_DEFAULT, ...(d.upgrades ?? {}) }
}

/** Keep only known upgrade ids, and drop slots that hold the starter part (so a stored design stays small). */
export function cleanUpgrades(u: unknown): RobotUpgrades | undefined {
  if (!u || typeof u !== 'object') return undefined
  const o = u as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const slot of UPGRADE_SLOTS) {
    const v = o[slot]
    if (typeof v === 'string' && v !== UPGRADE_DEFAULT[slot] && getUpgrade(slot, v)) out[slot] = v
  }
  return Object.keys(out).length ? (out as RobotUpgrades) : undefined
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
  // A second floor sensor is a real second sensor: its capability is added too.
  const s2 = d.upgrades?.sensor2
  if (s2) getUpgrade('sensor2', s2)?.gives.forEach((c) => caps.add(c))
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
/**
 * Base key. Each profile on the device has its own robot (lib/kids/profiles.ts):
 * member #1 keeps this exact key, others use `r2bot_kids_robot_v1::<profileId>`.
 */
const KEY = 'r2bot_kids_robot_v1'
export const ROBOT_CHANGED_EVENT = 'r2bot:kids-robot'

function isDesign(x: unknown): x is RobotDesign {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return o.v === 1 && typeof o.body === 'string' && typeof o.drive === 'string' && typeof o.head === 'string'
}

export function loadDesign(): RobotDesign {
  return loadDesignAt(profileKey(KEY))
}

/** One profile's robot without switching to it (parent hub, backup codes). */
export function loadDesignOf(profileId: string | null): RobotDesign {
  return loadDesignAt(namespacedKey(KEY, profileId))
}

function loadDesignAt(key: string): RobotDesign {
  if (typeof window === 'undefined') return { ...DEFAULT_DESIGN }
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return { ...DEFAULT_DESIGN }
    const parsed: unknown = JSON.parse(raw)
    if (!isDesign(parsed)) return { ...DEFAULT_DESIGN }
    // Validate each slot against the catalogue so a stale id never breaks rendering.
    const d: RobotDesign = { ...DEFAULT_DESIGN, ...parsed }
    for (const slot of ['body', 'drive', 'head', 'tool', 'sensor'] as Slot[]) {
      if (!getPart(slot, d[slot])) (d as unknown as Record<Slot, string>)[slot] = DEFAULT_DESIGN[slot]
    }
    const upgrades = cleanUpgrades(d.upgrades)
    if (upgrades) d.upgrades = upgrades
    else delete d.upgrades
    return d
  } catch {
    return { ...DEFAULT_DESIGN }
  }
}

export function saveDesign(d: RobotDesign): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(profileKey(KEY), JSON.stringify(d))
    window.dispatchEvent(new CustomEvent(ROBOT_CHANGED_EVENT))
  } catch {
    /* storage full or blocked — the design simply is not remembered */
  }
}

/** Save one profile's robot without switching to it (parent hub restore). */
export function saveDesignOf(profileId: string | null, d: RobotDesign): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(namespacedKey(KEY, profileId), JSON.stringify(d))
    window.dispatchEvent(new CustomEvent(ROBOT_CHANGED_EVENT))
  } catch {
    /* storage full or blocked */
  }
}

/**
 * Short shareable code for a design (no server needed): e.g. "box.tracks.camera.gripper.line.F59E0B.3B82F6.Sparky",
 * plus a 9th field for the upgrade slots when any is fitted ("lipo~torque~bumper~arm2~drone", "-" = starter part).
 * The name never contains a dot, so older 8-field codes decode exactly as before.
 */
export function encodeDesign(d: RobotDesign): string {
  const name = d.name.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 20)
  const fields = [d.body, d.drive, d.head, d.tool, d.sensor, d.primary.slice(1), d.accent.slice(1), encodeURIComponent(name)]
  const up = cleanUpgrades(d.upgrades)
  if (up) fields.push(UPGRADE_SLOTS.map((s) => up[s] ?? '-').join('~'))
  return fields.join('.')
}

function decodeUpgrades(field: string | undefined): RobotUpgrades | undefined {
  if (!field) return undefined
  const parts = field.split('~')
  const raw: Record<string, string> = {}
  UPGRADE_SLOTS.forEach((s, i) => {
    const v = parts[i]
    if (v && v !== '-') raw[s] = v
  })
  return cleanUpgrades(raw)
}

export function decodeDesign(s: string): RobotDesign | null {
  const p = s.split('.')
  if (p.length < 8) return null
  // The name is percent-encoded; a truncated or edited link can leave a broken
  // escape ("Robo%2"), and decodeURIComponent throws on that. Treat it as not a
  // design, and keep only the characters encodeDesign() itself allows.
  let name: string
  try {
    name = decodeURIComponent(p[7])
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
  const upgrades = decodeUpgrades(p[8])
  if (upgrades) d.upgrades = upgrades
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
