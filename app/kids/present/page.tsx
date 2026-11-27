// app/kids/present/page.tsx — Present mode for the classroom projector
// (roadmap #42). noindex: a teacher tool, not content. With a source in the
// URL (?session=1-5, ?session=1-5&unplugged=1, ?episode=<slug>, ?sim=lab,
// ?path=/kids/…, optional &code=ABC234) it opens the full-screen presenter;
// without one it lists what can be presented, as plain server HTML.

import type { Metadata } from 'next'
import Link from 'next/link'
import { buildDeck, parsePresentSource, presentCatalogue, presentHref } from '@/lib/kids/teach/present'
import PresentClient from '@/components/kids/present/PresentClient'

export const runtime = 'nodejs'

export const metadata: Metadata = {
  title: 'Present mode — R2BOT Kids for teachers',
  description: 'Show an R2BOT Kids lesson, episode or simulator on the classroom projector: big type, a lesson timer, the join code, slow motion, freeze-and-draw and a hands-up check.',
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const BAND_LABEL: Record<string, string> = { explorers: 'Explorers 5–7', builders: 'Builders 8–10', inventors: 'Inventors 11–13', engineers: 'Engineers 14–17' }

export default async function PresentPage({ searchParams }: Props) {
  const q = await searchParams
  const src = parsePresentSource(q)
  const deck = src ? buildDeck(src) : null
  const codeParam = typeof q.code === 'string' ? q.code : null
  if (deck) return <PresentClient deck={deck} joinCode={codeParam} />

  const cat = presentCatalogue()
  const chip = 'inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/[0.04] px-3 text-[15px] font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:pt-12">
      <p className="text-sm font-bold uppercase tracking-wider text-amber-300">R2BOT Kids · For teachers</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-white sm:text-5xl">Present mode</h1>
      <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-200">
        Put a lesson on the classroom projector. Present mode goes full screen with big type, a lesson timer (5, 10, 20 and 5
        minutes), your class join code with a QR code in the corner, slow motion for episodes and replays, freeze-and-draw,
        “ask the class” prompts from the teacher notes, and a hands-up vote for the check. Nothing about the children is
        stored: the vote counts disappear when you close it.
      </p>
      {src && !deck && <p role="alert" className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-amber-200">That lesson was not found. Pick one below.</p>}
      <p className="mt-3 text-[15px] text-slate-300">Tip: a presentation clicker works — it sends Page Down and Page Up. Press F for full screen, D to draw, T to start the timer.</p>

      {cat.levels.map((l) => (
        <section key={l.level} className="mt-10" aria-labelledby={`lv-${l.level}`}>
          <h2 id={`lv-${l.level}`} className="font-display text-2xl font-bold text-white">Level {l.level} · {l.name} ({l.ages})</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {l.sessions.map((s) => (
              <li key={s.number}><Link href={presentHref({ kind: 'session', level: l.level, number: s.number, unplugged: false })} className={chip}>{s.number}. {s.title}</Link></li>
            ))}
          </ul>
          {l.level === 1 && (
            <>
              <h3 className="mt-5 font-bold text-white">Level 1 without devices (unplugged)</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {l.sessions.map((s) => (
                  <li key={s.number}><Link href={presentHref({ kind: 'session', level: 1, number: s.number, unplugged: true })} className={chip}>{s.number}. {s.title}</Link></li>
                ))}
              </ul>
            </>
          )}
        </section>
      ))}

      <section className="mt-10" aria-labelledby="ep-h">
        <h2 id="ep-h" className="font-display text-2xl font-bold text-white">Story Theatre episodes</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {cat.episodes.map((e) => (
            <li key={e.slug}><Link href={presentHref({ kind: 'episode', slug: e.slug })} className={chip}>{e.title} <span className="ml-2 text-xs text-slate-400">{BAND_LABEL[e.band] ?? e.band}</span></Link></li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="sim-h">
        <h2 id="sim-h" className="font-display text-2xl font-bold text-white">Simulators and replays</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {cat.sims.map((s) => (
            <li key={s.id}><Link href={presentHref({ kind: 'sim', id: s.id })} className={chip}>{s.title}</Link></li>
          ))}
        </ul>
      </section>
    </div>
  )
}
