'use client'

// components/kids/profiles/ProfilePickerClient.tsx — "Who's playing?"
// Full-screen on top of the kids app whenever profiles are set up and nobody is
// signed in (after "Done" on a shared tablet, or "Switch" at home). A child taps
// their card; Explorers then tap their 3 secret pictures. Picking reloads the
// page so every screen reads the new child's robot and progress from scratch.
//
// At home, adding a profile asks a grown-up (parental gate). On a shared lab
// tablet a new child may add themselves (nickname + picture only) or join their
// class with the teacher's code, which makes the profile for them.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { getBand } from '@/lib/kids/bands'
import {
  KIDS_PROFILE_EVENT,
  checkPassword,
  readProfilesState,
  switchProfile,
  type KidsProfile,
  type ProfilesState,
} from '@/lib/kids/profiles'
import { requireGrownUp } from '@/components/kids/app/ParentalGateClient'
import { playSound } from '@/lib/kids-audio'
import PicturePasswordClient from './PicturePasswordClient'
import NewProfileClient from './NewProfileClient'

const focus = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

type View = { kind: 'list' } | { kind: 'password'; profile: KidsProfile } | { kind: 'new' }

export interface ProfilePickerProps {
  /** Close without choosing (only offered when someone is still signed in). */
  onClose?: () => void
}

export default function ProfilePickerClient({ onClose }: ProfilePickerProps) {
  const [st, setSt] = useState<ProfilesState | null>(null)
  const [view, setView] = useState<View>({ kind: 'list' })
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const read = () => setSt(readProfilesState())
    read()
    window.addEventListener(KIDS_PROFILE_EVENT, read)
    return () => window.removeEventListener(KIDS_PROFILE_EVENT, read)
  }, [])

  // Keep focus inside the picker and stop the page behind it scrolling.
  useEffect(() => {
    headingRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [view.kind])

  const shared = st?.mode === 'shared'
  const profiles = useMemo(() => {
    const list = [...(st?.profiles ?? [])]
    // Home: most recent first. Shared tablet: A–Z, so a child finds their name.
    if (shared) list.sort((a, b) => a.nickname.localeCompare(b.nickname))
    else list.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))
    const q = query.trim().toLowerCase()
    return q ? list.filter((p) => p.nickname.toLowerCase().includes(q) || (p.className ?? '').toLowerCase().includes(q)) : list
  }, [st, shared, query])

  const go = (p: KidsProfile) => {
    if (busy) return
    setBusy(true)
    if (switchProfile(p.id)) {
      playSound('correct')
      // A fresh page: every screen reads this child's things from the start.
      window.location.reload()
    } else {
      setBusy(false)
    }
  }

  const pick = (p: KidsProfile) => {
    playSound('click')
    if (p.pw) setView({ kind: 'password', profile: p })
    else go(p)
  }

  const addNew = async () => {
    if (!shared) {
      const ok = await requireGrownUp({ message: 'Adding a profile for another child on this device.' })
      if (!ok) return
    }
    setView({ kind: 'new' })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kids-picker-title"
      className="fixed inset-0 z-[80] overflow-y-auto bg-[#0A1120] px-4 pb-10 pt-[calc(24px+env(safe-area-inset-top))]"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && onClose) onClose()
      }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kids-icon.svg" alt="" width={36} height={36} />
            <span className="font-display text-lg font-bold text-[#EEF2F8]">R2BOT <span className="text-amber-300">Kids</span></span>
          </span>
          {onClose && view.kind === 'list' && (
            <button type="button" onClick={onClose} className={`min-h-[48px] rounded-2xl border border-white/15 bg-[#19263F] px-4 font-bold text-[#EEF2F8] hover:bg-white/10 ${focus}`}>
              Keep playing
            </button>
          )}
        </div>

        {view.kind === 'list' && (
          <>
            <h1 ref={headingRef} tabIndex={-1} id="kids-picker-title" className="mt-6 text-center font-display text-3xl font-bold text-[#EEF2F8] outline-none sm:text-4xl">
              Who&rsquo;s playing?
            </h1>
            <p className="mt-2 text-center text-lg text-[#A7B0C0]">
              {shared ? 'Tap your name. When you finish, tap Done so the next explorer gets a fresh start.' : 'Tap your picture to get your own robot back.'}
            </p>

            {(st?.profiles.length ?? 0) > 9 && (
              <div className="mx-auto mt-5 max-w-sm">
                <label htmlFor="kids-picker-find" className="sr-only">Find your name</label>
                <input
                  id="kids-picker-find"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find your name"
                  autoComplete="off"
                  className="w-full rounded-2xl border-2 border-white/20 bg-[#111C32] px-4 py-3 text-xl font-bold text-white placeholder:text-[#6E7888] focus:border-amber-400 focus:outline-none"
                />
              </div>
            )}

            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Profiles on this device">
              {profiles.map((p) => {
                const band = getBand(p.band)
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => pick(p)}
                      disabled={busy}
                      className={`flex min-h-[140px] w-full flex-col items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3 text-center shadow-[0_8px_24px_rgba(0,0,0,.45)] transition-transform hover:-translate-y-0.5 hover:border-white/25 active:scale-[.97] motion-reduce:transform-none motion-reduce:transition-none ${focus}`}
                    >
                      <span className="grid h-16 w-16 place-items-center rounded-full text-4xl" style={{ background: `${p.color}33`, boxShadow: `inset 0 0 0 3px ${p.color}` }} aria-hidden>
                        {p.picture}
                      </span>
                      <span className="font-display text-xl font-bold leading-tight text-[#EEF2F8]">{p.nickname}</span>
                      <span className="text-sm text-[#A7B0C0]">
                        {band ? `${band.emoji} ${band.name}` : 'Explorer'}
                        {p.className ? ` · ${p.className}` : ''}
                        {p.pw ? <span className="sr-only"> · has a picture key</span> : null}
                      </span>
                    </button>
                  </li>
                )
              })}
              <li>
                <button
                  type="button"
                  onClick={addNew}
                  className={`flex min-h-[140px] w-full flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-amber-400/50 bg-amber-400/[0.06] p-3 text-center hover:bg-amber-400/10 ${focus}`}
                >
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-amber-500 text-4xl font-bold text-[#1A1103]" aria-hidden>+</span>
                  <span className="font-display text-xl font-bold text-amber-200">{shared ? 'I’m new here' : 'Add a child'}</span>
                </button>
              </li>
            </ul>

            {shared && (
              <p className="mt-6 text-center text-base text-[#A7B0C0]">
                In a class? <Link href="/kids/join" className={`font-bold text-amber-300 underline-offset-2 hover:underline ${focus}`}>Join with your teacher&rsquo;s code</Link> and your name is made for you.
              </p>
            )}
          </>
        )}

        {view.kind === 'password' && (
          <div className="mt-8">
            <h1 ref={headingRef} tabIndex={-1} id="kids-picker-title" className="text-center font-display text-3xl font-bold text-[#EEF2F8] outline-none">
              <span aria-hidden>{view.profile.picture}</span> Hi, {view.profile.nickname}!
            </h1>
            <div className="mt-4">
              <PicturePasswordClient
                mode="enter"
                onDone={(seq) => {
                  if (!checkPassword(view.profile.id, seq)) return false
                  go(view.profile)
                  return true
                }}
                onCancel={() => setView({ kind: 'list' })}
              />
            </div>
          </div>
        )}

        {view.kind === 'new' && (
          <div className="mt-8">
            <h1 ref={headingRef} tabIndex={-1} id="kids-picker-title" className="sr-only outline-none">Make your profile</h1>
            <NewProfileClient title={shared ? 'I’m new here' : 'Add a child'} onCreated={go} onCancel={() => setView({ kind: 'list' })} />
          </div>
        )}
      </div>
    </div>
  )
}
