'use client'

// components/kids/ui/LevelUpCeremonyClient.tsx
// The level-up ceremony (roadmap #22, "rewards you can hear and see"). Rendered
// by RewardToastClient — never mount it yourself. About 3 seconds:
//   0.0 s  the XP bar fills          (sound: levelup fanfare)
//   0.8 s  the rank stamps in        (sound: stamp)
//   1.4 s  the new unlock drops in   (sound: unlock)
//   3.2 s  it closes by itself — but ONLY on a hover device, with no equippable
//          unlock, outside Explorers (a mouse resting on it, or any press on
//          the card, holds it open). On touch phones, with an "Equip it"
//          unlock, or for Explorers (Spark is still speaking) it stays until
//          the child taps Skip/Continue.
// Skippable at any moment: the Skip button, Continue, Escape or a tap outside.
// Reduced motion (device or kids Settings): the final frame, no movement.
// Explorers (5–7, pre-readers): Spark says the reward aloud when voice is on
// (sparkSays is silent otherwise). Sounds follow the kids Settings (playSound).

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { levelInfo, unlockUse, type RewardResult, type Unlock } from '@/lib/kids/universe/rewards'
import { playSound, sparkSays } from '@/lib/kids-audio'
import { useKidsReducedMotion } from '@/lib/kids/settings'

const KIND_ICON: Record<Unlock['kind'], string> = {
  paint: '🎨',
  decal: '✴️',
  trail: '💫',
  skin: '🧥',
  avatar: '🧑‍🚀',
  sound: '🔊',
  title: '🏷️',
}

/** Unlocks that are worn in the Hangar: the ceremony offers "Equip it" for these. */
const EQUIPPABLE: ReadonlySet<Unlock['kind']> = new Set(['paint', 'decal', 'trail', 'skin'])

const PHASE_MS = [60, 800, 1400] as const
const CLOSE_MS = 3200

/** What Spark says for this level-up (also the screen-reader text). */
export function ceremonyLine(r: RewardResult): string {
  const li = levelInfo(r.progress.xp)
  const u = r.newUnlocks[0]
  return `Level ${r.levelAfter}! You are a ${li.title}.${u ? ` You unlocked ${u.name}!` : ''}`
}

export interface LevelUpCeremonyProps {
  result: RewardResult
  onClose: () => void
}

export default function LevelUpCeremonyClient({ result, onClose }: LevelUpCeremonyProps) {
  const reduced = useKidsReducedMotion()
  // 0 = bar empty, 1 = bar filling, 2 = rank stamped, 3 = unlock shown.
  const [timelinePhase, setPhase] = useState(0)
  // Reduced motion may switch on after the first render (the hook reads the device): always the final frame then.
  const phase = reduced ? 3 : timelinePhase
  const hold = useRef(false)
  const pressed = useRef(false)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef<Element | null>(null)

  const li = levelInfo(result.progress.xp)
  const before = levelInfo(result.xpBefore)
  const startPct = result.levelBefore === before.level ? Math.round(before.progress * 100) : 0
  const unlocks = result.newUnlocks
  const shown = unlocks.slice(0, 3)
  const equippable = unlocks.some((u) => EQUIPPABLE.has(u.kind))
  const explorers = result.progress.band === 'explorers'

  const close = useCallback(() => {
    onClose()
  }, [onClose])

  // Focus in, focus back out.
  useEffect(() => {
    restoreFocus.current = document.activeElement
    closeBtn.current?.focus({ preventScroll: true })
    return () => {
      const el = restoreFocus.current
      if (el instanceof HTMLElement && document.contains(el)) el.focus({ preventScroll: true })
    }
  }, [])

  // The timeline: phases, sounds, Spark, auto-close.
  useEffect(() => {
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    playSound('levelup')
    if (reduced) {
      if (unlocks.length) at(450, () => playSound('unlock'))
    } else {
      at(PHASE_MS[0], () => setPhase(1))
      at(PHASE_MS[1], () => {
        setPhase(2)
        playSound('stamp')
      })
      at(PHASE_MS[2], () => {
        setPhase(3)
        if (unlocks.length) playSound('unlock')
      })
    }
    if (explorers) at(500, () => sparkSays(ceremonyLine(result)))
    const tryClose = () => {
      if (hold.current) at(800, tryClose)
      else close()
    }
    const canHover = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false
    if (canHover && !equippable && !explorers) at(CLOSE_MS, tryClose)
    return () => timers.forEach((t) => window.clearTimeout(t))
    // One timeline per ceremony; `result` identity changes only for a new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const anim = !reduced
  const barPct = phase >= 1 ? 100 : startPct

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-[#0A1120]/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
      aria-describedby="levelup-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        className={`relative w-full max-w-sm overflow-hidden rounded-[28px] border border-amber-400/40 bg-gradient-to-b from-[#19263F] to-[#0A1120] p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,.45)] ${anim ? 'kids-cer-pop' : ''}`}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') hold.current = true
        }}
        onPointerDown={() => {
          // Any press on the card (touch, pen or mouse) holds it open for good.
          pressed.current = true
          hold.current = true
        }}
        onPointerLeave={() => {
          if (!pressed.current) hold.current = false
        }}
      >
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 min-h-[44px] min-w-[44px] rounded-xl px-3 text-sm font-bold text-[#A7B0C0] hover:bg-white/10 hover:text-[#EEF2F8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        >
          Skip
        </button>

        <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Level up!</p>

        {/* The rank stamp */}
        <div className="mt-4 flex justify-center" aria-hidden>
          <div
            className={`grid h-28 w-28 place-items-center rounded-full border-4 border-amber-200/80 bg-amber-500 font-display text-5xl font-bold text-[#1A1103] shadow-[0_0_32px_rgba(252,104,24,.55)] ${
              phase >= 2 ? (anim ? 'kids-cer-stamp' : '') : 'opacity-0'
            }`}
          >
            {result.levelAfter}
          </div>
        </div>
        <h2 id="levelup-title" className={`mt-3 font-display text-2xl font-bold text-[#EEF2F8] ${phase >= 2 ? '' : 'opacity-0'}`}>
          Level {result.levelAfter} · {li.title}
        </h2>

        {/* The XP bar filling up */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-[13px] font-semibold text-[#A7B0C0]">
            <span>Level {result.levelBefore}</span>
            <span className="font-display text-amber-300">+{result.xpGained} XP</span>
            <span>Level {result.levelAfter}</span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_12px_rgba(252,104,24,.6)] ${anim ? 'transition-[width] duration-700 ease-[cubic-bezier(.22,.61,.36,1)]' : ''}`}
              style={{ width: `${barPct}%` }}
            />
          </div>
        </div>

        {/* The new unlocks */}
        <div id="levelup-desc" className="mt-4 min-h-[76px]">
          {shown.length ? (
            <ul className={`space-y-2 ${phase >= 3 ? (anim ? 'kids-cer-drop' : '') : 'opacity-0'}`}>
              {shown.map((u) => (
                <li key={u.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0A1120]/70 p-3 text-left">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/5 text-2xl" aria-hidden>
                    {u.kind === 'paint' && u.value ? <span className="block h-8 w-8 rounded-full ring-2 ring-white/30" style={{ backgroundColor: u.value }} /> : KIND_ICON[u.kind]}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-bold uppercase tracking-wider text-cyan-300">Unlocked</span>
                    <span className="block truncate font-display text-lg font-bold text-[#EEF2F8]">{u.name}</span>
                    <span className="block text-[13px] text-[#A7B0C0]">{unlockUse(u)}</span>
                  </span>
                </li>
              ))}
              {unlocks.length > shown.length && <li className="text-[13px] font-semibold text-[#A7B0C0]">+{unlocks.length - shown.length} more in your Hangar</li>}
            </ul>
          ) : (
            <p className={`text-[15px] text-[#A7B0C0] ${phase >= 3 ? '' : 'opacity-0'}`}>Keep exploring: something new unlocks at every level.</p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            ref={closeBtn}
            type="button"
            onClick={close}
            className="min-h-[48px] flex-1 rounded-2xl bg-amber-500 px-5 font-display font-bold text-[#1A1103] transition hover:bg-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            Continue
          </button>
          {equippable && (
            <Link
              href="/kids/hangar"
              onClick={close}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border-2 border-amber-300/60 px-4 font-display font-bold text-amber-200 hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              Equip it →
            </Link>
          )}
        </div>
      </div>
      <style>{`
        @keyframes kidsCerPop { from { opacity: 0; transform: scale(.9) } to { opacity: 1; transform: none } }
        @keyframes kidsCerStamp { 0% { opacity: 0; transform: scale(2.2) rotate(-14deg) } 70% { opacity: 1; transform: scale(.94) rotate(-4deg) } 100% { transform: scale(1) rotate(-4deg) } }
        @keyframes kidsCerDrop { from { opacity: 0; transform: translateY(-18px) } to { opacity: 1; transform: none } }
        .kids-cer-pop { animation: kidsCerPop .25s cubic-bezier(.22,.61,.36,1) both }
        .kids-cer-stamp { animation: kidsCerStamp .35s cubic-bezier(.22,.61,.36,1) both }
        .kids-cer-drop { animation: kidsCerDrop .3s cubic-bezier(.22,.61,.36,1) both }
        @media (prefers-reduced-motion: reduce) { .kids-cer-pop, .kids-cer-stamp, .kids-cer-drop { animation: none } }
        html.kids-reduce-motion .kids-cer-pop, html.kids-reduce-motion .kids-cer-stamp, html.kids-reduce-motion .kids-cer-drop { animation: none }
      `}</style>
    </div>
  )
}
