// components/kids/activities/templates/path-planner/samples.ts
// Three reference activities (easy → hard). validate() is empty and
// check(solution) is correct for each.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'ai-path-home-to-dock',
    title: 'Home to the charging dock',
    track: 'ai',
    band: 'explorers',
    template: 'path-planner',
    difficulty: 1,
    intro: 'The robot vacuum’s battery is low! Draw its way to the charging dock, around the sofa and the table.',
    takeaway: 'Robots plan a path before they move: a list of steps from where they are to where they want to be.',
    realWorld: 'Robot vacuums keep a map of your home and plan a path back to their dock when the battery runs low.',
    params: {
      task: 'Draw a path from the robot to the dock.',
      map: ['S..#.', '.#.#.', '.#...', '.##.#', '....G'],
      tolerance: 0.5,
      reveal: 'bfs',
      robotLabel: 'Robot vacuum',
      goalLabel: 'charging dock',
    },
    solution: {
      path: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [4, 0],
        [4, 1],
        [4, 2],
        [4, 3],
        [4, 4],
      ],
    },
  },
  {
    id: 'ai-path-mud-or-detour',
    title: 'Through the mud or around it?',
    track: 'ai',
    band: 'inventors',
    template: 'path-planner',
    difficulty: 3,
    intro: 'The farm rover needs to reach the barn. Mud costs 4 energy per square, sand costs 2, dry ground 1. Find the cheapest route — then watch Dijkstra’s algorithm find it too.',
    takeaway: 'The shortest route is not always the cheapest. Planners add up the cost of every step and pick the lowest total.',
    realWorld: 'Mars rover planners mark sand traps and rough rock as “high cost” so the rover drives around them — Spirit got stuck in soft sand in 2009.',
    params: {
      task: 'Find the lowest-cost route to the barn.',
      map: ['S..~~~..', '.#.~~~#.', '.#.:~:#.', '.#..::#.', '.####.#.', '......#G', '.#####..', '........'],
      costs: { mud: 4, sand: 2 },
      tolerance: 0,
      reveal: 'dijkstra',
      robotLabel: 'Farm rover',
      goalLabel: 'barn',
    },
    // Cost 16: all the way round on dry ground. Straight through the mud costs 21+.
    solution: { path: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [6, 6], [6, 7], [5, 7]] },
  },
  {
    id: 'ai-path-warehouse-astar',
    title: 'Pick, then deliver — with A*',
    track: 'ai',
    band: 'engineers',
    template: 'path-planner',
    difficulty: 5,
    intro: 'A warehouse robot must collect from shelf 1 and shelf 2 (in either order) and reach the packing station. Diagonal moves cost √2. Plan within 5 % of optimal, then compare A* with Dijkstra.',
    takeaway: 'A* finds the same optimal route as Dijkstra but explores fewer cells, because its heuristic points the search toward the goal.',
    realWorld: 'Warehouse fleets plan thousands of routes a minute with A*-style search on a grid of floor markers, then avoid each other on top.',
    params: {
      task: 'Visit both shelves and reach the packing station.',
      map: ['S.........', '..##..##..', '..#1..#...', '..##..##..', '....::....', '....::....', '..##..##..', '..#...#2..', '..##..##..', '.........G'],
      costs: { sand: 3 },
      terrainNames: { sand: 'Busy aisle' },
      diagonal: true,
      tolerance: 0.05,
      reveal: 'astar',
      predictExplored: true,
      robotLabel: 'Picker robot',
      goalLabel: 'packing station',
    },
    // Optimal cost 12 + 6√2 + … ≈ 22.24 (shelf 1, then 2). A* explores 45 cells; Dijkstra 110.
    solution: { path: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [2, 3], [2, 4], [3, 5], [4, 5], [4, 6], [4, 7], [5, 8], [6, 8], [7, 8], [7, 7], [7, 8], [8, 8], [9, 9]] },
  },
]
