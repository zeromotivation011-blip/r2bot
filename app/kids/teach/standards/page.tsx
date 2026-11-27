// app/kids/teach/standards/page.tsx — R2BOT Kids standards alignment (roadmap
// #31): every level mapped to CSTA, NGSS, England's National Curriculum (KS1–3)
// and NEP 2020, with the exact sessions behind each standard. Server component,
// SSG, indexable: heads of department search for "robotics curriculum CSTA
// alignment" and need this to timetable the course. Built from
// lib/kids/curriculum/mapping.ts via lib/kids/classroom-standards.ts; a PDF per
// level is made on the device.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { authorRef } from '@/lib/author'
import { allStandards, STANDARDS_UPDATED, type StandardsLevel } from '@/lib/kids/classroom-standards'
import StandardsPdfButtonClient from './StandardsPdfButtonClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/teach/standards`

const TITLE = 'Robotics Curriculum Standards Alignment: CSTA, NGSS, UK National Curriculum and NEP 2020'
const DESCRIPTION =
  'How each R2BOT Kids level (ages 5–17) lines up with the CSTA K–12 Computer Science Standards, NGSS engineering design, England’s National Curriculum for computing and design and technology (KS1–3) and India’s NEP 2020, session by session, with a printable PDF per level.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'R2BOT Kids — standards alignment for every level',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids standards alignment' }],
  },
}

function Sessions({ level, ns }: { level: number; ns: number[] }) {
  if (!ns.length) return <span className="text-slate-400">Across the level</span>
  return (
    <span className="flex flex-wrap gap-1">
      {ns.map((n) => (
        <Link
          key={n}
          href={`/kids/teach/${level}/${n}`}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-1.5 text-sm font-bold text-cyan-200 hover:border-cyan-300/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          aria-label={`Level ${level}, session ${n} teacher guide`}
        >
          {n}
        </Link>
      ))}
    </span>
  )
}

function LevelSection({ lv }: { lv: StandardsLevel }) {
  const focus = lv.csta.filter((c) => c.focus)
  const extra = lv.csta.filter((c) => !c.focus)
  return (
    <section id={`level-${lv.level}`} className="mt-16 scroll-mt-4" aria-labelledby={`lv-${lv.level}-h`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="teach-accent text-sm font-bold uppercase tracking-wider text-amber-300">
            Level {lv.level} · {lv.band} · ages {lv.ages} · {lv.sessionCount} sessions
          </p>
          <h2 id={`lv-${lv.level}-h`} className="mt-1 font-display text-3xl font-bold text-white">{lv.season}</h2>
          <p className="mt-1 text-[15px] text-slate-300">CSTA level {lv.cstaLevel}: {lv.cstaGrades}.</p>
        </div>
        <StandardsPdfButtonClient level={lv} />
      </div>

      <h3 className="mt-6 font-display text-xl font-bold text-white">CSTA K–12 Computer Science Standards</h3>
      <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-slate-300">
        The first {focus.length} are this level’s focus: the sessions listed address them directly. The rest are touched on
        along the way (“contributes”). Tap a session number to open its lesson plan.
      </p>
      <div className="mt-3 overflow-x-auto rounded-[20px] border border-white/10 bg-white/[0.02]">
        <table className="w-full min-w-[640px] text-left text-[15px]">
          <caption className="sr-only">CSTA standards for Level {lv.level} and the sessions that address them</caption>
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-3">Standard</th>
              <th scope="col" className="px-3 py-3">What it asks (our paraphrase)</th>
              <th scope="col" className="px-3 py-3">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {[...focus, ...extra].map((c) => (
              <tr key={c.id} className="border-b border-white/5 align-top last:border-0">
                <th scope="row" className="whitespace-nowrap px-4 py-3 font-mono text-sm font-bold text-white">
                  {c.id}
                  <span className={`mt-1 block w-fit rounded-full px-2 py-0.5 font-body text-[11px] font-bold ${c.focus || c.strength === 'addresses' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/10 text-slate-300'}`}>
                    {c.focus ? 'Focus' : c.strength === 'addresses' ? 'Addresses' : 'Contributes'}
                  </span>
                </th>
                <td className="px-3 py-3 text-slate-200">{c.summary}</td>
                <td className="px-3 py-3"><Sessions level={lv.level} ns={c.sessions} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lv.cstaNotCovered.length > 0 && (
        <div className="mt-3 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
          <h4 className="font-bold text-white">Not covered at this level</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-slate-300">
            {lv.cstaNotCovered.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="font-display text-xl font-bold text-white">England: National Curriculum</h3>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-300">{lv.uk.stage}</p>
          <ul className="mt-3 space-y-3">
            {lv.uk.statements.map((s) => (
              <li key={s.text} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">{s.subject}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-slate-100">{s.text}</p>
                <div className="mt-2"><Sessions level={lv.level} ns={s.sessions} /></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-5">
          <div>
            <h3 className="font-display text-xl font-bold text-white">NGSS</h3>
            {lv.ngss.length === 0 ? (
              <p className="mt-1 text-[15px] text-slate-300">No direct NGSS performance expectation at this level.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {lv.ngss.map((n) => (
                  <li key={n.id} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="font-mono text-sm font-bold text-white">{n.id}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-slate-100">{n.summary}</p>
                    <div className="mt-2"><Sessions level={lv.level} ns={n.sessions} /></div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
            <h3 className="font-display text-xl font-bold text-white">India: NEP 2020</h3>
            <p className="mt-1 text-[15px] font-semibold text-slate-200">{lv.india.stage}</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-300">
              {lv.india.themes.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <p className="mt-2 text-xs text-slate-400">NEP 2020 and CBSE publish no coded outcomes for this, so none are given.</p>
          </div>
        </div>
      </div>

      <h3 className="mt-8 font-display text-xl font-bold text-white">The concepts at this level</h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lv.concepts.map((c) => (
          <li key={c.id} className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4">
            <p className="font-bold text-white">{c.name}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{c.spiral}</p>
            <div className="mt-2"><Sessions level={lv.level} ns={c.sessions} /></div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function StandardsPage() {
  const levels = allStandards()
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${PAGE_URL}#page`,
        name: TITLE,
        description: DESCRIPTION,
        url: PAGE_URL,
        inLanguage: 'en',
        dateModified: STANDARDS_UPDATED,
        author: authorRef(),
        audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
        isAccessibleForFree: true,
      },
      ...levels.map((lv) => ({
        '@type': 'Course',
        '@id': `${PAGE_URL}#level-${lv.level}`,
        name: `R2BOT Kids Level ${lv.level}: ${lv.season}`,
        description: `${lv.sessionCount} robotics sessions for ages ${lv.ages}, aligned to CSTA level ${lv.cstaLevel}.`,
        provider: { '@type': 'Organization', name: 'R2BOT', url: BASE },
        educationalLevel: `Ages ${lv.ages}`,
        isAccessibleForFree: true,
        url: `${BASE}/kids/teach#level-${lv.level}`,
        educationalAlignment: lv.csta.filter((c) => c.focus).map((c) => ({
          '@type': 'AlignmentObject',
          alignmentType: 'teaches',
          educationalFramework: 'CSTA K-12 Computer Science Standards (2017)',
          targetName: c.id,
          targetDescription: c.summary,
        })),
      })),
    ],
  }

  return (
    <div className="teach-doc mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <nav aria-label="Breadcrumb" className="teach-no-print text-sm">
        <Link href="/kids/teach" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">← All lesson plans</Link>
      </nav>
      <header className="mt-2 max-w-3xl">
        <p className="teach-accent text-sm font-bold uppercase tracking-wider text-amber-300">R2BOT Kids · For teachers and heads of department</p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-[1.08] text-white sm:text-5xl">Standards alignment, session by session</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-200">
          R2BOT Kids is a four-level robotics course: 96 forty-minute sessions from age 5 to 17. Every session has written learning
          objectives, and every objective is tagged with what it teaches. This page turns those tags into the frameworks schools
          plan against — the CSTA K–12 Computer Science Standards, NGSS engineering design, England’s National Curriculum for
          computing and design and technology, and India’s National Education Policy 2020 — and lists the exact sessions behind
          each one, so you can see where a standard is taught before you timetable it.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-300">
          A standard marked <strong className="text-emerald-200">Focus</strong> is one the level sets out to teach; sessions that only
          touch a standard in passing are marked <strong className="text-slate-100">Contributes</strong>. Each level also lists what it
          does not cover, so nothing is over-claimed. Download a level as a PDF for a department meeting, or print this page.
        </p>
        <nav aria-label="Levels" className="teach-no-print mt-5 flex flex-wrap gap-2">
          {levels.map((lv) => (
            <a key={lv.level} href={`#level-${lv.level}`} className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
              Level {lv.level} · {lv.band} ({lv.ages})
            </a>
          ))}
        </nav>
      </header>

      <section className="mt-10 grid gap-4 md:grid-cols-3" aria-labelledby="how-h">
        <h2 id="how-h" className="sr-only">How the alignment works</h2>
        {[
          ['From objectives, not marketing', 'Each session’s objectives carry tags (algorithms, programming, debugging, data, design…) and concepts. Fixed rules turn those into standard ids; nothing is matched by hand to look good.'],
          ['Real ids, our words', 'CSTA and NGSS ids are the real ones; the descriptions are paraphrased. England’s statements are paraphrased from the programmes of study, which have no codes, so none are invented.'],
          ['Evidence in the classroom', 'In a class, the teacher’s gradebook shows each child against the same concepts, with the Skill Galaxy runs and course checks behind every cell, ready to export as CSV or PDF.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5">
            <h3 className="font-bold text-white">{t}</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-300">{d}</p>
          </div>
        ))}
      </section>

      {levels.map((lv) => <LevelSection key={lv.level} lv={lv} />)}

      <section className="mt-16 rounded-[20px] border border-amber-400/30 bg-amber-500/[0.07] p-6" aria-labelledby="note-h">
        <h2 id="note-h" className="font-display text-xl font-bold text-white">An honest note</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-200">{levels[0].disclaimer}</p>
        <div className="teach-no-print mt-4 flex flex-wrap gap-3">
          <Link href="/kids/teach" className="inline-flex min-h-[48px] items-center rounded-xl bg-amber-500 px-5 font-bold text-[#1A1103] hover:bg-amber-400">Open the lesson plans</Link>
          <Link href="/kids/classroom" className="inline-flex min-h-[48px] items-center rounded-xl border border-white/15 bg-white/[0.04] px-5 font-bold text-white hover:bg-white/10">Set up a class</Link>
          <Link href="/kids/schools" className="inline-flex min-h-[48px] items-center rounded-xl px-3 font-bold text-amber-300 hover:underline">R2BOT Kids for schools →</Link>
        </div>
      </section>
    </div>
  )
}
