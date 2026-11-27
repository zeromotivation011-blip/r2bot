'use client'

// components/kids/makers/CareerConstellationClient.tsx — the Career
// Constellation (roadmap #34). Every Maker's job is a small constellation of the
// big ideas it uses; a star lights up when the child has that idea (secure:
// bright, learning: half, fading: dim) from lib/kids/universe/mastery.ts. Careers
// stay in a fixed order: nothing is ranked, and the copy only says what the
// child already has. "Try my job" opens the matching game.

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { KIDS_PROGRESS_EVENT, getProgress } from '@/lib/kids-progress'
import type { ConceptId } from '@/lib/kids/curriculum/types'
import { KIDS_PROFILE_EVENT } from '@/lib/kids/profiles'
import { makerFirstName } from '@/lib/kids/makers/makers'
import { careerLights, careerLine, type StarLight } from '@/lib/kids/makers/careers'
import { CONCEPT_INFO, conceptStates, type ConceptStatus } from '@/lib/kids/universe/mastery'
import { GAMES } from '@/lib/kids/universe/worlds'
import { MakerAvatar } from './MakerAvatar'

const POINTS: Record<number, [number, number][]> = {
  3: [[18, 70], [60, 18], [102, 62]],
  4: [[14, 62], [46, 20], [84, 30], [104, 74]],
}

const LIGHT_LABEL: Record<StarLight, string> = { bright: 'You have it', dim: 'Needs a recharge', half: 'Learning', off: 'Not started' }

function Constellation({ stars }: { stars: { concept: ConceptId; light: StarLight }[] }) {
  const pts = POINTS[stars.length] ?? POINTS[4]
  return (
    <svg viewBox="0 0 120 90" className="h-[72px] w-[96px] shrink-0" aria-hidden>
      <polyline points={pts.slice(0, stars.length).map((p) => p.join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1.5" strokeDasharray="3 3" />
      {stars.map((s, i) => {
        const [x, y] = pts[i]
        const fill = s.light === 'bright' ? '#FFA878' : s.light === 'half' ? 'rgba(252,104,24,.55)' : s.light === 'dim' ? 'rgba(252,104,24,.3)' : 'transparent'
        return (
          <g key={s.concept}>
            {s.light === 'bright' && <circle cx={x} cy={y} r="11" fill="rgba(252,104,24,.25)" />}
            <circle cx={x} cy={y} r="6.5" fill={fill} stroke={s.light === 'off' ? 'rgba(255,255,255,.35)' : '#FC6818'} strokeWidth="2" />
          </g>
        )
      })}
    </svg>
  )
}

export default function CareerConstellationClient() {
  const [statuses, setStatuses] = useState<Partial<Record<ConceptId, ConceptStatus>> | null>(null)

  useEffect(() => {
    const read = () => {
      const p = getProgress()
      const out: Partial<Record<ConceptId, ConceptStatus>> = {}
      for (const s of conceptStates({ conceptLog: p.conceptLog ?? [], conceptSecured: p.conceptSecured ?? {} })) out[s.id] = s.status
      setStatuses(out)
    }
    read()
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    window.addEventListener(KIDS_PROFILE_EVENT, read)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, read)
      window.removeEventListener(KIDS_PROFILE_EVENT, read)
    }
  }, [])

  const lights = useMemo(() => careerLights(statuses ?? {}), [statuses])
  const have = statuses ? (Object.entries(statuses) as [ConceptId, ConceptStatus][]).filter(([, s]) => s === 'secure' || s === 'fading').map(([c]) => c) : []

  return (
    <section aria-labelledby="career-constellation-h" className="rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6">
      <h2 id="career-constellation-h" className="font-display text-2xl font-bold text-[#EEF2F8]">
        Your Career Constellation
      </h2>
      <p className="mt-2 max-w-3xl text-[17px] text-[#A7B0C0]">
        Each job is a little constellation of the big ideas it uses. A star lights up when you have that idea from your Skill Galaxy missions.
      </p>
      <p className="mt-3 text-[16px] text-[#EEF2F8]" aria-live="polite">
        {statuses === null
          ? 'Checking your skills…'
          : have.length
            ? `Your bright stars: ${have.map((c) => CONCEPT_INFO[c].name).join(', ')}.`
            : 'No bright stars yet. Finish Skill Galaxy missions on the first try and your stars will start to shine.'}
      </p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lights.map((c) => {
          const m = c.maker
          const first = makerFirstName(m)
          const game = GAMES.find((g) => g.id === m.tryGame)
          return (
            <li key={m.id} className="flex flex-col rounded-[20px] border border-white/[0.08] bg-[#111C32] p-4">
              <div className="flex items-start gap-3">
                <MakerAvatar look={m.look} size={64} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-bold leading-tight text-[#EEF2F8]">{m.role}</h3>
                  <p className="text-[14px] text-[#A7B0C0]">
                    {m.name} · {m.continent}
                  </p>
                </div>
                <Constellation stars={c.stars} />
              </div>
              <ul className="mt-3 grid gap-1 text-[15px]" aria-label={`Skills ${first} uses`}>
                {c.stars.map((s) => (
                  <li key={s.concept} className="flex items-center justify-between gap-2">
                    <span className="text-[#EEF2F8]">
                      <span aria-hidden>{CONCEPT_INFO[s.concept].icon}</span> {CONCEPT_INFO[s.concept].name}
                    </span>
                    <span data-cue={s.light === 'bright' ? 'ok' : s.light === 'off' ? undefined : 'info'} className={`text-[13px] ${s.light === 'bright' ? 'font-bold text-amber-300' : 'text-[#A7B0C0]'}`}>
                      {statuses === null ? '' : LIGHT_LABEL[s.light]}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[15px] text-[#A7B0C0]">{statuses === null ? m.tagline : careerLine(c)}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <Link
                  href={`/kids/careers/${m.id}`}
                  className="inline-flex min-h-[48px] items-center rounded-2xl bg-amber-500 px-4 font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                >
                  Meet {first}
                </Link>
                {game && (
                  <Link
                    href={`/kids/play/${game.id}`}
                    className="inline-flex min-h-[48px] items-center rounded-2xl border border-white/[0.16] px-4 font-bold text-[#EEF2F8] hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                  >
                    Try my job: {game.name}
                  </Link>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
