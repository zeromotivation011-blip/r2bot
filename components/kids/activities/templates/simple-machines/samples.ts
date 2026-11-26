// components/kids/activities/templates/simple-machines/samples.ts
// Three reference activities (easy → hard) for the simple-machines template.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'mech-machines-ramp-for-the-box',
    title: 'A ramp for the heavy box',
    track: 'mechanics',
    band: 'explorers',
    template: 'simple-machines',
    difficulty: 1,
    intro: 'The delivery robot must get a 20 kg box onto a 1 metre high stage, but it can only push like 8 kg. Build a ramp!',
    takeaway: 'A longer, gentler ramp needs a smaller push — but you push for longer.',
    realWorld: 'Delivery robots and wheelchairs use ramps instead of steps for exactly this reason.',
    params: {
      load: { mass: 20, label: 'box', emoji: '📦' },
      height: 1,
      maxEffort: 8 * 9.81,
      machines: [{ kind: 'ramp', min: 1.5, max: 4, step: 0.5 }],
      units: 'kg',
      showMath: false,
    },
    solution: { machine: 'ramp', setting: 3 },
  },
  {
    id: 'mech-machines-pulley-or-winch',
    title: 'Pulley or winch?',
    track: 'mechanics',
    band: 'inventors',
    template: 'simple-machines',
    difficulty: 3,
    intro: 'Hoist a 60 kg crate 3 m onto the robot dock. The robot pulls 200 N at most and has 12 m of rope. Pick the machine and set it up.',
    takeaway: 'Each extra strand shares the weight, but needs more rope. Real designs balance force against distance.',
    realWorld: 'Cranes, sailing boats and theatre fly systems use multi-strand pulleys; winches use a big drum and a small motor.',
    params: {
      load: { mass: 60, label: 'crate', emoji: '📦' },
      height: 3,
      maxEffort: 200,
      maxDistance: 12,
      machines: [
        { kind: 'pulley', min: 1, max: 6, step: 1 },
        { kind: 'wheel-axle', min: 4, max: 30, step: 2 },
      ],
      pulleyEfficiency: 0.9,
      axleRadiusCm: 5,
      units: 'newtons',
      showMath: true,
    },
    // pulley 4: 588.6 / (4 × 0.9) = 163.5 N, rope 12 m.
    solution: { machine: 'pulley', setting: 4 },
  },
  {
    id: 'mech-machines-just-enough-help',
    title: 'Just enough mechanical advantage',
    track: 'mechanics',
    band: 'engineers',
    template: 'simple-machines',
    difficulty: 5,
    intro: 'A 120 kg battery pack must rise 0.8 m. The actuator gives 400 N. The ramp has friction μ = 0.15. Find the setting that works with the least actuator travel.',
    takeaway: 'More mechanical advantage always costs distance (and friction adds work), so engineers size a machine for just enough force.',
    realWorld: 'Choosing a gearbox, a lead-screw pitch or a lever ratio for a robot joint is exactly this trade-off.',
    params: {
      load: { mass: 120, label: 'battery pack', emoji: '🔋' },
      height: 0.8,
      maxEffort: 400,
      machines: [
        { kind: 'ramp', min: 1, max: 6, step: 0.25 },
        { kind: 'lever', min: 0.5, max: 3, step: 0.25 },
      ],
      rampFriction: 0.15,
      leverLoadArm: 0.5,
      goal: 'least-distance',
      units: 'newtons',
      showMath: true,
    },
    solution: { machine: 'lever', setting: 1.5 },
  },
]
