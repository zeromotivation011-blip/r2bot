// app/kids/worlds/hospital/page.tsx — the Robot Hospital world (server component)
// Indexable. Medical robots: surgical robots the surgeon controls from a
// console, prosthetic hands driven by muscle signals, rehabilitation
// exoskeletons, delivery, disinfection and care robots, and medical safety.
// Server-rendered hero, flagship game card, teaching text, what each age band
// learns and every activity link; client islands add progress and the
// world-complete card.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import { byWorld } from '@/lib/kids/activities/content'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { getGame, getWorld } from '@/lib/kids/universe/worlds'
import { TIER_NAMES } from '@/lib/kids/universe/tiers'
import { HospitalActivities, HospitalProgressCard, type HospitalBand } from '@/components/kids/worlds/hospital/HospitalWorldClient'

export const runtime = 'nodejs'

const PAGE_URL = 'https://www.r2bot.in/kids/worlds/hospital'
const TITLE = 'Robot Hospital: Medical Robots for Kids — Surgical Robots, Bionic Hands and Safety'
const DESCRIPTION =
  'A robotics world for kids 5–17 about medical robots. Learn how surgeons control surgical robots with motion scaling and tremor filters, how bionic hands read muscle signals, and how hospitals keep robots safe — with a four-tier game and 24 hands-on activities.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Robot Hospital — robots that help doctors and patients',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Robot Hospital world' }],
  },
}

const world = getWorld('hospital')!
const game = getGame(world.game)!
const activities = byWorld('hospital')

const BAND_LEARN: Record<string, string> = {
  explorers: 'Meet the robots that work in a hospital, find them on a ward, learn what “sterile” means, drive medicine to the nurses, give a cleaning robot safety senses and decide how a kind companion robot should behave.',
  builders: 'Work out how motion scaling shrinks a surgeon’s moves, spot muscle squeezes in a signal, set the threshold that closes a robotic hand, program a cleaning robot’s safety check and plan a delivery robot’s quickest route.',
  inventors: 'Match real medical robots to their jobs, read the steady point through a hand tremor, stop a bionic hand from flickering with hysteresis, trace a tremor filter, tune P and D on a heavy scanner arm and weigh up a night-shift robot’s rules.',
  engineers: 'Calculate what a network delay does to a remote tool, build a two-electrode grip rule, filter spiky muscle signals, tune PID on a rehabilitation exoskeleton, trace a latching force limit and design a surgical safety interlock.',
}

const bands: HospitalBand[] = KIDS_BANDS.map((b) => ({
  id: b.id,
  name: b.name,
  ages: b.ages,
  learn: BAND_LEARN[b.id] ?? '',
  items: activities.filter((a) => a.band === b.id).map((a) => ({ id: a.id, title: a.title, track: a.track, difficulty: a.difficulty, template: a.template })),
}))

const GAME_TIERS = ['Drive medicine safely past people', 'Steady hands: scaling and tremor filter', 'Tune a bionic hand on muscle signals', 'Remote surgery assist with delay and limits']

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Robot Hospital — medical robots for kids',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive activities and game',
  educationalLevel: 'Ages 5–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Robot-assisted surgery: the surgeon controls the robot from a console',
    'Motion scaling and tremor filtering',
    'Myoelectric prosthetic hands and EMG signals',
    'Rehabilitation exoskeletons and feedback control',
    'Hospital delivery, disinfection and companion robots',
    'Medical safety: sterility, force limits, interlocks and checklists',
  ],
  hasPart: [
    { '@type': 'LearningResource', name: game.name, url: 'https://www.r2bot.in/kids/play/robot-surgeon' },
    ...activities.map((a) => ({ '@type': 'LearningResource', name: a.title, url: `https://www.r2bot.in/kids/galaxy/${a.track}/${a.id}` })),
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Robot Hospital', path: '/kids/worlds/hospital' },
])

const FACTS = [
  { big: '3 : 1', small: 'motion scaling: 3 cm of hand movement becomes 1 cm at the tool' },
  { big: '8–12', small: 'times a second a human hand trembles — filters remove it' },
  { big: '0', small: 'decisions a surgical robot makes alone: the surgeon is in control' },
]

export default function HospitalWorldPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-3 pb-16 pt-3 sm:px-4">
        <nav aria-label="Breadcrumb">
          <Link
            href="/kids"
            className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/5 px-3 font-bold text-[#EEF2F8] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            ← Universe
          </Link>
        </nav>

        {/* Hero, in the world's own gradient */}
        <header className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${world.gradient} p-6 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-10`}>
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0A1120]/70 via-[#0A1120]/35 to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/20 to-transparent" />
          {/* heartbeat line */}
          <svg aria-hidden viewBox="0 0 600 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-1 h-10 w-full opacity-25">
            <path d="M0 40 H170 L190 40 L205 12 L222 70 L238 24 L250 40 H380 L398 40 L410 20 L424 62 L436 40 H600" fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round" />
          </svg>
          <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-rose-50">A world of the R2BOT Universe</p>
              <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">Robot Hospital</h1>
              <p className="mt-2 max-w-xl text-xl font-semibold text-rose-50">{world.tagline}</p>
              <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-white/90">
                Steady a surgeon’s robot, tune a bionic hand that listens to muscles, and send robots along the corridors — safely. Here robots never
                replace doctors and nurses: they give them steadier hands and more time for patients.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/kids/play/robot-surgeon"
                  className="inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] shadow-lg transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 motion-safe:active:scale-[.97]"
                >
                  ▶ Play Robot Hospital
                </Link>
                <a
                  href="#activities"
                  className="inline-flex min-h-[52px] items-center rounded-2xl border-2 border-white/60 bg-[#0A1120]/30 px-5 font-display text-lg font-bold text-white transition hover:bg-[#0A1120]/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                >
                  {activities.length} activities
                </a>
              </div>
            </div>
            <div aria-hidden className="hidden h-44 w-44 items-center justify-center rounded-full bg-[#0A1120]/30 text-[96px] ring-8 ring-white/15 md:flex">
              {world.emoji}
            </div>
          </div>
          <dl className="relative mt-6 grid gap-2 sm:grid-cols-3">
            {FACTS.map((f) => (
              <div key={f.big} className="rounded-2xl bg-[#0A1120]/45 px-4 py-3 backdrop-blur-sm">
                <dt className="font-display text-2xl font-bold text-white">{f.big}</dt>
                <dd className="text-[14px] leading-snug text-white/90">{f.small}</dd>
              </div>
            ))}
          </dl>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Flagship game */}
          <section aria-labelledby="flagship" className="self-start overflow-hidden rounded-[28px] border border-white/10 bg-[#111C32] shadow-[0_8px_24px_rgba(0,0,0,.45)]">
            <div className={`relative bg-gradient-to-r ${game.gradient} px-5 py-4`}>
              <div aria-hidden className="absolute inset-0 bg-[#0A1120]/30" />
              <p className="relative text-xs font-bold uppercase tracking-[0.18em] text-rose-50">Flagship game · {game.zone}</p>
              <h2 id="flagship" className="relative font-display text-2xl font-bold text-white">
                {game.emoji} {game.name}
              </h2>
            </div>
            <div className="p-5">
              <p className="text-[17px] leading-snug text-[#EEF2F8]">{game.hook}</p>
              <p className="mt-2 text-[15px] leading-snug text-[#A7B0C0]">
                A real model underneath every tier: laser safety fields and stopping distances, motion scaling and a low-pass tremor filter, a noisy
                muscle signal turned into grips, and a tele-operated tool with a spring-like contact force, a robot-side force limit and a 0.4 s delay.
              </p>
              <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                {TIER_NAMES.map((t, i) => (
                  <li key={t} className="rounded-2xl bg-white/5 px-3 py-2 text-[14px] text-[#A7B0C0]">
                    <b className="font-display text-amber-300">{t}</b> — {GAME_TIERS[i]}
                  </li>
                ))}
              </ol>
              <Link
                href="/kids/play/robot-surgeon"
                className="mt-4 inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-[.97]"
              >
                Start your shift →
              </Link>
            </div>
          </section>

          <aside>
            <HospitalProgressCard ids={activities.map((a) => a.id)} gameId={game.id} />
          </aside>
        </div>

        {/* What this world is about */}
        <article className="max-w-4xl text-[17px] leading-relaxed text-[#A7B0C0]">
          <h2 className="font-display text-3xl font-bold text-[#EEF2F8]">How robots help in hospitals</h2>
          <p className="mt-3">
            When people hear “robot surgeon” they often picture a machine operating by itself. That is not how it works. In robot-assisted surgery a
            surgeon sits at a console, looks into a 3D viewer and moves two hand controls; the robot copies every movement with slim instruments that
            enter the body through small cuts. The robot makes the surgeon’s movements smaller with <strong className="text-[#EEF2F8]">motion
            scaling</strong> and steadier with <strong className="text-[#EEF2F8]">tremor filtering</strong>, and it shows a magnified 3D picture. It makes
            no decisions of its own. Smaller cuts can mean less pain and a quicker recovery for many patients.
          </p>
          <p className="mt-3">
            Robots help far beyond the operating room. Delivery robots carry medicine, meals and clean sheets along corridors, calling lifts as they go.
            Ultraviolet disinfection robots shine germ-killing light into empty rooms. Rehabilitation robots and exoskeletons help people practise
            walking after a spinal injury or a stroke. Myoelectric prosthetic hands read the tiny electrical signals of the wearer’s own muscles to open
            and close. Soft companion robots comfort people in care homes. Every one of them is designed around one idea: keep people safe, and keep a
            person in charge.
          </p>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Real robots you will meet here</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-[#EEF2F8]">The da Vinci surgical system</strong>, first cleared for use in the USA in 2000 and now used in hospitals
              in many countries, always with a surgeon at the console.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">TUG delivery robots</strong>, which drive hospital corridors by themselves with laser and sonar sensors,
              carrying medicine and meals in locked drawers.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">UVD Robots</strong> from Denmark, ultraviolet disinfection robots that hospitals in many countries used
              during the 2020 pandemic.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">PARO</strong>, a soft robotic baby seal developed in Japan, used in care homes to calm and comfort people.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">ReWalk</strong>, an exoskeleton with motors at the hips and knees that helps some people with spinal cord
              injuries stand and walk.
            </li>
          </ul>

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
            The ideas climb with you. A six-year-old learns that surgery tools must be sterile and that a care robot should call a nurse, not lift a
            patient. A ten-year-old works out that 5:1 scaling turns 10 cm into 2 cm. A sixteen-year-old builds the interlock that freezes the instruments
            when the surgeon looks away — and discovers why a force limit on the robot itself matters most when the video is late.
          </p>
          <p className="mt-3 text-[15px] text-[#6E7888]">Everything here uses abstract shapes and practice pads — no real anatomy, nothing scary.</p>
        </article>

        {/* Activities by band */}
        <section id="activities" aria-labelledby="activities-title" className="scroll-mt-20">
          <h2 id="activities-title" className="font-display text-3xl font-bold text-[#EEF2F8]">
            Robot Hospital activities
          </h2>
          <p className="mt-1 text-[17px] text-[#A7B0C0]">Six for each age band, easiest first. Start with yours — or visit the next ward when you are ready.</p>
          <div className="mt-4">
            <HospitalActivities bands={bands} gameId={game.id} />
          </div>
        </section>
      </div>
    </>
  )
}
