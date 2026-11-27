'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import {
  checkNickname,
  formatJoinCode,
  isValidJoinCode,
  normaliseJoinCode,
  type JoinedClassInfo,
} from '@/lib/kids/classroom'
import { getBand } from '@/lib/kids/bands'
import {
  clearMembership,
  loadMembership,
  saveMembership,
  syncMembership,
  type StoredMembership,
} from '@/lib/kids/classroom-membership'
import { ParentNote } from '@/components/kids/classroom/ParentNote'
import { activeProfile, bindClassMember, readProfilesState, setPassword, unbindClassMember } from '@/lib/kids/profiles'
import PicturePasswordClient from '@/components/kids/profiles/PicturePasswordClient'

type View = 'loading' | 'form' | 'joined'

export default function JoinClient() {
  const [view, setView] = useState<View>('loading')
  const [membership, setMembership] = useState<StoredMembership | null>(null)
  const [justJoined, setJustJoined] = useState(false)
  const [code, setCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [website, setWebsite] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [leaving, setLeaving] = useState<'idle' | 'confirm' | 'busy'>('idle')
  const [notice, setNotice] = useState<string | null>(null)
  // Shared tablet: an Explorer (5–7) whose profile was just made picks a picture key.
  const [pwFor, setPwFor] = useState<string | null>(null)
  const codeId = useId()
  const nickId = useId()
  const errId = useId()

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('code')
    if (fromUrl) setCode(formatJoinCode(normaliseJoinCode(fromUrl)))
    const m = loadMembership()
    if (!m) {
      setView('form')
      return
    }
    setMembership(m)
    setView('joined')
    void syncMembership(false).then((r) => {
      if (r === 'removed') {
        setMembership(null)
        setView('form')
        setNotice('Your teacher has taken you out of that class. You can join another one with a new code.')
      } else {
        setMembership(loadMembership())
      }
    })
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const c = normaliseJoinCode(code)
    if (!isValidJoinCode(c)) {
      setError('A class code has 6 letters and numbers, like ABC 234. Check it with your teacher.')
      return
    }
    const nick = checkNickname(nickname)
    if (!nick.ok) {
      setError(nick.error)
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/kids/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c, nickname: nick.nickname, website }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; token?: string; class?: JoinedClassInfo }
      if (!res.ok || !data.ok || !data.token || !data.class) {
        setError(data.error ?? 'Something went wrong. Try again.')
        return
      }
      const m: StoredMembership = { ...data.class, token: data.token, joinedAt: new Date().toISOString() }
      // Profiles on this device (lib/kids/profiles.ts): tag the child playing now
      // with the class, or — nobody signed in on a shared tablet — make their
      // profile and sign it in FIRST, so the membership lands in it.
      const pid = bindClassMember({ nickname: data.class.nickname, className: data.class.className, band: data.class.band })
      const prof = pid ? activeProfile() : null
      if (prof && !prof.pw && prof.band === 'explorers' && readProfilesState()?.mode === 'shared') setPwFor(prof.id)
      saveMembership(m)
      setMembership(m)
      setJustJoined(true)
      setNotice(null)
      setView('joined')
      void syncMembership(true)
    } catch {
      setError('No internet? Check the connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function leave() {
    if (!membership) return
    setLeaving('busy')
    try {
      const res = await fetch('/api/kids/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: membership.token }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? 'Could not leave the class. Try again.')
        setLeaving('idle')
        return
      }
      clearMembership()
      unbindClassMember()
      setMembership(null)
      setJustJoined(false)
      setLeaving('idle')
      setView('form')
      setNotice('You have left the class. Your name and class progress were deleted from R2BOT. Progress on this device is still here.')
    } catch {
      setError('No internet? Check the connection and try again.')
      setLeaving('idle')
    }
  }

  if (view === 'loading') {
    return <div className="h-72 rounded-3xl border-2 border-white/10 bg-[#111C32]/70" aria-hidden />
  }

  if (view === 'joined' && membership && pwFor) {
    return (
      <section className="rounded-3xl border-2 border-emerald-400/40 bg-[#111C32] p-6 shadow-xl sm:p-8" aria-live="polite">
        <p className="text-center text-lg text-slate-200">
          You&rsquo;re in, <strong className="text-white">{membership.nickname}</strong>! This tablet is shared, so pick a secret key.
        </p>
        <div className="mt-5">
          <PicturePasswordClient
            mode="set"
            onDone={(seq) => {
              setPassword(pwFor, seq)
              setPwFor(null)
            }}
          />
        </div>
      </section>
    )
  }

  if (view === 'joined' && membership) {
    const band = getBand(membership.band)
    const who = membership.teacherName ? `${membership.teacherName}’s class` : `class ${membership.className}`
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border-2 border-emerald-400/40 bg-[#111C32] p-6 text-center shadow-xl sm:p-8" aria-live="polite">
          <div className="text-6xl" aria-hidden>{justJoined ? '🎉' : '🏫'}</div>
          <h1 className="mt-3 text-3xl font-black text-yellow-300 sm:text-4xl">
            {justJoined ? `You joined ${who}!` : `You are in ${who}`}
          </h1>
          <p className="mt-2 text-lg text-slate-200">
            Hi <strong className="text-white">{membership.nickname}</strong>! Class: <strong className="text-white">{membership.className}</strong>
            {band ? <> · {band.emoji} {band.name}</> : null}
          </p>
          <p className="mt-3 text-base text-slate-300">Every star you earn now shows up for your teacher.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link href="/kids/course" className="flex min-h-[52px] items-center justify-center rounded-2xl bg-amber-500 px-4 font-extrabold text-[#1A1103] hover:bg-amber-400">🚀 Course</Link>
            <Link href="/kids/galaxy" className="flex min-h-[52px] items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-4 font-extrabold text-cyan-100 hover:bg-cyan-400/20">🌌 Skill Galaxy</Link>
            <Link href="/kids/play" className="flex min-h-[52px] items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-4 font-extrabold text-white hover:bg-white/10">🎮 Games</Link>
          </div>
        </section>

        <ParentNote variant="kids">
          <div className="mt-4">
            {leaving === 'confirm' ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-slate-200">Leave {membership.className}? Your nickname and class progress will be deleted.</span>
                <button type="button" onClick={leave} className="min-h-[44px] rounded-xl bg-red-500 px-4 font-bold text-white hover:bg-red-400">Yes, leave</button>
                <button type="button" onClick={() => setLeaving('idle')} className="min-h-[44px] rounded-xl border border-white/20 px-4 font-bold text-slate-200 hover:bg-white/10">Stay</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLeaving('confirm')}
                disabled={leaving === 'busy'}
                className="min-h-[44px] rounded-xl border border-red-400/60 px-4 font-bold text-red-200 hover:bg-red-500/15 disabled:opacity-60"
              >
                {leaving === 'busy' ? 'Leaving…' : 'Leave class'}
              </button>
            )}
            {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-300">{error}</p>}
          </div>
        </ParentNote>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border-2 border-white/10 bg-[#111C32] p-6 shadow-xl sm:p-8">
        <div className="text-center">
          <div className="text-6xl" aria-hidden>🏫</div>
          <h1 className="mt-2 text-3xl font-black text-yellow-300 sm:text-4xl">Join your class</h1>
          <p className="mt-2 text-lg text-slate-200">Type the code from your teacher and pick a name.</p>
        </div>

        {notice && <p className="mt-5 rounded-2xl bg-white/5 p-4 text-base text-slate-200" role="status">{notice}</p>}

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5" aria-describedby={error ? errId : undefined}>
          <div>
            <label htmlFor={codeId} className="block text-lg font-extrabold text-white">Class code</label>
            <input
              id={codeId}
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              maxLength={9}
              placeholder="ABC 234"
              className="mt-2 w-full rounded-2xl border-2 border-white/20 bg-[#0A1120] px-4 py-4 text-center font-mono text-3xl font-black tracking-[0.3em] text-white placeholder:text-slate-500 focus:border-yellow-300 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor={nickId} className="block text-lg font-extrabold text-white">Your name in class</label>
            <p className="text-sm text-slate-300">Your first name or a made-up robot name. Not your full name, not an email.</p>
            <input
              id={nickId}
              name="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoComplete="off"
              maxLength={20}
              placeholder="Asha, Leo, RoboMax…"
              className="mt-2 w-full rounded-2xl border-2 border-white/20 bg-[#0A1120] px-4 py-4 text-2xl font-bold text-white placeholder:text-slate-500 focus:border-yellow-300 focus:outline-none"
            />
          </div>
          {/* Honeypot — hidden from people and screen readers. */}
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>
          {error && <p id={errId} role="alert" className="rounded-2xl bg-red-500/15 p-3 text-base font-semibold text-red-200">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-xl font-black text-[#111C32] shadow-lg hover:brightness-110 disabled:opacity-60"
          >
            {busy ? 'Joining…' : 'Join my class 🚀'}
          </button>
        </form>
      </section>

      <ParentNote variant="kids" />
    </div>
  )
}
