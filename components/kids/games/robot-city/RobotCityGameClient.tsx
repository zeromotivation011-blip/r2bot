'use client'

// components/kids/games/robot-city/RobotCityGameClient.tsx
// Robot City — the playable game (loaded with next/dynamic, ssr:false).
// One tier, one part of a robot city:
//   Cadet  — Crossing Patrol (pavement delivery robot, stopping distances, right-of-way)
//   Pilot  — Safe Speed (self-driving car: speed and following gap vs stopping distance)
//   Ace    — Junction Timer (traffic-light timing with human and robot traffic)
//   Legend — Rulebook (behaviour rules for unexpected events + a safety test suite)

import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import CrossingGameClient from './CrossingGameClient'
import FollowGameClient from './FollowGameClient'
import JunctionGameClient from './JunctionGameClient'
import RulesGameClient from './RulesGameClient'

export default function RobotCityGameClient({ tier, onFinish }: { tier: number; onFinish: (r: RoundResult) => void }) {
  const t = Math.max(0, Math.min(3, tier))
  if (t === 0) return <CrossingGameClient onFinish={onFinish} />
  if (t === 1) return <FollowGameClient onFinish={onFinish} />
  if (t === 2) return <JunctionGameClient onFinish={onFinish} />
  return <RulesGameClient onFinish={onFinish} />
}
