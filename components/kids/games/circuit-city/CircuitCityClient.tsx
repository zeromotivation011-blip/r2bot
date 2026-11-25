'use client'

// components/kids/games/circuit-city/CircuitCityClient.tsx
// The page's client island: the shared GameShell around Circuit City. The game
// (canvas, solver, panels) loads with next/dynamic so the server HTML stays
// light; the skeleton has the same footprint.

import dynamic from 'next/dynamic'
import { GameShell } from '@/components/kids/ui/GameShellClient'
import { getGame } from '@/lib/kids/universe/worlds'

function Skeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]" aria-busy="true" aria-label="Loading Circuit City">
      <div className="flex flex-col gap-2">
        <div className="h-[96px] animate-pulse rounded-2xl bg-white/5" />
        <div className="h-[130px] animate-pulse rounded-[20px] bg-gradient-to-b from-slate-900 to-emerald-950/60 sm:h-[170px]" />
        <div className="h-[60px] animate-pulse rounded-2xl bg-white/5" />
        <div className="mx-auto aspect-[4/3] w-full max-w-[672px] animate-pulse rounded-[18px] border border-white/10 bg-[#0c1628]" />
        <div className="h-[104px] animate-pulse rounded-2xl bg-white/5" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
      </div>
    </div>
  )
}

const CircuitCityGame = dynamic(() => import('./CircuitCityGameClient'), { ssr: false, loading: Skeleton })

const HOW_TO_PLAY = (
  <>
    <p>
      You are Circuit City’s electrician. Build real circuits on the breadboard to power the buildings above it. A real circuit solver works out every
      voltage and current, so what you see is what real parts would do.
    </p>
    <ul className="list-disc space-y-1 pl-5">
      <li>
        <b>Build:</b> pick a part from the box, then tap the gap between two dots (or drag the part onto the board). With <b>Wire</b>, drag from dot to
        dot.
      </li>
      <li>
        <b>Use:</b> tap a switch to flip it. Tap any part to see its current and change it (resistor value, flip an LED, remove).
      </li>
      <li>
        <b>Measure:</b> the <b>Multimeter</b> reads voltage at a dot or current through a part. Yellow dots show current: faster dots, more current.
      </li>
      <li>
        <b>Careful:</b> too much current pops an LED, and a wire from + straight to − is a short circuit that drains the battery.
      </li>
      <li>
        Press <b>Test it!</b> when you think it works. If it fails, Spark tells you why.
      </li>
    </ul>
    <p>Keyboard: arrows move the cursor, R turns it, Enter places or uses a part, F flips, Delete removes.</p>
  </>
)

export default function CircuitCityClient() {
  const game = getGame('circuit-city')
  if (!game) return null
  return (
    <GameShell
      game={game}
      howToPlay={HOW_TO_PLAY}
      lesson="Current only flows round a complete loop. Parallel paths each get the full battery voltage; series parts share it. Ohm’s law (I = V ÷ R) lets you pick a resistor that keeps an LED safe."
    >
      {({ tier, round, finish }) => <CircuitCityGame key={`${tier}-${round}`} tier={tier} onFinish={finish} />}
    </GameShell>
  )
}
