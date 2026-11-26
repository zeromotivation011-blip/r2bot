'use client'

// components/kids/games/ocean-rescue/OceanRescueGameClient.tsx
// Deep Sea Rescue — the playable game (loaded with next/dynamic, ssr:false).
// Cadet and Pilot fly a tethered ROV in a side view; Ace and Legend program
// an untethered AUV on a chart.

import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import DiveGameClient from './DiveGameClient'
import SurveyGameClient from './SurveyGameClient'

export default function OceanRescueGameClient({ tier, onFinish }: { tier: number; onFinish: (r: RoundResult) => void }) {
  const t = Math.max(0, Math.min(3, tier))
  if (t === 0 || t === 1) return <DiveGameClient tier={t} onFinish={onFinish} />
  return <SurveyGameClient tier={t as 2 | 3} onFinish={onFinish} />
}
