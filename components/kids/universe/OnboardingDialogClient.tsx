'use client'

// components/kids/universe/OnboardingDialogClient.tsx
// First-visit setup (and "edit my explorer"): three steps, every one skippable.
//   1. Who's exploring? — age group (band)
//   2. Name your explorer — a nickname, checked by the classroom rules
//      (lib/kids/classroom.ts checkNickname): never an email, phone or full name
//   3. Pick an avatar and colour — earned avatars/paints from progress.unlocks
// Never opens by itself: it starts only when the child taps "Start exploring"
// or their avatar.

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type React from 'react'
import { saveProgress, type KidsProgress } from '@/lib/kids-progress'
import { KIDS_BANDS, getBand, type BandId } from '@/lib/kids/bands'
import { checkNickname } from '@/lib/kids/classroom'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { AVATARS, AVATAR_COLOURS, Avatar, DEFAULT_ME_LOOK, avatarName, displayAvatarId, encodeMeLook, isMeAvatar, isOwned, unlockHint } from './avatars'
import AvatarMakerClient from './AvatarMakerClient'
import { markOnboarded } from './universe-state'

const ADJ = ['Captain', 'Rocket', 'Turbo', 'Cosmic', 'Clever', 'Super', 'Nova', 'Pixel', 'Solar', 'Zippy', 'Mighty', 'Lunar']
const NOUN = ['Comet', 'Gizmo', 'Sprocket', 'Orbit', 'Bolt', 'Spark', 'Rover', 'Quasar', 'Widget', 'Meteor', 'Circuit', 'Nebula']

function funName(seed: number): string {
  return `${ADJ[seed % ADJ.length]} ${NOUN[Math.floor(seed / ADJ.length) % NOUN.length]}`
}

export interface OnboardingDialogProps {
  progress: KidsProgress
  /** 'setup' on first visit, 'edit' from the explorer card. */
  mode: 'setup' | 'edit'
  onClose: () => void
}

export function OnboardingDialogClient({ progress, mode, onClose }: OnboardingDialogProps) {
  const [step, setStep] = useState(0)
  const [band, setBand] = useState<BandId | null>(progress.band)
  const [name, setName] = useState(progress.explorerName)
  const [nameError, setNameError] = useState('')
  // Teens who never chose see the Lab badge, not the cartoon default (roadmap #83).
  const [avatarId, setAvatarId] = useState(() => displayAvatarId(progress.avatar, progress.band))
  // Robot avatars, or "Draw me" (roadmap #87).
  const [avatarKind, setAvatarKind] = useState<'robot' | 'me'>(() => (isMeAvatar(progress.avatar?.id) ? 'me' : 'robot'))
  const [colour, setColour] = useState(progress.avatar?.color ?? '#FC6818')
  const [ideaSeed, setIdeaSeed] = useState(7)
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const nameId = useId()
  const nameHelpId = useId()

  // Remember where focus was, lock page scroll, and give focus back on close.
  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      returnFocus.current?.focus?.()
    }
  }, [])

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  // Picking Engineers swaps an untouched cartoon default for the Lab badge (and back).
  const untouchedAvatar = displayAvatarId(progress.avatar, 'engineers') === 'lab'
  useEffect(() => {
    if (!untouchedAvatar) return
    setAvatarId((id) => (band === 'engineers' && id === 'astro' ? 'lab' : band !== 'engineers' && id === 'lab' ? 'astro' : id))
  }, [band, untouchedAvatar])

  const close = useCallback(() => {
    markOnboarded()
    onClose()
  }, [onClose])

  // Esc closes; Tab stays inside the dialog.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key !== 'Tab' || !dialogRef.current) return
    const f = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])')
    if (!f.length) return
    const first = f[0]
    const last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const tap = () => {
    primeAudio()
    playSound('click')
  }

  const goNext = () => {
    if (step === 1 && name.trim()) {
      const c = checkNickname(name)
      if (!c.ok) {
        setNameError(c.error)
        playSound('wrong')
        return
      }
      setName(c.nickname)
    }
    tap()
    setStep((s) => Math.min(2, s + 1))
  }

  const finish = () => {
    const c = name.trim() ? checkNickname(name) : null
    const b = getBand(band)
    saveProgress({
      band,
      age: b ? Math.round((b.minAge + b.maxAge) / 2) : progress.age,
      explorerName: c && c.ok ? c.nickname : progress.explorerName,
      avatar: { id: avatarId, color: colour },
    })
    primeAudio()
    playSound('levelup')
    close()
  }

  const unlocks = progress.unlocks
  const steps = ['Age group', 'Explorer name', 'Avatar']

  // Portalled to <body>: the kids shell's <main> is its own stacking context,
  // so a dialog inside it would sit under the phone tab bar.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#050A14]/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" onKeyDown={onKeyDown}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="uv-pop flex max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] border border-white/15 bg-[#111C32] shadow-[0_8px_40px_rgba(0,0,0,.6)] sm:max-h-[92vh] sm:rounded-[28px]"
      >
        {/* Header: step dots + skip */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <ol className="flex items-center gap-2" aria-label={`Step ${step + 1} of 3`}>
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full font-display text-sm font-bold ${
                    i < step ? 'bg-green-500 text-[#06210F]' : i === step ? 'bg-amber-500 text-[#1A1103]' : 'bg-white/10 text-[#A7B0C0]'
                  }`}
                  aria-current={i === step ? 'step' : undefined}
                >
                  {i < step ? '✓' : i + 1}
                </span>
                <span className="sr-only">{s}</span>
                {i < 2 && <span className="h-0.5 w-5 rounded bg-white/15" aria-hidden />}
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={close}
            className="min-h-[48px] rounded-xl px-3 text-[15px] font-semibold text-[#A7B0C0] hover:bg-white/5 hover:text-[#EEF2F8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            {mode === 'setup' ? 'Skip for now' : 'Close'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-5">
          {step === 0 && (
            <>
              <h2 id={titleId} ref={headingRef} tabIndex={-1} className="font-display text-2xl font-bold text-[#EEF2F8] outline-none">
                Who&rsquo;s exploring?
              </h2>
              <p className="mt-1 text-[15px] text-[#A7B0C0]">Pick your age group. You can still visit every planet and game.</p>
              <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Age group">
                {KIDS_BANDS.map((b) => {
                  const on = band === b.id
                  return (
                    <button
                      key={b.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        tap()
                        setBand(b.id)
                      }}
                      className={`relative min-h-[104px] overflow-hidden rounded-2xl border-2 p-3 text-left transition active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                        on ? 'border-amber-400 bg-amber-500/10' : 'border-white/10 bg-white/[0.04] hover:border-white/25'
                      }`}
                    >
                      <span className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${b.gradient}`} aria-hidden />
                      <span className="text-3xl" aria-hidden>
                        {b.emoji}
                      </span>
                      <span className="mt-1 block font-display text-lg font-bold text-[#EEF2F8]">{b.name}</span>
                      <span className="block text-[14px] font-semibold text-[#A7B0C0]">Ages {b.ages}</span>
                      {on && (
                        <span className="absolute right-2 top-3 grid h-6 w-6 place-items-center rounded-full bg-amber-500 text-xs font-black text-[#1A1103]" aria-hidden>
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 id={titleId} ref={headingRef} tabIndex={-1} className="font-display text-2xl font-bold text-[#EEF2F8] outline-none">
                Name your explorer
              </h2>
              <p id={nameHelpId} className="mt-1 text-[15px] text-[#A7B0C0]">
                A made-up name or just your first name. Never your full name, email or phone number.
              </p>
              <label htmlFor={nameId} className="mt-4 block text-[14px] font-semibold text-[#EEF2F8]">
                Explorer name
              </label>
              <input
                id={nameId}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') goNext()
                }}
                maxLength={24}
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                aria-describedby={`${nameHelpId}${nameError ? ` ${nameId}-err` : ''}`}
                aria-invalid={nameError ? true : undefined}
                placeholder="e.g. Captain Comet"
                className={`mt-1 min-h-[56px] w-full rounded-2xl border-2 bg-[#0A1120] px-4 font-display text-xl text-[#EEF2F8] placeholder:text-[#6E7888] focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                  nameError ? 'border-red-400' : 'border-white/15 focus:border-amber-400'
                }`}
              />
              <p id={`${nameId}-err`} className="mt-2 min-h-[24px] text-[15px] font-semibold text-red-300" role="alert">
                {nameError}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-[14px] text-[#A7B0C0]">Ideas:</span>
                {[0, 1, 2].map((k) => {
                  const idea = funName(ideaSeed * 3 + k * 13)
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        tap()
                        setName(idea)
                        setNameError('')
                      }}
                      className="min-h-[48px] rounded-full border border-white/15 bg-white/5 px-4 text-[15px] font-semibold text-[#EEF2F8] transition hover:border-amber-400/60 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                    >
                      {idea}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => {
                    tap()
                    setIdeaSeed((s) => s + 5)
                  }}
                  className="min-h-[48px] rounded-full px-3 text-[15px] font-semibold text-cyan-300 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                >
                  🎲 More ideas
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 id={titleId} ref={headingRef} tabIndex={-1} className="font-display text-2xl font-bold text-[#EEF2F8] outline-none">
                Pick your avatar
              </h2>
              <div className="mt-3 flex items-center gap-4">
                <Avatar id={avatarId} color={colour} size={88} title={`Your avatar: ${avatarName(avatarId)}`} />
                <div>
                  <p className="font-display text-xl font-bold text-[#EEF2F8]">{checkNickname(name).ok ? name.trim() : 'Explorer'}</p>
                  <p className="text-[14px] text-[#A7B0C0]">Earn more avatars and colours as your Rank goes up.</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.04] p-1" role="tablist" aria-label="Kind of avatar">
                {(
                  [
                    ['robot', 'Robot avatars'],
                    ['me', 'Draw me'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={avatarKind === k}
                    onClick={() => {
                      tap()
                      setAvatarKind(k)
                      if (k === 'me' && !isMeAvatar(avatarId)) setAvatarId(encodeMeLook(DEFAULT_ME_LOOK))
                    }}
                    className={`min-h-[48px] rounded-xl font-display text-[16px] font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                      avatarKind === k ? 'bg-amber-500 text-[#1A1103]' : 'text-[#A7B0C0] hover:text-[#EEF2F8]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {avatarKind === 'me' && (
                <div className="mt-3">
                  <AvatarMakerClient value={avatarId} colour={colour} onChange={setAvatarId} />
                </div>
              )}
              <div className={`mt-4 grid grid-cols-4 gap-2${avatarKind === 'me' ? ' hidden' : ''}`} role="radiogroup" aria-label="Avatar">
                {AVATARS.map((a) => {
                  const owned = isOwned(a.unlock, unlocks)
                  const on = avatarId === a.id
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-disabled={!owned}
                      aria-label={owned ? a.name : `${a.name}, locked. ${unlockHint(a.unlock)} to earn it.`}
                      onClick={() => {
                        if (!owned) return
                        tap()
                        setAvatarId(a.id)
                      }}
                      className={`relative flex min-h-[80px] flex-col items-center justify-center rounded-2xl border-2 p-1.5 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                        on ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_0_3px_rgba(252,104,24,.25)]' : 'border-white/10 bg-white/[0.04]'
                      } ${owned ? 'active:scale-95 hover:border-white/30' : 'cursor-not-allowed'}`}
                    >
                      <span className={owned ? '' : 'opacity-35 grayscale'}>
                        <Avatar id={a.id} color={colour} size={52} />
                      </span>
                      {!owned && (
                        <span className="mt-0.5 text-[11px] font-bold leading-tight text-[#A7B0C0]">🔒 {unlockHint(a.unlock)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="mt-4 text-[14px] font-semibold text-[#EEF2F8]">Colour</p>
              <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar colour">
                {AVATAR_COLOURS.map((c) => {
                  const owned = isOwned(c.unlock, unlocks)
                  const on = colour.toLowerCase() === c.value.toLowerCase()
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-disabled={!owned}
                      aria-label={owned ? c.name : `${c.name}, locked. ${unlockHint(c.unlock)} to earn it.`}
                      title={owned ? c.name : `${c.name} · ${unlockHint(c.unlock)}`}
                      onClick={() => {
                        if (!owned) return
                        tap()
                        setColour(c.value)
                      }}
                      className={`relative grid h-12 w-12 place-items-center rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                        on ? 'border-white' : 'border-transparent'
                      } ${owned ? 'active:scale-90' : 'cursor-not-allowed'}`}
                    >
                      <span className={`block h-9 w-9 rounded-full ${owned ? '' : 'opacity-30'}`} style={{ background: c.value }} />
                      {!owned && (
                        <span className="absolute text-[14px]" aria-hidden>
                          🔒
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer: back / next */}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => {
                tap()
                setStep((s) => s - 1)
              }}
              className="min-h-[52px] rounded-2xl px-4 font-semibold text-[#A7B0C0] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <button
              type="button"
              onClick={goNext}
              className="min-h-[52px] rounded-2xl bg-amber-500 px-7 font-display text-lg font-bold text-[#1A1103] transition hover:bg-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              {step === 0 && !band ? 'Skip' : step === 1 && !name.trim() ? 'Skip' : 'Next'} →
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="min-h-[52px] rounded-2xl bg-amber-500 px-7 font-display text-lg font-bold text-[#1A1103] shadow-lg shadow-amber-500/30 transition hover:bg-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              {mode === 'setup' ? 'Launch! 🚀' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
