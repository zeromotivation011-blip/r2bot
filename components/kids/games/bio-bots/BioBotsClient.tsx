'use client'

// components/kids/games/bio-bots/BioBotsClient.tsx
// The page's client island: the shared GameShell around Bio-Bot Lab. The game
// itself loads with next/dynamic behind a skeleton of the same footprint.

import dynamic from 'next/dynamic'
import { GameShell } from '@/components/kids/ui/GameShellClient'
import { getGame } from '@/lib/kids/universe/worlds'

function Skeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy="true" aria-label="Loading Bio-Bot Lab">
      <div className="flex flex-col gap-3">
        <div className="aspect-[400/240] w-full animate-pulse rounded-[28px] border border-white/10 bg-gradient-to-b from-[#14325A] to-green-900/60" />
        <div className="h-8 w-48 animate-pulse rounded-full bg-white/5" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-36 animate-pulse rounded-[20px] bg-white/5" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  )
}

const BioBotsGame = dynamic(() => import('./BioBotsGameClient'), { ssr: false, loading: Skeleton })

const HOW_TO_PLAY = (
  <>
    <p>
      Welcome to the <b>Bio-Bot Lab</b> in Robo Zoo. Engineers copy animals that already solved a problem — gecko feet that stick to glass, snakes that
      slither through pipes, birds that flap, goats that never fall. Every test runs a real physics model and tells you <b>why</b> it worked or failed.
    </p>
    <ul className="list-disc space-y-1 pl-5">
      <li>
        <b>Cadet:</b> pick the animal trick that fits each challenge, then watch your robot try it.
      </li>
      <li>
        <b>Pilot:</b> tune one number at three stations — how long each foot stays down, how wide a snake wave is, how fast wings flap.
      </li>
      <li>
        <b>Ace:</b> combine modules for three missions on one 7 Wh battery. Weight costs energy on every metre.
      </li>
      <li>
        <b>Legend:</b> practise, then send one robot onto courses it has never seen, and explain the trade-offs.
      </li>
    </ul>
    <p>Use touch or the keyboard (Tab, Enter, arrow keys on sliders). The same design always gives the same result.</p>
  </>
)

export default function BioBotsClient() {
  const game = getGame('bio-bots')
  if (!game) return null
  return (
    <GameShell
      game={game}
      howToPlay={HOW_TO_PLAY}
      lesson="Biomimicry: copy the animal that already solved the problem. Stability needs the centre of mass inside the feet; grip needs friction or adhesion bigger than the pull; lift must beat weight; and every kilogram costs energy on every metre."
    >
      {({ tier, round, finish }) => <BioBotsGame key={`${tier}-${round}`} tier={tier} onFinish={finish} />}
    </GameShell>
  )
}
