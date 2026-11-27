'use client'

// components/kids/universe/ContinueCardClient.tsx
// "Your next mission" (roadmap #9): one clear next step on every visit, chosen
// for the child's band.
//   - Every band: the next unfinished session on their own planet (all four
//     levels are playable since Wave 2), or "fly on" when the season is done.
//   - Ages 8–17 also get "also today" picks worked out from their mastery
//     (lib/kids/universe/mastery.ts, read from the progress store — no activity
//     data is shipped to this page): a concept whose battery is running low
//     ("Recharge"), or the one closest to secure, which today's Galaxy missions
//     practise; and a game at the right tier (the next tier they have not won,
//     or their band's tier), opened on that tier with ?tier=.
//   - Ages 5–7 get one simple extra: a game that fits, on Cadet.
// Session titles come from the curriculum on the server (passed in), so this
// island stays small.

import Link from 'next/link'
import type { KidsProgress } from '@/lib/kids-progress'
import { getBand, type BandId } from '@/lib/kids/bands'
import { getPlanet } from '@/lib/kids/universe/worlds'
import { TIER_NAMES } from '@/lib/kids/universe/tiers'
import { CONCEPT_INFO } from '@/lib/kids/universe/mastery'
import { SESSIONS_PER_LEVEL, masteryPick, nextTierFor, planetForBand, sessionsDoneOn, suggestGame } from './universe-state'

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
  /** "Also today": up to two smaller next steps (mastery and a game tier). */
  extras: MissionExtra[]
}

export interface MissionExtra {
  kind: 'recharge' | 'almost' | 'game' | 'season'
  href: string
  icon: string
  /** Short chip, e.g. "Recharge". */
  chip: string
  label: string
}

function gameExtra(p: KidsProgress, band: BandId): MissionExtra {
  const g = suggestGame(p, band)
  const tier = nextTierFor(p, g, band)
  const name = TIER_NAMES[tier] ?? TIER_NAMES[0]
  return { kind: 'game', href: `/kids/play/${g.id}?tier=${tier}`, icon: g.emoji, chip: name, label: `Play ${g.name} on ${name}` }
}

function extrasFor(p: KidsProgress, band: BandId): MissionExtra[] {
  const out: MissionExtra[] = []
  if (band !== 'explorers') {
    const m = masteryPick(p)
    if (m) {
      const info = CONCEPT_INFO[m.state.id]
      out.push(
        m.kind === 'recharge'
          ? { kind: 'recharge', href: '/kids/galaxy', icon: info.icon, chip: 'Recharge', label: `${info.name}: its battery is low. Today’s Galaxy missions top it up.` }
          : { kind: 'almost', href: '/kids/galaxy', icon: info.icon, chip: 'Almost secure', label: `${info.name}: one more first-try win in the Galaxy.` },
      )
    }
  }
  out.push(gameExtra(p, band))
  return out
}

/**
 * The child's next step. `playable` lists the levels whose sessions are written
 * in full (computed on the server from the curriculum), so a level starts to
 * offer its sessions the day its content ships.
 */
export function pickMission(p: KidsProgress, titles: SessionTitles, playable: readonly number[]): Mission {
  const planet = planetForBand(p.band)
  const done = new Set(sessionsDoneOn(p, planet.level))
  const bandId: BandId = p.band ?? 'explorers'
  const extras = extrasFor(p, bandId)

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
        extras,
      }
    }
    // The last planet's season is finished: nothing left to "continue".
    return {
      eyebrow: `${planet.name} complete!`,
      title: 'Season finished!',
      detail: `All ${SESSIONS_PER_LEVEL} sessions done. Replay a game or visit your Garage.`,
      href: '/kids/hangar',
      cta: 'Open the Garage',
      icon: '🏆',
      gradient: planet.gradient,
      extras,
    }
  }

  let next = 1
  while (done.has(next) && next < SESSIONS_PER_LEVEL) next++
  const title = titles[planet.level]?.[next - 1]

  if (playable.includes(planet.level) || done.size > 0) {
    return {
      eyebrow: done.size ? 'Your next mission' : 'Your first mission',
      title: title ? `Session ${next}: ${title}` : `Session ${next}`,
      detail: `${planet.name} · ${done.size} of ${SESSIONS_PER_LEVEL} sessions done`,
      href: `/kids/course/${planet.level}`,
      cta: done.size ? 'Continue' : 'Start',
      icon: planet.emoji,
      gradient: planet.gradient,
      extras,
    }
  }

  // A planet whose season is not written yet (none today): a game that fits, and the season map.
  const band = getBand(p.band)
  const game = suggestGame(p, bandId)
  const tier = nextTierFor(p, game, bandId)
  return {
    eyebrow: band ? `Picked for ${band.name}` : 'Try this game',
    title: game.name,
    detail: game.hook,
    href: `/kids/play/${game.id}?tier=${tier}`,
    cta: `Play on ${TIER_NAMES[tier] ?? TIER_NAMES[0]}`,
    icon: game.emoji,
    gradient: game.gradient,
    extras: [{ kind: 'season', href: `/kids/course/${planet.level}`, icon: planet.emoji, chip: 'Season', label: `See the ${planet.name} season` }],
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
      className="relative min-h-[300px] overflow-hidden sm:min-h-[250px] rounded-[28px] border border-white/10 bg-[#111C32] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)]"
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
          <div className="mt-4">
            <Link
              href={m.href}
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-amber-500 px-6 font-display text-lg font-bold text-[#1A1103] shadow-lg shadow-amber-500/25 transition hover:-translate-y-0.5 hover:bg-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              {m.cta} →
            </Link>
          </div>
          {m.extras.length > 0 && (
            <div className="mt-4">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#6E7888]">Also today</p>
              <ul className="mt-1.5 grid gap-2 sm:grid-cols-2">
                {m.extras.map((x) => (
                  <li key={x.kind}>
                    <Link
                      href={x.href}
                      className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-white/10 bg-[#0A1120]/60 px-3 py-2 transition hover:border-white/25 active:scale-[.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                    >
                      <span className="text-2xl" aria-hidden>
                        {x.icon}
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-[12px] font-bold uppercase tracking-wide ${x.kind === 'game' ? 'text-cyan-300' : 'text-amber-300'}`}>{x.chip}</span>
                        <span className="block text-[14px] font-semibold leading-snug text-[#EEF2F8]">{x.label}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <>
          <h2 id="continue-h" className="sr-only">
            Your next mission
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
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="h-[52px] rounded-2xl bg-white/10" />
            <div className="h-[52px] rounded-2xl bg-white/10" />
          </div>
          </div>
        </>
      )}
    </section>
  )
}
