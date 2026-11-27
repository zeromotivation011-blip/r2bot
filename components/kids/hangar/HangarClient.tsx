'use client'

// components/kids/hangar/HangarClient.tsx
// The top of the Hangar: the robot in its 3D bay, the explorer's level, and the
// customise panel (paints, decals, trails, skins from the rewards engine's
// UNLOCKS). This file does not import three.js — the bay is next/dynamic
// ({ ssr: false }) behind a same-size poster.

import dynamic from 'next/dynamic'
import Link from 'next/link'
import type React from 'react'
import { useCallback, useId, useRef, useState } from 'react'
import { collectedStars } from '@/lib/kids-progress'
import { DEFAULT_DESIGN, saveDesign } from '@/lib/kids/robot-design'
import { daysExploredThisWeek, levelInfo, MAX_LEVEL, xpForLevel, type Unlock } from '@/lib/kids/universe/rewards'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { howToEarn, LOOK_NOTES, owns, saveCosmetics, unlocksOf, type CosmeticKind } from './cosmetics'
import { HangarPoster } from './HangarPoster'
import { useHangarState } from './useHangarState'

const HangarScene = dynamic(() => import('./HangarSceneClient'), { ssr: false })

const TABS: { kind: CosmeticKind; label: string; hint: string }[] = [
  { kind: 'paint', label: 'Paint', hint: 'Paint changes your robot’s main colour everywhere: the Workshop, the Code Lab and AR.' },
  { kind: 'decal', label: 'Decals', hint: 'A glowing sign on both sides of your robot’s body.' },
  { kind: 'trail', label: 'Trails', hint: 'Trails show when your robot drives. Press Test drive to see yours.' },
  { kind: 'skin', label: 'Skins', hint: 'A skin covers the paint with a whole new surface.' },
]

const DECAL_ICON: Record<string, string> = {
  'decal-lightning': '⚡',
  'decal-eye': '👁️',
  'decal-wave': '〰️',
  'decal-gear': '⚙️',
}
const TRAIL_SWATCH: Record<string, string> = {
  'trail-sparkle': 'radial-gradient(circle at 30% 40%, #fff 0 8%, transparent 9%), radial-gradient(circle at 65% 60%, #FFA878 0 7%, transparent 8%), radial-gradient(circle at 50% 25%, #fff 0 5%, transparent 6%), #19263F',
  'trail-rainbow': 'linear-gradient(90deg, #ef4444, #f59e0b, #facc15, #22c55e, #0ea5e9, #6366f1)',
  'trail-plasma': 'radial-gradient(circle at 50% 50%, #E0FBFF 0 12%, #00E5FF 30%, #0369A1 70%, #082F49 100%)',
}
const SKIN_SWATCH: Record<string, string> = {
  'skin-mars': 'radial-gradient(circle at 30% 30%, #E8965F 0 10%, transparent 30%), radial-gradient(circle at 70% 70%, #5A1E0E 0 10%, transparent 35%), #B4532A',
  'skin-circuit':
    'linear-gradient(90deg, transparent 45%, #D4A93A 45% 52%, transparent 52%), linear-gradient(0deg, transparent 30%, #7EE2A8 30% 36%, transparent 36%), #0B5D3B',
}

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      <path fill="currentColor" d="M6 8V6a4 4 0 1 1 8 0v2h1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h1Zm2 0h4V6a2 2 0 1 0-4 0v2Z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      <path fill="currentColor" d="M8.1 14.3 3.8 10l1.4-1.4 2.9 2.9 6.7-6.7 1.4 1.4-8.1 8.1Z" />
    </svg>
  )
}

export function HangarClient() {
  const { ready, progress, design, cosmetics } = useHangarState()
  const [tab, setTab] = useState<CosmeticKind>('paint')
  const [driveToken, setDriveToken] = useState(0)
  const [driving, setDriving] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [sceneFailed, setSceneFailed] = useState(false)
  const [say, setSay] = useState('')
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const baseId = useId()

  const lvl = levelInfo(progress.xp)
  const name = progress.explorerName.trim() || 'Explorer'
  const paints = unlocksOf('paint')
  const allLooks = (['paint', 'decal', 'trail', 'skin'] as CosmeticKind[]).flatMap(unlocksOf)
  const ownedCount = allLooks.filter((u) => owns(u, progress)).length
  const paintNow = paints.find((p) => p.value && p.value.toLowerCase() === design.primary.toLowerCase())
  // When an earned paint is on but the Workshop colour was never remembered (a
  // robot card imported in that colour, a new device), fall back to the
  // Workshop's own default so "Workshop colour" always does something.
  const workshopColour = paintNow ? (cosmetics.workshopColour ?? DEFAULT_DESIGN.primary) : design.primary
  // The closest look still to earn by levelling up: a real goal, from real XP.
  const nextUnlock = allLooks
    .filter((u) => !owns(u, progress) && u.atLevel !== undefined)
    .sort((a, b) => (a.atLevel ?? 0) - (b.atLevel ?? 0))[0]
  const xpToNextUnlock = nextUnlock?.atLevel !== undefined ? Math.max(0, xpForLevel(nextUnlock.atLevel) - progress.xp) : 0

  const announce = useCallback((text: string) => {
    setSay('')
    window.setTimeout(() => setSay(text), 30)
  }, [])

  const choose = (u: Unlock | null, kind: CosmeticKind) => {
    primeAudio()
    if (u && !owns(u, progress)) {
      playSound('click')
      announce(`${u.name} is locked. ${howToEarn(u)} to unlock it.`)
      return
    }
    if (kind === 'paint') {
      const colour = u?.value ?? workshopColour
      const same = colour.toLowerCase() === design.primary.toLowerCase()
      if (same && !cosmetics.skin) {
        announce(u ? `${design.name} is already painted ${u.name}.` : `${design.name} is already in its Workshop colour.`)
        return
      }
      playSound('correct')
      // Remember the Workshop colour the first time an earned paint replaces it.
      // A skin covers the paint, so choosing a paint takes the skin off.
      const next = { ...cosmetics, skin: null, workshopColour: u?.value ? workshopColour : cosmetics.workshopColour }
      if (next.skin !== cosmetics.skin || next.workshopColour !== cosmetics.workshopColour) saveCosmetics(next)
      if (!same) saveDesign({ ...design, primary: colour })
      announce(u ? `${design.name} is now painted ${u.name}.` : `${design.name} is back in its Workshop colour.`)
      return
    }
    const id = u ? u.id : null
    if (cosmetics[kind] === id) {
      announce(u ? `${u.name} is already on.` : `No ${kind} on ${design.name}.`)
      return
    }
    playSound('correct')
    saveCosmetics({ ...cosmetics, [kind]: id })
    announce(u ? `${u.name} on. ${LOOK_NOTES[u.id] ?? ''}` : `No ${kind} on ${design.name}.`)
  }

  const startDrive = () => {
    if (driving || !sceneReady) return
    primeAudio()
    playSound('click')
    setDriving(true)
    setDriveToken((n) => n + 1)
    announce(`${design.name} is out for a test drive.`)
  }

  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next = -1
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    if (next < 0) return
    e.preventDefault()
    setTab(TABS[next].kind)
    tabRefs.current[next]?.focus()
  }

  const items = unlocksOf(tab)
  const current: string | null = tab === 'paint' ? (paintNow?.id ?? null) : cosmetics[tab]
  const nameOf = (kind: CosmeticKind, id: string | null) =>
    id ? (unlocksOf(kind).find((u) => u.id === id)?.name ?? 'None').replace(/ (Skin|Trail)$/, '') : 'None'
  const days = daysExploredThisWeek(progress)
  const wearing = [
    { k: 'Paint', v: paintNow ? paintNow.name : 'Workshop', dot: cosmetics.skin ? '#334155' : design.primary },
    { k: 'Decal', v: nameOf('decal', cosmetics.decal), dot: cosmetics.decal ? '#FC6818' : 'transparent' },
    { k: 'Trail', v: nameOf('trail', cosmetics.trail), dot: cosmetics.trail ? '#00E5FF' : 'transparent' },
    { k: 'Skin', v: nameOf('skin', cosmetics.skin), dot: cosmetics.skin ? '#22C55E' : 'transparent' },
  ]
  const tabInfo = TABS.find((t) => t.kind === tab) ?? TABS[0]
  const lookLabel = [
    `${design.name}, your robot, standing in its hangar bay`,
    paintNow ? `painted ${paintNow.name}` : '',
    cosmetics.skin ? `wearing the ${unlocksOf('skin').find((u) => u.id === cosmetics.skin)?.name ?? 'skin'}` : '',
    cosmetics.decal ? `with a ${unlocksOf('decal').find((u) => u.id === cosmetics.decal)?.name ?? 'decal'} decal` : '',
    cosmetics.booster ? 'with the Rocket Booster on its back' : '',
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <section aria-labelledby="bay-h" className="mx-auto max-w-6xl px-4 py-0">
      <h2 id="bay-h" className="sr-only">
        Your robot and its looks
      </h2>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* ── The bay ── */}
        <div className="relative h-[400px] overflow-hidden rounded-[28px] border border-white/10 bg-[#060B16] shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:h-[440px] lg:h-[520px]">
          <HangarPoster colour={design.primary} hidden={sceneReady} failed={sceneFailed} />
          {ready && !sceneFailed && (
            <div className={`absolute inset-0 transition-opacity duration-500 ${sceneReady ? 'opacity-100' : 'opacity-0'}`}>
              <HangarScene
                design={design}
                look={{ decal: cosmetics.decal, skin: cosmetics.skin, trail: cosmetics.trail, booster: cosmetics.booster }}
                driveToken={driveToken}
                onDriveEnd={() => setDriving(false)}
                onReady={() => setSceneReady(true)}
                onError={() => setSceneFailed(true)}
                label={lookLabel}
              />
            </div>
          )}
          {/* Name plate */}
          <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-white/10 bg-[#0A1120]/80 px-3 py-2 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Bay 01</p>
            <p className="font-display text-lg font-bold leading-tight text-white">{ready ? design.name : ' '}</p>
          </div>
          {sceneReady && (
            <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0A1120]/80 px-3 py-1 text-sm font-semibold text-[#A7B0C0]">
              <span className="[@media(pointer:fine)]:hidden">Drag to spin · pinch to zoom</span>
              <span className="hidden [@media(pointer:fine)]:inline">Drag to spin · scroll to zoom</span>
            </p>
          )}
        </div>

        {/* ── Pilot card ── */}
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
          <div className="flex items-center gap-4">
            <div
              className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full"
              style={{ background: `conic-gradient(#FC6818 ${Math.round((ready ? lvl.progress : 0) * 360)}deg, rgba(255,255,255,.08) 0)` }}
              aria-hidden
            >
              <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-[#111C32]">
                <span className="font-display text-2xl font-bold text-white">{ready ? lvl.level : '–'}</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#A7B0C0]">{ready ? name : ' '}</p>
              <p className="font-display text-2xl font-bold leading-tight text-white">{ready ? lvl.title : ' '}</p>
              <p className="text-sm text-[#A7B0C0]">
                {!ready ? (
                  '\u00A0'
                ) : lvl.level >= MAX_LEVEL ? (
                  <>Level {lvl.level} · Top level reached</>
                ) : (
                  <>
                    Level {lvl.level} · {lvl.xpIntoLevel.toLocaleString('en-GB')} / {lvl.xpForNext.toLocaleString('en-GB')} XP to level{' '}
                    {lvl.level + 1}
                  </>
                )}
              </p>
            </div>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Progress to the next level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={ready ? Math.round(lvl.progress * 100) : 0}
          >
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-[width] duration-500" style={{ width: `${ready ? Math.round(lvl.progress * 100) : 0}%` }} />
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              // The one currency (XP) and the one quality mark (stars), the same everywhere.
              { k: 'XP', v: progress.xp.toLocaleString('en-GB'), hint: 'XP grows your level. Lessons, games and activities earn it.' },
              { k: 'Stars', v: ready ? collectedStars(progress).toLocaleString('en-GB') : '0', hint: 'Your best stars from every lesson, story, mission and activity.' },
              { k: 'Badges', v: Object.keys(progress.badges).length, hint: 'Skill badges you have earned.' },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-white/10 bg-[#0A1120]/60 px-2 py-3" title={s.hint}>
                <dt className="text-xs font-semibold text-[#A7B0C0]">{s.k}</dt>
                <dd className="font-display text-xl font-bold text-white">{ready ? s.v : '–'}</dd>
              </div>
            ))}
          </dl>
          <div className="rounded-2xl border border-white/10 bg-[#0A1120]/60 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#A7B0C0]">Wearing now</p>
            <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              {wearing.map((w) => (
                <li key={w.k} className="flex min-w-0 items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full border border-white/20" style={{ background: w.dot }} aria-hidden />
                  <span className="text-[#A7B0C0]">{w.k}</span>
                  <span className="truncate font-semibold text-white">{ready ? w.v : '\u00A0'}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-[#A7B0C0]">
              {ready ? (
                <>
                  <span className="font-display font-bold text-white">{days}</span> {days === 1 ? 'day' : 'days'} explored this week
                </>
              ) : (
                '\u00A0'
              )}
            </p>
          </div>
          {/* Next unlock: the nearest look earned by levelling up. */}
          <div className="rounded-2xl border border-amber-400/25 bg-amber-500/[0.06] p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Next unlock</p>
            {!ready ? (
              <p className="mt-2 flex min-h-[44px] items-center text-sm text-[#A7B0C0]">{'\u00A0'}</p>
            ) : nextUnlock ? (
              <div className="mt-2 flex min-h-[44px] items-center gap-3">
                <span className="block h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/15" aria-hidden>
                  <Swatch u={nextUnlock} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-bold leading-tight text-white">{nextUnlock.name}</p>
                  <p className="text-sm text-[#A7B0C0]">
                    Reach level {nextUnlock.atLevel} · <span className="font-semibold text-white">{xpToNextUnlock.toLocaleString('en-GB')} XP</span> to go
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 flex min-h-[44px] items-center text-sm text-[#A7B0C0]">Every level look is yours. Badges unlock the rest.</p>
            )}
          </div>
          <div className="mt-auto grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={startDrive}
              disabled={driving || !sceneReady}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-amber-500 px-4 font-display text-base font-bold text-[#1A1103] transition hover:-translate-y-0.5 hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                <path fill="currentColor" d="M6 4.5v11l9-5.5-9-5.5Z" />
              </svg>
              {driving ? 'Driving…' : 'Test drive'}
            </button>
            <Link
              href="/kids/workshop"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-white/15 bg-white/[0.06] px-3 font-display text-base font-bold text-white transition hover:-translate-y-0.5 hover:border-white/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.97]"
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                <path
                  fill="currentColor"
                  d="M12.9 2.2a4.5 4.5 0 0 0-5.6 5.7L2.6 12.6a2 2 0 1 0 2.8 2.8l4.7-4.7a4.5 4.5 0 0 0 5.7-5.6l-2.6 2.6-2.3-.5-.5-2.3 2.5-2.7Z"
                />
              </svg>
              Change parts
            </Link>
          </div>
        </div>
      </div>

      {/* ── Customise ── */}
      <div className="mt-4 rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="font-display text-2xl font-bold text-white">Customise</h3>
          <p className="text-sm text-[#A7B0C0]">
            {ready && (
              <>
                <span className="font-display font-bold text-white">
                  {ownedCount} of {allLooks.length}
                </span>{' '}
                looks earned ·{' '}
              </>
            )}
            Earned with XP and badges, never bought.
          </p>
        </div>
        <div role="tablist" aria-label="Kinds of looks" className="mt-3 grid grid-cols-4 gap-1 rounded-2xl bg-[#0A1120]/70 p-1">
          {TABS.map((t, i) => {
            const on = t.kind === tab
            return (
              <button
                key={t.kind}
                ref={(el) => {
                  tabRefs.current[i] = el
                }}
                id={`${baseId}-tab-${t.kind}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`${baseId}-panel`}
                tabIndex={on ? 0 : -1}
                onKeyDown={(e) => onTabKey(e, i)}
                onClick={() => setTab(t.kind)}
                className={`min-h-[48px] rounded-xl px-2 font-display text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 sm:text-base ${
                  on ? 'bg-amber-500 text-[#1A1103] shadow' : 'text-[#A7B0C0] hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
        <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${tab}`} className="mt-4">
          <p className="mb-3 text-sm text-[#A7B0C0]">{tabInfo.hint}</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {/* The "off" choice for each kind. */}
            <li>
              <LookButton
                selected={ready && current === null}
                locked={false}
                onClick={() => choose(null, tab)}
                swatch={
                  tab === 'paint' ? (
                    <span className="block h-full w-full rounded-xl" style={{ background: workshopColour ?? design.primary }} />
                  ) : (
                    <span className="grid h-full w-full place-items-center rounded-xl bg-[#0A1120] text-2xl text-[#6E7888]" aria-hidden>
                      ∅
                    </span>
                  )
                }
                title={tab === 'paint' ? 'Workshop colour' : 'None'}
                sub={tab === 'paint' ? 'The colour you chose in the Workshop' : `No ${tabInfo.label.toLowerCase().replace(/s$/, '')}`}
              />
            </li>
            {items.map((u) => {
              const own = owns(u, progress)
              return (
                <li key={u.id}>
                  <LookButton
                    selected={ready && current === u.id}
                    locked={ready && !own}
                    onClick={() => choose(u, tab)}
                    swatch={<Swatch u={u} />}
                    title={u.name}
                    sub={!ready || !own ? howToEarn(u) : (LOOK_NOTES[u.id] ?? 'Yours to use.')}
                  />
                </li>
              )
            })}
          </ul>
        </div>
        <p className="sr-only" aria-live="polite">
          {say}
        </p>
      </div>
    </section>
  )
}

function Swatch({ u }: { u: Unlock }) {
  if (u.kind === 'paint') return <span className="block h-full w-full rounded-xl shadow-inner" style={{ background: `linear-gradient(145deg, ${u.value}, ${u.value} 55%, rgba(0,0,0,.35))`, backgroundColor: u.value }} />
  if (u.kind === 'decal')
    return (
      <span className="grid h-full w-full place-items-center rounded-xl bg-[#0A1120] text-3xl" aria-hidden>
        {DECAL_ICON[u.id] ?? '★'}
      </span>
    )
  const bg = u.kind === 'trail' ? TRAIL_SWATCH[u.id] : SKIN_SWATCH[u.id]
  return <span className="block h-full w-full rounded-xl" style={{ background: bg ?? '#19263F' }} aria-hidden />
}

function LookButton({
  selected,
  locked,
  onClick,
  swatch,
  title,
  sub,
}: {
  selected: boolean
  locked: boolean
  onClick: () => void
  swatch: React.ReactNode
  title: string
  sub: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-disabled={locked || undefined}
      className={`group relative flex h-full min-h-[136px] w-full flex-col gap-2 rounded-[20px] border-2 p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.97] ${
        selected
          ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_0_4px_rgba(252,104,24,.15)]'
          : locked
            ? 'border-white/[0.06] bg-white/[0.02]'
            : 'border-white/10 bg-white/[0.04] hover:-translate-y-0.5 hover:border-white/25'
      }`}
    >
      <span className={`relative block h-14 w-full ${locked ? 'opacity-35 grayscale' : ''}`}>{swatch}</span>
      <span className="flex items-center gap-1.5 font-display text-base font-bold leading-tight text-white">
        {locked && (
          <span className="text-[#6E7888]">
            <LockIcon />
          </span>
        )}
        {title}
      </span>
      <span className={`text-sm leading-snug ${locked ? 'text-amber-300' : 'text-[#A7B0C0]'}`}>{sub}</span>
      {selected && (
        <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-amber-500 text-[#1A1103]">
          <CheckIcon />
        </span>
      )}
    </button>
  )
}
