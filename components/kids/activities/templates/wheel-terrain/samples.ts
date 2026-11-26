// components/kids/activities/templates/wheel-terrain/samples.ts
// Three reference activities (easy → hard) for the wheel-terrain template.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'mech-terrain-beach-day',
    title: 'Which robot can cross the beach?',
    track: 'motion',
    band: 'explorers',
    template: 'wheel-terrain',
    difficulty: 1,
    intro: 'Spark wants to cross the floor and then the soft sand to the sea. Pick the robot that will not get stuck!',
    takeaway: 'Thin wheels push hard into soft ground and sink. Wide wheels or tracks spread the weight, like snowshoes.',
    realWorld: 'Beach-cleaning robots and Mars rovers have wide wheels so they float on sand instead of digging in.',
    params: {
      robotMassKg: 3,
      course: [
        { terrain: 'tile', length: 4 },
        { terrain: 'sand', length: 3 },
      ],
      allowed: ['wheels', 'tracks'],
      diameterCm: { min: 6, max: 20, step: 2 },
      presets: [
        { name: 'Zippy', emoji: '⚡', kind: 'wheels', diameterCm: 6, widthCm: 2 },
        { name: 'Chunky', emoji: '🍩', kind: 'wheels', diameterCm: 20, widthCm: 10 },
        { name: 'Tank', emoji: '🪖', kind: 'tracks', diameterCm: 8, widthCm: 6 },
      ],
      showPhysics: false,
    },
    solution: { kind: 'tracks', diameterCm: 8, widthCm: 6 },
  },
  {
    id: 'mech-terrain-kerb-climber',
    title: 'Up the kerb and onto the grass',
    track: 'motion',
    band: 'builders',
    template: 'wheel-terrain',
    difficulty: 3,
    intro: 'The delivery robot must climb a 10 cm kerb, then roll across the grass. Choose wheels or tracks and size them so it makes it.',
    takeaway: 'A wheel can only climb a step a bit lower than its radius. To climb higher, use bigger wheels — or tracks.',
    realWorld: 'Pavement delivery robots use big wheels and a rocker frame so they can mount kerbs on their own.',
    params: {
      robotMassKg: 5,
      course: [
        { terrain: 'tile', length: 3 },
        { terrain: 'grass', length: 6, stepCm: 10 },
      ],
      allowed: ['wheels', 'tracks'],
      diameterCm: { min: 4, max: 30, step: 2 },
      fixedWidthCm: 4,
      showPhysics: false,
    },
    solution: { kind: 'wheels', diameterCm: 24, widthCm: 4 },
    after: ['mech-terrain-beach-day'],
  },
  {
    id: 'mech-terrain-dune-rover',
    title: 'Size the wheels of a dune rover',
    track: 'motion',
    band: 'engineers',
    template: 'wheel-terrain',
    difficulty: 4,
    intro: 'A 40 kg rover crosses sand, climbs a 15° dune and finishes on rocks within 90 s. Its motors give 40 N·m at 30 rpm. Size the drive.',
    takeaway: 'Wheel size is a trade: bigger is faster and climbs rocks, but push = torque ÷ radius falls; wider spreads the weight so it floats on sand.',
    realWorld: 'NASA’s Curiosity uses 50 cm wheels: big enough to roll over rocks, slow enough that its motors can still climb.',
    params: {
      robotMassKg: 40,
      motorRpm: 30,
      motorTorqueNm: 40,
      timeLimitS: 90,
      course: [
        { terrain: 'sand', length: 10 },
        { terrain: 'sand', length: 6, slopeDeg: 15 },
        { terrain: 'rocks', length: 5 },
      ],
      allowed: ['wheels', 'tracks'],
      diameterCm: { min: 10, max: 60, step: 5 },
      widthCm: { min: 4, max: 30, step: 2 },
      showPhysics: true,
    },
    // 35 cm × 16 cm wheels: 8.8 kPa on 20 kPa sand, climbs 15.75 cm (rocks are 6 cm), 229 N of push for the dune, 70.7 s.
    solution: { kind: 'wheels', diameterCm: 35, widthCm: 16 },
  },
]
