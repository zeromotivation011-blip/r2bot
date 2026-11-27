// app/kids/teach/unplugged/page.tsx — unplugged robotics lessons for
// classrooms with no devices (roadmap #85). Server component, SSG, indexable.
// One no-device version of every Level 1 session, plus the four printable
// kits (command cards, floor grid, sorting cards, paper gears) on one page.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { authorRef } from '@/lib/author'
import { allUnpluggedLessons, CARD_ORDER, KIT_LABEL, type KitId } from '@/lib/kids/unplugged'
import { CardMeanings, CommandCardSheet, PaperGears } from './printables'
import PrintButtonClient from './PrintButtonClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/teach/unplugged`
const TITLE = 'Unplugged Robotics Lessons for Ages 5–7: No Devices Needed'
const DESCRIPTION =
  '24 free unplugged robotics lessons for a classroom with no computers or one projector: human-robot floor-grid games, printable command cards, sense–think–act sorting cards and paper gears. Each follows a Level 1 R2BOT Kids session, 40 minutes, with a hands-up check.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { type: 'website', url: PAGE_URL, siteName: 'R2BOT', title: 'R2BOT Kids — unplugged robotics lessons', description: DESCRIPTION, images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Unplugged robotics lessons' }] },
}

const card = 'rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6'

export default function UnpluggedIndexPage() {
  const lessons = allUnpluggedLessons()
  const missions = lessons.filter((l) => l.mission).length
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': `${PAGE_URL}#page`, name: TITLE, description: DESCRIPTION, url: PAGE_URL, inLanguage: 'en', author: authorRef(), isAccessibleForFree: true, audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' } },
      {
        '@type': 'ItemList',
        name: 'Unplugged Level 1 lessons',
        numberOfItems: lessons.length,
        itemListElement: lessons.map((l, i) => ({ '@type': 'ListItem', position: i + 1, name: `Lesson ${l.number}: ${l.title}`, url: `${BASE}${l.href}` })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'R2BOT Kids', item: `${BASE}/kids` },
          { '@type': 'ListItem', position: 2, name: 'Teacher guides', item: `${BASE}/kids/teach` },
          { '@type': 'ListItem', position: 3, name: 'Unplugged lessons', item: PAGE_URL },
        ],
      },
    ],
  }
  const kitCount = (k: KitId) => lessons.filter((l) => l.kits.includes(k)).length

  return (
    <div className="teach-doc mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <nav aria-label="Breadcrumb" className="teach-no-print text-sm">
        <Link href="/kids/teach" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">← Teacher guides</Link>
      </nav>
      <header>
        <p className="teach-accent text-sm font-bold uppercase tracking-wider text-amber-300">R2BOT Kids · For teachers · No devices</p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-[1.08] text-white sm:text-6xl">Unplugged robotics lessons</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-200">
          Many classrooms have one device, a projector, or nothing at all. Robotics still works there. Every one of the{' '}
          {lessons.length} Level 1 sessions (ages 5–7) has a no-device version that teaches the same idea with the body, paper
          and things every school has: children program a classmate on a floor grid with command cards, sort pictures into
          sense, think and act, and turn paper gears.
        </p>
        <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-slate-300">
          Each lesson is 40 minutes: a warm-up game, the story told aloud, the main activity, a hands-up check where children
          answer with their fingers (no names, no scores), and a share circle. The cards carry the same words and pictures as
          the on-screen blocks, so a class can move between paper and a tablet without learning anything twice.
        </p>
      </header>

      <section className="mt-10" aria-labelledby="kits-h">
        <h2 id="kits-h" className="font-display text-2xl font-bold text-white">The four printable kits</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(['command-cards', 'floor-grid', 'sorting', 'paper-gears'] as const).map((k) => (
            <li key={k} className={card}>
              <p className="font-display text-lg font-bold text-white">{KIT_LABEL[k].name}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-300">{KIT_LABEL[k].line}</p>
              <p className="mt-2 text-sm font-bold text-amber-300">Used in {kitCount(k)} lessons</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-slate-300">
          The {missions} floor-grid missions are small — never more than six squares a side — so they fit a classroom rug, a
          corridor or a yard. Each comes with an answer key that has been played through square by square, and two of them
          come with a deliberately buggy program for the class to fix.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="list-h">
        <h2 id="list-h" className="font-display text-2xl font-bold text-white">All {lessons.length} lessons</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-2">
          {lessons.map((l) => (
            <li key={l.number}>
              <Link href={l.href} className="block min-h-[44px] rounded-[20px] border border-white/10 bg-white/[0.03] p-4 hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                <span className="text-sm font-bold text-amber-300">Lesson {l.number}{l.kind === 'project' ? ' · project' : ''}</span>
                <span className="mt-0.5 block font-display text-lg font-bold text-white">{l.title}</span>
                <span className="mt-1 block text-[15px] leading-relaxed text-slate-300">{l.idea}</span>
                <span className="mt-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">{l.kits.map((k) => KIT_LABEL[k].name).join(' · ')}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${card} mt-12 print:[break-before:page]`} aria-labelledby="all-cards-h">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="all-cards-h" className="font-display text-2xl font-bold text-white">The full card set</h2>
          <div className="teach-no-print"><PrintButtonClient label="Print the card set" /></div>
        </div>
        <p className="mt-2 text-[15px] text-slate-300">One copy of every command card used in Level 1. Print on card, cut out, and keep them in an envelope for the term.</p>
        <div className="mt-4"><CommandCardSheet cards={CARD_ORDER} copies={1} /></div>
        <h3 className="mt-6 font-bold text-white">What each card means</h3>
        <div className="mt-2"><CardMeanings cards={CARD_ORDER} /></div>
      </section>

      <section className={`${card} mt-10`} aria-labelledby="gears-h">
        <h2 id="gears-h" className="font-display text-2xl font-bold text-white">Paper gears template</h2>
        <div className="mt-3"><PaperGears /></div>
      </section>

      <section className="mt-10 max-w-3xl" aria-labelledby="tips-h">
        <h2 id="tips-h" className="font-display text-2xl font-bold text-white">Running a human-robot game well</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-slate-200">
          <li>The robot does exactly what the cards say, even when the cards are wrong. That is how a class discovers a bug.</li>
          <li>Let the class read each card aloud as the robot does it. Non-readers follow the pictures.</li>
          <li>Rotate the robot role so every child is a programmer and a robot at least once. A child who prefers not to move can be the card reader or the “bridge keeper”.</li>
          <li>Eyes closed is always optional. A robot that looks at the floor works just as well.</li>
          <li>Praise the plan and the fix, never the speed. There are no scores and no winners.</li>
        </ul>
      </section>
    </div>
  )
}
