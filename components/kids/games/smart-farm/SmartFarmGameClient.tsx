'use client'

// components/kids/games/smart-farm/SmartFarmGameClient.tsx
// Smart Farm — the playable game (loaded with next/dynamic, ssr:false).
// Cadet reads soil sensors, Pilot sets an irrigation controller and plans a
// drone survey, Ace programs a picking robot's vision rule, Legend runs a
// whole season with random events.

import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import CadetClient from './CadetClient'
import PilotClient from './PilotClient'
import AceClient from './AceClient'
import LegendClient from './LegendClient'

export default function SmartFarmGameClient({ tier, onFinish }: { tier: number; onFinish: (r: RoundResult) => void }) {
  const t = Math.max(0, Math.min(3, tier))
  if (t === 0) return <CadetClient onFinish={onFinish} />
  if (t === 1) return <PilotClient onFinish={onFinish} />
  if (t === 2) return <AceClient onFinish={onFinish} />
  return <LegendClient onFinish={onFinish} />
}
