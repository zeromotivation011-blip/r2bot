// components/kids/activities/templates/centre-of-mass/samples.ts
// Three reference activities (easy → hard) for the centre-of-mass template.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'mech-com-battery-up-the-ramp',
    title: 'Battery for the big ramp',
    track: 'mechanics',
    band: 'explorers',
    template: 'centre-of-mass',
    difficulty: 2,
    intro: 'Spark has to drive up a steep ramp. Where should the heavy battery go so Spark does not flip over backwards?',
    takeaway: 'Going uphill, a robot leans back. Heavy parts towards the front keep it on its wheels.',
    realWorld: 'Stair-climbing and ramp robots move their battery or lean forward so they do not tip backwards.',
    params: {
      wheelbaseCm: 20,
      chassis: { mass: 1, x: 10, h: 6 },
      items: [{ mass: 2, label: 'Battery', emoji: '🔋' }],
      deck: { fromCm: -6, toCm: 26, slots: 5, levels: [14] },
      tests: [{ slopeDeg: 35, label: 'Up the ramp' }],
      liveCom: true,
      showMath: false,
    },
    solution: { placed: [{ item: 0, slot: 3, level: 0 }] },
  },
  {
    id: 'mech-com-hill-both-ways',
    title: 'Up the hill and back down',
    track: 'mechanics',
    band: 'inventors',
    template: 'centre-of-mass',
    difficulty: 3,
    intro: 'The scout robot drives up a 32° hill and back down it. Place the battery and the camera box so it never tips — either way.',
    takeaway: 'A balance point that is LOW and near the middle survives slopes both ways. Height makes the line of gravity swing further.',
    realWorld: 'Rovers like Perseverance carry their heavy power source low between the wheels so they can climb and descend crater walls.',
    params: {
      wheelbaseCm: 24,
      chassis: { mass: 1.5, x: 12, h: 8 },
      items: [
        { mass: 3, label: 'Battery', emoji: '🔋' },
        { mass: 2, label: 'Camera box', emoji: '📷' },
      ],
      deck: { fromCm: -6, toCm: 30, slots: 7, levels: [6, 22] },
      tests: [{ slopeDeg: 32 }, { slopeDeg: -32 }],
      liveCom: false,
      showMath: true,
    },
    solution: { placed: [{ item: 0, slot: 3, level: 0 }, { item: 1, slot: 2, level: 0 }] },
    after: ['mech-com-battery-up-the-ramp'],
  },
  {
    id: 'mech-com-counterweight-the-arm',
    title: 'Counterweight a mobile manipulator',
    track: 'mechanics',
    band: 'engineers',
    template: 'centre-of-mass',
    difficulty: 5,
    intro: 'A 6 kg arm reaches out past the front wheels. The robot must survive ±25° slopes, a 0.6 g emergency stop and braking downhill, with 3 cm margin.',
    takeaway: 'Tip point = x̄ − h̄·tanθ + h̄·a/cosθ. Mobile manipulators counter a reaching arm with mass at the back, kept as low as possible.',
    realWorld: 'Forklifts and warehouse robots carry a heavy counterweight behind the rear axle for exactly this reason.',
    params: {
      wheelbaseCm: 40,
      chassis: { mass: 6, x: 20, h: 12 },
      fixed: [{ mass: 6, label: 'Arm', emoji: '🦾', x: 50, h: 55 }],
      items: [
        { mass: 5, label: 'Battery', emoji: '🔋' },
        { mass: 3, label: 'Counterweight', emoji: '🧱' },
        { mass: 1, label: 'Computer', emoji: '💻' },
      ],
      deck: { fromCm: -10, toCm: 50, slots: 9, levels: [6, 18, 32] },
      tests: [{ slopeDeg: 25 }, { slopeDeg: -25 }, { slopeDeg: 0, brakeG: 0.6, label: 'Emergency stop' }, { slopeDeg: -12, brakeG: 0.4, label: 'Braking downhill' }],
      minMarginCm: 3,
      liveCom: false,
      showMath: true,
    },
    solution: {
      placed: [
        { item: 0, slot: 0, level: 0 },
        { item: 1, slot: 0, level: 1 },
        { item: 2, slot: 0, level: 2 },
      ],
    },
  },
]
