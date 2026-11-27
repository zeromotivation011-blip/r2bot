// components/kids/games/GameTeacherStrip.tsx — the grown-up row under a game page.
// Server component: "Share to Google Classroom" + where to find teaching help.

import Link from 'next/link'
import { GrownUpLink } from '@/components/kids/app/GrownUpLinkClient'
import { ShareToClassroom } from '@/components/kids/teach/ShareToClassroom'
import type { UniverseGame } from '@/lib/kids/universe/worlds'

export function GameTeacherStrip({ game }: { game: Pick<UniverseGame, 'id' | 'name'> }) {
  return (
    <aside
      aria-label="For teachers"
      className="mt-10 flex flex-wrap items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-[15px] text-[#A7B0C0]"
    >
      <span className="font-display font-bold text-[#EEF2F8]">Teaching this?</span>
      <ShareToClassroom path={`/kids/play/${game.id}`} title={`${game.name} — R2BOT Kids`} variant="chip" />
      <GrownUpLink href="/kids/teach" grant className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline-offset-4 hover:underline">
        Teacher hub
      </GrownUpLink>
      <Link href="/kids/play" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline-offset-4 hover:underline">
        All games
      </Link>
    </aside>
  )
}
