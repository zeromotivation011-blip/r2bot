'use client'

// components/kids/games/sumo-arena/SumoArenaClient.tsx
// The page's client island: the shared GameShell around Robo Sumo Arena.
// The game itself (three.js, Rapier physics, the editors) loads with
// next/dynamic so the page's server HTML stays light; the skeleton has the
// same footprint as the game.

import dynamic from 'next/dynamic'
import { GameShell } from '@/components/kids/ui/GameShellClient'
import { getGame } from '@/lib/kids/universe/worlds'

function Skeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy="true" aria-label="Loading Robo Sumo Arena">
      <div className="flex flex-col gap-2">
        <div className="relative h-[300px] animate-pulse overflow-hidden rounded-3xl border border-white/10 bg-[#0A1120] sm:h-[420px] lg:h-[470px]">
          <div className="absolute left-1/2 top-[58%] h-[62%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-4 border-white/20 bg-[#16181D]" />
        </div>
        <div className="flex gap-2">
          <div className="h-[52px] flex-1 animate-pulse rounded-2xl bg-amber-500/30 sm:w-40 sm:flex-none" />
          <div className="h-[52px] w-24 animate-pulse rounded-xl bg-white/5" />
          <div className="h-[52px] w-32 animate-pulse rounded-xl bg-white/5" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-40 animate-pulse rounded-[20px] bg-white/5" />
        <div className="h-80 animate-pulse rounded-[20px] bg-white/5" />
      </div>
    </div>
  )
}

const SumoArenaGame = dynamic(() => import('./SumoArenaGameClient'), { ssr: false, loading: Skeleton })

const HOW_TO_PLAY = (
  <>
    <p>
      Your own robot steps onto a real sumo ring, a <b>dohyo</b>: a raised black circle 154 cm across with a white edge line. Push the rival out
      — or make it drive out — and stay in yourself.
    </p>
    <ul className="list-disc space-y-1 pl-5">
      <li>
        <b>Cadet:</b> pick a behaviour (Hunter, Bulldozer or Statue) and tune its power.
      </li>
      <li>
        <b>Pilot:</b> fix the rule cards. The robot checks them from the top: “if the edge sensor sees the white line → back up and turn”.
      </li>
      <li>
        <b>Ace:</b> program the full state machine — SEARCH, CHARGE, RECOVER — with sensor thresholds and timings.
      </li>
      <li>
        <b>Legend:</b> best of three against a bot that learns from every round. Change your robot too: drive, wedge and ballast.
      </li>
    </ul>
    <p>Press Fight, watch the states change above each robot, read why the bout was won or lost, change one thing and fight again. The same program always fights the same bout.</p>
  </>
)

export default function SumoArenaClient() {
  const game = getGame('sumo-arena')
  if (!game) return null
  return (
    <GameShell
      game={game}
      howToPlay={HOW_TO_PLAY}
      lesson="A sumo robot is a state machine: SEARCH until a sensor sees the rival, CHARGE, and RECOVER when the edge sensor sees the white line. Its push is limited by its motors AND by its grip (grip × weight), and a wedge wins by lifting the rival off its wheels."
    >
      {({ tier, round, finish }) => <SumoArenaGame key={`${tier}-${round}`} tier={tier} onFinish={finish} />}
    </GameShell>
  )
}
