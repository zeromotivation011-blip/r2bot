// components/kids/games/swarm-reef/rules.tsx
// The rule cards the child tunes: names, plain-language meaning, slider range
// and a tiny diagram for each. Shared by the game UI. No hooks, no state.

import type { ReactNode } from 'react'
import type { TierIndex, WeightKey } from './sim'

export interface RuleDef {
  key: WeightKey
  name: string
  /** One short line a 7-year-old understands. */
  kid: string
  /** The engineering view, for older players. */
  pro: string
  min: number
  max: number
  step: number
  unit?: string
  icon: ReactNode
}

const stroke = { stroke: 'currentColor', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3} fill="currentColor" />
}

export const RULES: Record<WeightKey, RuleDef> = {
  sep: {
    key: 'sep',
    name: 'Separation',
    kid: 'Don’t bump! Move away from robots that are too close.',
    pro: 'Repulsion from neighbours inside personal space, stronger the closer they are.',
    min: 0,
    max: 3,
    step: 0.1,
    icon: (
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <Dot x={13} y={16} />
        <Dot x={19} y={16} />
        <path d="M10 16H3m3-3-3 3 3 3M22 16h7m-3-3 3 3-3 3" {...stroke} />
      </svg>
    ),
  },
  ali: {
    key: 'ali',
    name: 'Alignment',
    kid: 'Copy your neighbours: swim the same way they swim.',
    pro: 'Steer toward the average velocity of the neighbours you can sense.',
    min: 0,
    max: 3,
    step: 0.1,
    icon: (
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <path d="M4 9h20m-4-4 4 4-4 4M4 16h20m-4-4 4 4-4 4M4 23h20m-4-4 4 4-4 4" {...stroke} />
      </svg>
    ),
  },
  coh: {
    key: 'coh',
    name: 'Cohesion',
    kid: 'Stay together: move toward the middle of your neighbours.',
    pro: 'Steer toward the centre of mass of the neighbours you can sense.',
    min: 0,
    max: 3,
    step: 0.1,
    icon: (
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <Dot x={16} y={16} />
        <path d="M4 4l7 7m0-5v5H6M28 4l-7 7m0-5v5h5M4 28l7-7m0 5v-5H6M28 28l-7-7m0 5v-5h5" {...stroke} />
      </svg>
    ),
  },
  goal: {
    key: 'goal',
    name: 'Go to food',
    kid: 'Head for the food — if you can smell it.',
    pro: 'Goal-seeking steer. Only informed robots (gold scouts) sense the goal from afar.',
    min: 0,
    max: 3,
    step: 0.1,
    icon: (
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <circle cx={16} cy={16} r={11} {...stroke} />
        <circle cx={16} cy={16} r={6} {...stroke} />
        <Dot x={16} y={16} />
      </svg>
    ),
  },
  avoid: {
    key: 'avoid',
    name: 'Avoid rocks',
    kid: 'Feel the rock before you hit it, and turn away.',
    pro: 'Repulsion from obstacles inside sensing range, with a short look-ahead along your velocity.',
    min: 0,
    max: 3,
    step: 0.1,
    icon: (
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <path d="M18 26c-4 0-8-3-8-7 0-5 5-8 9-7s7 4 6 8c0 3-3 6-7 6z" fill="currentColor" opacity={0.35} />
        <path d="M3 8c8 0 12 2 14 6m-4-1 4 1 1-4" {...stroke} />
      </svg>
    ),
  },
  shape: {
    key: 'shape',
    name: 'Shape pull',
    kid: 'Swim to the nearest bit of the glowing shape.',
    pro: 'Spring toward the closest point of the broadcast shape. No robot has an assigned slot.',
    min: 0,
    max: 3,
    step: 0.1,
    icon: (
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <circle cx={16} cy={16} r={11} {...stroke} strokeDasharray="4 4" />
        <path d="M16 16l6-6m-4 0h4v4" {...stroke} />
      </svg>
    ),
  },
  explore: {
    key: 'explore',
    name: 'Explore',
    kid: 'Go where the trail is faint — places nobody has searched.',
    pro: 'Descend the shared trail field: steer toward the direction with the least pheromone.',
    min: 0,
    max: 3,
    step: 0.1,
    icon: (
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <circle cx={16} cy={16} r={12} {...stroke} />
        <path d="M20 12l-2.5 6.5L11 21l2.5-6.5z" fill="currentColor" />
      </svg>
    ),
  },
  trail: {
    key: 'trail',
    name: 'Leave a trail',
    kid: 'Drop a fading glow wherever you swim, so others know you were here.',
    pro: 'Deposit rate of a virtual pheromone that evaporates over time (stigmergy).',
    min: 0,
    max: 4,
    step: 0.1,
    icon: (
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <circle cx={5} cy={24} r={1.5} fill="currentColor" opacity={0.3} />
        <circle cx={11} cy={20} r={2} fill="currentColor" opacity={0.5} />
        <circle cx={17} cy={15} r={2.5} fill="currentColor" opacity={0.75} />
        <path d="M22 10l6-3-2 6" {...stroke} />
      </svg>
    ),
  },
  radius: {
    key: 'radius',
    name: 'Sensing radius',
    kid: 'How far each robot can see. Robots only know about neighbours inside this circle.',
    pro: 'Neighbourhood radius in world units (the reef is 1000 × 700). In Legend, sensing costs battery.',
    min: 20,
    max: 160,
    step: 5,
    unit: '',
    icon: (
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <circle cx={16} cy={16} r={12} {...stroke} strokeDasharray="3 3" />
        <Dot x={16} y={16} />
        <path d="M16 16h12" {...stroke} />
      </svg>
    ),
  },
}

export interface Brief {
  title: string
  goal: string
  steps: string[]
  hints: string[]
}

export const BRIEFS: Record<TierIndex, Brief> = {
  0: {
    title: 'Feeding time',
    goal: 'Get at least 70% of the robots to the food in 50 seconds.',
    steps: [
      'Only the gold scouts can smell the food. The blue robots cannot.',
      'The current pushes robots around. A robot left on its own drifts away.',
      'Set the rules, press Launch, and watch the swarm decide for itself.',
    ],
    hints: [
      'Watch the blue robots: are they following the gold scouts, or wandering off on their own?',
      'Cohesion makes robots stay close to their neighbours. Try turning it up to about 1.5.',
      'Alignment makes robots swim the same way as their neighbours, so they follow the scouts. Try about 1.',
      'If the scouts race off and leave everyone behind, lower “Go to food” a little so they stay with the group.',
    ],
  },
  1: {
    title: 'The narrow gap',
    goal: 'Get 80% through the gap to the food with 12 or fewer wall crashes.',
    steps: [
      'Every robot knows where the food is this time. The problem is the rock wall.',
      'Crashes into the wall and bumps between robots are counted.',
      '3 stars: 95% through, at most 2 crashes and 15 bumps, in 30 seconds.',
    ],
    hints: [
      'Turn on “Avoid rocks” so robots feel the wall before they touch it.',
      'More separation keeps space around each robot so they don’t bump in the gap.',
      'Alignment helps them queue and flow through the gap like a school of fish.',
      'Too much cohesion squeezes the swarm into a ball that is too fat for the gap.',
    ],
  },
  2: {
    title: 'Light-show formation',
    goal: 'Hold a ring, heal it after 12 robots fail, then form a line. Formation score 62+ to win.',
    steps: [
      '0–15 s: form the ring. At 15 s, 12 robots lose power and sink.',
      '15–30 s: the survivors must close the gaps and make the ring even again.',
      '30–45 s: the shape changes to a long line. Each shape is scored in its last 3 seconds.',
    ],
    hints: [
      'Cohesion pulls robots to the middle of their neighbours — that is inside a ring! Try turning it off.',
      'Separation is what spreads robots evenly along the shape.',
      'After robots are lost, the gaps get wider. If the sensing radius is smaller than a gap, nobody can feel it to close it.',
      'A strong shape pull keeps robots on the line, so separation pushes them along it instead of off it.',
    ],
  },
  3: {
    title: 'Search and rescue',
    goal: 'Find at least 5 of 6 hidden beacons and search 75% of the reef before the batteries run out.',
    steps: [
      '14 robots leave the dock. Dark water has not been searched yet. The mission ends when every battery is flat.',
      'Batteries drain from moving and from sensing: a bigger radius sees more but empties faster. Every crash and bump costs battery too.',
      '3 stars: all 6 beacons, 90% searched, 3 collisions or fewer.',
    ],
    hints: [
      'A tight flock searches like one big robot. To search, robots need to spread out.',
      'Robots have no map. “Leave a trail” lets them mark where they have been — the orange glow.',
      '“Explore” makes each robot swim away from the trail, toward water nobody has searched.',
      'Watch when the batteries go flat. A big radius sees a wide strip but dies early; a small one lasts longer but sees a thin strip. Find the balance.',
    ],
  },
}
