// app/kids/teach/family/page.tsx — the family class for homeschoolers
// (roadmap #84): siblings of different ages learn robotics together with the
// same Classroom tools a teacher has. Server component, SSG, indexable.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { authorRef } from '@/lib/author'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { FAMILY_NOTES, FAMILY_SETUP, FAMILY_WEEK } from '@/lib/kids/teach/clubs'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/teach/family`
const TITLE = 'Homeschool Robotics for Siblings of Different Ages: The Family Class'
const DESCRIPTION =
  'Teach robotics at home to children aged 5 to 17 at once: a free family class with the same progress view, missions and lesson guides a teacher uses, a three-day weekly rhythm, and unplugged activities with things every home has.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { type: 'article', url: PAGE_URL, siteName: 'R2BOT', title: 'R2BOT Kids — the family class for homeschoolers', description: DESCRIPTION, images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Homeschool robotics' }] },
}

const card = 'rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6'
const h2 = 'font-display text-2xl font-bold text-white sm:text-3xl'
const link = 'inline-flex min-h-[44px] items-center font-bold text-amber-300 underline'

export default function FamilyClassPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Article', '@id': `${PAGE_URL}#guide`, headline: TITLE, description: DESCRIPTION, url: PAGE_URL, inLanguage: 'en', author: authorRef(), isAccessibleForFree: true, audience: { '@type': 'EducationalAudience', educationalRole: 'parent' } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'R2BOT Kids', item: `${BASE}/kids` },
        { '@type': 'ListItem', position: 2, name: 'Teacher guides', item: `${BASE}/kids/teach` },
        { '@type': 'ListItem', position: 3, name: 'Family class', item: PAGE_URL },
      ] },
    ],
  }
  return (
    <article className="teach-doc mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <nav aria-label="Breadcrumb" className="teach-no-print text-sm">
        <Link href="/kids/teach" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">← Teacher guides</Link>
      </nav>
      <header>
        <p className="teach-accent text-sm font-bold uppercase tracking-wider text-amber-300">Homeschool · siblings of any age</p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-[1.08] text-white sm:text-6xl">The family class</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-200">
          A homeschooling family rarely has one child of one age. The family class lets a parent run robotics for all of
          them at once, with the same tools a teacher has: one view of every child’s progress, missions you can set, the
          concepts each child has secured, and a printable guide for every session of every level. Each child keeps their
          own age band, so the seven-year-old and the twelve-year-old are never stuck on the same lesson.
        </p>
        <div className="teach-no-print mt-5 flex flex-wrap gap-3">
          <Link href="/kids/classroom?kind=family" className="inline-flex min-h-[48px] items-center rounded-xl bg-amber-500 px-5 font-bold text-[#1A1103] hover:bg-amber-400">Create your family class</Link>
          <Link href="/kids/parents" className="inline-flex min-h-[48px] items-center rounded-xl border border-white/15 bg-white/[0.04] px-5 font-bold text-white hover:bg-white/10">Parent controls</Link>
        </div>
      </header>

      <section className={`${card} mt-10`} aria-labelledby="setup-h">
        <h2 id="setup-h" className={h2}>Set it up</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[16px] leading-relaxed text-slate-200">
          {FAMILY_SETUP.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </section>

      <section className="mt-12" aria-labelledby="week-h">
        <h2 id="week-h" className={h2}>A family week</h2>
        <p className="mt-2 max-w-3xl text-[16px] text-slate-300">Three short sessions. Every child does the same kind of thing on the same day, at their own level.</p>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {FAMILY_WEEK.map((d) => (
            <li key={d.day} className={card}>
              <p className="text-sm font-bold uppercase tracking-wider text-amber-300">{d.minutes} minutes</p>
              <h3 className="mt-1 font-display text-xl font-bold text-white">{d.day}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-300">{d.what}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12" aria-labelledby="bands-h">
        <h2 id="bands-h" className={h2}>Where each child starts</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {KIDS_BANDS.map((b) => (
            <li key={b.id} className={card}>
              <p className="font-display text-lg font-bold text-white"><span aria-hidden>{b.emoji} </span>{b.name} · ages {b.ages}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-300">{b.outcome}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${card} mt-12`} aria-labelledby="tips-h">
        <h2 id="tips-h" className={h2}>Tips from the classroom, for the kitchen table</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-slate-200">
          {FAMILY_NOTES.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <p className="mt-4 text-[15px] text-slate-300">
          Everything for the younger ones also works with no screen at all: <Link href="/kids/teach/unplugged" className={link}>the unplugged lessons</Link>. Several families together? Run it as <Link href="/kids/teach/clubs" className={link}>a club</Link>. What the class stores, and how to delete it: <Link href="/kids/teach/trust" className={link}>the Trust &amp; Privacy Pack</Link>.
        </p>
      </section>
    </article>
  )
}
