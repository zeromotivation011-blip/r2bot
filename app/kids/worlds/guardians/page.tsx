// app/kids/worlds/guardians/page.tsx — the Robot Guardians world (server component)
// Indexable. Teaches how to spot and prevent harm from robots with the
// six-question Robot Harm Check. Server-rendered: the hero, the printable Harm
// Check card, the flagship game card, what each age band learns and every
// activity link. Client islands add progress ticks and the world certificate.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import { byWorld } from '@/lib/kids/activities/content'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { getGame, getWorld } from '@/lib/kids/universe/worlds'
import { TIER_NAMES } from '@/lib/kids/universe/tiers'
import { HarmCheckCard } from '@/components/kids/worlds/guardians/HarmCheckCard'
import PrintHarmCheckClient from '@/components/kids/worlds/guardians/PrintHarmCheckClient'
import { ActivitiesByBand, ProgressCard, type BandGroup } from '@/components/kids/worlds/guardians/GuardiansWorldClient'

export const runtime = 'nodejs'

const PAGE_URL = 'https://www.r2bot.in/kids/worlds/guardians'
const TITLE = 'Robot Guardians: Robot Safety and Ethics for Kids'
const DESCRIPTION =
  'A robotics world for kids 5–17 about robot safety and ethics. Learn the six-question Robot Harm Check — body, data, fairness, control, people, planet — inspect real kinds of robots, and build a safety case.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Robot Guardians — keep robots safe, fair and kind',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Robot Guardians world' }],
  },
}

const world = getWorld('guardians')!
const game = getGame(world.game)!
const activities = byWorld('guardians')

/** What each age band learns in this world. */
const BAND_LEARN: Record<string, string> = {
  explorers: 'Spot dangers in a robot workshop, tell safe robots from unsafe ones, and learn that every robot needs a way to stop.',
  builders: 'Find devices that see and hear you, sort harms into the Harm Check questions, program a safety stop and design a safe corridor robot.',
  inventors: 'Match safety features to hazards, test whether an AI is fair to every group, choose sensors for a night ward and write rules for a school robot.',
  engineers: 'Use a risk matrix, design a hospital robot to a full specification, order fail-safe logic, and weigh jobs, privacy and the planet in a warehouse.',
}

const bands: BandGroup[] = KIDS_BANDS.map((b) => ({
  id: b.id,
  name: b.name,
  ages: b.ages,
  learn: BAND_LEARN[b.id] ?? '',
  items: activities
    .filter((a) => a.band === b.id)
    .map((a) => ({ id: a.id, title: a.title, track: a.track, band: a.band, difficulty: a.difficulty, template: a.template })),
}))

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Robot Guardians — robot safety and ethics for kids',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive activities and game',
  educationalLevel: 'Ages 5–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'The Robot Harm Check: body, data, fairness, control, people, planet',
    'Physical robot safety: guarding, light curtains, emergency stops, speed near people',
    'Privacy, fairness and bias in robot AI',
    'Risk = likelihood × severity, mitigation and residual risk',
  ],
  hasPart: [
    { '@type': 'LearningResource', name: game.name, url: 'https://www.r2bot.in/kids/play/safety-inspector' },
    ...activities.map((a) => ({ '@type': 'LearningResource', name: a.title, url: `https://www.r2bot.in/kids/galaxy/${a.track}/${a.id}` })),
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Robot Guardians', path: '/kids/worlds/guardians' },
])

const GAME_TIERS = [
  'Factory dangers, with hints',
  'A smart home, all six questions',
  'Robot Street: trade-offs + budget',
  'A hospital robot’s full safety case',
]

export default function GuardiansWorldPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-3 pb-16 pt-3 sm:px-4">
        <nav aria-label="Breadcrumb" className="print:hidden">
          <Link href="/kids" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/5 px-3 font-bold text-[#EEF2F8] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            ← Universe
          </Link>
        </nav>

        {/* Hero, in the world's own gradient */}
        <header className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${world.gradient} p-6 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-10 print:hidden`}>
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-[#0A1120]/30 blur-2xl" />
          <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-50/90">A world of the R2BOT Universe</p>
              <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">Robot Guardians</h1>
              <p className="mt-2 max-w-xl text-xl font-semibold text-emerald-50">{world.tagline}</p>
              <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-emerald-50/90">
                Robots are powerful helpers — and anything powerful can cause harm. Guardians learn to ask six questions of any robot, find what
                could go wrong, and fix it before anyone gets hurt.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/kids/play/safety-inspector"
                  className="inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] shadow-lg transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 motion-safe:active:scale-[.97]"
                >
                  ▶ Play Robot Safety Inspector
                </Link>
                <a
                  href="#activities"
                  className="inline-flex min-h-[52px] items-center rounded-2xl border-2 border-white/60 bg-[#0A1120]/20 px-5 font-display text-lg font-bold text-white transition hover:bg-[#0A1120]/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                >
                  {activities.length} activities
                </a>
              </div>
            </div>
            <div aria-hidden className="hidden h-44 w-44 items-center justify-center rounded-full bg-[#0A1120]/25 text-[96px] ring-8 ring-white/15 md:flex">
              {world.emoji}
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-6">
            {/* The Harm Check card */}
            <div className="flex flex-col gap-3">
              <HarmCheckCard />
              <div className="flex flex-wrap items-center gap-3 print:hidden">
                <PrintHarmCheckClient />
                <p className="text-[15px] text-[#A7B0C0]">Stick it on the fridge or the classroom wall.</p>
              </div>
            </div>

            {/* Flagship game */}
            <section aria-labelledby="flagship" className="overflow-hidden rounded-[28px] border border-white/10 bg-[#111C32] shadow-[0_8px_24px_rgba(0,0,0,.45)] print:hidden">
              <div className={`bg-gradient-to-r ${game.gradient} px-5 py-4`}>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">Flagship game · {game.zone}</p>
                <h2 id="flagship" className="font-display text-2xl font-bold text-white">
                  {game.emoji} {game.name}
                </h2>
              </div>
              <div className="p-5">
                <p className="text-[17px] leading-snug text-[#EEF2F8]">{game.hook}</p>
                <p className="mt-2 text-[15px] leading-snug text-[#A7B0C0]">
                  Inspect each scene, name every hazard with the Harm Check, choose the fix, then run the scene: watch each moment with and without
                  your fixes and a simulated year of incidents.
                </p>
                <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                  {TIER_NAMES.map((t, i) => (
                    <li key={t} className="rounded-2xl bg-white/5 px-3 py-2 text-[14px] text-[#A7B0C0]">
                      <b className="font-display text-amber-300">{t}</b> — {GAME_TIERS[i]}
                    </li>
                  ))}
                </ol>
                <Link
                  href="/kids/play/safety-inspector"
                  className="mt-4 inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-[.97]"
                >
                  Start inspecting →
                </Link>
              </div>
            </section>
          </div>

          <aside className="print:hidden">
            <ProgressCard ids={activities.map((a) => a.id)} gameId={game.id} />
          </aside>
        </div>

        {/* What this world is about */}
        <article className="max-w-4xl text-[17px] leading-relaxed text-[#A7B0C0] print:hidden">
          <h2 className="font-display text-3xl font-bold text-[#EEF2F8]">What is a Robot Guardian?</h2>
          <p className="mt-3">
            A Robot Guardian is someone who looks at a robot and asks: who could this hurt, and how do we stop that from happening? It is a real job.
            Safety engineers, product testers, privacy officers and the people who write the rules for robots all do it every day. In this world you
            learn to do it too — whether you are five or seventeen.
          </p>
          <p className="mt-3">
            The first kind of harm everyone thinks of is a robot hurting someone’s body. Factory robot arms are strong enough to lift car doors and
            fast enough to hit before you can step back, so they work behind fences with interlocked gates, or behind light curtains that stop the
            arm the moment a beam is broken. Collaborative robots, or cobots, are built to work beside people: they move slowly and limit the force
            they can push with. Every robot needs an emergency stop that anyone can reach.
          </p>
          <p className="mt-3">
            But many harms leave no bruise. A robot vacuum with a camera can send pictures from inside your home to a company’s computers. A voice
            assistant can understand some accents and children far worse than others because of the voices it learned from. A self-driving car that
            guesses when it does not understand something is not under anyone’s control. A company can replace its workers with robots overnight,
            and a robot whose battery is glued in can end up in a landfill after a couple of years. The six-question Robot Harm Check — Body, Data,
            Fairness, Control, People, Planet — makes sure none of these is forgotten.
          </p>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Real robots you will meet here</h2>
          <p className="mt-3">
            Factory robot arms and cobots, like those in car and electronics factories in Germany, Japan, Korea, China and the USA. Robot vacuums and
            robot lawn mowers in homes around the world. Six-wheeled delivery robots on pavements and university campuses. Self-driving cars and
            robotaxis. Hospital delivery robots that carry medicines along corridors and ride the lifts on their own. Each one has its own hazards,
            and each one has safety features you will learn to recognise: light curtains, protective laser fields, cliff sensors, lift-and-tilt
            sensors, recording lights and big red stop buttons.
          </p>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">What you learn at every age</h2>
          <ul className="mt-3 space-y-2">
            {KIDS_BANDS.map((b) => (
              <li key={b.id}>
                <b className="text-[#EEF2F8]">
                  {b.name} ({b.ages}):
                </b>{' '}
                {BAND_LEARN[b.id]}
              </li>
            ))}
          </ul>
          <p className="mt-3">
            At the top of the ladder, engineers rate hazards the way professionals do — risk equals likelihood times severity — choose
            mitigations within a budget, check that a fix does not create a new hazard, and write down the residual risk they accept. That is the
            heart of a real safety case, the document a company must prepare before a robot is allowed near the public.
          </p>
        </article>

        {/* Activities by band */}
        <section id="activities" aria-labelledby="activities-title" className="scroll-mt-20 print:hidden">
          <h2 id="activities-title" className="font-display text-3xl font-bold text-[#EEF2F8]">
            Guardian activities
          </h2>
          <p className="mt-1 text-[17px] text-[#A7B0C0]">Six for each age band, easiest first. Start with yours — or try the next band up when you are ready.</p>
          <div className="mt-4">
            <ActivitiesByBand bands={bands} gameId={game.id} />
          </div>
        </section>
      </div>
    </>
  )
}
