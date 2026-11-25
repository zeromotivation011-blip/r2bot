// components/kids/activities/templates/lever-balance/samples.ts
// Three reference activities (easy → hard) for the lever-balance template.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'mech-lever-seesaw-friends',
    title: 'See-saw for two robots',
    track: 'mechanics',
    band: 'explorers',
    template: 'lever-balance',
    difficulty: 1,
    intro: 'Big Bolt sits on the see-saw. Little Spark is lighter. Where should Spark sit so the see-saw is level?',
    takeaway: 'A lighter one can balance a heavier one by sitting further from the middle.',
    realWorld: 'Cranes carry a heavy block at the back so they don’t tip over when they lift.',
    params: {
      beamLength: 8,
      fulcrum: 4,
      fulcrumMovable: false,
      fixed: [{ pos: 2, mass: 4, label: 'Bolt', emoji: '🤖' }],
      tray: [{ mass: 2, label: 'Spark', emoji: '🔶' }],
      goal: 'balance',
      liveTilt: true,
      showMoments: false,
    },
    solution: { fulcrum: 4, placed: [{ item: 0, pos: 8 }] },
  },
  {
    id: 'mech-lever-crowbar-rock',
    title: 'Move the pivot, lift the rock',
    track: 'mechanics',
    band: 'builders',
    template: 'lever-balance',
    difficulty: 3,
    intro: 'The rover can only push down with 3 kg. The rock weighs 15 kg. Slide the pivot and place the rover’s push to lift it.',
    takeaway: 'Moving the pivot closer to the load gives you a longer lever on your side, so a small push lifts a big load.',
    realWorld: 'Crowbars, bottle openers and the excavator arms on Mars rovers all use this trick.',
    params: {
      beamLength: 12,
      fulcrum: 6,
      fulcrumMovable: true,
      fixed: [{ pos: 0, mass: 15, label: 'Rock', emoji: '🪨' }],
      tray: [{ mass: 3, label: 'Rover push', emoji: '🚙' }],
      goal: 'lift',
      liftIndex: 0,
      mustUseAll: true,
      liveTilt: true,
      showMoments: true,
    },
    solution: { fulcrum: 2, placed: [{ item: 0, pos: 12 }] },
    after: ['mech-lever-seesaw-friends'],
  },
  {
    id: 'mech-lever-arm-counterweight',
    title: 'Counterweight a heavy robot arm',
    track: 'mechanics',
    band: 'engineers',
    template: 'lever-balance',
    difficulty: 4,
    intro: 'A 2 kg arm beam carries a 3 kg gripper at its tip. Use exactly three counterweights so the shoulder motor holds it level with zero effort. The beam’s own weight counts.',
    takeaway: 'Counterweights cancel the moment at a joint, so the motor only has to move the arm, not hold it up. The beam’s own weight acts at its middle.',
    realWorld: 'Industrial arms and tower cranes use counterweights so their motors and brakes carry far less load.',
    params: {
      beamLength: 16,
      fulcrum: 6,
      fulcrumMovable: false,
      beamMass: 2,
      fixed: [{ pos: 16, mass: 3, label: 'Gripper', emoji: '🦾' }],
      tray: [
        { mass: 4, label: 'Battery', emoji: '🔋' },
        { mass: 2.5, label: 'Plate', emoji: '⬛' },
        { mass: 1, label: 'Block', emoji: '🧱' },
        { mass: 5, label: 'Motor', emoji: '⚙️' },
      ],
      goal: 'balance',
      tolerance: 0,
      liveTilt: false,
      showMoments: true,
    },
    // right: 3×10 + 2×(8−6)=34. Left: 5×5 + 4×2 + 1×1 = 34.
    solution: {
      fulcrum: 6,
      placed: [
        { item: 3, pos: 1 },
        { item: 0, pos: 4 },
        { item: 2, pos: 5 },
      ],
    },
  },
]
