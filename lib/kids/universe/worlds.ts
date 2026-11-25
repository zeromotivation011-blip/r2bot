// lib/kids/universe/worlds.ts
// The map of the R2BOT Universe: the four course "planets" (one per age band /
// curriculum level) and the game "zones" around them. The hub, the routes, the
// sitemap and the classroom all read this list — add a game here or it does
// not exist.
//
// Pure data. Safe on server and client.

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
    zone: 'Battle Dome',
    emoji: '🥊',
    hook: 'Program your robot to push rival bots out of the ring — with real physics.',
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
]

export function getGame(id: string): UniverseGame | undefined {
  return GAMES.find((g) => g.id === id)
}

export function getPlanet(level: number): Planet | undefined {
  return PLANETS.find((p) => p.level === level)
}
