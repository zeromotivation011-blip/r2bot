'use client'

// components/kids/profiles/ProfileSwitcherClient.tsx — the shell's profile
// button (roadmap #41 shared tablets, #90 family profiles). Mount ONCE in the
// kids header (app/kids/KidsShell.tsx, in .kids-nav-right before the level chip):
//
//   <ProfileSwitcherClient />
//
// It renders nothing on a device with one child (no profiles set up), so most
// homes see no change. Otherwise: a 44px picture button with a small menu —
// "Done" (shared tablet: clears the device for the next child) or "Switch
// player" (home), and "Play together". When nobody is signed in it shows the
// "Who's playing?" picker over the page (not on grown-up pages, and not on
// /kids/join, where a new child in a class makes their profile).
//
// It also pays out "play together" stars waiting for this child (a sibling
// finished a mission with them as partner), through reportBestRun.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  KIDS_PROFILE_EVENT,
  PROFILES_KEY,
  finishTurn,
  profilesInUse,
  readProfilesState,
  takeTogetherCredits,
  type KidsProfile,
  type ProfilesState,
} from '@/lib/kids/profiles'
import { reportBestRun } from '@/lib/kids/universe/rewards'

// The picker is only needed on shared/family devices: its own chunk.
const ProfilePicker = dynamic(() => import('./ProfilePickerClient'), { ssr: false })

/** Grown-up pages and the class join form: never covered by the picker. */
const NO_PICKER = ['/kids/parents', '/kids/classroom', '/kids/teach', '/kids/schools', '/kids/join']

const focus = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export default function ProfileSwitcherClient() {
  const pathname = usePathname() ?? ''
  const [st, setSt] = useState<ProfilesState | null>(null)
  const [open, setOpen] = useState(false)
  const [picker, setPicker] = useState(false)
  const activeAtLoad = useRef<string | null | undefined>(undefined)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const read = () => setSt(readProfilesState())
    read()
    activeAtLoad.current = readProfilesState()?.active
    // Another tab switched child: reload, so this tab never writes into the wrong robot.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== PROFILES_KEY) return
      const now = readProfilesState()?.active
      if (activeAtLoad.current !== undefined && now !== activeAtLoad.current) window.location.reload()
      else read()
    }
    window.addEventListener(KIDS_PROFILE_EVENT, read)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(KIDS_PROFILE_EVENT, read)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Stars from a "play together" mission where this child was the partner.
  useEffect(() => {
    if (!st?.active) return
    for (const c of takeTogetherCredits()) reportBestRun({ kind: 'challenge', id: c.id, stars: c.stars, score: c.stars })
  }, [st?.active])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  if (!st || !profilesInUse(st)) return null

  const me: KidsProfile | null = st.profiles.find((p) => p.id === st.active) ?? null
  const grownUpPage = NO_PICKER.some((p) => pathname.startsWith(p))
  const shared = st.mode === 'shared'

  const done = () => {
    setOpen(false)
    if (finishTurn()) window.location.assign('/kids')
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => (me ? setOpen((o) => !o) : setPicker(true))}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={me ? `Playing as ${me.nickname}. Switch player or finish` : 'Who is playing? Pick your name'}
          className={`grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-[#111C32] text-2xl ${focus}`}
          style={me ? { boxShadow: `inset 0 0 0 3px ${me.color}` } : undefined}
        >
          <span aria-hidden>{me ? me.picture : '👤'}</span>
        </button>
        {open && me && (
          <div role="menu" aria-label="Player" className="absolute right-0 top-[calc(100%+8px)] z-[70] w-64 rounded-[20px] border border-white/10 bg-[#19263F] p-2 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
            <p className="px-3 py-2 text-sm text-[#A7B0C0]">
              Playing as <strong className="text-[#EEF2F8]">{me.nickname}</strong>
            </p>
            <button
              type="button"
              role="menuitem"
              onClick={done}
              className={`flex min-h-[48px] w-full items-center gap-2 rounded-2xl px-3 text-left font-bold ${shared ? 'bg-amber-500 text-[#1A1103] hover:bg-amber-400' : 'text-[#EEF2F8] hover:bg-white/10'} ${focus}`}
            >
              <span aria-hidden>{shared ? '✅' : '🔁'}</span> {shared ? 'Done: next explorer' : 'Switch player'}
            </button>
            {st.profiles.length > 1 && (
              <Link
                href="/kids/together"
                role="menuitem"
                onClick={() => setOpen(false)}
                className={`flex min-h-[48px] w-full items-center gap-2 rounded-2xl px-3 font-bold text-[#EEF2F8] hover:bg-white/10 ${focus}`}
              >
                <span aria-hidden>🤝</span> Play together
              </Link>
            )}
          </div>
        )}
      </div>
      {/* Portalled: the sticky header would otherwise clip a fixed, full-screen layer. */}
      {(picker || (!me && !grownUpPage)) &&
        createPortal(<ProfilePicker onClose={me || grownUpPage ? () => setPicker(false) : undefined} />, document.body)}
    </>
  )
}
