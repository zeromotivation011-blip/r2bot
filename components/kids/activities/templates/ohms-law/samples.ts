// components/kids/activities/templates/ohms-law/samples.ts
// Three reference activities (easy → hard). validate() is empty and
// check(solution) is correct for each.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'elec-ohm-safe-red-led',
    title: 'Keep Spark’s eye light safe',
    track: 'electronics',
    band: 'explorers',
    template: 'ohms-law',
    difficulty: 2,
    intro: 'Spark’s red eye light needs a resistor. Too small and the light pops; too big and it stays dark. Try each resistor and watch the meter!',
    takeaway: 'A resistor holds back electricity. A bigger resistor lets less through — just enough keeps an LED bright and safe.',
    realWorld: 'Every LED on a robot, a phone or a toy has a little resistor next to it doing exactly this job.',
    params: {
      mode: 'tune',
      battery: { fixed: 5 },
      resistor: { choices: [10, 150, 10000] },
      led: { colour: 'red' },
      target: { currentMa: { min: 5, max: 25 } },
      liveMeter: true,
      showFormula: false,
    },
    solution: { ohms: 150 },
    badges: ['ohms-friend'],
  },
  {
    id: 'elec-ohm-blue-led-e12',
    title: 'Pick a real resistor for a blue LED',
    track: 'electronics',
    band: 'inventors',
    template: 'ohms-law',
    difficulty: 3,
    intro: 'A 9 V battery must light a blue status LED at 10–20 mA. Choose a standard E12 resistor — the meter only shows after you test.',
    takeaway: 'Resistor = (battery voltage − LED voltage) ÷ current. Then round to a standard value that keeps the current in range.',
    realWorld: 'Electronics engineers do this sum for every indicator LED on a circuit board, then pick the nearest standard value.',
    params: {
      mode: 'tune',
      battery: { fixed: 9 },
      resistor: { e12: { min: 47, max: 2200 } },
      led: { colour: 'blue' },
      target: { currentMa: { min: 10, max: 20 } },
      liveMeter: false,
      showFormula: true,
    },
    solution: { ohms: 390 },
    badges: ['ohms-friend'],
  },
  {
    id: 'elec-ohm-predict-current',
    title: 'Predict the current before you measure',
    track: 'electronics',
    band: 'engineers',
    template: 'ohms-law',
    difficulty: 4,
    intro: 'A 9 V battery, a 680 Ω resistor and a green LED (Vf ≈ 2.2 V). Work out the current in milliamps, then let the meter prove you right.',
    takeaway: 'Subtract the LED’s forward voltage first: I = (V − Vf) ÷ R. Forgetting Vf is the most common LED mistake.',
    realWorld: 'Engineers predict currents before power-on so a mistake shows up on paper, not as smoke.',
    params: {
      mode: 'predict',
      battery: { fixed: 9 },
      resistor: { fixed: 680 },
      led: { colour: 'green' },
      ask: { quantity: 'I', tolerancePct: 5 },
      showFormula: false,
    },
    solution: { value: 10 },
  },
]
