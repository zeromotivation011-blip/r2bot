// app/kids/grown-ups/page.tsx — the ONE front door for grown-ups (roadmap #20).
//
// Parents, teachers, school leaders and data officers start here: what R2BOT
// Kids is, the promises it keeps about children, and one card per grown-up
// place (Parents, Teachers, Teacher classroom, Schools, Trust Pack, children's
// privacy, the main R2BOT site). Server-rendered and indexable; the cards are
// gated by the parental gate (GrownUpDoorsClient). It is the single grown-up
// link in the kids footer, so a child meets one door instead of six.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { GAMES, WORLDS, numberWord } from '@/lib/kids/universe/worlds'
import { KIDS_GROWNUP_DOORS } from '@/lib/kids/nav'
import { GrownUpDoorsClient } from './GrownUpDoorsClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/grown-ups`
const TITLE = 'R2BOT Kids for grown-ups: parents, teachers and schools'
const DESCRIPTION =
  'One place for the adults around a young robotics learner: the parent hub and device controls, teacher guides and the classroom, school pilots, the Trust Pack and children’s privacy.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'R2BOT Kids for grown-ups',
    description: DESCRIPTION,
    // The kids share card (app/kids/opengraph-image.tsx); a page that sets openGraph does not inherit it.
    images: [{ url: `${BASE}/kids/opengraph-image`, width: 1200, height: 630, alt: 'R2BOT Kids: explore the Robot Universe, ages 5 to 17' }],
  },
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)

const PROMISES: { t: string; d: string }[] = [
  {
    t: 'No personal data from children',
    d: 'Children never give an email address, password, phone number, birthday or photo. They pick an explorer nickname, and that is all R2BOT Kids ever asks of them.',
  },
  {
    t: 'Progress stays on the device',
    d: 'Stars, badges, ranks and the robot are saved in the browser. A backup code moves them to another device without an account. If a teacher sets up a class, only counts are shared with that class, never answers or free text.',
  },
  {
    t: 'A grown-up gate on every way out',
    d: 'Pages for adults, links that leave R2BOT Kids, the camera and the share buttons all ask a quick grown-up question first. A parent can switch links out, the camera and the Ask Spark helper off on the device.',
  },
  {
    t: 'Rewards for learning, never for time',
    d: 'Children earn experience for finishing things and beating their own best. There are no leaderboards, no comparing children with each other and no streak that punishes a missed day.',
  },
  {
    t: 'Gentle time limits, never a lock',
    d: 'A daily time budget and quiet hours show a kind “time for a break” note. Nothing is cut off mid-mission, so a child always gets to finish what they started.',
  },
  {
    t: 'Help when a child needs it',
    d: 'If a child tells the Ask Spark helper they are being hurt or feel unsafe, it answers kindly and shows a children’s helpline for their region. That help is never behind the gate or a switch.',
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${PAGE_URL}#page`,
      url: PAGE_URL,
      name: TITLE,
      description: DESCRIPTION,
      isPartOf: { '@id': `${BASE}/#website` },
      audience: { '@type': 'Audience', audienceType: 'parents, teachers and school leaders' },
      hasPart: KIDS_GROWNUP_DOORS.filter((d) => !d.leaves).map((d) => ({ '@type': 'WebPage', name: d.label, url: `${BASE}${d.href}` })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'R2BOT Kids', item: `${BASE}/kids` },
        { '@type': 'ListItem', position: 2, name: 'For grown-ups', item: PAGE_URL },
      ],
    },
  ],
}

export default function GrownUpsPage() {
  const bands = KIDS_BANDS.map((b) => `${b.name} (${b.ages})`).join(', ')
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pt-10">
        <nav aria-label="Breadcrumb" className="text-[15px] text-[#A7B0C0]">
          <Link href="/kids" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">
            R2BOT Kids
          </Link>
          <span aria-hidden className="mx-2">
            /
          </span>
          <span aria-current="page">For grown-ups</span>
        </nav>

        <header className="mt-2 max-w-3xl">
          <p className="text-[13px] font-bold uppercase tracking-[.14em] text-amber-300">For parents, teachers and schools</p>
          <h1 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight text-[#EEF2F8] sm:text-[44px]">
            The grown-ups’ door to R2BOT Kids
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-[#A7B0C0]">
            R2BOT Kids is a robotics universe for ages 5 to 17. Children follow a story-led course on their own planet, build and
            code one robot that grows with them, and play {numberWord(GAMES.length)} games that run on real engineering: feedback
            control, kinematics, circuits, mapping and machine learning. {cap(numberWord(WORLDS.length))} worlds show where robots
            really work, from the deep sea to a space station. Everything runs in a web browser, with no kit and no account.
          </p>
          <p className="mt-3 text-[17px] leading-relaxed text-[#A7B0C0]">
            This page is for the adults around a young learner. Every grown-up place is listed once below. Each card asks a quick
            grown-up question the first time you open one, so a child exploring on their own does not wander into the settings or
            out of R2BOT Kids.
          </p>
        </header>

        <section className="mt-8" aria-labelledby="doors-h">
          <h2 id="doors-h" className="font-display text-2xl font-bold text-[#EEF2F8]">
            Where would you like to go?
          </h2>
          <div className="mt-4">
            <GrownUpDoorsClient />
          </div>
        </section>

        <section className="mt-12" aria-labelledby="promises-h">
          <h2 id="promises-h" className="font-display text-2xl font-bold text-[#EEF2F8]">
            What R2BOT Kids promises every child
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {PROMISES.map((p) => (
              <li key={p.t} className="rounded-[20px] border border-white/10 bg-[#111C32] p-5">
                <h3 className="font-display text-lg font-bold text-[#EEF2F8]">{p.t}</h3>
                <p className="mt-1 text-[16px] leading-relaxed text-[#A7B0C0]">{p.d}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-2" aria-label="How it fits home and school">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#EEF2F8]">At home</h2>
            <p className="mt-2 text-[16px] leading-relaxed text-[#A7B0C0]">
              Children choose their age group the first time they play: {bands}. The age group sets their course planet, the
              difficulty a game starts on and the missions they see each day. Brothers and sisters can share one tablet with their
              own profiles, and younger children unlock theirs with a three-picture password instead of anything to type. The
              parent hub shows the week in plain words, the robot your child built, the skills they are growing and one robotics
              idea to try together at the kitchen table.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-[#EEF2F8]">At school and in clubs</h2>
            <p className="mt-2 text-[16px] leading-relaxed text-[#A7B0C0]">
              Teachers create a class in a minute and print join cards; children join with the class code and their nickname. Each
              of the four levels has a teacher guide for every session, unplugged lessons for days without devices, maps to
              national standards and a Present mode for the classroom board. The class view shows progress by concept and where
              children are stuck, as counts only. The Trust Pack sets out exactly what a class shares, for your records and your
              data officer.
            </p>
          </div>
        </section>
      </div>
    </>
  )
}
