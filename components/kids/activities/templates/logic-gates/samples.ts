import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'sample-logic-gates-vacuum-start',
    title: 'Start the robot vacuum',
    track: 'electronics',
    band: 'builders',
    template: 'logic-gates',
    difficulty: 1,
    intro: 'The robot vacuum must only start when you press Start AND its dust bin is clipped in. Pick the gate that makes that rule.',
    takeaway: 'An AND gate is ON only when both of its inputs are ON. Robots use it for safety rules: everything must be ready.',
    realWorld: 'Robot vacuums refuse to run with the dust bin removed — a sensor and a simple AND rule stop dust going everywhere.',
    params: {
      inputs: [
        { id: 'A', label: 'Start pressed', kind: 'button' },
        { id: 'B', label: 'Bin clipped in', kind: 'switch' },
      ],
      gates: [{ id: 'g1', inputs: ['A', 'B'] }],
      outputs: [{ id: 'motor', label: 'Vacuum motor', kind: 'motor', from: 'g1', target: 'A AND B' }],
      palette: ['AND', 'OR'],
      notation: 'words',
      story: 'Rule: the vacuum motor runs only when Start is pressed and the bin is in place.',
    },
    solution: { gates: { g1: { type: 'AND' } } },
  },
  {
    id: 'sample-logic-gates-arm-safety',
    title: 'The safety curtain',
    track: 'electronics',
    band: 'inventors',
    template: 'logic-gates',
    difficulty: 3,
    intro: 'A factory arm may move when a worker presses Go OR the computer sends a command — but NEVER while someone breaks the light curtain. Build its safety circuit.',
    takeaway: 'Combining gates builds rules: (Go OR Command) AND NOT Curtain. Safety signals always get the final say.',
    realWorld: 'Industrial robot cells use light curtains: if a beam is broken, safety circuits cut power to the arm within milliseconds.',
    params: {
      inputs: [
        { id: 'A', label: 'Go button', kind: 'button' },
        { id: 'B', label: 'Computer command', kind: 'sensor' },
        { id: 'C', label: 'Curtain broken', kind: 'light' },
      ],
      gates: [
        { id: 'g1', inputs: ['A', 'B'] },
        { id: 'g2', inputs: ['C'] },
        { id: 'g3', inputs: ['g1', 'g2'] },
      ],
      outputs: [{ id: 'arm', label: 'Arm motor', kind: 'motor', from: 'g3', target: '(A OR B) AND NOT C' }],
      palette: ['AND', 'OR', 'NOT', 'XOR'],
      showTable: 'after-check',
      story: 'The arm moves if Go is pressed or the computer commands it — but never while the light curtain is broken.',
    },
    solution: { gates: { g1: { type: 'OR' }, g2: { type: 'NOT' }, g3: { type: 'AND' } } },
  },
  {
    id: 'sample-logic-gates-nand-xor',
    title: 'XOR from NAND only',
    track: 'electronics',
    band: 'engineers',
    template: 'logic-gates',
    difficulty: 5,
    intro: 'Chip makers can build ANY logic from NAND gates alone. Wire four NAND gates so the output is A XOR B — the heart of a robot’s adder and parity checker.',
    takeaway: 'NAND is a universal gate: every other gate, and so every computer, can be built from NAND gates alone.',
    realWorld: 'Microcontrollers in robots are built from billions of transistors arranged mostly as NAND and NOR gates.',
    params: {
      inputs: [
        { id: 'A', label: 'Bit A', kind: 'sensor' },
        { id: 'B', label: 'Bit B', kind: 'sensor' },
      ],
      gates: [
        { id: 'g1', inputs: ['A', 'B'], col: 1 },
        { id: 'g2', inputs: ['A', 'B'], col: 2 },
        { id: 'g3', inputs: ['A', 'B'], col: 2 },
        { id: 'g4', inputs: ['A', 'B'], col: 3 },
      ],
      outputs: [{ id: 'x', label: 'A XOR B', kind: 'led', from: 'g4', target: 'A XOR B' }],
      palette: ['NAND'],
      wiring: 'choose',
      notation: 'bits',
    },
    solution: {
      gates: {
        g1: { type: 'NAND', inputs: ['A', 'B'] },
        g2: { type: 'NAND', inputs: ['A', 'g1'] },
        g3: { type: 'NAND', inputs: ['B', 'g1'] },
        g4: { type: 'NAND', inputs: ['g2', 'g3'] },
      },
    },
  },
]
