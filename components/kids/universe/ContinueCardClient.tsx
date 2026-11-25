'use client'

// components/kids/universe/ContinueCardClient.tsx
// "Continue your mission": the next unfinished session on the child's planet,
// or — when their planet's season is still being written and they have not
// started it — a game that fits their band. Session titles come from the
// curriculum on the server (passed in), so this island stays small.

import Link from 'next/link'
import type { KidsProgress } from '@/lib/kids-progress'
import { getBand } from '@/lib/kids/bands'
import { getPlanet } from '@/lib/kids/universe/worlds'
import { SESSIONS_PER_LEVEL, planetForBand, sessionsDoneOn, suggestGame } from './universe-state'

/** Level number -> session titles in order (index 0 = session 1). */
export type SessionTitles = Record<number, string[]>

export interface Mission {
  eyebrow: string
  title: string
  detail: string
  href: string
  cta: string
  icon: string
  gradient: string
  alt?: { href: string; label: string }
}

/**
 * The child's next step. `playable` lists the levels whose sessions are written
 * in full (computed on the server from the curriculum), so a level starts to
 * offer its sessions the day its content ships.
 */
export function pickMission(p: KidsProgress, titles: SessionTitles, playable: readonly number[]): Mission {
  const planet = planetForBand(p.band)
  const done = new Set(sessionsDoneOn(p, planet.level))
  const band = getBand(p.band)
  const game = suggestGame(p, p.band ?? 'explorers')
  const gameAlt = { href: `/kids/play/${game.id}`, label: `Or play ${game.name}` }

  if (done.size >= SESSIONS_PER_LEVEL) {
    const nextPlanet = getPlanet(planet.level + 1)
    if (nextPlanet) {
      return {
        eyebrow: `${planet.name} complete!`,
        title: `Fly on to ${nextPlanet.name}`,
        detail: nextPlanet.tagline,
        href: `/kids/course/${nextPlanet.level}`,
        cta: 'Fly there',
        icon: nextPlanet.emoji,
        gradient: nextPlanet.gradient,
        alt: gameAlt,
      }
    }
    // The last planet's season is finished: nothing left to "continue".
    return {
      eyebrow: `${planet.name} complete!`,
      title: 'Season finished. Replay a game or visit the Hangar',
      detail: `All ${SESSIONS_PER_LEVEL} sessions done. Your badges and robot are waiting in the Hangar.`,
      href: '/kids/hangar',
      cta: 'Open the Hangar',
      icon: '🏆',
      gradient: planet.gradient,
      alt: gameAlt,
    }
  }

  let next = 1
  while (done.has(next) && next < SESSIONS_PER_LEVEL) next++
  const title = titles[planet.level]?.[next - 1]

  if (playable.includes(planet.level) || done.size > 0) {
    return {
      eyebrow: done.size ? 'Continue your mission' : 'Your first mission',
      title: title ? `Session ${next}: ${title}` : `Session ${next}`,
      detail: `${planet.name} · ${done.size} of ${SESSIONS_PER_LEVEL} sessions done`,
      href: `/kids/course/${planet.level}`,
      cta: done.size ? 'Continue' : 'Start',
      icon: planet.emoji,
      gradient: planet.gradient,
      alt: gameAlt,
    }
  }

  return {
    eyebrow: band ? `Picked for ${band.name}` : 'Try this game',
    title: game.name,
    detail: game.hook,
    href: `/kids/play/${game.id}`,
    cta: 'Play',
    icon: game.emoji,
    gradient: game.gradient,
    alt: { href: `/kids/course/${planet.level}`, label: `See the ${planet.name} season` },
  }
}

export interface ContinueCardProps {
  progress: KidsProgress | null
  titles: SessionTitles
  playable: readonly number[]
}

export function ContinueCardClient({ progress, titles, playable }: ContinueCardProps) {
  const m = progress ? pickMission(progress, titles, playable) : null
  return (
    <section
      aria-labelledby="continue-h"
      className="relative min-h-[240px] overflow-hidden sm:min-h-[183px] rounded-[28px] border border-white/10 bg-[#111C32] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)]"
    >
      {m ? (
        <div className="uv-pop flex h-full flex-col">
          <div className="flex items-start gap-4">
            <span
              className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${m.gradient} text-3xl shadow-[inset_-4px_-5px_10px_rgba(0,0,0,.35)]`}
              aria-hidden
            >
              {m.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold uppercase tracking-wide text-amber-300">{m.eyebrow}</p>
              <h2 id="continue-h" className="font-display text-xl font-bold leading-snug text-[#EEF2F8]">
                {m.title}
              </h2>
              <p className="mt-0.5 text-[14px] text-[#A7B0C0]">{m.detail}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href={m.href}
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-amber-500 px-6 font-display text-lg font-bold text-[#1A1103] shadow-lg shadow-amber-500/25 transition hover:-translate-y-0.5 hover:bg-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              {m.cta} →
            </Link>
            {m.alt && (
              <Link
                href={m.alt.href}
                className="inline-flex min-h-[48px] items-center rounded-xl px-2 text-[15px] font-semibold text-cyan-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                {m.alt.label}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          <h2 id="continue-h" className="sr-only">
            Continue your mission
          </h2>
          <div className="animate-pulse motion-reduce:animate-none" aria-hidden>
          <div className="flex gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-white/10" />
              <div className="h-5 w-3/4 rounded bg-white/10" />
              <div className="h-3 w-1/2 rounded bg-white/10" />
            </div>
          </div>
          <div className="mt-4 h-[52px] w-36 rounded-2xl bg-white/10" />
          </div>
        </>
      )}
    </section>
  )
}
