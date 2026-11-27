// app/kids/teach/clubs/page.tsx — Club mode (roadmap #84): running R2BOT Kids
// as a mixed-age after-school or community robotics club. Server component,
// SSG, indexable. The weekly stations come from every band's class plan.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { authorRef } from '@/lib/author'
import { CLUB_FINALE, CLUB_LEADER_NOTES, CLUB_SETUP, clubSessionShape, clubWeeks } from '@/lib/kids/teach/clubs'
import { PresentButton } from '@/components/kids/present/PresentButton'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/teach/clubs`
const TITLE = 'How to Run a Robotics Club for Ages 5–17: Mixed-Age Session Plans'
const DESCRIPTION =
  'A free plan for an after-school or community robotics club where every age learns at its own level: 60, 75 or 90-minute weekly sessions, mixed-age buddy activities, a station for each age band, an eight-week season and a showcase night.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { type: 'article', url: PAGE_URL, siteName: 'R2BOT', title: 'R2BOT Kids — run a robotics club', description: DESCRIPTION, images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Robotics club plans' }] },
}

const card = 'rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6'
const h2 = 'font-display text-2xl font-bold text-white sm:text-3xl'

export default function ClubsPage() {
  const weeks = clubWeeks()
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Article', '@id': `${PAGE_URL}#guide`, headline: TITLE, description: DESCRIPTION, url: PAGE_URL, inLanguage: 'en', author: authorRef(), isAccessibleForFree: true, audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'R2BOT Kids', item: `${BASE}/kids` },
        { '@type': 'ListItem', position: 2, name: 'Teacher guides', item: `${BASE}/kids/teach` },
        { '@type': 'ListItem', position: 3, name: 'Robotics clubs', item: PAGE_URL },
      ] },
    ],
  }
  return (
    <article className="teach-doc mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <nav aria-label="Breadcrumb" className="teach-no-print text-sm">
        <Link href="/kids/teach" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">← Teacher guides</Link>
      </nav>
      <header>
        <p className="teach-accent text-sm font-bold uppercase tracking-wider text-amber-300">Club mode · ages 5–17 together</p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-[1.08] text-white sm:text-6xl">Run a robotics club</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-200">
          After-school and community clubs are where a love of robotics lasts, year after year. A club is not a class: the
          ages are mixed, the leader is often a volunteer, and a session is an hour or more once a week. Club mode is built
          for that. Every member keeps their own age band, so a six-year-old and a fourteen-year-old share one theme and one
          room while each works at their own level, and older members learn by explaining.
        </p>
        <div className="teach-no-print mt-5 flex flex-wrap gap-3">
          <Link href="/kids/classroom" className="inline-flex min-h-[48px] items-center rounded-xl bg-amber-500 px-5 font-bold text-[#1A1103] hover:bg-amber-400">Create your club</Link>
          <PresentButton source={{ kind: 'episode', slug: weeks[0].stations[0].episode.href.split('/').pop() ?? '' }} gate={false} label="Present week 1’s hook" />
          <Link href="/kids/teach/unplugged" className="inline-flex min-h-[48px] items-center rounded-xl px-3 font-bold text-amber-300 hover:underline">No devices? Unplugged lessons →</Link>
        </div>
      </header>

      <section className={`${card} mt-10`} aria-labelledby="setup-h">
        <h2 id="setup-h" className={h2}>Set up your club in ten minutes</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[16px] leading-relaxed text-slate-200">
          {CLUB_SETUP.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </section>

      <section className="mt-12" aria-labelledby="shape-h">
        <h2 id="shape-h" className={h2}>The weekly session</h2>
        <p className="mt-2 max-w-3xl text-[16px] text-slate-300">Choose the length that fits your slot. The shape stays the same: everyone together, then each age at its own station, then everyone together again.</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {([60, 75, 90] as const).map((len) => (
            <div key={len} className={card}>
              <h3 className="font-display text-xl font-bold text-white">{len} minutes</h3>
              <ol className="mt-3 space-y-3">
                {clubSessionShape(len).map((b) => (
                  <li key={b.title}>
                    <p className="font-bold text-white"><span className="text-amber-300">{b.minutes}′</span> {b.title}</p>
                    <p className="text-[15px] leading-relaxed text-slate-300">{b.what}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="weeks-h">
        <h2 id="weeks-h" className={h2}>Six themed weeks, one station per age</h2>
        <p className="mt-2 max-w-3xl text-[16px] text-slate-300">Each week the whole club shares one idea. The stations below say what each band does with it; every link opens the exact episode or mission.</p>
        {weeks.map((w) => (
          <div key={w.week} className={`${card} mt-5`}>
            <h3 className="font-display text-xl font-bold text-white">Week {w.week}: {w.theme}</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {w.stations.map((s) => (
                <div key={s.band} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-bold text-white"><span aria-hidden>{s.emoji} </span>{s.bandName} ({s.ages}) · {s.concept}</p>
                  <p className="mt-1 text-[15px] text-slate-300">{s.goal}</p>
                  <ul className="mt-2 space-y-1 text-[15px] text-slate-200">
                    <li><strong className="text-white">Watch:</strong> <Link href={s.episode.href} className="inline-flex min-h-[44px] items-center text-amber-300 underline-offset-2 hover:underline">{s.episode.title}</Link></li>
                    <li><strong className="text-white">Code:</strong> {s.codeLab}</li>
                    <li><strong className="text-white">Build:</strong> {s.workshop}</li>
                    <li><strong className="text-white">Unplugged:</strong> {s.unplugged}</li>
                  </ul>
                  {s.missions.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2" aria-label="Code Lab missions">
                      {s.missions.map((m) => (
                        <li key={m.href}><Link href={m.href} className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/[0.04] px-3 text-sm font-bold text-white hover:bg-white/10">{m.title}</Link></li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {CLUB_FINALE.map((b) => (
            <div key={b.title} className={card}>
              <h3 className="font-display text-xl font-bold text-white">{b.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-300">{b.what}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${card} mt-12`} aria-labelledby="notes-h">
        <h2 id="notes-h" className={h2}>Notes for club leaders</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-slate-200">
          {CLUB_LEADER_NOTES.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <p className="mt-4 text-[15px] text-slate-300">
          Running a club for one family, or a homeschool co-op? See <Link href="/kids/teach/family" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline">the family class</Link>. Running a library or community-centre drop-in? Print <Link href="/kids/teach/library" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline">the drop-in kit</Link>. Before you start, your organisation may want the <Link href="/kids/teach/trust" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline">Trust &amp; Privacy Pack</Link>.
        </p>
      </section>
    </article>
  )
}
