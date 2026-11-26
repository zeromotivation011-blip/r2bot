import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'sample-sequence-path-dock',
    title: 'Drive to the dock',
    track: 'code',
    band: 'explorers',
    template: 'sequence-path',
    difficulty: 1,
    intro: 'The warehouse robot is tired! Give it steps to drive to its charging dock. It can go forward and turn.',
    takeaway: 'A program is a list of steps the robot follows exactly, one after another.',
    realWorld: 'Warehouse robots follow planned routes between shelves and drive themselves to a charger when their battery is low.',
    params: {
      world: { cols: 4, rows: 4, start: { at: [0, 3], dir: 'N' }, goal: [2, 1] },
      palette: ['forward', 'left', 'right'],
      showHintPath: true,
      theme: 'warehouse',
    },
    solution: { program: [{ op: 'forward' }, { op: 'forward' }, { op: 'right' }, { op: 'forward' }, { op: 'forward' }] },
  },
  {
    id: 'sample-sequence-path-samples-loop',
    title: 'Rock samples in a row',
    track: 'code',
    band: 'builders',
    template: 'sequence-path',
    difficulty: 3,
    intro: 'The rover must collect three rock samples on a zig-zag ridge, then park at base. Its memory only fits 6 blocks — spot the pattern!',
    takeaway: 'When steps repeat, a loop says them once and runs them many times — shorter programs, fewer mistakes.',
    realWorld: 'NASA’s Perseverance rover drives using command sequences sent from Earth, packed tightly because data and time are precious.',
    params: {
      world: {
        cols: 6,
        rows: 6,
        start: { at: [0, 5], dir: 'N' },
        goal: [3, 2],
        gems: [[0, 4], [1, 3], [2, 2]],
        walls: [[1, 5], [2, 4], [3, 3], [0, 0], [5, 5]],
      },
      palette: ['forward', 'left', 'right', 'repeat'],
      maxBlocks: 6,
      maxDepth: 1,
      theme: 'mars',
    },
    solution: {
      program: [
        { op: 'repeat', times: 3, body: [{ op: 'forward' }, { op: 'right' }, { op: 'forward' }, { op: 'left' }] },
      ],
    },
  },
  {
    id: 'sample-sequence-path-wall-follower',
    title: 'One program, two mazes',
    track: 'code',
    band: 'engineers',
    template: 'sequence-path',
    difficulty: 4,
    intro: 'A hospital delivery robot meets new corridors every day. Write ONE program, using its front distance sensor, that reaches the station in both maps.',
    takeaway: 'An algorithm reacts to what the sensors report, so the same code works in places it has never seen — like the right-hand rule for mazes.',
    realWorld: 'Hospital delivery robots such as TUG use sensors to avoid obstacles and follow corridors instead of replaying a fixed route.',
    params: {
      world: {
        cols: 5,
        rows: 5,
        start: { at: [0, 4], dir: 'E' },
        goal: [0, 0],
        walls: [[1, 2], [2, 2], [3, 2], [2, 3]],
      },
      extraWorlds: [
        {
          cols: 5,
          rows: 5,
          start: { at: [0, 4], dir: 'E' },
          goal: [0, 2],
          walls: [[3, 4], [3, 3], [2, 1], [1, 1], [0, 1], [4, 0]],
        },
      ],
      palette: ['forward', 'left', 'right', 'back', 'untilGoal', 'ifWall'],
      maxBlocks: 6,
      maxDepth: 2,
      python: 'on',
      theme: 'hospital',
    },
    solution: {
      program: [{ op: 'untilGoal', body: [{ op: 'ifWall', then: [{ op: 'left' }], else: [{ op: 'forward' }] }] }],
    },
  },
]
