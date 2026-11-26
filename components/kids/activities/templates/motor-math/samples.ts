// components/kids/activities/templates/motor-math/samples.ts
// Three reference activities (easy → hard) for the motor-math template.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'motion-wheel-turns-to-the-dock',
    title: 'How many wheel turns to the dock?',
    track: 'motion',
    band: 'explorers',
    template: 'motor-math',
    difficulty: 2,
    intro: 'Spark is tired! Its charging dock is about one metre away. Choose how many times the wheels turn so Spark stops right on the dock.',
    takeaway: 'Every time a wheel turns once, the robot rolls the length of the wheel’s edge. Count the turns to know how far it went.',
    realWorld: 'Robot vacuums count their wheel turns to know how far they have cleaned and how to get back to their dock.',
    params: {
      command: 'ticks',
      ticksPerRev: 1,
      knobs: { ticks: { min: 1, max: 8, step: 1 } },
      fixed: { rpm: 60, diameterCm: 10 },
      target: { distanceCm: { min: 88, max: 100 } },
      goal: 'Charging dock 🔌',
      liveReadout: true,
      showMath: false,
    },
    solution: { ticks: 3 },
    badges: ['precise-parker'],
  },
  {
    id: 'motion-delivery-in-three-seconds',
    title: 'Deliver the cup in 3 seconds',
    track: 'motion',
    band: 'builders',
    template: 'motor-math',
    difficulty: 3,
    intro: 'The café robot must carry a cup 150 cm to the table in no more than 3 seconds. Its motor runs at 120 rpm. Pick the wheel size and the run time.',
    takeaway: 'Speed = wheel edge length × turns per second. Bigger wheels go further every turn, so the same motor drives faster.',
    realWorld: 'Restaurant delivery robots are set to a safe speed by choosing their wheel size and motor speed together.',
    params: {
      command: 'time',
      knobs: { diameterCm: { min: 4, max: 12, step: 2 }, timeS: { min: 0.5, max: 6, step: 0.5 } },
      fixed: { rpm: 120 },
      target: { distanceCm: { min: 145, max: 155 }, timeS: { max: 3 } },
      goal: 'Table ☕',
      liveReadout: true,
      showMath: true,
    },
    solution: { diameterCm: 8, timeS: 3 },
    after: ['motion-wheel-turns-to-the-dock'],
  },
  {
    id: 'motion-encoder-odometry-with-slip',
    title: 'Encoder odometry with wheel slip',
    track: 'motion',
    band: 'engineers',
    template: 'motor-math',
    difficulty: 4,
    intro: 'A 6.5 cm wheel, a 360-tick encoder and 5% slip on dusty floor. Command ticks and rpm so the rover stops 118–122 cm away in 3.5–4.5 s.',
    takeaway: 'Odometry: distance = ticks ÷ ticks-per-rev × π·d. Slip makes it under-read reality, so robots fuse it with other sensors.',
    realWorld: 'Mars rovers compare wheel odometry with camera-based visual odometry because their wheels slip in sand.',
    params: {
      command: 'ticks',
      ticksPerRev: 360,
      knobs: { ticks: { min: 500, max: 2500, step: 25 }, rpm: { min: 30, max: 150, step: 10 } },
      fixed: { diameterCm: 6.5 },
      slip: 0.05,
      target: { distanceCm: { min: 118, max: 122 }, timeS: { min: 3.5, max: 4.5 } },
      goal: 'Sample site 🪨',
      liveReadout: false,
      showMath: true,
      showCode: true,
    },
    // 2225 ticks ÷ 360 = 6.18 turns × 20.42 cm = 126.2 cm × 0.95 = 119.9 cm; at 90 rpm that takes 4.1 s.
    solution: { ticks: 2225, rpm: 90 },
  },
]
