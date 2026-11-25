'use client'

// components/kids/games/drone-hover/DroneHoverClient.tsx
// The page's client island: the shared GameShell around the Sky Port game.
// The game itself (canvas, physics, controls) loads with next/dynamic so the
// page's server HTML stays light; the skeleton has the same footprint.

import dynamic from 'next/dynamic'
import { GameShell } from '@/components/kids/ui/GameShellClient'
import { getGame } from '@/lib/kids/universe/worlds'

function Skeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy="true" aria-label="Loading Sky Port">
      <div className="flex flex-col gap-2">
        <div className="h-[330px] animate-pulse rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 via-violet-950 to-orange-900/60 sm:h-[420px] lg:h-[470px]" />
        <div className="h-[170px] animate-pulse rounded-2xl border border-white/10 bg-slate-950/70 sm:h-[190px]" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-32 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
      </div>
    </div>
  )
}

const DroneHoverGame = dynamic(() => import('./DroneHoverGameClient'), { ssr: false, loading: Skeleton })

const HOW_TO_PLAY = (
  <>
    <p>
      You are the <b>brain designer</b> at Sky Port. A drone must hold its height (and, at Legend, its position) while wind gusts push it and parcels
      change its weight.
    </p>
    <ul className="list-disc space-y-1 pl-5">
      <li>
        <b>Cadet:</b> you are the brain. Use the throttle (＋/－ or ↑/↓) to hover in the green band. Hover happens when thrust equals weight.
      </li>
      <li>
        <b>Pilot:</b> tune one number, Kp. Too small and it sags under the parcel; too big and it overshoots and rings.
      </li>
      <li>
        <b>Ace:</b> tune P, I and D through gusts, a parcel and a downdraft. Watch the P, I and D pushes on the graph.
      </li>
      <li>
        <b>Legend:</b> fly a 2-D waypoint course with three loops working together, a parcel drop and a tiring battery.
      </li>
    </ul>
    <p>Press Launch, watch the live graph, read the debrief, re-tune, and fly again. Same settings always give the same flight.</p>
  </>
)

export default function DroneHoverClient() {
  const game = getGame('drone-hover')
  if (!game) return null
  return (
    <GameShell
      game={game}
      howToPlay={HOW_TO_PLAY}
      lesson="Feedback control: measure the error, push against it (P), remove the error that stays (I), and brake fast changes (D). Hover is thrust equal to weight."
    >
      {({ tier, round, finish }) => <DroneHoverGame key={`${tier}-${round}`} tier={tier} onFinish={finish} />}
    </GameShell>
  )
}
