// lib/kids/universe/worlds.ts
// The map of the R2BOT Universe: the four course "planets" (one per age band /
// curriculum level) and the game "zones" around them. The hub, the routes, the
// sitemap and the classroom all read this list — add a game here or it does
// not exist.
//
// Pure data. Safe on server and client.
//
// GAMES holds every game with a built, QA'd page under app/kids/play/<id>: the
// eight original Universe games (the map's moons) and, since 26 Nov 2026, the
// seven world flagship games (the map's Worlds belt; see WORLDS below).

import type { BandId } from '../bands'

export interface Planet {
  id: string
  level: 1 | 2 | 3 | 4
  band: BandId
  name: string
  tagline: string
  /** Tailwind gradient for the planet sphere. */
  gradient: string
  emoji: string
}

export const PLANETS: Planet[] = [
  { id: 'spark', level: 1, band: 'explorers', name: 'Planet Spark', tagline: 'Rebuild Spark, part by part.', gradient: 'from-amber-300 via-orange-500 to-rose-600', emoji: '🌱' },
  { id: 'gearon', level: 2, band: 'builders', name: 'Gearon', tagline: 'Build machines that work for people.', gradient: 'from-sky-300 via-blue-500 to-indigo-700', emoji: '🔧' },
  { id: 'nova', level: 3, band: 'inventors', name: 'Nova Prime', tagline: 'Robots that sense and decide.', gradient: 'from-fuchsia-300 via-violet-500 to-purple-800', emoji: '💡' },
  { id: 'apex', level: 4, band: 'engineers', name: 'Apex Station', tagline: 'Autonomy, control and real engineering.', gradient: 'from-orange-300 via-red-500 to-rose-800', emoji: '🚀' },
]

export type SkillTag =
  | 'motion'
  | 'sensors'
  | 'logic'
  | 'loops'
  | 'control'
  | 'pid'
  | 'kinematics'
  | 'electronics'
  | 'ai'
  | 'mapping'
  | 'planning'
  | 'swarm'
  | 'design'
  | 'physics'

export interface UniverseGame {
  /** URL segment: /kids/play/<id> */
  id: string
  name: string
  zone: string
  emoji: string
  /** One line a child understands. */
  hook: string
  /** What it really teaches, for parents/teachers. */
  teaches: string
  skills: SkillTag[]
  /** Youngest band it is designed for; every game scales difficulty with tiers. */
  minBand: BandId
  /** Difficulty tiers inside the game (e.g. 'Cadet', 'Pilot', 'Ace', 'Legend'). */
  tiers: number
  /** Tailwind gradient for the card. */
  gradient: string
}

export const GAMES: UniverseGame[] = [
  {
    id: 'sumo-arena',
    name: 'Robo Sumo Arena',
    zone: 'Push Lab',
    emoji: '🏟️',
    hook: 'Program your robot to grip the floor and push a rival bot out of the ring — traction and pushing force, with real physics.',
    teaches: 'Sensing an opponent, state machines (search → charge → recover), traction, mass and momentum.',
    skills: ['physics', 'sensors', 'logic', 'design'],
    minBand: 'builders',
    tiers: 4,
    gradient: 'from-rose-500 to-orange-600',
  },
  {
    id: 'drone-hover',
    name: 'Sky Port: Drone Pilot',
    zone: 'Sky Port',
    emoji: '🚁',
    hook: 'Keep a drone steady through wind gusts by tuning its brain.',
    teaches: 'Feedback control: P, I and D terms, overshoot, steady-state error, disturbance rejection.',
    skills: ['control', 'pid', 'physics'],
    minBand: 'inventors',
    tiers: 4,
    gradient: 'from-sky-400 to-cyan-600',
  },
  {
    id: 'arm-factory',
    name: 'Arm Factory',
    zone: 'Mega Factory',
    emoji: '🦾',
    hook: 'Control a 3-joint robot arm to sort parts on a moving conveyor.',
    teaches: 'Joints and links, forward and inverse kinematics, reach and workspace, sequencing pick-and-place.',
    skills: ['kinematics', 'planning', 'motion'],
    minBand: 'builders',
    tiers: 4,
    gradient: 'from-amber-400 to-yellow-600',
  },
  {
    id: 'circuit-city',
    name: 'Circuit City',
    zone: 'Circuit City',
    emoji: '💡',
    hook: 'Wire batteries, switches, LEDs and motors to power up the city.',
    teaches: "Complete circuits, series vs parallel, Ohm's law (V = I × R), current limits, short circuits, sensors as switches.",
    skills: ['electronics', 'logic'],
    minBand: 'explorers',
    tiers: 4,
    gradient: 'from-lime-400 to-emerald-600',
  },
  {
    id: 'mars-rover',
    name: 'Mars Rover Command',
    zone: 'Mars Base',
    emoji: '🔴',
    hook: 'Drive a rover on Mars — but every command takes minutes to arrive.',
    teaches: 'Planning under latency, dead reckoning vs sensing, hazard avoidance, why rovers need autonomy.',
    skills: ['planning', 'sensors', 'ai'],
    minBand: 'inventors',
    tiers: 4,
    gradient: 'from-orange-600 to-red-800',
  },
  {
    id: 'robot-brain',
    name: 'Train the Robot Brain',
    zone: 'AI Academy',
    emoji: '🧠',
    hook: 'Teach a robot to recognise your drawings — then watch it act on what it sees.',
    teaches: 'Machine learning by examples: training data, features, nearest-neighbour classification, bias from bad data, confidence.',
    skills: ['ai'],
    minBand: 'builders',
    tiers: 4,
    gradient: 'from-violet-500 to-fuchsia-700',
  },
  {
    id: 'maze-mapper',
    name: 'Maze Mapper',
    zone: 'The Labyrinth',
    emoji: '🗺️',
    hook: 'Your robot wakes up in an unknown maze. Make it map the maze and escape.',
    teaches: 'Exploration strategies (wall-following, frontier search), occupancy grids, sensor noise, path planning (BFS/A*).',
    skills: ['mapping', 'planning', 'ai', 'sensors'],
    minBand: 'inventors',
    tiers: 4,
    gradient: 'from-teal-400 to-emerald-700',
  },
  {
    id: 'swarm-reef',
    name: 'Swarm Reef',
    zone: 'Swarm Reef',
    emoji: '🐝',
    hook: 'Command 40 tiny robots with just three rules — and make them move as one.',
    teaches: 'Emergent behaviour: separation, alignment, cohesion; decentralised control; how drone light shows and warehouse fleets coordinate.',
    skills: ['swarm', 'ai', 'logic'],
    minBand: 'builders',
    tiers: 4,
    gradient: 'from-indigo-500 to-blue-800',
  },
  // ── World flagship games (26 Nov 2026: one per world in WORLDS below; each page built and QA'd) ──
  { id: 'safety-inspector', name: 'Robot Safety Inspector', zone: 'Robot Guardians HQ', emoji: '🛡️', hook: 'Inspect robots in a factory, a home, a street and a hospital — find every danger before it hurts someone.', teaches: 'The Robot Harm Check: physical safety (pinch points, speed near people, emergency stops), data and privacy, fairness and bias, human control, effects on people, and the planet.', skills: ['design', 'sensors', 'logic'], minBand: 'builders', tiers: 4, gradient: 'from-emerald-400 to-teal-700' },
  { id: 'ocean-rescue', name: 'Deep Sea Rescue', zone: 'Ocean Lab', emoji: '🌊', hook: 'Pilot an underwater robot through currents and darkness to rescue a lost sensor buoy.', teaches: 'Buoyancy, pressure with depth, sonar ranging (speed of sound in water), tethered vs autonomous vehicles, navigating without GPS.', skills: ['physics', 'sensors', 'control'], minBand: 'explorers', tiers: 4, gradient: 'from-cyan-500 to-blue-900' },
  { id: 'bio-bots', name: 'Robo Zoo: Bio-Bot Lab', zone: 'Robo Zoo', emoji: '🦎', hook: 'Copy nature’s tricks — gecko feet, snake slither, bird flapping — to build robots that move like animals.', teaches: 'Biomimicry: gait and stability (support polygons), friction and adhesion, legged vs wheeled locomotion, lift, and energy efficiency (cost of transport).', skills: ['design', 'motion', 'physics'], minBand: 'explorers', tiers: 4, gradient: 'from-lime-400 to-green-800' },
  { id: 'robot-surgeon', name: 'Robot Hospital', zone: 'Robot Hospital', emoji: '🏥', hook: 'Drive a delivery robot through the wards, steady a surgical robot’s tool and tune a bionic hand that reads muscle signals.', teaches: 'Precision and motion scaling, tremor filtering, prosthetic hands controlled by muscle signals (EMG), force limits and safety interlocks in medical robots.', skills: ['control', 'kinematics', 'sensors'], minBand: 'builders', tiers: 4, gradient: 'from-rose-300 to-red-700' },
  { id: 'smart-farm', name: 'Smart Farm', zone: 'Smart Farm', emoji: '🚜', hook: 'Run a farm with drones, picking robots and soil sensors — grow more food with less water.', teaches: 'Sensor-driven decisions (moisture, colour ripeness), drone coverage paths, robotic picking with vision, trade-offs between yield, water and energy.', skills: ['sensors', 'ai', 'planning'], minBand: 'explorers', tiers: 4, gradient: 'from-yellow-400 to-green-700' },
  { id: 'robot-city', name: 'Robot City', zone: 'Robot City', emoji: '🏙️', hook: 'Keep a city of self-driving cars, delivery robots and smart traffic lights moving — safely.', teaches: 'Perception and right-of-way rules, traffic signal timing, multi-robot coordination, safe stopping distances, why autonomous vehicles must handle the unexpected.', skills: ['ai', 'control', 'planning'], minBand: 'builders', tiers: 4, gradient: 'from-sky-400 to-indigo-800' },
  { id: 'orbit-repair', name: 'Orbit Repair Crew', zone: 'Space Station', emoji: '🛰️', hook: 'Use a space station’s robot arm to catch a supply ship and repair a satellite in zero gravity.', teaches: 'Motion without friction (Newton’s first law), momentum and reaction, slow precise approaches, robotic arm grappling, teleoperation with delay.', skills: ['physics', 'kinematics', 'control'], minBand: 'builders', tiers: 4, gradient: 'from-slate-300 to-indigo-900' },
]

export function getGame(id: string): UniverseGame | undefined {
  return GAMES.find((g) => g.id === id)
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']

/** "fifteen" for 15 — so copy that counts games or worlds never goes stale. Digits above twenty. */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n)
}

export function getPlanet(level: number): Planet | undefined {
  return PLANETS.find((p) => p.level === level)
}

// ── Worlds ──────────────────────────────────────────────────────────────────
// Themed places in the Universe. Each world has its own page (/kids/worlds/<id>),
// a flagship game in GAMES and a set of Skill Galaxy activities tagged with
// `world: <id>` (lib/kids/activities/content/zones/<id>.ts).

export type WorldId = 'guardians' | 'ocean' | 'zoo' | 'hospital' | 'farm' | 'city' | 'station'

export interface UniverseWorld {
  id: WorldId
  name: string
  emoji: string
  tagline: string
  /** For parents/teachers: what this world teaches. */
  teaches: string
  gradient: string
  /** Flagship game id in GAMES. */
  game: string
}

export const WORLDS: UniverseWorld[] = [
  { id: 'guardians', name: 'Robot Guardians', emoji: '🛡️', tagline: 'Keep robots safe, fair and kind.', teaches: 'How to spot and prevent harm from robots with the six-question Robot Harm Check: body, data, fairness, control, people and planet.', gradient: 'from-emerald-400 to-teal-700', game: 'safety-inspector' },
  { id: 'ocean', name: 'Ocean Lab', emoji: '🌊', tagline: 'Dive with robots into the deep sea.', teaches: 'Underwater robots: buoyancy, pressure, sonar, tethers and autonomy.', gradient: 'from-cyan-500 to-blue-900', game: 'ocean-rescue' },
  { id: 'zoo', name: 'Robo Zoo', emoji: '🦎', tagline: 'Robots that learned from animals.', teaches: 'Biomimicry: how gecko feet, snakes, insects and birds inspire robot design.', gradient: 'from-lime-400 to-green-800', game: 'bio-bots' },
  { id: 'hospital', name: 'Robot Hospital', emoji: '🏥', tagline: 'Robots that help doctors and patients.', teaches: 'Surgical robots, prosthetic limbs, care and delivery robots, and medical safety.', gradient: 'from-rose-300 to-red-700', game: 'robot-surgeon' },
  { id: 'farm', name: 'Smart Farm', emoji: '🚜', tagline: 'Grow food with drones and sensors.', teaches: 'Agricultural robots: soil and crop sensors, drones, picking robots, saving water.', gradient: 'from-yellow-400 to-green-700', game: 'smart-farm' },
  { id: 'city', name: 'Robot City', emoji: '🏙️', tagline: 'Self-driving cars and smart streets.', teaches: 'Autonomous vehicles, traffic systems, delivery robots and safe multi-robot cities.', gradient: 'from-sky-400 to-indigo-800', game: 'robot-city' },
  { id: 'station', name: 'Space Station', emoji: '🛰️', tagline: 'Robot arms working in orbit.', teaches: 'Space robotics: zero-gravity motion, robotic arms, satellite servicing, teleoperation.', gradient: 'from-slate-300 to-indigo-900', game: 'orbit-repair' },
]

export function getWorld(id: string): UniverseWorld | undefined {
  return WORLDS.find((w) => w.id === id)
}

/** Ids of the games that are a world's flagship (shown on the map's Worlds belt, not as moons). */
export const WORLD_GAME_IDS: ReadonlySet<string> = new Set(WORLDS.map((w) => w.game))

/** The world a game belongs to, if it is a world's flagship game. */
export function worldForGame(gameId: string): UniverseWorld | undefined {
  return WORLDS.find((w) => w.game === gameId)
}
