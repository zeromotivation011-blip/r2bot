// app/kids/teach/unplugged/[session]/page.tsx — the no-device version of one
// Level 1 session (roadmap #85): a 40-minute plan, the story told aloud, the
// human-robot floor-grid mission with its answer key, cut-out command cards,
// sorting cards, paper gears, a hands-up check and the note for families.
// Server component, SSG, indexable: teachers search for "unplugged robotics
// lesson" and this is complete, printable server HTML.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { jsonldScript } from '@/lib/seo/jsonld'
import { authorRef } from '@/lib/author'
import { allUnpluggedLessons, unpluggedLesson, KIT_LABEL, type UnpluggedLesson } from '@/lib/kids/unplugged'
import { CardMeanings, CommandCardSheet, FloorGridMap, PaperGears, SortingSheet } from '../printables'
import PrintButtonClient from '../PrintButtonClient'

export const runtime = 'nodejs'
export const dynamicParams = false

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

type Params = { params: Promise<{ session: string }> }

export function generateStaticParams() {
  return allUnpluggedLessons().map((l) => ({ session: String(l.number) }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const l = unpluggedLesson((await params).session)
  if (!l) return {}
  const url = `${BASE}${l.href}`
  const title = `Unplugged Robotics Lesson ${l.number}: ${l.title} — No Devices Needed, Ages 5–7`
  const description = `A 40-minute robotics lesson with no screens: ${l.idea} Human-robot floor grid, printable command cards${l.sorting ? ', sense–think–act sorting cards' : ''}${l.gears ? ', paper gears' : ''}, a hands-up check and a note for families.`
  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical: url },
    openGraph: { type: 'article', url, siteName: 'R2BOT', title: `Unplugged lesson ${l.number}: ${l.title}`, description: l.idea, images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids unplugged lesson' }] },
  }
}

function jsonLd(l: UnpluggedLesson) {
  const url = `${BASE}${l.href}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LearningResource',
        '@id': `${url}#lesson`,
        name: `Unplugged lesson ${l.number}: ${l.title}`,
        description: l.idea,
        url,
        inLanguage: 'en',
        learningResourceType: 'Lesson plan',
        educationalLevel: 'Ages 5–7 (Explorers)',
        audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
        timeRequired: 'PT40M',
        teaches: l.iCan,
        keywords: 'unplugged robotics, unplugged computing, human robot game, command cards, no devices',
        isAccessibleForFree: true,
        author: authorRef(),
        publisher: { '@type': 'Organization', name: 'R2BOT', url: BASE },
        isPartOf: { '@type': 'Course', name: 'R2BOT Kids Level 1 — Explorers', url: `${BASE}/kids/course/1` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'R2BOT Kids', item: `${BASE}/kids` },
          { '@type': 'ListItem', position: 2, name: 'Teacher guides', item: `${BASE}/kids/teach` },
          { '@type': 'ListItem', position: 3, name: 'Unplugged lessons', item: `${BASE}/kids/teach/unplugged` },
          { '@type': 'ListItem', position: 4, name: `Lesson ${l.number}: ${l.title}`, item: url },
        ],
      },
    ],
  }
}

const card = 'rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6'
const h2 = 'font-display text-2xl font-bold text-white'

export default async function UnpluggedLessonPage({ params }: Params) {
  const l = unpluggedLesson((await params).session)
  if (!l) notFound()
  const presentHref = `/kids/present?session=1-${l.number}&unplugged=1`

  return (
    <article className="teach-doc mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd(l)) }} />

      <nav aria-label="Breadcrumb" className="teach-no-print text-sm text-slate-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/kids/teach" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">Teacher guides</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/kids/teach/unplugged" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">Unplugged</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page">Lesson {l.number}</li>
        </ol>
      </nav>

      <header className="mt-3">
        <p className="teach-accent text-sm font-bold uppercase tracking-wider text-amber-300">
          Unplugged · Level 1 · Lesson {l.number} of 24 · 40 minutes · no devices
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-white sm:text-5xl">{l.title}</h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-200">{l.idea}</p>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-300">
          This is the no-screen version of Level 1, session {l.number}. It teaches the same idea as the on-screen session, with
          the same words and the same picture blocks on paper, so a class can do one, the other, or both. Everything you need
          to print is on this page.
        </p>
        <div className="teach-no-print mt-5 flex flex-wrap gap-3">
          <PrintButtonClient />
          <Link href={presentHref} className="inline-flex min-h-[48px] items-center rounded-xl border border-white/15 bg-white/[0.04] px-5 font-bold text-white hover:bg-white/10">Present to the class</Link>
          <Link href={l.guideHref} className="inline-flex min-h-[48px] items-center rounded-xl px-3 font-bold text-amber-300 hover:underline">On-screen teacher guide →</Link>
        </div>
      </header>

      <section className={`${card} mt-8`} aria-labelledby="ican-h">
        <h2 id="ican-h" className={h2}>By the end, children can say</h2>
        <ul className="mt-3 space-y-2">
          {l.iCan.map((t) => (
            <li key={t} className="flex gap-2 text-[17px] text-slate-100"><span aria-hidden className="text-amber-300">★</span>{t}</li>
          ))}
        </ul>
        <h3 className="mt-5 font-bold text-white">You will need</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-slate-300">
          {l.materials.map((m) => <li key={m}>{m}</li>)}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="plan-h">
        <h2 id="plan-h" className={h2}>The 40-minute plan</h2>
        <ol className="mt-4 space-y-4">
          {l.plan.map((p, i) => (
            <li key={p.title} className={card}>
              <p className="teach-accent text-sm font-bold uppercase tracking-wider text-amber-300">{p.minutes} minutes · part {i + 1}</p>
              <h3 className="mt-1 font-display text-xl font-bold text-white">{p.title}</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[16px] leading-relaxed text-slate-200">
                {p.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
            </li>
          ))}
        </ol>
      </section>

      {l.mission && (
        <section className={`${card} mt-10`} aria-labelledby="mission-h">
          <h2 id="mission-h" className={h2}>Human-robot mission: {l.mission.title}</h2>
          <p className="mt-2 text-[17px] text-slate-200">{l.mission.ask}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-300">
            Mark out the map on the floor with tape or chalk, one square per sheet of paper or floor tile, about a big step
            across. At desks, pairs can use the same map on paper with a counter as the robot. The class lays out the cards;
            one child is the robot and does exactly what the cards say — even when the cards are wrong.
          </p>
          <div className="mt-5 grid gap-6 md:grid-cols-2 md:items-start">
            <FloorGridMap mission={l.mission} />
            <div>
              <h3 className="font-bold text-white">Cards for this mission</h3>
              <p className="mt-1 text-[15px] text-slate-300">{l.mission.deck.length} kinds of card. Print the card sheet below.</p>
              <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <summary className="min-h-[44px] cursor-pointer font-bold text-amber-300">Answer key (for the teacher)</summary>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-200">{l.answerKey}</p>
                {l.buggyKey && (
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-300">
                    <strong className="text-white">The buggy program to lay out:</strong> {l.buggyKey}
                  </p>
                )}
                <p className="mt-2 text-sm text-slate-400">Other programs can work too: if the robot reaches the goal by the rules, it counts.</p>
              </details>
            </div>
          </div>
        </section>
      )}

      {l.sorting && (
        <section className={`${card} mt-10`} aria-labelledby="sort-h">
          <h2 id="sort-h" className={h2}>Sense, think, act: sorting cards</h2>
          <p className="mt-2 text-[15px] text-slate-300">Cut out the three header cards and the picture cards. Groups lay each picture under a header and explain why.</p>
          <div className="mt-4"><SortingSheet prompt={l.sorting.prompt} items={l.sorting.items} /></div>
          <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <summary className="min-h-[44px] cursor-pointer font-bold text-amber-300">Answers</summary>
            <ul className="mt-2 grid gap-1 text-[15px] text-slate-200 sm:grid-cols-2">
              {l.sorting.items.map((i) => <li key={i.text}>{i.text}: <strong className="uppercase">{i.answer}</strong></li>)}
            </ul>
          </details>
        </section>
      )}

      {l.gears && (
        <section className={`${card} mt-10`} aria-labelledby="gear-h">
          <h2 id="gear-h" className={h2}>Paper gears: {l.gears.title}</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[16px] text-slate-200">
            {l.gears.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
          <div className="mt-4"><PaperGears /></div>
        </section>
      )}

      <section className={`${card} mt-10 print:[break-before:page]`} aria-labelledby="cards-h">
        <h2 id="cards-h" className={h2}>Command cards to cut out</h2>
        <p className="mt-2 text-[15px] text-slate-300">
          Two copies of each card. The cards use the same words and pictures as the blocks on screen, so the class meets
          them again when they get a device. Laminate a set to keep for every lesson.
        </p>
        <div className="mt-4"><CommandCardSheet cards={l.cards} /></div>
        <h3 className="mt-6 font-bold text-white">What each card means for the human robot</h3>
        <div className="mt-2"><CardMeanings cards={l.cards} /></div>
      </section>

      <section className={`${card} mt-10`} aria-labelledby="check-h">
        <h2 id="check-h" className={h2}>Hands-up check</h2>
        <p className="mt-2 text-[15px] text-slate-300">Read each question aloud. Children show one, two or three fingers. Count the hands, then read why.</p>
        <ol className="mt-4 space-y-4">
          {l.check.map((q, i) => (
            <li key={q.prompt}>
              <p className="font-bold text-white">{i + 1}. {q.prompt}</p>
              <ol className="mt-1 space-y-1 text-[16px] text-slate-200">
                {q.options.map((o, j) => (
                  <li key={o.text}>{j + 1} finger{j ? 's' : ''}: <span aria-hidden>{o.icon} </span>{o.text}{j === q.answer ? ' ✓' : ''}</li>
                ))}
              </ol>
              <p className="mt-1 text-[15px] text-slate-300"><strong className="text-white">Why:</strong> {q.why}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${card} mt-10`} aria-labelledby="disc-h">
        <h2 id="disc-h" className={h2}>Questions to ask the class</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[16px] text-slate-200">
          {l.discussion.map((d) => <li key={d}>{d}</li>)}
        </ul>
        <h3 className="mt-5 font-bold text-white">With one screen or a projector</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-slate-300">
          {l.withOneScreen.map((d) => <li key={d}>{d}</li>)}
        </ul>
      </section>

      <section className={`${card} mt-10`} aria-labelledby="home-h">
        <h2 id="home-h" className={h2}>Note for families</h2>
        <p className="mt-2 text-[16px] text-slate-200"><strong className="text-white">Today:</strong> {l.parent.today}</p>
        <p className="mt-2 text-[16px] text-slate-200"><strong className="text-white">Try at home:</strong> {l.parent.tryAtHome}</p>
        <p className="mt-2 text-[16px] text-slate-200"><strong className="text-white">Ask your child:</strong> {l.parent.askYourChild}</p>
      </section>

      <section className="teach-no-print mt-10" aria-labelledby="kit-h">
        <h2 id="kit-h" className="font-display text-xl font-bold text-white">The kits in this lesson</h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {l.kits.map((k) => (
            <li key={k} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[15px] text-slate-300"><strong className="text-white">{KIT_LABEL[k].name}.</strong> {KIT_LABEL[k].line}</li>
          ))}
        </ul>
      </section>

      <nav aria-label="More unplugged lessons" className="teach-no-print mt-10 flex flex-wrap justify-between gap-3">
        {l.prev ? (
          <Link href={`/kids/teach/unplugged/${l.prev.number}`} className="inline-flex min-h-[48px] items-center rounded-xl border border-white/15 bg-white/[0.04] px-4 font-bold text-white hover:bg-white/10">← Lesson {l.prev.number}: {l.prev.title}</Link>
        ) : <span />}
        {l.next && (
          <Link href={`/kids/teach/unplugged/${l.next.number}`} className="inline-flex min-h-[48px] items-center rounded-xl border border-white/15 bg-white/[0.04] px-4 font-bold text-white hover:bg-white/10">Lesson {l.next.number}: {l.next.title} →</Link>
        )}
      </nav>
    </article>
  )
}
