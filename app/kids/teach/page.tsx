// app/kids/teach/page.tsx — R2BOT Kids for teachers: every Level 1 lesson plan
// (server component, SSG, indexable). Real server HTML: the four acts, the 24
// sessions with their objectives, and how the guides fit a school timetable.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { authorRef } from '@/lib/author'
import { guideIndex, LEVEL1_SESSION_COUNT } from '@/lib/kids/teach/guides'
import { TRAINING_MODULES, TRAINING_TOTAL_MINUTES } from '@/lib/kids/teach/training'
import { ShareToClassroom } from '@/components/kids/teach/ShareToClassroom'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/teach`

const TITLE = 'Robotics Lesson Plans for Ages 5–7: 24 Free Teacher Guides'
const DESCRIPTION =
  'Free, printable 40-minute robotics lesson plans for young children: unplugged warm-ups, minute-by-minute timing, discussion questions, misconceptions, differentiation and notes for families — for all 24 sessions of R2BOT Kids Level 1.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'R2BOT Kids — teacher guides for every session',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids teacher guides' }],
  },
}

export default function TeachIndexPage() {
  const acts = guideIndex()
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${PAGE_URL}#page`,
        name: TITLE,
        description: DESCRIPTION,
        url: PAGE_URL,
        inLanguage: 'en',
        author: authorRef(),
        audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
        isAccessibleForFree: true,
      },
      {
        '@type': 'ItemList',
        name: 'R2BOT Kids Level 1 teacher guides',
        numberOfItems: LEVEL1_SESSION_COUNT,
        itemListElement: acts.flatMap((a) => a.sessions).map((s) => ({
          '@type': 'ListItem',
          position: s.number,
          name: `Session ${s.number}: ${s.title}`,
          url: `${BASE}/kids/teach/1/${s.number}`,
        })),
      },
    ],
  }

  return (
    <div className="teach-doc mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />

      <header className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <p className="teach-accent text-sm font-bold uppercase tracking-wider text-amber-300">R2BOT Kids · For teachers</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-[1.08] text-white sm:text-6xl">
            Robotics lesson plans for ages 5–7
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-200">
            Every one of the {LEVEL1_SESSION_COUNT} sessions in Level 1 has a ready-to-teach guide: a 40-minute plan that counts every
            minute, an unplugged warm-up, what children do on screen, the questions to ask, the misconceptions to listen for, and a
            note to send home. Print it, download it as a PDF, or share it straight to Google Classroom.
          </p>
          <div className="teach-no-print mt-6 flex flex-wrap gap-3">
            <Link href="/kids/teach/1/1" className="inline-flex min-h-[48px] items-center rounded-xl bg-amber-500 px-5 font-bold text-[#1A1103] hover:bg-amber-400">Start with Session 1</Link>
            <Link href="/kids/teach/training" className="inline-flex min-h-[48px] items-center rounded-xl border border-white/15 bg-white/[0.04] px-5 font-bold text-white hover:bg-white/10">Teacher training ({TRAINING_TOTAL_MINUTES} min)</Link>
            <Link href="/kids/classroom" className="inline-flex min-h-[48px] items-center rounded-xl px-3 font-bold text-amber-300 hover:underline">Set up your class →</Link>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          {[
            ['24', 'sessions, 40 minutes each'],
            ['4', 'acts of six, one story'],
            ['0', 'accounts for children'],
            ['1', 'device per pair'],
          ].map(([n, label]) => (
            <div key={label} className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4">
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className="block font-display text-3xl font-bold text-amber-300">{n}</span>
                <span className="text-sm text-slate-300">{label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="mt-12" aria-labelledby="how-h">
        <h2 id="how-h" className="font-display text-2xl font-bold text-white">How a session runs</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Warm up, unplugged', 'Four minutes of a body game on the rug that acts out the day’s idea before any screen.'],
            ['Watch together', 'A short animated episode on the big screen, captions on, with a question for the class.'],
            ['Build, code, challenge', 'Pairs add a part to their robot, program it, and solve a mission in a physics simulator.'],
            ['Check and share', 'Three spoken questions, a badge, and two children show their run while you ask the discussion questions.'],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
              <span className="inline-grid h-8 w-8 place-items-center rounded-full bg-amber-500 font-display font-bold text-[#1A1103]">{i + 1}</span>
              <p className="mt-2 font-bold text-white">{t}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-300">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {acts.map((a, ai) => (
        <section key={a.act.title} className="mt-12" aria-labelledby={`act-${ai}`}>
          <p className="teach-accent text-xs font-bold uppercase tracking-wider text-amber-300">Act {ai + 1} · sessions {a.act.sessions[0]}–{a.act.sessions[1]}</p>
          <h2 id={`act-${ai}`} className="mt-1 font-display text-2xl font-bold text-white">{a.act.title}</h2>
          <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-slate-300">{a.act.summary}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {a.sessions.map((s) => (
              <li key={s.number} className="flex flex-col rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.35)] transition hover:border-amber-400/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Session {s.number}{s.kind === 'project' ? ' · Project' : ''}
                </p>
                <h3 className="mt-1 font-display text-lg font-bold text-white">
                  <Link href={`/kids/teach/1/${s.number}`} className="hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                    {s.title}
                  </Link>
                </h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-300">{s.objective}</p>
                <p className="mt-2 text-xs text-slate-400">{s.concepts.join(' · ')}</p>
                <div className="teach-no-print mt-3 flex flex-wrap items-center gap-2">
                  <Link href={`/kids/teach/1/${s.number}`} className="inline-flex min-h-[44px] items-center rounded-xl bg-amber-500/15 px-3 text-sm font-bold text-amber-200 hover:bg-amber-500/25">Open guide</Link>
                  <ShareToClassroom path={`/kids/course/1/${s.number}`} title={`Robotics: Session ${s.number} — ${s.title}`} variant="chip" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mt-14 grid gap-5 lg:grid-cols-2" aria-labelledby="more-h">
        <h2 id="more-h" className="sr-only">More for teachers</h2>
        <div className="rounded-[20px] border border-amber-400/30 bg-amber-500/[0.07] p-6">
          <h3 className="font-display text-xl font-bold text-white">Teacher training, with a certificate</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-200">
            {TRAINING_MODULES.length} short modules, about {TRAINING_TOTAL_MINUTES} minutes in all: {TRAINING_MODULES.map((m) => m.title.toLowerCase()).join(', ')}.
          </p>
          <Link href="/kids/teach/training" className="teach-no-print mt-4 inline-flex min-h-[48px] items-center rounded-xl bg-amber-500 px-5 font-bold text-[#1A1103] hover:bg-amber-400">Start the training</Link>
        </div>
        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-6">
          <h3 className="font-display text-xl font-bold text-white">Run it with your class</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-200">
            Create a class, put the join code on the wall, and assign sessions, Skill Galaxy activities or games with due dates.
            Children join with a code and a nickname — no email, no password, no account. Teaching with colleagues? Create a school
            and see every class in one place.
          </p>
          <div className="teach-no-print mt-4 flex flex-wrap gap-3">
            <Link href="/kids/classroom" className="inline-flex min-h-[48px] items-center rounded-xl border border-white/15 px-5 font-bold text-white hover:bg-white/10">Open the Classroom</Link>
            <Link href="/kids/schools" className="inline-flex min-h-[48px] items-center rounded-xl px-3 font-bold text-amber-300 hover:underline">R2BOT Kids for schools →</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
