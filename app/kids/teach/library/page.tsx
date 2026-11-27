// app/kids/teach/library/page.tsx — the drop-in session kit for libraries and
// community centres (roadmap #84). Server component, SSG, indexable,
// printable: a poster, a 60-minute plan, three station cards, a volunteer
// script and a head-count tally with no names.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { authorRef } from '@/lib/author'
import { DROP_IN_PLAN, DROP_IN_STATIONS, DROP_IN_VOLUNTEER_SCRIPT, TALLY_ROWS } from '@/lib/kids/teach/clubs'
import PrintButtonClient from '../unplugged/PrintButtonClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/teach/library`
const TITLE = 'Library Robotics Drop-In Kit: A Free 60-Minute Session for Ages 5–17'
const DESCRIPTION =
  'Everything a library or community centre needs for a walk-in robotics session: a printable poster, a 60-minute plan, three stations (human-robot floor grid, screens, gears and sorting), a volunteer script and a head-count sheet with no names.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { type: 'article', url: PAGE_URL, siteName: 'R2BOT', title: 'R2BOT Kids — library drop-in kit', description: DESCRIPTION, images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Library robotics drop-in kit' }] },
}

const card = 'rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6'
const h2 = 'font-display text-2xl font-bold text-white sm:text-3xl'

export default function LibraryKitPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Article', '@id': `${PAGE_URL}#kit`, headline: TITLE, description: DESCRIPTION, url: PAGE_URL, inLanguage: 'en', author: authorRef(), isAccessibleForFree: true },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'R2BOT Kids', item: `${BASE}/kids` },
        { '@type': 'ListItem', position: 2, name: 'Teacher guides', item: `${BASE}/kids/teach` },
        { '@type': 'ListItem', position: 3, name: 'Library drop-in kit', item: PAGE_URL },
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
        <p className="teach-accent text-sm font-bold uppercase tracking-wider text-amber-300">Libraries · community centres · drop-in</p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-[1.08] text-white sm:text-6xl">Library drop-in kit</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-200">
          A drop-in is different from a class: children arrive whenever they like, ages are mixed, and you may never see
          the same child twice. This kit runs a one-hour robotics session in that setting with volunteers and whatever
          devices the library has — or none. Visitors do not sign in or join anything, so nothing about them is stored by
          R2BOT, and the only record you keep is a head count by age band.
        </p>
        <div className="teach-no-print mt-5"><PrintButtonClient label="Print the whole kit" /></div>
      </header>

      <section className="print-keep mt-10 rounded-[28px] border-4 border-amber-500 bg-white p-8 text-center text-[#111C32] [--pk-bg:#ffffff] [--pk-border:#FC6818]" aria-labelledby="poster-h">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#B4410A]">Free · ages 5–17 · no sign-up</p>
        <h2 id="poster-h" className="mt-2 font-display text-5xl font-black sm:text-6xl">Robot Club drop-in</h2>
        <p className="mt-4 text-2xl font-bold">Be a robot. Program a robot. Build a robot.</p>
        <p className="mt-3 text-xl">Day: ____________ &nbsp; Time: ____________ &nbsp; Room: ____________</p>
        <p className="mt-4 text-lg">Come any time during the hour. A grown-up stays with children under 8.</p>
      </section>

      <section className={`${card} mt-10`} aria-labelledby="plan-h">
        <h2 id="plan-h" className={h2}>The 60-minute plan</h2>
        <ol className="mt-4 space-y-3">
          {DROP_IN_PLAN.map((b) => (
            <li key={b.title}>
              <p className="font-bold text-white"><span className="text-amber-300">{b.minutes}′</span> {b.title}</p>
              <p className="text-[15px] leading-relaxed text-slate-300">{b.what}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10" aria-labelledby="st-h">
        <h2 id="st-h" className={h2}>Station cards</h2>
        <p className="mt-2 text-[15px] text-slate-300">Print one per table.</p>
        <ul className="mt-4 grid gap-4 md:grid-cols-3">
          {DROP_IN_STATIONS.map((s) => (
            <li key={s.name} className={card}>
              <p className="text-4xl" aria-hidden>{s.emoji}</p>
              <h3 className="mt-2 font-display text-xl font-bold text-white">{s.name}</h3>
              <p className="text-sm font-bold text-amber-300">{s.ages}</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-200">{s.what.map((w) => <li key={w}>{w}</li>)}</ol>
              <p className="mt-3 text-sm text-slate-300"><strong className="text-white">You need:</strong> {s.needs.join('; ')}.</p>
            </li>
          ))}
        </ul>
        <p className="teach-no-print mt-4 text-[15px] text-slate-300">
          The command cards, mission maps, gear template and sorting cards are in <Link href="/kids/teach/unplugged" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline">the unplugged lessons</Link> (start with <Link href="/kids/teach/unplugged/2" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline">lesson 2</Link>).
        </p>
      </section>

      <section className={`${card} mt-10`} aria-labelledby="script-h">
        <h2 id="script-h" className={h2}>Volunteer script</h2>
        <ul className="mt-4 space-y-2 text-[17px] leading-relaxed text-slate-100">{DROP_IN_VOLUNTEER_SCRIPT.map((l) => <li key={l}>{l}</li>)}</ul>
        <p className="mt-4 text-[15px] text-slate-300">No volunteer needs to know robotics. The cards and the children do the teaching; a volunteer’s job is to read, cheer for bugs, and keep turns fair.</p>
      </section>

      <section className={`${card} mt-10`} aria-labelledby="tally-h">
        <h2 id="tally-h" className={h2}>Head-count sheet (no names)</h2>
        <p className="mt-2 text-[15px] text-slate-300">Tick a box for each visitor. This is all a funder or a manager needs, and it holds nothing about any child.</p>
        <table className="mt-4 w-full border-collapse">
          <thead><tr><th scope="col" className="border-b border-white/15 px-3 py-2 text-left text-white">Age band</th><th scope="col" className="border-b border-white/15 px-3 py-2 text-left text-white">Visitors (tally)</th><th scope="col" className="border-b border-white/15 px-3 py-2 text-left text-white">Total</th></tr></thead>
          <tbody>
            {TALLY_ROWS.map((r) => (
              <tr key={r}><td className="border-b border-white/10 px-3 py-4 text-slate-200">{r}</td><td className="border-b border-white/10 px-3 py-4" /><td className="border-b border-white/10 px-3 py-4" /></tr>
            ))}
            <tr><td className="px-3 py-4 font-bold text-white">Grown-ups</td><td className="px-3 py-4" /><td className="px-3 py-4" /></tr>
          </tbody>
        </table>
      </section>

      <section className="teach-no-print mt-10 max-w-3xl" aria-labelledby="more-h">
        <h2 id="more-h" className="font-display text-xl font-bold text-white">Turning a drop-in into a club</h2>
        <p className="mt-2 text-[16px] leading-relaxed text-slate-300">
          If the same children keep coming back, start a weekly club: they join a class with a code and a nickname, keep
          their own progress, and follow a six-week season with a showcase at the end. See <Link href="/kids/teach/clubs" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline">Club mode</Link>.
        </p>
      </section>
    </article>
  )
}
