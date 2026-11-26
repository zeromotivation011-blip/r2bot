// lib/kids/ai/think/senses-missions.ts
// The rooms and "find the obstacle" missions of Robot Senses.

import type { TierName } from '@/lib/kids/universe/tiers'
import type { ThinkMission } from './common'
import type { Pose, RoomObject } from './senses'

export const BASE_ROOM: RoomObject[] = [
  { id: 'sofa', name: 'Sofa (soft)', kind: 'box', x: 1.5, y: 0.45, hx: 0.95, hy: 0.32, h: 0.8, color: '#9A5B45', material: 'soft' },
  { id: 'shelf', name: 'Bookshelf', kind: 'box', x: 5.68, y: 1.0, hx: 0.25, hy: 0.6, h: 1.8, color: '#6B7A99', material: 'solid' },
  { id: 'plant', name: 'Plant pot', kind: 'cyl', x: 4.4, y: 3.7, hx: 0.22, hy: 0.22, h: 0.9, color: '#2F9E62', material: 'solid' },
  { id: 'ball', name: 'Ball', kind: 'cyl', x: 2.2, y: 3.4, hx: 0.12, hy: 0.12, h: 0.24, color: '#E5484D', material: 'solid' },
]

export const START_POSE: Pose = { x: 1.0, y: 2.6, a: 0 }

export type SensorId = 'camera' | 'depth' | 'lidar' | 'sonar' | 'line'

interface MissionBase extends ThinkMission {
  /** Objects added to the base room for this mission. */
  extra: RoomObject[]
  lights: number
  noise: number
  pose: Pose
}

export interface ChoiceMission extends MissionBase {
  type: 'choice'
  question: string
  options: { id: string; label: string }[]
  answer: string
  explain: string
}

export interface LocateMission extends MissionBase {
  type: 'locate'
  /** Possible spots for the hidden box; one is picked each attempt. */
  spots: { x: number; y: number }[]
}

export interface DistanceMission extends MissionBase {
  type: 'distance'
  tolerance: number
}

export interface LineMission extends MissionBase {
  type: 'line'
}

export type SensesMission = ChoiceMission | LocateMission | DistanceMission | LineMission

const box = (id: string, name: string, x: number, y: number, hx: number, hy: number, h: number, color: string, material: RoomObject['material'] = 'solid'): RoomObject => ({
  id,
  name,
  kind: 'box',
  x,
  y,
  hx,
  hy,
  h,
  color,
  material,
})

const SENSOR_OPTIONS = [
  { id: 'camera', label: 'Camera' },
  { id: 'depth', label: 'Depth camera' },
  { id: 'lidar', label: 'Lidar' },
  { id: 'sonar', label: 'Ultrasonic' },
]

export const MYSTERY_ID = 'mystery'

export const SENSES_MISSIONS: SensesMission[] = [
  {
    id: 'dark',
    tier: 'Cadet',
    type: 'choice',
    title: 'Lights out!',
    goal: 'The lights are off. Look at every view. Which robot eye is blind now?',
    question: 'Which sensor cannot see the box in the dark?',
    options: SENSOR_OPTIONS,
    answer: 'camera',
    explain: 'A camera needs light, like your eyes. Depth cameras, lidar and ultrasonic send out their own light or sound, so they work in the dark.',
    lesson: 'Robots that work at night use sensors that bring their own light or sound.',
    xp: 15,
    extra: [box('crate', 'Crate', 2.6, 2.6, 0.3, 0.3, 0.6, '#D9A441')],
    lights: 0.04,
    noise: 0,
    pose: START_POSE,
  },
  {
    id: 'find',
    tier: 'Cadet',
    type: 'locate',
    title: 'Find the hidden box',
    goal: 'A box is hiding in the room. It is not drawn on the map — but the lidar dots are. Tap where it is on the map.',
    lesson: 'Lidar dots trace the edges of things. A line of dots where the map shows nothing means an obstacle!',
    xp: 20,
    badges: ['map-maker'],
    extra: [],
    lights: 0.9,
    noise: 0,
    pose: START_POSE,
    spots: [
      { x: 3.4, y: 3.1 },
      { x: 3.0, y: 1.6 },
      { x: 4.7, y: 2.3 },
      { x: 2.0, y: 1.6 },
    ],
  },
  {
    id: 'howfar',
    tier: 'Pilot',
    type: 'distance',
    title: 'How far to the wall?',
    goal: 'Read the ultrasonic sensor and set the slider to how far away the thing in front is.',
    tolerance: 0.3,
    lesson: 'Ultrasonic sensors time an echo: sound goes out, bounces back, and time × speed of sound ÷ 2 = distance.',
    xp: 20,
    extra: [box('crate', 'Crate', 3.3, 2.6, 0.3, 0.45, 0.6, '#D9A441')],
    lights: 0.9,
    noise: 0.15,
    pose: START_POSE,
  },
  {
    id: 'line',
    tier: 'Pilot',
    type: 'line',
    title: 'On the tape',
    goal: 'Drive onto the black tape and line up so ONLY the middle line sensor reads dark.',
    lesson: 'Black tape reflects less infrared light. A line follower steers to keep the dark reading in the middle.',
    xp: 25,
    extra: [],
    lights: 0.9,
    noise: 0.02,
    pose: { x: 1.6, y: 3.6, a: Math.PI },
  },
  {
    id: 'glass',
    tier: 'Ace',
    type: 'choice',
    title: 'The glass door',
    goal: 'There is a glass door ahead. Compare the views. Which sensor really warns the robot?',
    question: 'Which sensor detects the glass door?',
    options: SENSOR_OPTIONS,
    answer: 'sonar',
    explain: 'Lidar and depth cameras use light, and light goes straight through clear glass. Sound bounces off it, so ultrasonic hears the door.',
    lesson: 'Robot vacuums and delivery robots often carry ultrasonic sensors just for glass and mirrors.',
    xp: 25,
    extra: [box('glass', 'Glass door', 2.8, 2.6, 0.04, 0.8, 2.1, '#9FD8F5', 'glass')],
    lights: 0.9,
    noise: 0,
    pose: START_POSE,
  },
  {
    id: 'step',
    tier: 'Ace',
    type: 'choice',
    title: 'The low step',
    goal: 'A low step (10 cm) is ahead. Which sensor misses it completely?',
    question: 'Which sensor misses the low step?',
    options: SENSOR_OPTIONS,
    answer: 'lidar',
    explain: 'This lidar scans one flat plane 20 cm above the floor. Anything lower slips underneath its beam. The cameras see it.',
    lesson: 'That is why self-driving cars use 3-D lidar with many beams, plus cameras pointed down.',
    xp: 25,
    extra: [box('step', 'Low step', 2.5, 2.6, 0.35, 0.7, 0.1, '#C97B2A')],
    lights: 0.9,
    noise: 0,
    pose: START_POSE,
  },
  {
    id: 'noisy',
    tier: 'Legend',
    type: 'locate',
    title: 'Noisy lidar',
    goal: 'This lidar is noisy. Turn on “Keep old spins” to average many scans, then tap where the hidden box is.',
    lesson: 'Averaging many noisy readings shrinks the noise — real robots fuse scans over time to build a clean map (SLAM).',
    xp: 35,
    badges: ['map-maker'],
    extra: [],
    lights: 0.9,
    noise: 0.5,
    pose: START_POSE,
    spots: [
      { x: 3.6, y: 3.3 },
      { x: 3.2, y: 1.5 },
      { x: 4.8, y: 2.6 },
    ],
  },
  {
    id: 'fusion',
    tier: 'Legend',
    type: 'choice',
    title: 'Sensor fusion',
    goal: 'Glass door, low step, lights off. One sensor is never enough. Pick the pair that sees all of it.',
    question: 'Which TWO sensors together see the glass AND the step in the dark?',
    options: [
      { id: 'cam-lidar', label: 'Camera + Lidar' },
      { id: 'depth-sonar', label: 'Depth + Ultrasonic' },
      { id: 'lidar-depth', label: 'Lidar + Depth' },
      { id: 'cam-sonar', label: 'Camera + Ultrasonic' },
    ],
    answer: 'depth-sonar',
    explain: 'The depth camera brings its own infrared light, so it sees the step in the dark. Ultrasonic hears the glass. Each covers the other’s blind spot.',
    lesson: 'Combining sensors so each covers another’s weakness is called sensor fusion. Every serious robot does it.',
    xp: 40,
    extra: [box('step', 'Low step', 2.0, 2.6, 0.25, 0.6, 0.1, '#C97B2A'), box('glass', 'Glass door', 3.2, 2.6, 0.04, 0.8, 2.1, '#9FD8F5', 'glass')],
    lights: 0.04,
    noise: 0,
    pose: START_POSE,
  },
]

export function sensesMissionsFor(tier: TierName): SensesMission[] {
  return SENSES_MISSIONS.filter((m) => m.tier === tier)
}

export function mysteryBox(spot: { x: number; y: number }): RoomObject {
  return { id: MYSTERY_ID, name: 'Hidden box', kind: 'box', x: spot.x, y: spot.y, hx: 0.25, hy: 0.25, h: 0.55, color: '#F59E0B', material: 'solid' }
}
