'use client'

// components/kids/universe/UniverseMapClient.tsx
// The hero of the kids home: the R2BOT Universe as a living star map. Four
// course planets (PLANETS) with the child's progress ring, eight game moons
// (GAMES), and the Hangar station in the middle. Pure SVG + CSS: no canvas, no
// three.js, nothing heavy on first load. It server-renders with every link and
// label in place (rings at zero), then fills in the child's progress — same
// size before and after, so nothing shifts.
//
// Age is never a lock: a zone made for older children says who it is
// "recommended for", and still opens.

import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { KidsProgress } from '@/lib/kids-progress'
import { BAND_ORDER, getBand, type BandId } from '@/lib/kids/bands'
import { GAMES, PLANETS, type Planet, type UniverseGame } from '@/lib/kids/universe/worlds'
import { SESSIONS_PER_LEVEL, gamesPlayed, sessionsDoneOn } from './universe-state'
import './universe.css'

/** [phone x%, phone y%, wide x%, wide y%] — centre of each body. */
type Pos = [number, number, number, number]

const PLANET_POS: Record<string, Pos> = {
  spark: [24.6, 16.5, 20, 21],
  gearon: [78, 31, 79, 19],
  nova: [75, 80.5, 79, 73],
  apex: [25, 74, 21, 71],
}

const GAME_POS: Record<string, Pos> = {
  'sumo-arena': [60, 9, 50, 9],
  'drone-hover': [88, 9, 93, 44],
  'arm-factory': [16, 42.2, 7, 45],
  'circuit-city': [85, 53, 50, 88],
  'mars-rover': [50, 73, 93, 88],
  'robot-brain': [50, 93.3, 7, 88],
  'maze-mapper': [16.8, 93.3, 34, 48],
  'swarm-reef': [48, 33, 66, 48],
}

const HANGAR_POS: Pos = [50, 53, 50, 48]

function posStyle(p: Pos): CSSProperties {
  return { '--mx': `${p[0]}%`, '--my': `${p[1]}%`, '--dx': `${p[2]}%`, '--dy': `${p[3]}%` } as CSSProperties
}

/** Deterministic star field (same on server and client). */
const STARS = (() => {
  let s = 1337
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: 90 }, (_, i) => ({
    x: r() * 100,
    y: r() * 100,
    size: r() < 0.12 ? 0.9 : r() < 0.5 ? 0.55 : 0.35,
    twinkle: i % 4 === 0,
    delay: (r() * 3).toFixed(2),
  }))
})()

export interface UniverseMapProps {
  progress: KidsProgress | null
}

export function UniverseMapClient({ progress }: UniverseMapProps) {
  const band = progress?.band ?? null
  const played = progress ? gamesPlayed(progress) : new Set<string>()

  return (
    <div
      className="relative aspect-[3/5] w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#060C18] shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:aspect-[4/3]"
      role="group"
      aria-label="Universe map"
    >
      {/* Sky: nebula glows + stars + orbit rings. Decorative only. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-[20%] -top-[20%] h-[70%] w-[70%] rounded-full bg-[radial-gradient(closest-side,rgba(252,104,24,.22),transparent)]" />
        <div className="absolute -bottom-[25%] -right-[15%] h-[75%] w-[75%] rounded-full bg-[radial-gradient(closest-side,rgba(0,184,212,.18),transparent)]" />
        <div className="absolute left-[30%] top-[35%] h-[35%] w-[40%] rounded-full bg-[radial-gradient(closest-side,rgba(255,168,120,.10),transparent)]" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {STARS.map((st, i) => (
            <circle
              key={i}
              cx={st.x}
              cy={st.y}
              r={st.size * 0.35}
              fill="#fff"
              opacity={st.twinkle ? undefined : 0.55}
              className={st.twinkle ? 'uv-twinkle' : undefined}
              style={st.twinkle ? { animationDelay: `${st.delay}s` } : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <ellipse cx="50" cy="47" rx="31" ry="27" fill="none" stroke="rgba(255,168,120,.22)" strokeWidth="1.2" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" className="uv-dash" />
          <ellipse cx="50" cy="48" rx="44" ry="40" fill="none" stroke="rgba(103,232,249,.13)" strokeWidth="1" strokeDasharray="1 7" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      {/* Hangar: the station in the middle (the child's robot, avatar and badges). */}
      <Link
        href="/kids/hangar"
        className="uv-pos group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        style={posStyle(HANGAR_POS)}
        aria-label="Hangar: your robot, avatar and badges"
      >
        <span className="relative grid h-16 w-16 place-items-center sm:h-20 sm:w-20">
          <span className="uv-pulse absolute inset-0 rounded-full border-2 border-amber-400/50 motion-reduce:hidden" aria-hidden />
          <span className="uv-spin-slow absolute inset-0 rounded-full border border-dashed border-amber-300/40" aria-hidden />
          <span className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-b from-[#19263F] to-[#0A1120] shadow-[0_0_28px_rgba(252,104,24,.45)] ring-1 ring-amber-400/40 transition duration-200 group-hover:scale-105 group-active:scale-95 sm:h-16 sm:w-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kids-icon.svg" alt="" width={40} height={40} className="h-9 w-9 sm:h-11 sm:w-11" />
          </span>
        </span>
        <span className="mt-1 rounded-full bg-[#0A1120]/80 px-2 py-0.5 font-display text-[13px] font-bold text-amber-300 sm:text-sm">Hangar</span>
      </Link>

      {PLANETS.map((pl, i) => (
        <PlanetNode key={pl.id} planet={pl} index={i} progress={progress} childBand={band} />
      ))}

      {GAMES.map((g, i) => (
        <MoonNode key={g.id} game={g} index={i} childBand={band} played={played.has(g.id)} />
      ))}

      <p className="pointer-events-none absolute inset-x-0 bottom-2 hidden text-center text-xs font-semibold text-[#A7B0C0]/80 sm:block" aria-hidden>
        Planets are your course · moons are games · tap anything to fly there
      </p>
    </div>
  )
}

function PlanetNode({ planet, index, progress, childBand }: { planet: Planet; index: number; progress: KidsProgress | null; childBand: BandId | null }) {
  const pos = PLANET_POS[planet.id] ?? [50, 50, 50, 50]
  const b = getBand(planet.band)
  const done = progress ? sessionsDoneOn(progress, planet.level).length : 0
  const frac = Math.min(1, done / SESSIONS_PER_LEVEL)
  const mine = childBand === planet.band
  const R = 46
  const C = 2 * Math.PI * R
  const label = `${planet.name}: course level ${planet.level}, made for ${b?.name ?? ''} ages ${b?.ages ?? ''}. ${done} of ${SESSIONS_PER_LEVEL} sessions done.${mine ? ' This is your planet.' : ''}`

  return (
    <Link
      href={`/kids/course/${planet.level}`}
      aria-label={label}
      className="uv-pos group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-3xl outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
      style={posStyle(pos)}
    >
      <span className="uv-float relative block" style={{ animationDelay: `${-index * 1.7}s` }}>
        {mine && (
          <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-[#1A1103] shadow-lg">
            Your planet
          </span>
        )}
        <span className="relative grid h-[88px] w-[88px] place-items-center sm:h-[104px] sm:w-[104px] lg:h-[118px] lg:w-[118px]">
          {/* progress ring */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="4" />
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={mine ? '#FF8A4C' : '#67E8F9'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${C * frac} ${C}`}
              className="transition-[stroke-dasharray] duration-700"
            />
          </svg>
          {/* the planet */}
          <span
            className={`relative block h-[70%] w-[70%] rounded-full bg-gradient-to-br ${planet.gradient} shadow-[inset_-10px_-12px_22px_rgba(0,0,0,.5),0_0_30px_rgba(255,255,255,.08)] transition duration-200 group-hover:scale-[1.06] group-active:scale-95`}
            aria-hidden
          >
            <span className="absolute left-[18%] top-[14%] h-[28%] w-[34%] rounded-full bg-white/35 blur-[3px]" />
            <span className="absolute bottom-[22%] right-[20%] h-[16%] w-[16%] rounded-full bg-black/20" />
            <span className="absolute bottom-[38%] left-[26%] h-[10%] w-[10%] rounded-full bg-black/15" />
            {planet.id === 'gearon' && (
              <span className="absolute left-1/2 top-1/2 h-[26%] w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-[50%] border-[3px] border-sky-200/50" />
            )}
            <span className="absolute inset-0 grid place-items-center text-2xl sm:text-3xl">{planet.emoji}</span>
          </span>
          {/* a tiny moon on its own orbit */}
          <span className="uv-spin pointer-events-none absolute inset-0" style={{ animationDelay: `${-index * 3}s` }} aria-hidden>
            <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-white/80 shadow-[0_0_8px_#fff]" />
          </span>
        </span>
      </span>
      <span className="mt-0.5 flex flex-col items-center rounded-xl bg-[#0A1120]/70 px-2 py-0.5 text-center backdrop-blur-sm">
        <span className="whitespace-nowrap font-display text-[15px] font-bold leading-tight text-[#EEF2F8] sm:text-base">{planet.name}</span>
        <span className="whitespace-nowrap text-[12px] font-semibold leading-tight text-[#A7B0C0] sm:text-[13px]">
          Ages {b?.ages} · <span className={mine ? 'text-amber-300' : 'text-cyan-300'}>{done}/{SESSIONS_PER_LEVEL}</span>
        </span>
      </span>
    </Link>
  )
}

function MoonNode({ game, index, childBand, played }: { game: UniverseGame; index: number; childBand: BandId | null; played: boolean }) {
  const pos = GAME_POS[game.id] ?? [50, 50, 50, 50]
  const made = getBand(game.minBand)
  const older = childBand !== null && BAND_ORDER.indexOf(game.minBand) > BAND_ORDER.indexOf(childBand)
  const label = `${game.name} game in ${game.zone}. ${game.hook}${older && made ? ` Recommended for ${made.name} (ages ${made.ages}) and up — you can still try it.` : ''}${played ? ' You have played this.' : ''}`

  return (
    <Link
      href={`/kids/play/${game.id}`}
      aria-label={label}
      title={older && made ? `Recommended for ${made.name} (${made.ages}+)` : game.name}
      className="uv-pos group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
      style={posStyle(pos)}
    >
      <span className="uv-orbit relative block" style={{ animationDelay: `${-index * 1.1}s` }}>
        <span
          className={`relative grid h-[52px] w-[52px] place-items-center rounded-full bg-gradient-to-br ${game.gradient} text-2xl shadow-[inset_-5px_-6px_12px_rgba(0,0,0,.45),0_4px_14px_rgba(0,0,0,.5)] ring-2 transition duration-200 group-hover:scale-110 group-active:scale-95 sm:h-14 sm:w-14 ${
            played ? 'ring-amber-300/80' : 'ring-white/15'
          }`}
          aria-hidden
        >
          {game.emoji}
          {older && made && (
            <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#0A1120] text-[11px] ring-1 ring-white/25">{made.emoji}</span>
          )}
          {played && (
            <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-[11px] font-black text-[#1A1103]">✓</span>
          )}
        </span>
      </span>
      <span className="mt-1 whitespace-nowrap rounded-lg bg-[#0A1120]/70 px-1.5 text-[12px] font-bold leading-5 text-[#EEF2F8] sm:text-[13px]">{game.zone}</span>
    </Link>
  )
}
