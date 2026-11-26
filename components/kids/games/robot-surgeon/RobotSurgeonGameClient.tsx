'use client'

// components/kids/games/robot-surgeon/RobotSurgeonGameClient.tsx
// Robot Hospital — the playable game (loaded with next/dynamic, ssr:false).
// One tier, one hospital robot:
//   Cadet  — Medicine Run (delivery robot, laser safety fields)
//   Pilot  — Steady Hands (surgical console: motion scaling, tremor filter)
//   Ace    — Bionic Hand (prosthetic hand driven by muscle/EMG signals)
//   Legend — Remote Assist (interlock checklist, force limit, network delay)

import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import BionicHandGameClient from './BionicHandGameClient'
import DeliveryGameClient from './DeliveryGameClient'
import RemoteAssistGameClient from './RemoteAssistGameClient'
import SteadyHandsGameClient from './SteadyHandsGameClient'

export default function RobotSurgeonGameClient({ tier, onFinish }: { tier: number; onFinish: (r: RoundResult) => void }) {
  const t = Math.max(0, Math.min(3, tier))
  if (t === 0) return <DeliveryGameClient onFinish={onFinish} />
  if (t === 1) return <SteadyHandsGameClient onFinish={onFinish} />
  if (t === 2) return <BionicHandGameClient onFinish={onFinish} />
  return <RemoteAssistGameClient onFinish={onFinish} />
}
