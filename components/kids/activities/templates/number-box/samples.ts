// components/kids/activities/templates/number-box/samples.ts
// Three reference activities, one per question kind (easy → hard). validate()
// is empty and check(solution) is correct for each. Test-bench only: the live
// ones are in lib/kids/activities/content/code.ts (code-ex-11 … code-ex-15).

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'code-number-box-sample-end',
    title: 'Shells in the bucket',
    track: 'code',
    band: 'explorers',
    template: 'number-box',
    difficulty: 1,
    intro: 'A beach-cleaning robot keeps shells in its bucket. Follow the cards. How many shells are in the bucket at the end?',
    takeaway: 'The bucket remembers one number. Each card changes it.',
    params: {
      thing: { icon: '🐚', one: 'shell', many: 'shells' },
      box: { icon: '🪣', name: 'bucket' },
      start: 1,
      cards: [{ op: 'add', n: 2 }, { op: 'add', n: 1 }],
      ask: { kind: 'end', options: [3, 4, 1] },
    },
    solution: { value: 4 },
  },
  {
    id: 'code-number-box-sample-trace',
    title: 'Blocks in the cart',
    track: 'code',
    band: 'explorers',
    template: 'number-box',
    difficulty: 3,
    intro: 'A building robot loads blocks into its cart. Show how many blocks are in the cart after every card.',
    takeaway: 'A computer changes a number step by step, and remembers it in between.',
    params: {
      thing: { icon: '🧱', one: 'block', many: 'blocks' },
      box: { icon: '🛒', name: 'cart' },
      start: 2,
      cards: [{ op: 'add', n: 3 }, { op: 'take', n: 1 }, { op: 'set', n: 2 }],
      ask: { kind: 'trace' },
    },
    solution: { values: [5, 4, 2] },
  },
  {
    id: 'code-number-box-sample-missing',
    title: 'The missing card',
    track: 'code',
    band: 'explorers',
    template: 'number-box',
    difficulty: 5,
    intro: 'One card fell off! The box must end with 3 balls. Which card goes in the gap?',
    takeaway: 'Change one card and the end number changes too.',
    params: {
      thing: { icon: '⚽', one: 'ball', many: 'balls' },
      box: { icon: '📦', name: 'box' },
      start: 4,
      cards: [{ op: 'take', n: 2 }, { op: 'add', n: 1 }],
      ask: { kind: 'missing', gap: 0, options: [{ op: 'take', n: 2 }, { op: 'add', n: 2 }, { op: 'set', n: 0 }] },
    },
    solution: { option: 0 },
  },
]
