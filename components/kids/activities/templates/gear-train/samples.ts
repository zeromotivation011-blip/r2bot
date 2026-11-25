// components/kids/activities/templates/gear-train/samples.ts
// Three reference activities (easy → hard) that show content authors the range
// of the Params. lib/kids/activities/verify.ts-style check: validate() is empty
// and check(solution) is correct for each.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'mech-gears-slow-the-wheel',
    title: 'Slow down the wheel',
    track: 'mechanics',
    band: 'explorers',
    template: 'gear-train',
    difficulty: 1,
    intro: 'Spark’s motor spins the wheel so fast it skids! Put a gear on the wheel that makes it turn slower.',
    takeaway: 'A small gear turning a big gear makes the big one turn slower — and push harder.',
    realWorld: 'Toy cars, robot vacuums and bikes all use gears to pick between fast and strong.',
    params: {
      mode: 'chain',
      motorRpm: 60,
      inventory: [10, 20, 40],
      motorGear: 10,
      maxGears: 2,
      target: { rpm: { max: 20 } },
      output: 'wheel',
      showMath: false,
      liveReadout: true,
    },
    solution: { gears: [10, 40] },
    badges: ['gear-head'],
  },
  {
    id: 'mech-gears-idler-flip',
    title: 'Same speed, other way round',
    track: 'mechanics',
    band: 'builders',
    template: 'gear-train',
    difficulty: 3,
    intro: 'The winch must wind the rope at exactly the motor’s speed — but the same way the motor turns. Two gears won’t do it. Can you?',
    takeaway: 'Every pair of meshing gears flips direction. An idler gear in the middle flips it back without changing the speed.',
    realWorld: 'Idler gears reverse the drive in printers, car gearboxes and robot grippers.',
    params: {
      mode: 'chain',
      motorRpm: 30,
      inventory: [12, 16, 24],
      maxGears: 4,
      target: { rpm: { min: 30, max: 30 }, direction: 'same' },
      output: 'winch',
      showMath: true,
      liveReadout: true,
    },
    solution: { gears: [12, 24, 12] },
    after: ['mech-gears-slow-the-wheel'],
  },
  {
    id: 'mech-gears-gearbox-for-a-lift',
    title: 'Design a gearbox for the lift arm',
    track: 'mechanics',
    band: 'engineers',
    template: 'gear-train',
    difficulty: 4,
    intro: 'A 6,000 rpm motor gives only 1.2 N·cm. The arm needs 60–90 rpm and at least 70 N·cm. Real gears lose 5% per mesh. Design a compound gearbox.',
    takeaway: 'Compound stages multiply ratios; every mesh costs a few percent of torque, so engineers use as few stages as the ratio allows.',
    realWorld: 'Servo motors hide a 4–5 stage compound gearbox behind the output horn.',
    params: {
      mode: 'compound',
      motorRpm: 6000,
      motorTorque: 1.2,
      inventory: [8, 10, 12, 30, 40, 50],
      maxGears: 6,
      efficiencyPerMesh: 0.95,
      target: { rpm: { min: 60, max: 90 }, torque: { min: 70 } },
      output: 'arm',
      showMath: true,
      liveReadout: false,
    },
    // 6000 × 8/50 × 8/50 × 12/30 = 61.4 rpm; torque 1.2 ÷ 0.01024 × 0.95³ ≈ 100 N·cm. Two stages cannot get slow enough.
    solution: { gears: [8, 50, 8, 50, 12, 30] },
    badges: ['gear-head'],
  },
]
