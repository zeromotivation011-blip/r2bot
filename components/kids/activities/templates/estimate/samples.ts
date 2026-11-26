// components/kids/activities/templates/estimate/samples.ts
// Three reference activities (easy → hard). validate() is empty and
// check(solution) is correct for each.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'design-estimate-vacuum-tower',
    title: 'A tower of robot vacuums',
    track: 'design',
    band: 'explorers',
    template: 'estimate',
    difficulty: 1,
    intro: 'If you stacked robot vacuums on top of each other, how many would reach the top of a door? Slide to guess, and watch the tower grow!',
    takeaway: 'You can estimate big things using small things you know. A door is about 20 robot vacuums tall!',
    params: {
      question: 'How many robot vacuums, stacked up, are as tall as a door?',
      unit: 'robot vacuums',
      min: 1,
      max: 50,
      step: 1,
      answer: 22,
      tolerance: { kind: 'percent', pct: 30 },
      picture: { icon: 'svg:vacuum', reference: '🚪 door' },
      reasoning: ['A robot vacuum is about as tall as your hand is wide: about 9 cm.', 'A door is about 2 metres tall — that is 200 cm.', '200 ÷ 9 is about 22 robot vacuums.'],
    },
    solution: { value: 20 },
  },
  {
    id: 'motion-estimate-wheel-turns',
    title: 'How many wheel turns to cross the room?',
    track: 'motion',
    band: 'builders',
    template: 'estimate',
    difficulty: 3,
    intro: 'A robot vacuum’s drive wheel is about 7 cm across. How many times does it turn to cross a 5-metre room?',
    takeaway: 'One wheel turn moves a robot one circumference: about 3 × the diameter. Robots count turns to know how far they went.',
    realWorld: 'Robots count wheel turns with sensors called encoders — this is called odometry.',
    params: {
      question: 'How many turns does a 7 cm wheel make crossing a 5 m room?',
      unit: 'turns',
      min: 1,
      max: 100,
      step: 1,
      answer: 23,
      tolerance: { kind: 'percent', pct: 25 },
      reasoning: [
        'One turn rolls the wheel’s whole edge along the floor: the circumference, π × 7 cm ≈ 22 cm.',
        '5 m is 500 cm.',
        '500 ÷ 22 ≈ 23 turns.',
      ],
    },
    solution: { value: 24 },
  },
  {
    id: 'space-estimate-mars-delay',
    title: 'Can you drive a Mars rover with a joystick?',
    track: 'space',
    band: 'engineers',
    template: 'estimate',
    difficulty: 4,
    intro: 'Estimate how long a radio command takes to reach Mars on an average day. Build it from factors: distance and the speed of light.',
    takeaway: 'Light-speed delay to Mars is minutes, not milliseconds — so rovers must drive themselves between commands. That is why space robots need autonomy.',
    realWorld: 'The one-way delay to Mars varies from about 3 to 22 minutes as the planets move; rover drivers send a whole day’s plan at once.',
    params: {
      question: 'One-way radio delay from Earth to Mars, average distance',
      unit: 'minutes',
      min: 0.5,
      max: 60,
      step: 0.1,
      log: true,
      answer: 12.5,
      tolerance: { kind: 'ratio', factor: 1.5 },
      constant: 1000 / 60,
      constantNote: '× 1 000 000 km ÷ 1 000 km/s ÷ 60 s/min',
      factors: [
        { label: 'Average Earth–Mars distance', unit: 'million km', min: 10, max: 1000, step: 1, op: 'mul', trueValue: 225, note: 'Mars swings between about 55 and 400 million km from Earth; 225 million is the average.', log: true },
        { label: 'Speed of radio waves (light)', unit: 'thousand km/s', min: 1, max: 1000, step: 1, op: 'div', trueValue: 300, note: 'Radio is light: about 300 000 km every second.', log: true },
      ],
      reasoning: [
        'Time = distance ÷ speed.',
        '225 000 000 km ÷ 300 000 km/s = 750 s.',
        '750 s ÷ 60 = 12.5 minutes one way — 25 minutes before you even see the rover react.',
      ],
    },
    solution: { value: 12.5, factors: [225, 300] },
  },
]
