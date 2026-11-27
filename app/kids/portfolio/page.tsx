// app/kids/portfolio/page.tsx — My Robotics Portfolio (roadmap #45). Server shell,
// noindex: a child's own record, read from this device only (PortfolioClient).
// Projects (Make It at Home check-ins, course progress), robot snapshots, best
// runs, badges by skill, teens' one-line reflections, "Save as PDF" (print CSS)
// and certificates for every level, World and milestone. The server passes only
// small lists (names, ids); the client never loads the curriculum or the Robodex.

import type { Metadata } from 'next'
import Link from 'next/link'
import PortfolioClient, { type PortfolioBuildInfo } from '@/components/kids/portfolio/PortfolioClient'
import PrintStyles from '@/components/kids/portfolio/PrintStyles'
import type { WorldInfo } from '@/components/kids/portfolio/certificates'
import { HOME_BUILDS } from '@/lib/kids/builds/builds'
import { TRACKS } from '@/lib/kids/activities/types'
import { byWorld } from '@/lib/kids/activities/content'
import { GAMES, WORLDS } from '@/lib/kids/universe/worlds'
import { ROBODEX_CARDS } from '@/lib/kids/robodex/cards'
import { LEVEL1_SESSIONS } from '@/lib/kids/curriculum/level1'
import { LEVEL2_SESSIONS } from '@/lib/kids/curriculum/level2'
import { LEVEL3_SESSIONS } from '@/lib/kids/curriculum/level3'
import { LEVEL4_SESSIONS } from '@/lib/kids/curriculum/level4'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

export const metadata: Metadata = {
  title: 'My Robotics Portfolio — R2BOT Kids',
  description: 'Your projects, robot snapshots, best runs, badges by skill and certificates, saved on this device only. Print it or save it as a PDF.',
  alternates: { canonical: `${BASE}/kids/portfolio` },
  // A child's own record: nothing here should rank.
  robots: { index: false, follow: true },
}

const builds: PortfolioBuildInfo[] = HOME_BUILDS.map((b) => ({
  id: b.id,
  title: b.title,
  emoji: b.emoji,
  track: TRACKS.find((t) => t.id === b.track)?.name ?? b.track,
  change: b.fairTest.change,
  outcomes: b.fairTest.outcomes,
}))

const worlds: WorldInfo[] = WORLDS.map((w) => ({ id: w.id, name: w.name, emoji: w.emoji, game: w.game, activityIds: byWorld(w.id).map((a) => a.id) }))
const games = GAMES.map((g) => ({ id: g.id, name: g.name, emoji: g.emoji }))
const courseBadges: Record<string, { name: string; icon: string }> = Object.fromEntries(
  [...LEVEL1_SESSIONS, ...LEVEL2_SESSIONS, ...LEVEL3_SESSIONS, ...LEVEL4_SESSIONS].map((s) => [s.badge.id, { name: s.badge.name, icon: s.badge.icon }]),
)

export default function PortfolioPage() {
  return (
    <>
      <PrintStyles />
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6">
        <header className="no-print mb-6">
          <Link href="/kids/hangar" className="inline-flex min-h-[44px] items-center rounded-lg text-[15px] text-[#A7B0C0] hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            ← Garage
          </Link>
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">R2BOT Kids · Garage</p>
          <h1 className="mt-1 font-display text-[34px] font-bold leading-tight text-[#EEF2F8] sm:text-5xl">My Robotics Portfolio</h1>
          <p className="mt-2 max-w-3xl text-lg text-[#A7B0C0]">
            Everything you have built, tested and learned, in one place — ready to show your family, your teacher or a robotics club. It is
            saved on this device only. Print it, or choose “Save as PDF” in the print window.
          </p>
        </header>
        <PortfolioClient builds={builds} worlds={worlds} games={games} courseBadges={courseBadges} totalRobodex={ROBODEX_CARDS.length} />
      </div>
    </>
  )
}
