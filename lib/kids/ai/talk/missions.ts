// lib/kids/ai/talk/missions.ts
// Talk-to-your-robot missions: 6 per age band, 24 in all. In each one the
// child DESCRIBES the plan in words, the parser turns it into blocks, the
// robot runs it in a real-physics arena, and the child debugs it — by fixing
// the words (the robot did exactly what was said, not what was meant) or by
// editing the blocks. "Fix it" missions start with a buggy plan someone else
// wrote.
//
// Each mission is a physics Challenge (lib/kids/sim/challenge.ts) so the
// shared stage and the shared judge run it. `solution` is a phrase that the
// parser understands and that succeeds headless for every body
// (lib/kids/ai/talk/test-parser.ts runs them all); `starterWords` in a "fix
// it" mission must FAIL, for the reason the mission teaches.

import type { BandId } from '../../bands'
import type { RobotDesign } from '../../robot-design'
import type { Arena, Shape2D, Vec2 } from '../../sim/arena'
import type { Challenge, Criterion } from '../../sim/challenge'
import type { Program, Stmt } from '../../sim/program'

export interface TalkMission {
  id: string
  band: BandId
  title: string
  icon: string
  /** One or two lines of story. */
  story: string
  /** What counts as done, in a child's words. */
  goal: string
  /** The language lesson: what this mission teaches about how robots read words. */
  teach: string
  kind: 'describe' | 'fix'
  /** "Fix it" missions: the buggy plan already in the box. */
  starterWords?: string
  /** Word chips under the box — pieces, never the whole answer. */
  wordChips: string[]
  /** A tested plan that works (shown by "Show me a way" after a few tries). */
  solution: string
  solutionAnswers?: Record<string, string>
  /** Parts fitted over the child's robot for this mission (body, colours and name stay theirs). */
  parts: Partial<RobotDesign>
  /** Two stars: the program has at most this many blocks. */
  parBlocks: number
  /** Says the criteria compare exactly: a child's "hello!" is accepted as "Hello". */
  canonicalSays?: string[]
  challenge: Challenge
}

// ── Arena helpers ─────────────────────────────────────────────────────────

const START: { pos: Vec2; headingDeg: number } = { pos: [0, -1.4], headingDeg: 0 }

function arena(id: string, title: string, extra: Partial<Arena> & { goal: Arena['goal'] }): Arena {
  return {
    id,
    title,
    size: [2.4, 3.4],
    center: [0, 0],
    floor: 'tile',
    regions: [],
    lines: [],
    walls: [],
    ramps: [],
    boxes: [],
    objects: [],
    start: START,
    timeLimit: 60,
    ...extra,
  }
}

const circle = (x: number, z: number, r: number): Shape2D => ({ kind: 'circle', center: [x, z], radius: r })
const rect = (x: number, z: number, w: number, d: number): Shape2D => ({ kind: 'rect', center: [x, z], size: [w, d] })

/** Turtle path for a regular shape drawn with left turns (left of +z is +x in this world). */
function turtle(start: Vec2, side: number, turnDeg: number, n: number): Vec2[] {
  const pts: Vec2[] = [start]
  let a = 0
  let [x, z] = start
  for (let i = 0; i < n; i++) {
    x += Math.sin((a * Math.PI) / 180) * side
    z += Math.cos((a * Math.PI) / 180) * side
    pts.push([Math.round(x * 1000) / 1000, Math.round(z * 1000) / 1000])
    a += turnDeg
  }
  return pts
}

function challenge(m: { id: string; title: string; mission: string; arena: Arena; criteria: Criterion[] }): Challenge {
  return {
    id: m.id,
    session: 0,
    title: m.title,
    mission: m.mission,
    specArena: m.arena.id,
    arena: m.arena,
    palette: [],
    requires: ['move'],
    robot: { body: 'box', drive: 'wheels2', head: 'distance', tool: 'none', sensor: 'none' },
    fit: [],
    starter: [],
    criteria: m.criteria,
    stars: { two: { text: 'Short and clear: few blocks.' }, three: { text: 'Solved with words alone.' } },
    reference: [],
    failures: [],
  }
}

/** Every block a Talk program may contain: the editor offers them all (locked ones say which part they need). */
export const TALK_TOOLBOX = [
  'drive_for', 'drive_distance', 'turn_degrees', 'set_motors', 'stop', 'wait',
  'distance_cm', 'line_seen', 'line_offset', 'reflectance', 'floor_color', 'bumped', 'heading_deg', 'timer_s', 'battery_pct',
  'repeat', 'repeat_until', 'forever', 'if', 'if_else', 'compare', 'and', 'or', 'not',
  'number', 'text', 'math',
  'grip_open', 'grip_close', 'pen_down', 'pen_up', 'light_on', 'light_off', 'say', 'beep',
]

// ── Shared arenas ─────────────────────────────────────────────────────────

const YELLOW_AHEAD = circle(0, 0.1, 0.24)
const runway = (id: string, title: string, zone: Shape2D = YELLOW_AHEAD): Arena =>
  arena(id, title, { regions: [{ shape: zone, color: 'yellow', label: 'Goal' }], goal: { kind: 'reach', zone } })

const LEFT_GOAL = circle(0.6, -0.9, 0.22)

const WALL_Z = 0.6
const wallHall = (id: string, zone: Shape2D, color: 'green' | 'yellow' = 'green'): Arena =>
  arena(id, 'Wall hall', {
    floor: 'carpet',
    regions: [{ shape: zone, color, label: 'Stop here' }],
    walls: [{ from: [-1.2, WALL_Z], to: [1.2, WALL_Z], height: 0.4, thickness: 0.06 }],
    goal: { kind: 'stop-in-zone', zone, noCrash: true },
  })
const HALL_ZONE = rect(0, 0.33, 2.4, 0.3)

const CORNER_GOAL = circle(0.65, 0.18, 0.24)
const corner = arena('talk-corner', 'Corner', {
  regions: [{ shape: CORNER_GOAL, color: 'yellow', label: 'Goal' }],
  walls: [{ from: [-1.2, 0.55], to: [1.2, 0.55], height: 0.4, thickness: 0.06 }],
  goal: { kind: 'reach', zone: CORNER_GOAL },
})

const RED_BAND = rect(0, 0.6, 2.4, 0.4)
const BLUE_BAND = rect(0, -0.45, 2.4, 0.3)
/** Where the robot's centre is when its floor sensor (at the front) has just seen red and it has stopped. */
const STOP_ON_RED = rect(0, 0.52, 2.4, 0.56)
const STOP_ON_BLUE = rect(0, -0.52, 2.4, 0.5)
const colourRoad = (id: string, title: string): Arena =>
  arena(id, title, {
    regions: [
      { shape: BLUE_BAND, color: 'blue', label: 'Blue' },
      { shape: RED_BAND, color: 'red', label: 'Red' },
    ],
    goal: { kind: 'stop-in-zone', zone: STOP_ON_RED, noCrash: true },
  })

const CAVE = rect(0, 0.45, 2.4, 1.1)
const CAVE_STOP = circle(0, 0.35, 0.28)
const cave = (id: string, stop: Shape2D = CAVE_STOP): Arena =>
  arena(id, 'Dark cave', {
    regions: [
      { shape: CAVE, dark: true, label: 'Cave' },
      { shape: stop, color: 'yellow', label: stop === CAVE_STOP ? 'Crystal' : 'Exit' },
    ],
    goal: { kind: 'reach', zone: stop },
  })
/** Out of the far side of the cave, into the light again. */
const CAVE_EXIT = circle(0, 1.3, 0.26)

const DROP_ZONE = circle(0, -0.95, 0.25)
const depot = (id: string, cubeZ: number, drop: Shape2D = DROP_ZONE): Arena =>
  arena(id, 'Parcel depot', {
    regions: [{ shape: drop, color: 'green', label: 'Drop zone' }],
    objects: [{ id: 'parcel', kind: 'cube', pos: [0, cubeZ], size: 0.045, mass: 0.08, color: '#EF4444' }],
    goal: { kind: 'reach', zone: drop },
  })

const studio = (id: string, guide: Vec2[], start: Vec2): Arena =>
  arena(id, 'Art studio', {
    start: { pos: start, headingDeg: 0 },
    guides: [{ points: guide }],
    goal: { kind: 'reach', zone: circle(start[0], start[1], 0.2) },
  })

const LINE_FINISH = circle(-0.35, 1.2, 0.22)
const lineTrack = (id: string): Arena =>
  arena(id, 'Line track', {
    size: [2.6, 3.2],
    regions: [{ shape: LINE_FINISH, color: 'green', label: 'Finish' }],
    lines: [
      {
        width: 0.025,
        points: [
          [0, -1.4],
          [0, -0.9],
          [0.12, -0.6],
          [0.35, -0.35],
          [0.45, -0.05],
          [0.38, 0.25],
          [0.15, 0.5],
          [-0.1, 0.7],
          [-0.28, 0.95],
          [-0.35, 1.2],
        ],
      },
    ],
    start: { pos: [0, -1.3], headingDeg: 0 },
    goal: { kind: 'follow-line', zone: LINE_FINISH, minOnLine: 0.8 },
  })

const MAZE_GOAL = rect(-0.62, 1.3, 0.6, 0.7)
const maze = arena('talk-maze', 'Maze', {
  regions: [{ shape: MAZE_GOAL, color: 'yellow', label: 'Exit' }],
  walls: [
    { from: [-0.3, 0], to: [1.2, 0], height: 0.4, thickness: 0.06 },
    { from: [-0.9, -1.0], to: [-0.9, 0.5], height: 0.4, thickness: 0.06 },
  ],
  goal: { kind: 'reach', zone: MAZE_GOAL },
})

const PATROL_GOAL = circle(-0.9, 0, 0.25)
const patrol = arena('talk-patrol', 'Patrol', {
  regions: [{ shape: PATROL_GOAL, color: 'yellow', label: 'Check-point' }],
  start: { pos: [0.7, -1.3], headingDeg: 0 },
  goal: { kind: 'reach', zone: PATROL_GOAL },
})

// ── Missions ──────────────────────────────────────────────────────────────

const SQUARE_START: Vec2 = [-0.2, -0.5]
const SQUARE = turtle(SQUARE_START, 0.3, 90, 4)
const STAR_START: Vec2 = [-0.1, -0.7]
const STAR = turtle(STAR_START, 0.4, 144, 5)
const HEX_START: Vec2 = [-0.3, -0.6]
const HEX = turtle(HEX_START, 0.25, 60, 6)
const PEN_TOL = 0.045

export const TALK_MISSIONS: TalkMission[] = [
  // ── Explorers 5–7 ────────────────────────────────────────────────────────
  {
    id: 'e1-yellow-circle',
    band: 'explorers',
    title: 'Roll to the sun',
    icon: '☀️',
    story: 'Your robot is waiting at the start. A big yellow sun is painted on the floor ahead.',
    goal: 'Tell your robot how to stop on the yellow sun.',
    teach: '“Go forward” is not enough for a robot: it needs to know HOW FAR. Try a number with “cm”.',
    kind: 'describe',
    wordChips: ['drive forward', 'cm', '1 metre'],
    solution: 'drive forward 150 cm',
    parts: {},
    parBlocks: 1,
    challenge: challenge({
      id: 'talk-e1',
      title: 'Roll to the sun',
      mission: 'Stop on the yellow sun.',
      arena: runway('talk-runway', 'Runway'),
      criteria: [{ kind: 'stop-in-zone', zone: YELLOW_AHEAD, label: 'the yellow sun' }],
    }),
  },
  {
    id: 'e2-turn-and-go',
    band: 'explorers',
    title: 'Round the corner',
    icon: '↪️',
    story: 'The goal is not straight ahead this time. It is round a corner, on the LEFT.',
    goal: 'Drive a little, turn, then drive to the yellow circle.',
    teach: 'Order matters. Robots do one thing, then the next — in exactly the order you say.',
    kind: 'describe',
    wordChips: ['drive 50 cm', 'turn left', 'then'],
    solution: 'drive 50 cm, then turn left, then drive 60 cm',
    parts: {},
    parBlocks: 3,
    challenge: challenge({
      id: 'talk-e2',
      title: 'Round the corner',
      mission: 'Stop in the yellow circle on the left.',
      arena: runway('talk-left', 'Left turn', LEFT_GOAL),
      criteria: [{ kind: 'stop-in-zone', zone: LEFT_GOAL, label: 'the yellow circle' }],
    }),
  },
  {
    id: 'e3-beep-on-arrival',
    band: 'explorers',
    title: 'Ring the doorbell',
    icon: '🔔',
    story: 'Spark is delivering a letter. When it gets to the yellow door mat, it should ring the bell.',
    goal: 'Drive to the mat, THEN beep.',
    teach: '“Then” tells the robot to finish one thing before starting the next.',
    kind: 'describe',
    wordChips: ['drive', 'then beep', '150 cm'],
    solution: 'drive 150 cm then beep',
    parts: {},
    parBlocks: 2,
    challenge: challenge({
      id: 'talk-e3',
      title: 'Ring the doorbell',
      mission: 'Arrive on the mat, then beep.',
      arena: runway('talk-door', 'Door mat'),
      criteria: [
        { kind: 'stop-in-zone', zone: YELLOW_AHEAD, label: 'the mat' },
        { kind: 'sounds-after-arrival', zone: YELLOW_AHEAD, steps: [{ kind: 'beep' }] },
      ],
    }),
  },
  {
    id: 'e4-polite-robot',
    band: 'explorers',
    title: 'The polite robot',
    icon: '👋',
    story: 'Good robots say hello before they move, so nobody gets a fright.',
    goal: 'Say “Hello” first, then drive to the yellow circle.',
    teach: 'Robots can talk too. Put what it should say after the word “say”.',
    kind: 'describe',
    wordChips: ['say hello', 'then', 'drive 150 cm'],
    solution: 'say hello, then drive 150 cm',
    parts: {},
    parBlocks: 2,
    canonicalSays: ['Hello'],
    challenge: challenge({
      id: 'talk-e4',
      title: 'The polite robot',
      mission: 'Say Hello before moving, then stop on the circle.',
      arena: runway('talk-hello', 'Hello lane'),
      criteria: [
        { kind: 'say-before-move', text: 'Hello' },
        { kind: 'stop-in-zone', zone: YELLOW_AHEAD, label: 'the yellow circle' },
      ],
    }),
  },
  {
    id: 'e5-fix-left-right',
    band: 'explorers',
    title: 'Fix it: wrong way!',
    icon: '🐞',
    story: 'Bolt wrote this plan, but the robot went the wrong way round the corner.',
    goal: 'Change ONE word so the robot reaches the yellow circle.',
    teach: 'Left and right are easy to mix up. Robots never mix them up — they do exactly what the words say.',
    kind: 'fix',
    starterWords: 'drive 50 cm, turn right, then drive 60 cm',
    wordChips: ['left', 'right'],
    solution: 'drive 50 cm, turn left, then drive 60 cm',
    parts: {},
    parBlocks: 3,
    challenge: challenge({
      id: 'talk-e5',
      title: 'Fix it: wrong way!',
      mission: 'Reach the yellow circle on the left.',
      arena: runway('talk-left-fix', 'Left turn', LEFT_GOAL),
      criteria: [{ kind: 'stop-in-zone', zone: LEFT_GOAL, label: 'the yellow circle' }],
    }),
  },
  {
    id: 'e6-light-the-cave',
    band: 'explorers',
    title: 'Into the dark cave',
    icon: '🔦',
    story: 'A crystal is hidden inside a dark cave. Your robot has a headlight.',
    goal: 'Switch the light on BEFORE going in, then drive to the crystal.',
    teach: 'Some words switch a part on. “Turn on the light” is not a turn!',
    kind: 'describe',
    wordChips: ['turn on the light', 'drive', '175 cm'],
    solution: 'turn on the light, then drive 175 cm',
    parts: { tool: 'light' },
    parBlocks: 2,
    challenge: challenge({
      id: 'talk-e6',
      title: 'Into the dark cave',
      mission: 'Light on, then stop at the crystal.',
      arena: cave('talk-cave'),
      criteria: [
        { kind: 'light-in-dark', offAtEnd: false },
        { kind: 'stop-in-zone', zone: CAVE_STOP, label: 'the crystal' },
      ],
    }),
  },

  // ── Builders 8–10 ────────────────────────────────────────────────────────
  {
    id: 'b1-draw-square',
    band: 'builders',
    title: 'Draw a square',
    icon: '🟧',
    story: 'The art studio wants a square painted on the floor, 30 cm on each side. Your robot has a pen.',
    goal: 'Draw over the dotted square.',
    teach: 'One shape name can stand for many blocks: a square is 4 sides and 4 turns of 90°.',
    kind: 'describe',
    wordChips: ['draw a', 'square', '30 cm'],
    solution: 'draw a square of 30 cm',
    parts: { tool: 'pen' },
    parBlocks: 5,
    challenge: challenge({
      id: 'talk-b1',
      title: 'Draw a square',
      mission: 'Trace the dotted square.',
      arena: studio('talk-studio-square', SQUARE, SQUARE_START),
      criteria: [{ kind: 'draw-path', guide: [SQUARE], coverage: 0.85, tolerance: PEN_TOL }],
    }),
  },
  {
    id: 'b2-stop-at-wall',
    band: 'builders',
    title: 'Stop before the wall',
    icon: '🧱',
    story: 'There is a wall ahead. Nobody told you how far away it is.',
    goal: 'Stop in the green zone without touching the wall.',
    teach: 'When you don’t know a distance, let a SENSOR decide: “until the wall is close”.',
    kind: 'describe',
    wordChips: ['drive', 'until', 'the wall is close'],
    solution: 'drive until the wall is close',
    parts: { head: 'distance' },
    parBlocks: 3,
    challenge: challenge({
      id: 'talk-b2',
      title: 'Stop before the wall',
      mission: 'Stop in the green zone, no touching.',
      arena: wallHall('talk-hall', HALL_ZONE),
      criteria: [
        { kind: 'stop-in-zone', zone: HALL_ZONE, label: 'the green zone' },
        { kind: 'no-touch', walls: true, what: 'the wall' },
      ],
    }),
  },
  {
    id: 'b3-red-means-stop',
    band: 'builders',
    title: 'Red means stop',
    icon: '🟥',
    story: 'The road has a blue stripe and then a red one. Red means STOP.',
    goal: 'Stop on the red stripe.',
    teach: 'A colour sensor looks DOWN at the floor. “Until you see red” makes the robot check the floor every moment.',
    kind: 'describe',
    wordChips: ['drive', 'until you see', 'red'],
    solution: 'drive until you see red',
    parts: { sensor: 'color' },
    parBlocks: 3,
    challenge: challenge({
      id: 'talk-b3',
      title: 'Red means stop',
      mission: 'Stop on the red stripe.',
      arena: colourRoad('talk-road', 'Colour road'),
      criteria: [{ kind: 'stop-in-zone', zone: STOP_ON_RED, label: 'the red stripe' }],
    }),
  },
  {
    id: 'b4-wall-corner',
    band: 'builders',
    title: 'Wall, then left',
    icon: '↩️',
    story: 'Drive up to the wall, then go left to the yellow goal.',
    goal: 'Reach the yellow circle without touching the wall.',
    teach: '“At the wall” is a condition: the robot has to find the wall first, then turn.',
    kind: 'describe',
    wordChips: ['drive forward', 'turn left at the wall', 'then drive'],
    solution: 'drive forward, turn left at the wall, then drive 60 cm',
    parts: { head: 'distance' },
    parBlocks: 5,
    challenge: challenge({
      id: 'talk-b4',
      title: 'Wall, then left',
      mission: 'Reach the yellow circle without touching the wall.',
      arena: corner,
      criteria: [
        { kind: 'stop-in-zone', zone: CORNER_GOAL, label: 'the yellow circle' },
        { kind: 'no-touch', walls: true, what: 'the wall' },
      ],
    }),
  },
  {
    id: 'b5-fix-loop',
    band: 'builders',
    title: 'Fix it: one short',
    icon: '🔁',
    story: 'Nova used a loop to drive in little hops. The robot stopped before the sun!',
    goal: 'Fix the number in the loop so the robot stops on the sun.',
    teach: 'A loop repeats EXACTLY the number of times you say. Count the hops: 5 × 30 cm = 150 cm.',
    kind: 'fix',
    starterWords: 'drive 30 cm 3 times',
    wordChips: ['times'],
    solution: 'drive 30 cm 5 times',
    parts: {},
    parBlocks: 2,
    challenge: challenge({
      id: 'talk-b5',
      title: 'Fix it: one short',
      mission: 'Stop on the sun using a loop.',
      arena: runway('talk-hops', 'Hops'),
      criteria: [
        { kind: 'stop-in-zone', zone: YELLOW_AHEAD, label: 'the sun' },
        { kind: 'uses-blocks', families: ['repeat'] },
      ],
    }),
  },
  {
    id: 'b6-deliver-parcel',
    band: 'builders',
    title: 'Parcel pick-up',
    icon: '📦',
    story: 'A red parcel is waiting ahead. Bring it back and put it in the green drop zone behind you.',
    goal: 'Pick up the parcel, bring it back, put it down in the green zone.',
    teach: 'The claw grabs whatever is right in front of it. You must drive TO the parcel first.',
    kind: 'describe',
    wordChips: ['drive to the box', 'pick it up', 'turn around', 'drop it'],
    solution: 'drive to the box, pick it up, turn around, drive 80 cm, then drop it',
    parts: { tool: 'gripper', head: 'distance', drive: 'wheels2' },
    parBlocks: 8,
    challenge: challenge({
      id: 'talk-b6',
      title: 'Parcel pick-up',
      mission: 'Deliver the parcel to the green zone.',
      arena: depot('talk-depot', 0.2),
      criteria: [{ kind: 'deliver', object: 'parcel', zone: DROP_ZONE, label: 'parcel' }],
    }),
  },

  // ── Inventors 11–13 ──────────────────────────────────────────────────────
  {
    id: 'i1-maze',
    band: 'inventors',
    title: 'Maze runner',
    icon: '🌀',
    story: 'Two walls make a maze. You can’t see the distances — but your robot’s eyes can.',
    goal: 'Reach the yellow exit without touching a wall.',
    teach: 'Chain sensor steps: drive until a wall, turn, drive until the next wall. The same words work wherever the walls are.',
    kind: 'describe',
    wordChips: ['until the wall is close', 'turn right', 'turn left', 'then'],
    solution: 'drive until the wall is close, turn right, drive until the wall is close, turn left, then drive until the wall is close',
    parts: { head: 'distance' },
    parBlocks: 11,
    challenge: challenge({
      id: 'talk-i1',
      title: 'Maze runner',
      mission: 'Reach the exit without touching a wall.',
      arena: maze,
      criteria: [
        { kind: 'stop-in-zone', zone: MAZE_GOAL, label: 'the exit' },
        { kind: 'no-touch', walls: true, what: 'a wall' },
      ],
    }),
  },
  {
    id: 'i2-line-rider',
    band: 'inventors',
    title: 'Line rider',
    icon: '〰️',
    story: 'A curvy black line leads to a green finish. Your robot has a line sensor and a camera.',
    goal: 'Follow the line and stop at the green finish.',
    teach: '“Follow the line” is a whole controller: steer more the further you drift. “Until you see green” tells it when to stop.',
    kind: 'describe',
    wordChips: ['follow the line', 'until you see', 'green'],
    solution: 'follow the line until you see green, then drive 20 cm',
    parts: { head: 'camera', sensor: 'line', drive: 'wheels2' },
    parBlocks: 5,
    challenge: challenge({
      id: 'talk-i2',
      title: 'Line rider',
      mission: 'Follow the line to the green finish.',
      arena: lineTrack('talk-line'),
      criteria: [{ kind: 'stop-in-zone', zone: LINE_FINISH, label: 'the green finish' }],
    }),
  },
  {
    id: 'i3-night-shift',
    band: 'inventors',
    title: 'Night shift',
    icon: '🌙',
    story: 'Save battery: drive right through the dark cave to the exit. The light must be ON in the dark and OFF again at the end.',
    goal: 'Light on in the cave, out the other side, light off at the end.',
    teach: 'Robots don’t switch things off by themselves. If you want it off, say so.',
    kind: 'describe',
    wordChips: ['turn on the light', 'turn off the light', 'drive'],
    solution: 'turn on the light, drive 270 cm, then turn off the light',
    parts: { tool: 'light' },
    parBlocks: 3,
    challenge: challenge({
      id: 'talk-i3',
      title: 'Night shift',
      mission: 'Light on in the dark, off at the end.',
      arena: cave('talk-cave-night', CAVE_EXIT),
      criteria: [
        { kind: 'light-in-dark', offAtEnd: true },
        { kind: 'stop-in-zone', zone: CAVE_EXIT, label: 'the exit' },
      ],
    }),
  },
  {
    id: 'i4-patrol',
    band: 'inventors',
    title: 'Wall patrol',
    icon: '🔄',
    story: 'A guard robot patrols the room. It never knows where the walls are — it just reacts.',
    goal: 'Reach the check-point using a loop that checks the wall again and again.',
    teach: 'IF checks once. Put it in “forever” and it checks every time round — that is how real robots react.',
    kind: 'describe',
    wordChips: ['forever:', 'if the wall is close', 'turn right', 'otherwise', 'drive 10 cm'],
    solution: 'forever: if the wall is close turn right, otherwise drive 10 cm',
    parts: { head: 'distance', drive: 'wheels2' },
    parBlocks: 4,
    challenge: challenge({
      id: 'talk-i4',
      title: 'Wall patrol',
      mission: 'Reach the check-point.',
      arena: patrol,
      criteria: [
        { kind: 'reach-zone', zone: PATROL_GOAL, label: 'the check-point', endsRun: true },
        { kind: 'no-touch', walls: true, what: 'a wall' },
      ],
    }),
  },
  {
    id: 'i5-fix-sensor-word',
    band: 'inventors',
    title: 'Fix it: the missing sensor',
    icon: '🛡️',
    story: 'Kai’s plan says “until you hit the wall” — but this robot has no bumper, only distance eyes.',
    goal: 'Change the words so the robot uses the sensor it HAS, and stops in the green zone.',
    teach: 'Words must match the robot’s parts. “Hit” needs a bumper; “close” uses distance eyes.',
    kind: 'fix',
    starterWords: 'drive until you hit the wall, then reverse 25 cm',
    wordChips: ['close', 'hit', 'reverse'],
    solution: 'drive until the wall is 10 cm away, then reverse 15 cm',
    parts: { head: 'distance', sensor: 'none' },
    parBlocks: 4,
    challenge: challenge({
      id: 'talk-i5',
      title: 'Fix it: the missing sensor',
      mission: 'Stop in the green zone without touching.',
      arena: wallHall('talk-hall-sensor', HALL_ZONE),
      criteria: [
        { kind: 'stop-in-zone', zone: HALL_ZONE, label: 'the green zone' },
        { kind: 'no-touch', walls: true, what: 'the wall' },
      ],
    }),
  },
  {
    id: 'i6-two-colours',
    band: 'inventors',
    title: 'Blue beep, red stop',
    icon: '🎨',
    story: 'A level crossing: beep at the blue stripe to warn people, then stop on the red one.',
    goal: 'Beep on blue, stop on red.',
    teach: 'Several conditions in a row: until blue → beep → until red.',
    kind: 'describe',
    wordChips: ['until you see blue', 'beep', 'until you see red'],
    solution: 'drive until you see blue, beep, then drive until you see red',
    parts: { sensor: 'color' },
    parBlocks: 7,
    challenge: challenge({
      id: 'talk-i6',
      title: 'Blue beep, red stop',
      mission: 'Beep on blue, stop on red.',
      arena: colourRoad('talk-road-2', 'Level crossing'),
      criteria: [
        { kind: 'sounds-after-arrival', zone: STOP_ON_BLUE, steps: [{ kind: 'beep' }] },
        { kind: 'stop-in-zone', zone: STOP_ON_RED, label: 'the red stripe' },
      ],
    }),
  },

  // ── Engineers 14–17 ──────────────────────────────────────────────────────
  {
    id: 'x1-star',
    band: 'engineers',
    title: 'Five-point star',
    icon: '⭐',
    story: 'Draw the dotted star: 5 lines of 40 cm. Work out the turn angle yourself.',
    goal: 'Trace the star.',
    teach: 'Total turning for a star is 720° (two full turns), so each corner is 720 ÷ 5 = 144°. A shape is a loop.',
    kind: 'describe',
    wordChips: ['pen down', 'repeat 5 times:', 'turn left 144 degrees', 'draw a star'],
    solution: 'pen down. repeat 5 times: drive 40 cm and turn left 144 degrees. pen up',
    parts: { tool: 'pen' },
    parBlocks: 5,
    challenge: challenge({
      id: 'talk-x1',
      title: 'Five-point star',
      mission: 'Trace the dotted star.',
      arena: studio('talk-studio-star', STAR, STAR_START),
      criteria: [{ kind: 'draw-path', guide: [STAR], coverage: 0.8, tolerance: PEN_TOL }],
    }),
  },
  {
    id: 'x2-precision-park',
    band: 'engineers',
    title: 'Precision park',
    icon: '🅿️',
    story: 'The parking bay is only 12 cm deep, right in front of the wall.',
    goal: 'Stop with the robot in the narrow bay. No touching.',
    teach: 'Sensors measure from the robot’s eye, not its centre — and a moving robot keeps rolling after “stop”. Engineers measure, then adjust the number.',
    kind: 'describe',
    wordChips: ['slowly', 'until the wall is', 'cm away'],
    solution: 'drive slowly until the wall is 8 cm away',
    parts: { head: 'distance' },
    parBlocks: 3,
    challenge: challenge({
      id: 'talk-x2',
      title: 'Precision park',
      mission: 'Stop inside the narrow bay.',
      arena: wallHall('talk-bay', rect(0, 0.44, 2.4, 0.12), 'yellow'),
      criteria: [
        { kind: 'stop-in-zone', zone: rect(0, 0.44, 2.4, 0.12), label: 'the bay' },
        { kind: 'no-touch', walls: true, what: 'the wall' },
      ],
    }),
  },
  {
    id: 'x3-line-report',
    band: 'engineers',
    title: 'Line run with a report',
    icon: '📡',
    story: 'Follow the line to the finish, then report “Arrived” to mission control.',
    goal: 'Stop at the green finish and say Arrived.',
    teach: 'A plan in words can mix a controller (follow the line), a stop condition (green) and a message.',
    kind: 'describe',
    wordChips: ['follow the line', 'until you see green', 'say Arrived'],
    solution: 'follow the line until you see green, drive 20 cm, then say Arrived',
    parts: { head: 'camera', sensor: 'line', drive: 'wheels2' },
    parBlocks: 6,
    canonicalSays: ['Arrived'],
    challenge: challenge({
      id: 'talk-x3',
      title: 'Line run with a report',
      mission: 'Finish, then report.',
      arena: lineTrack('talk-line-report'),
      criteria: [
        { kind: 'stop-in-zone', zone: LINE_FINISH, label: 'the green finish' },
        { kind: 'sounds-after-arrival', zone: LINE_FINISH, steps: [{ kind: 'say', text: 'Arrived' }] },
      ],
    }),
  },
  {
    id: 'x4-fetch',
    band: 'engineers',
    title: 'Fetch and return',
    icon: '🦾',
    story: 'The parcel is far away this time. Fetch it and bring it all the way back to the green zone.',
    goal: 'Deliver the parcel to the green zone at the start.',
    teach: '“Back” is ambiguous: reverse, or forwards after a U-turn? Say what you mean.',
    kind: 'describe',
    wordChips: ['drive to the box', 'grab it', 'turn around', 'drive back', 'drop it'],
    solution: 'drive to the box, grab it, turn around, drive back 125 cm, then drop it',
    solutionAnswers: { 'back|drive back 125 cm': 'forward' },
    parts: { tool: 'gripper', head: 'distance', drive: 'wheels2' },
    parBlocks: 8,
    challenge: challenge({
      id: 'talk-x4',
      title: 'Fetch and return',
      mission: 'Deliver the parcel to the green zone.',
      arena: depot('talk-depot-far', 0.65),
      criteria: [{ kind: 'deliver', object: 'parcel', zone: DROP_ZONE, label: 'parcel' }],
    }),
  },
  {
    id: 'x5-fix-overshoot',
    band: 'engineers',
    title: 'Fix it: overshoot',
    icon: '💥',
    story: 'This plan stops “5 cm from the wall” at top speed. The robot hits the wall anyway. Why?',
    goal: 'Change the words so it stops in the green zone without touching.',
    teach: 'Momentum: at high speed the robot travels several centimetres after the sensor says stop. Slow down, or stop earlier.',
    kind: 'fix',
    starterWords: 'drive really fast until the wall is 3 cm away',
    wordChips: ['slowly', 'fast', 'cm away'],
    solution: 'drive slowly until the wall is 15 cm away',
    parts: { head: 'distance' },
    parBlocks: 3,
    challenge: challenge({
      id: 'talk-x5',
      title: 'Fix it: overshoot',
      mission: 'Stop in the green zone without touching.',
      arena: wallHall('talk-hall-fast', HALL_ZONE),
      criteria: [
        { kind: 'stop-in-zone', zone: HALL_ZONE, label: 'the green zone' },
        { kind: 'no-touch', walls: true, what: 'the wall' },
      ],
    }),
  },
  {
    id: 'x6-hexagon',
    band: 'engineers',
    title: 'Hexagon in few blocks',
    icon: '⬡',
    story: 'Trace the dotted hexagon, 25 cm per side. Two stars if your program is 5 blocks or fewer.',
    goal: 'Trace the hexagon.',
    teach: 'Six sides, six turns, 360° in total: each turn is 360 ÷ 6 = 60°. One loop beats twelve blocks.',
    kind: 'describe',
    wordChips: ['repeat 6 times:', 'drive 25 cm', 'turn left', 'degrees', 'pen down'],
    solution: 'pen down. repeat 6 times: drive 25 cm and turn left 60 degrees. pen up',
    parts: { tool: 'pen' },
    parBlocks: 5,
    challenge: challenge({
      id: 'talk-x6',
      title: 'Hexagon in few blocks',
      mission: 'Trace the dotted hexagon.',
      arena: studio('talk-studio-hex', HEX, HEX_START),
      criteria: [{ kind: 'draw-path', guide: [HEX], coverage: 0.85, tolerance: PEN_TOL }],
    }),
  },
]

/** A free-play arena: open floor with a wall, a parcel, colours and a line, for any words at all. */
export const FREE_PLAY: Challenge = challenge({
  id: 'talk-free',
  title: 'Free play',
  mission: 'Say anything and watch.',
  arena: arena('talk-playground', 'Playground', {
    size: [3, 3.6],
    regions: [
      { shape: rect(-0.8, 0.9, 0.6, 0.4), color: 'red', label: 'Red' },
      { shape: rect(0.8, 0.9, 0.6, 0.4), color: 'blue', label: 'Blue' },
      { shape: circle(0, -0.3, 0.2), color: 'yellow', label: 'Sun' },
      { shape: rect(-0.9, -0.9, 0.7, 0.7), dark: true, label: 'Dark corner' },
    ],
    walls: [{ from: [-0.5, 1.4], to: [0.5, 1.4], height: 0.4, thickness: 0.06 }],
    objects: [{ id: 'parcel', kind: 'cube', pos: [0.6, -0.2], size: 0.045, mass: 0.08, color: '#EF4444' }],
    lines: [{ width: 0.025, points: [[0.9, -1.5], [0.9, -0.6], [1.2, -0.3]] }],
    start: { pos: [0, -1.5], headingDeg: 0 },
    goal: { kind: 'reach', zone: circle(0, -0.3, 0.2) },
    timeLimit: 90,
  }),
  criteria: [],
})

export function missionsFor(band: BandId): TalkMission[] {
  return TALK_MISSIONS.filter((m) => m.band === band)
}

export function getMission(id: string): TalkMission | undefined {
  return TALK_MISSIONS.find((m) => m.id === id)
}

/** The child's robot with the mission's parts fitted (body, colours and name stay theirs). */
export function missionDesign(m: TalkMission | null, mine: RobotDesign): RobotDesign {
  return m ? { ...mine, ...m.parts } : mine
}

/** "hello!" → "Hello" when the mission listens for "Hello": the judge compares says exactly. */
export function canonicalise(p: Program, says: string[] | undefined): Program {
  if (!says || says.length === 0) return p
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const fix = (list: Stmt[]): Stmt[] =>
    list.map((s) => {
      if (s.op === 'say' && s.text.k === 'text') {
        const hit = says.find((w) => key(w) === key(s.text.k === 'text' ? s.text.v : ''))
        return hit ? { ...s, text: { k: 'text', v: hit } } : s
      }
      if (s.op === 'if') return { ...s, then: fix(s.then), ...(s.else ? { else: fix(s.else) } : {}) }
      if ('body' in s) return { ...s, body: fix(s.body) } as Stmt
      return s
    })
  return { body: fix(p.body) }
}
