// lib/kids/ai/think/learn-missions.ts
// Missions of the Learning Robot (reinforcement learning).

import type { TierName } from '@/lib/kids/universe/tiers'
import type { ThinkMission } from './common'
import type { LevelId } from './qlearn'

export interface LearnSnapshot {
  level: LevelId
  episodes: number
  /** Result of the last "Test run" (greedy, no exploring), or null. */
  test: { reached: boolean; steps: number; optimal: number } | null
  epsilon: number
  icy: boolean
  /** Training episodes run with ε ≥ 0.3 since the last reset. */
  exploredEpisodes: number
  ownWalls: number
  ownLava: number
  walkerBest: number
}

export interface LearnMission extends ThinkMission {
  check: (s: LearnSnapshot) => boolean
}

export const LEARN_MISSIONS: LearnMission[] = [
  {
    id: 'watch-5',
    tier: 'Cadet',
    title: 'Watch it try',
    goal: 'In “Cookie corner”, press “Try once” until the robot has tried 5 times.',
    lesson: 'The robot did not know the way. It tried, bumped, and remembered what happened.',
    xp: 15,
    check: (s) => s.level === 'cookie' && s.episodes >= 5,
  },
  {
    id: 'cookie-alone',
    tier: 'Cadet',
    title: 'Find the cookie alone',
    goal: 'Train the robot, then press “Test run”. It must reach the cookie on its own.',
    lesson: 'Rewards taught it: +30 for the cookie, −1 for every step. So it learned the short way.',
    xp: 20,
    badges: ['map-maker'],
    check: (s) => s.level === 'cookie' && !!s.test?.reached,
  },
  {
    id: 'walls-best',
    tier: 'Pilot',
    title: 'Round the walls',
    goal: 'In “Wall room”, train until the Test run takes the shortest possible path.',
    lesson: 'The colours are the robot’s map of how good each square is. Brighter = closer to the reward.',
    xp: 25,
    badges: ['map-maker'],
    check: (s) => s.level === 'walls' && !!s.test?.reached && s.test.steps === s.test.optimal,
  },
  {
    id: 'explore',
    tier: 'Pilot',
    title: 'Curious robot',
    goal: 'Reset, set “Curiosity” (ε) to 0.3 or more, train 30 tries, then pass a Test run in Wall room.',
    lesson: 'A robot that never tries something new can get stuck with its first idea. Exploring finds better ones.',
    xp: 25,
    check: (s) => s.level === 'walls' && s.exploredEpisodes >= 30 && !!s.test?.reached,
  },
  {
    id: 'cliff',
    tier: 'Ace',
    title: 'Cross the lava cliff',
    goal: 'In “Lava cliff”, train until the Test run reaches the goal without falling in.',
    lesson: 'Lava costs −30. Q-learning learns the shortest safe path right along the edge — the best path, if nothing ever slips.',
    xp: 30,
    badges: ['map-maker'],
    check: (s) => s.level === 'cliff' && !!s.test?.reached,
  },
  {
    id: 'own-world',
    tier: 'Ace',
    title: 'Your own world',
    goal: 'In “Build your own”, add at least 4 walls and 1 lava square, then train the robot to solve it.',
    lesson: 'The same learning rule solves a world nobody programmed. That is why engineers love reinforcement learning.',
    xp: 30,
    badges: ['map-maker'],
    check: (s) => s.level === 'own' && s.ownWalls >= 4 && s.ownLava >= 1 && !!s.test?.reached,
  },
  {
    id: 'icy-maze',
    tier: 'Legend',
    title: 'Icy maze',
    goal: 'Turn on the icy floor in “The maze”, train, and pass a Test run.',
    lesson: 'When moves can slip, the robot learns values that average over what MIGHT happen — the heart of real-world RL.',
    xp: 40,
    badges: ['map-maker'],
    check: (s) => s.level === 'maze' && s.icy && !!s.test?.reached,
  },
  {
    id: 'walker',
    tier: 'Legend',
    title: 'Teach it to walk',
    goal: 'Scroll to the Walker. Let it learn until it walks 3 metres in 8 seconds.',
    lesson: 'No one told it how to walk. It kept every random change that went further — policy search, used on real legged robots.',
    xp: 45,
    check: (s) => s.walkerBest >= 3,
  },
]

export function learnMissionsFor(tier: TierName): LearnMission[] {
  return LEARN_MISSIONS.filter((m) => m.tier === tier)
}
