// app/kids/robodex/page.tsx — the Robodex: collect real robots (roadmap #32).
// Server component, indexable. The collection itself is a client island
// (RobodexClient) that reads only this device. Everything a search engine or a
// parent needs is rendered here: what the Robodex is, how cards are earned, and
// a field guide to every real robot in it, world by world.

import type { Metadata } from 'next'
import Link from 'next/link'
import RobodexClient from '@/components/kids/robodex/RobodexClient'
import { breadcrumbJsonLD, jsonldScript } from '@/lib/seo/jsonld'
import { ROBODEX_CARDS } from '@/lib/kids/robodex/cards'
import { robodexViews } from '@/lib/kids/robodex/view'
import { MAKERS } from '@/lib/kids/makers/makers'
import { numberWord } from '@/lib/kids/universe/worlds'

export const runtime = 'nodejs'

const BASE = 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/robodex`
const TITLE = 'Robodex for Kids: Collect Real Robots From the Ocean to Mars'
const DESCRIPTION =
  'A collection of real robots kids discover by playing: Mars rovers, surgical robots, milking robots, ocean gliders and more. Each card has a story for young children, facts and specs for older ones, and the people who build them. Ages 5–17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'R2BOT Kids Robodex — collect real robots by playing',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Robodex' }],
  },
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Robodex', path: '/kids/robodex' },
])

const link = 'rounded font-semibold text-amber-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export default function RobodexPage() {
  const { cards, worlds } = robodexViews()
  const listLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Real robots in the R2BOT Kids Robodex',
    url: PAGE_URL,
    numberOfItems: cards.length,
    itemListElement: cards.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, description: c.front, url: `${PAGE_URL}#about-${c.id}` })),
  }
  const count = ROBODEX_CARDS.length

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(listLd) }} />
      <div className="mx-auto w-full max-w-6xl px-3 pb-24 pt-4 sm:px-5">
        <nav aria-label="Breadcrumb" className="text-[15px] text-[#A7B0C0]">
          <Link href="/kids/worlds" className="inline-flex min-h-[44px] items-center rounded-lg hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            ← Worlds
          </Link>
        </nav>
        <header className="mb-6 mt-1">
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">R2BOT Universe</p>
          <h1 className="mt-1 font-display text-[34px] font-bold leading-tight text-[#EEF2F8] sm:text-5xl">Robodex</h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-[#A7B0C0]">
            {count} real robots are hiding in the Worlds, from a robot that milks cows to a helicopter that flew on Mars. Play missions, games and
            stories to discover them. Every card is a real machine that works today, or one that made history.
          </p>
        </header>

        <RobodexClient cards={cards} worlds={worlds} />

        <article className="mt-14 max-w-4xl text-[17px] leading-relaxed text-[#A7B0C0]">
          <h2 className="font-display text-2xl font-bold text-[#EEF2F8]">How the Robodex works</h2>
          <p className="mt-3">
            Collecting is one of the strongest pulls for children between six and twelve, so R2BOT Kids lets them collect something worth
            knowing: real robots. A card is discovered only by <strong className="text-[#EEF2F8]">doing</strong>. Finishing a Skill Galaxy mission about
            sea robots reveals the underwater robot on a cable; flying the Mars rover in its game reveals the rover itself. Cards are never bought,
            never traded and never drawn at random, so the same play always earns the same card. Each locked card says exactly how to find it.
          </p>
          <p className="mt-3">
            Every card has a back that grows with the child. Explorers (5–7) hear a short story told by the robot itself. Builders and
            Inventors (8–13) get two or three true facts and real examples. Inventors and Engineers (11–17) see a spec sheet: how it moves, what
            it senses, how much it decides for itself, how it is powered and how it works, with a link to a full robot profile on the main R2BOT site
            where one exists. Everyone can turn to <em>Who builds it?</em> and meet the people behind the machine in{' '}
            <Link href="/kids/careers" className={link}>
              Meet the Makers
            </Link>
            .
          </p>
          <p className="mt-3">
            Progress shows per world, such as “Ocean Lab 3/8”, and never against anyone else. There is no leaderboard and nothing to compare. The
            collection lives on this device only, in the same place as the rest of a child’s R2BOT Kids progress, and it travels with the backup
            code. No account, no personal details.
          </p>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Field guide: the real robots in the Robodex</h2>
          <p className="mt-3">
            For grown-ups and the curious: every robot in the collection, by world. Names are the kind of robot rather than a brand, because the
            idea matters more than the product. Across the {numberWord(worlds.length)} worlds, {numberWord(MAKERS.length)} Makers from every
            continent work with these machines.
          </p>
          {worlds.map((w) => (
            <section key={w.id} aria-labelledby={`fg-${w.id}`} className="mt-6">
              <h3 id={`fg-${w.id}`} className="font-display text-xl font-bold text-[#EEF2F8]">
                <span aria-hidden>{w.emoji}</span>{' '}
                <Link href={`/kids/worlds/${w.id}`} className="inline-flex min-h-[44px] items-center rounded hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                  {w.name}
                </Link>
              </h3>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {cards
                  .filter((c) => c.world === w.id)
                  .map((c) => (
                    <li key={c.id} id={`about-${c.id}`} className="scroll-mt-24 rounded-2xl border border-white/[0.08] bg-[#111C32] p-3">
                      <p className="font-bold text-[#EEF2F8]">
                        <span aria-hidden>{c.emoji}</span> {c.name} <span className="font-normal text-[#6E7888]">· {c.type}</span>
                      </p>
                      <p className="mt-1 text-[15px]">{c.front}</p>
                      <p className="mt-1 text-[14px] text-[#6E7888]">{c.realExamples}</p>
                    </li>
                  ))}
              </ul>
            </section>
          ))}

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Why real robots?</h2>
          <p className="mt-3">
            Children decide early whether robotics is “for people like me”. Seeing that robots milk cows on family dairy farms, deliver blood
            by drone in Rwanda, swim under Antarctic ice and help surgeons in hospitals everywhere turns robotics from a toy into a world of
            useful work. The facts on each card are kept short and checkable, and the spec sheets use the same words engineers use: degrees of
            freedom, sensors, autonomy and power. When a teenager is ready for more, the{' '}
            <Link href="/kids/next-step" className={link}>
              next step
            </Link>{' '}
            maps what they have learnt onto the main R2BOT platform.
          </p>
        </article>
      </div>
    </>
  )
}
