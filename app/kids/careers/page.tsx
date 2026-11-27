// app/kids/careers/page.tsx — Meet the Makers and the Career Constellation
// (roadmap #34). Server component, indexable. The constellation is a client
// island that reads only this device's mastery; everything else (who the Makers
// are, what they do, how to get into the job) is server-rendered.

import type { Metadata } from 'next'
import Link from 'next/link'
import CareerConstellationClient from '@/components/kids/makers/CareerConstellationClient'
import { MakerAvatar } from '@/components/kids/makers/MakerAvatar'
import { breadcrumbJsonLD, jsonldScript } from '@/lib/seo/jsonld'
import { CONTINENTS, MAKERS } from '@/lib/kids/makers/makers'
import { CONCEPT_INFO } from '@/lib/kids/universe/mastery'
import { GAMES, WORLDS, numberWord } from '@/lib/kids/universe/worlds'

export const runtime = 'nodejs'

const BASE = 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/careers`
const TITLE = 'Robotics Careers for Kids: Meet the Makers Behind Real Robots'
const DESCRIPTION =
  'Meet twenty robotics makers from every continent: an ROV pilot, a surgical-robot engineer, a farm-robot technician, a Mars rover driver and more. Short stories for young children, “how I got here” for teens, and a career map that lights up the skills kids already have.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'R2BOT Kids — Meet the Makers and the Career Constellation',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids robotics careers' }],
  },
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Robotics careers', path: '/kids/careers' },
])

const listLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Robotics careers in R2BOT Kids: Meet the Makers',
  url: PAGE_URL,
  numberOfItems: MAKERS.length,
  itemListElement: MAKERS.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.role, url: `${PAGE_URL}/${m.id}` })),
}

const link = 'rounded font-semibold text-amber-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export default function CareersPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(listLd) }} />
      <div className="mx-auto w-full max-w-6xl px-3 pb-24 pt-4 sm:px-5">
        <nav aria-label="Breadcrumb" className="text-[15px] text-[#A7B0C0]">
          <Link href="/kids" className="inline-flex min-h-[44px] items-center rounded-lg hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            ← R2BOT Kids
          </Link>
        </nav>
        <header className="mb-6 mt-1">
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Meet the Makers</p>
          <h1 className="mt-1 font-display text-[34px] font-bold leading-tight text-[#EEF2F8] sm:text-5xl">Who builds the robots?</h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-[#A7B0C0]">
            Real robots need real people: pilots, engineers, technicians, designers, scientists and teachers. Meet {numberWord(MAKERS.length)} of
            them, from all {numberWord(CONTINENTS.length)} continents, hear how they started, and see which of their skills you already have.
          </p>
        </header>

        <CareerConstellationClient />

        <article className="mt-14 max-w-4xl text-[17px] leading-relaxed text-[#A7B0C0]">
          <h2 className="font-display text-2xl font-bold text-[#EEF2F8]">The Makers, continent by continent</h2>
          <p className="mt-3">
            The Makers are original characters created for R2BOT Kids. They are not real people, but their jobs, their robots and the routes they
            took into the work are real. Some went to university; some started with an apprenticeship, a technical college, a volunteer group or a
            free online course. One is a firefighter, one designs the robot hand she wears herself, one uses a wheelchair and trains the eyes of
            weeding robots.
          </p>
          {CONTINENTS.map((c) => {
            const list = MAKERS.filter((m) => m.continent === c)
            if (!list.length) return null
            return (
              <section key={c} aria-labelledby={`ct-${c}`} className="mt-6">
                <h3 id={`ct-${c}`} className="font-display text-xl font-bold text-[#EEF2F8]">
                  {c}
                </h3>
                <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                  {list.map((m) => {
                    const world = WORLDS.find((w) => w.id === m.world)
                    return (
                      <li key={m.id} className="flex gap-3 rounded-2xl border border-white/[0.08] bg-[#111C32] p-3">
                        <MakerAvatar look={m.look} size={56} />
                        <div>
                          <Link href={`/kids/careers/${m.id}`} className={`${link} text-[17px]`}>
                            {m.name}, {m.role}
                          </Link>
                          <p className="text-[15px]">
                            {m.tagline} {m.place}
                            {world ? `. World: ${world.name}.` : '.'}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">How the Career Constellation works</h2>
          <p className="mt-3">
            Every job uses three or four of the sixteen{' '}
            <Link href="/kids/galaxy/concepts" className={link}>
              big ideas of robotics
            </Link>
            . An ROV pilot leans on feedback, sensors and forces; a robot vision engineer on data, sensors and debugging. When a child secures an
            idea in the Skill Galaxy (three first-try wins on three different missions, in at least two kinds of mission), its star lights up in
            every job that uses it. Ideas being learnt glow softly; ideas that need a recharge stay dimly lit, because skills fade when they are
            not used and come back with practice.
          </p>
          <p className="mt-3">
            The jobs always stay in the same order. Nothing is ranked, and the words only ever say what a child already has. “Try my job” opens a
            game that uses the same skills, such as{' '}
            {GAMES.filter((g) => MAKERS.some((m) => m.tryGame === g.id))
              .slice(0, 4)
              .map((g) => g.name)
              .join(', ')}
            . Each Maker also links to the real robots they work with in the{' '}
            <Link href="/kids/robodex" className={link}>
              Robodex
            </Link>
            .
          </p>
          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">For parents and teachers</h2>
          <p className="mt-3">
            Careers do not appear in most children’s robotics apps, yet seeing someone like you doing the job is often what turns interest into a
            future. Interest in engineering often drops for girls around ages 11 to 13, so more than half of the Makers are women, and they come
            from every continent, with different skin tones, a headscarf, glasses, hearing aids, a wheelchair and a limb difference. Young
            children get a story of about a minute that can be read aloud; teenagers get “how I got here”, a day in the job and the real ways in.
            The skills used most by each job are: {MAKERS.slice(0, 3).map((m) => `${m.role.toLowerCase()} (${m.skills.map((s) => CONCEPT_INFO[s].name.toLowerCase()).join(', ')})`).join('; ')}, and so on for every Maker.
          </p>
        </article>
      </div>
    </>
  )
}
