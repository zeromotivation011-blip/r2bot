'use client'

// components/kids/profiles/ParentProfilesClient.tsx — "Children on this device",
// the profiles section of the parent hub (behind the parental gate).
// Roadmap #90 (family profiles) and #41 (shared lab tablets).
//
// Shows each child on this device (level, sessions, days this week, last
// played) and lets the grown-up add, rename, re-key (picture password), back up,
// restore and remove profiles, and switch the device between "family" and
// "shared tablet" (where "Done" clears the device for the next child).
// Everything stays on this device; nothing about a child is sent anywhere.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { checkNickname } from '@/lib/kids/classroom'
import { getBand } from '@/lib/kids/bands'
import { exportProgressCode, getProgressOf, importProgressCode, KIDS_PROGRESS_EVENT, type KidsProgress } from '@/lib/kids-progress'
import { levelInfo } from '@/lib/kids/universe/rewards'
import { DEFAULT_DESIGN, decodeDesign, encodeDesign, loadDesignOf, saveDesignOf } from '@/lib/kids/robot-design'
import {
  KIDS_PROFILE_EVENT,
  LEGACY_PROFILE_ID,
  activeProfileId,
  ensureProfiles,
  readProfilesState,
  removeProfile,
  setDeviceMode,
  setPassword,
  switchProfile,
  updateProfile,
  withProfile,
  type KidsProfile,
  type ProfilesState,
} from '@/lib/kids/profiles'
import { looksBackupExtra, restoreLooksExtra } from '@/components/kids/hangar/cosmetics'
import PicturePasswordClient from './PicturePasswordClient'
import NewProfileClient from './NewProfileClient'

const card = 'rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6'
const h2 = 'font-display text-xl font-bold text-[#EEF2F8] sm:text-2xl'
const focus = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
const btn = `min-h-[44px] rounded-2xl border border-white/15 bg-[#19263F] px-3 text-sm font-bold text-[#EEF2F8] hover:bg-white/10 ${focus}`
const DAY = 86_400_000

type Panel = { id: string; kind: 'rename' | 'key' | 'backup' | 'restore' } | { kind: 'add' } | null

function daysThisWeek(p: KidsProgress, now: number): number {
  return p.playDays.filter((d) => {
    const t = Date.parse(`${d}T12:00:00Z`)
    return Number.isFinite(t) && t > now - 7 * DAY
  }).length
}

function lastPlayedText(p: KidsProgress, now: number): string {
  if (!p.playDays.length && p.xp === 0) return 'Not played yet'
  const t = Date.parse(p.lastPlayed)
  if (!Number.isFinite(t)) return '–'
  const d = Math.floor((now - t) / DAY)
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`
}

export default function ParentProfilesClient() {
  const [st, setSt] = useState<ProfilesState | null>(null)
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [msg, setMsg] = useState('')
  const [, setTick] = useState(0)

  useEffect(() => {
    const read = () => {
      setSt(readProfilesState())
      setActive(activeProfileId())
      setTick((n) => n + 1)
      setReady(true)
    }
    read()
    window.addEventListener(KIDS_PROFILE_EVENT, read)
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    return () => {
      window.removeEventListener(KIDS_PROFILE_EVENT, read)
      window.removeEventListener(KIDS_PROGRESS_EVENT, read)
    }
  }, [])

  // A device with no profiles yet is one child: show them as member #1 without writing anything.
  const profiles: KidsProfile[] = st?.profiles ?? (ready ? implicitProfiles() : [])
  const mode = st?.mode ?? 'home'
  const now = Date.now()

  const open = (p: Panel) => {
    setMsg('')
    setPanel(p)
  }

  return (
    <section aria-labelledby="hub-profiles" className={`${card} print:hidden`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="hub-profiles" className={h2}>Children on this device</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-[#A7B0C0]">
            Each child gets their own robot, stars and course. 5–7-year-olds unlock theirs with three secret pictures; older children tap their name.
          </p>
        </div>
        <button type="button" onClick={() => open({ kind: 'add' })} className={`min-h-[48px] rounded-2xl bg-amber-500 px-4 font-bold text-[#1A1103] hover:bg-amber-400 ${focus}`}>
          Add a child
        </button>
      </div>

      {panel?.kind === 'add' && (
        <div className="mt-5 rounded-[20px] border border-white/10 bg-[#0A1120] p-4">
          <NewProfileClient
            title="Add a child"
            onCancel={() => setPanel(null)}
            onCreated={(p) => {
              setPanel(null)
              setMsg(`${p.nickname} is ready. They pick their picture on the “Who’s playing?” screen.`)
            }}
          />
        </div>
      )}

      <ul className="mt-5 grid gap-3">
        {!ready && <li className="h-24 rounded-2xl bg-white/5" aria-hidden />}
        {profiles.map((p) => {
          const prog = getProgressOf(p.id)
          const lvl = levelInfo(prog.xp)
          const band = getBand(p.band ?? prog.band)
          const isActive = p.id === active
          const here = panel && 'id' in panel && panel.id === p.id ? panel.kind : null
          return (
            <li key={p.id} className="rounded-[20px] border border-white/10 bg-[#111C32] p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-3xl" style={{ background: `${p.color}33`, boxShadow: `inset 0 0 0 3px ${p.color}` }} aria-hidden>
                  {p.picture}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold text-[#EEF2F8]">
                    {p.nickname}
                    {isActive && <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 align-middle text-xs font-bold text-emerald-300">playing now</span>}
                  </p>
                  <p className="text-sm text-[#A7B0C0]">
                    {band ? `${band.emoji} ${band.name}` : 'No level picked yet'}
                    {p.className ? ` · class ${p.className}` : ''}
                    {p.pw ? ' · picture key on' : ''}
                  </p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                {[
                  ['Rank', `${lvl.level} · ${lvl.title}`],
                  ['Course sessions', String(Object.keys(prog.sessionsDone).length)],
                  ['Days this week', `${daysThisWeek(prog, now)} of 7`],
                  ['Last played', lastPlayedText(prog, now)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-[#0A1120] p-2">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-[#6E7888]">{k}</dt>
                    <dd className="mt-0.5 font-bold text-[#EEF2F8]">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {!isActive && (
                  <button
                    type="button"
                    className={btn}
                    onClick={() => {
                      if (switchProfile(p.id)) window.location.reload()
                    }}
                  >
                    Switch to {p.nickname}
                  </button>
                )}
                <button type="button" className={btn} aria-expanded={here === 'rename'} onClick={() => open(here === 'rename' ? null : { id: p.id, kind: 'rename' })}>Rename</button>
                <button type="button" className={btn} aria-expanded={here === 'key'} onClick={() => open(here === 'key' ? null : { id: p.id, kind: 'key' })}>Picture key</button>
                <button type="button" className={btn} aria-expanded={here === 'backup'} onClick={() => open(here === 'backup' ? null : { id: p.id, kind: 'backup' })}>Backup code</button>
                <button type="button" className={btn} aria-expanded={here === 'restore'} onClick={() => open(here === 'restore' ? null : { id: p.id, kind: 'restore' })}>Restore</button>
                {profiles.length > 1 && (
                  <button
                    type="button"
                    className={`min-h-[44px] rounded-2xl border border-rose-400/60 px-3 text-sm font-bold text-rose-200 hover:bg-rose-500/10 ${focus}`}
                    onClick={() => {
                      if (!window.confirm(`Remove ${p.nickname} from this device? Their robot, stars and course progress on this device are deleted. Save a backup code first if you may want it back.`)) return
                      const wasActive = p.id === activeProfileId()
                      if (removeProfile(p.id)) {
                        setMsg(`${p.nickname} was removed from this device.`)
                        if (wasActive) window.location.reload()
                      }
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              {here === 'rename' && <RenamePanel profile={p} onDone={(m) => { setPanel(null); setMsg(m) }} />}
              {here === 'key' && <KeyPanel profile={p} onDone={(m) => { setPanel(null); setMsg(m) }} />}
              {here === 'backup' && <BackupPanel profile={p} />}
              {here === 'restore' && <RestorePanel profile={p} onDone={(m) => setMsg(m)} />}
            </li>
          )
        })}
      </ul>

      <p className="mt-3 min-h-[1.25rem] text-sm font-semibold text-emerald-300" role="status">{msg}</p>

      <fieldset className="mt-4 rounded-[20px] border border-white/10 p-4">
        <legend className="px-1 font-display text-lg font-bold text-[#EEF2F8]">How this device is used</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {([
            ['home', 'Family device', 'Siblings switch with the picture button in the top bar.'],
            ['shared', 'Shared tablet (school, club, library)', 'After each turn the child taps Done and the tablet is ready for the next one. New children can add themselves or join their class.'],
          ] as const).map(([id, label, sub]) => (
            <label key={id} className={`flex min-h-[48px] cursor-pointer gap-3 rounded-2xl border p-3 ${mode === id ? 'border-amber-400/70 bg-amber-400/10' : 'border-white/10 bg-[#111C32]'}`}>
              <input
                type="radio"
                name="kids-device-mode"
                checked={mode === id}
                onChange={() => {
                  setDeviceMode(id)
                  setMsg(id === 'shared' ? 'Shared tablet mode is on. Each child taps Done when they finish.' : 'Family device mode is on.')
                }}
                className="mt-1 h-5 w-5 accent-amber-500"
              />
              <span>
                <span className="block font-bold text-[#EEF2F8]">{label}</span>
                <span className="block text-sm text-[#A7B0C0]">{sub}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {profiles.length > 1 && (
        <p className="mt-4 text-[15px] leading-relaxed text-[#A7B0C0]">
          Two children, one tablet? Try{' '}
          <Link href="/kids/together" className={`font-semibold text-amber-300 hover:underline ${focus}`}>Play together</Link>: the older child navigates with the map, the younger one drives.
        </p>
      )}
    </section>
  )
}

function implicitProfiles(): KidsProfile[] {
  // Read-only preview of member #1; ensureProfiles() writes it on the first change.
  const p = getProgressOf(LEGACY_PROFILE_ID)
  const name = p.explorerName && p.explorerName.length >= 2 ? p.explorerName : 'Explorer 1'
  return [{ id: LEGACY_PROFILE_ID, nickname: name, picture: '🚀', color: '#FC6818', band: p.band, pw: null, className: null, createdAt: '', lastUsedAt: '', pending: [] }]
}

function RenamePanel({ profile, onDone }: { profile: KidsProfile; onDone: (msg: string) => void }) {
  const [name, setName] = useState(profile.nickname)
  const [error, setError] = useState('')
  return (
    <form
      className="mt-3 flex flex-wrap items-start gap-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const n = checkNickname(name)
        if (!n.ok) return setError(n.error)
        ensureProfiles()
        updateProfile(profile.id, { nickname: n.nickname })
        onDone(`Renamed to ${n.nickname}.`)
      }}
    >
      <label className="sr-only" htmlFor={`rename-${profile.id}`}>New nickname</label>
      <input id={`rename-${profile.id}`} value={name} maxLength={20} onChange={(e) => setName(e.target.value)} className="min-h-[44px] flex-1 rounded-xl border-2 border-white/20 bg-[#0A1120] px-3 font-bold text-white focus:border-amber-400 focus:outline-none" />
      <button type="submit" className={`min-h-[44px] rounded-2xl bg-amber-500 px-4 font-bold text-[#1A1103] hover:bg-amber-400 ${focus}`}>Save</button>
      {error && <p role="alert" className="w-full text-sm font-semibold text-rose-300">{error}</p>}
    </form>
  )
}

function KeyPanel({ profile, onDone }: { profile: KidsProfile; onDone: (msg: string) => void }) {
  return (
    <div className="mt-3 rounded-[20px] border border-white/10 bg-[#0A1120] p-4">
      <PicturePasswordClient
        mode="set"
        title={`New secret pictures for ${profile.nickname}`}
        onDone={(seq) => {
          ensureProfiles()
          setPassword(profile.id, seq)
          onDone(`${profile.nickname}’s picture key was changed. Show them the three pictures.`)
        }}
      />
      {profile.pw && profile.band !== 'explorers' && (
        <button
          type="button"
          className={`${btn} mt-3`}
          onClick={() => {
            setPassword(profile.id, null)
            onDone(`${profile.nickname} now just taps their name.`)
          }}
        >
          Turn the picture key off
        </button>
      )}
    </div>
  )
}

/** The per-child stores the backup code carries beside the progress (loaded on demand). */
function extraStores() {
  return Promise.all([import('@/lib/kids/robodex/store'), import('@/lib/kids/builds/store'), import('@/components/kids/portfolio/portfolio-store')])
}

/**
 * One profile's extras, the same set the Hangar backup carries for the child
 * playing: robot, looks, Robodex, Make It at Home check-ins and the newest
 * portfolio robot snapshots. Portfolio and build reflections are free text
 * and stay on this device by design. withProfile() points each store's own
 * reader at this profile, so nothing is switched and nobody else is read.
 */
async function profileExtras(id: string): Promise<Record<string, string>> {
  const [{ robodexBackupExtra }, { buildsBackupExtra }, { portfolioBackupExtra }] = await extraStores()
  return withProfile(id, () => ({
    robot: encodeDesign(loadDesignOf(id)),
    looks: looksBackupExtra(),
    robodex: robodexBackupExtra(id),
    builds: buildsBackupExtra(),
    portfolio: portfolioBackupExtra(),
  }))
}

/** Restores a code's extras into one profile (merge: never removes or overwrites what they have). */
async function restoreProfileExtras(id: string, extras: Record<string, string>): Promise<void> {
  // Robot: only onto a profile that still has the starter robot.
  const d = extras.robot ? decodeDesign(extras.robot) : null
  if (d && encodeDesign(loadDesignOf(id)) === encodeDesign(DEFAULT_DESIGN)) saveDesignOf(id, d)
  if (!extras.looks && !extras.robodex && !extras.builds && !extras.portfolio) return
  const [[{ restoreRobodexExtra }, { restoreBuildsExtra }, { restorePortfolioExtra }], { HOME_BUILDS }] = await Promise.all([extraStores(), import('@/lib/kids/builds/builds')])
  withProfile(id, () => {
    restoreLooksExtra(extras.looks)
    if (extras.robodex) restoreRobodexExtra(extras.robodex)
    if (extras.builds) restoreBuildsExtra(extras.builds, HOME_BUILDS.map((b) => b.id))
    if (extras.portfolio) restorePortfolioExtra(extras.portfolio)
  })
}

function BackupPanel({ profile }: { profile: KidsProfile }) {
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    let live = true
    void profileExtras(profile.id)
      .then((extras) => exportProgressCode({ profileId: profile.id, extras }))
      .then((c) => {
        if (live) setCode(c)
      })
    return () => {
      live = false
    }
  }, [profile.id])
  return (
    <div className="mt-3 rounded-[20px] border border-white/10 bg-[#0A1120] p-4">
      <p className="text-sm text-[#A7B0C0]">{profile.nickname}&rsquo;s backup code. It holds progress, the robot, looks, Robodex cards, home builds and portfolio robots, and no personal data (written reflections stay on this device). Keep it somewhere safe; paste it under Restore on any device.</p>
      <label className="sr-only" htmlFor={`code-${profile.id}`}>Backup code</label>
      <textarea id={`code-${profile.id}`} readOnly value={code} rows={3} className="mt-2 w-full break-all rounded-xl border border-white/15 bg-[#111C32] p-2 font-mono text-xs text-[#EEF2F8]" />
      <button
        type="button"
        disabled={!code}
        className={`${btn} mt-2`}
        onClick={() => {
          void navigator.clipboard?.writeText(code).then(() => setCopied(true)).catch(() => setCopied(false))
        }}
      >
        {copied ? 'Copied' : 'Copy code'}
      </button>
    </div>
  )
}

function RestorePanel({ profile, onDone }: { profile: KidsProfile; onDone: (msg: string) => void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <form
      className="mt-3 rounded-[20px] border border-white/10 bg-[#0A1120] p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError('')
        ensureProfiles()
        const r = await importProgressCode(text, { profileId: profile.id })
        if (!r.ok) {
          setBusy(false)
          setError(r.reason === 'checksum' ? 'That code has a typo. Copy it again.' : 'That does not look like an R2BOT Kids backup code.')
          return
        }
        await restoreProfileExtras(profile.id, r.extras)
        setBusy(false)
        setText('')
        onDone(r.changed ? `Restored into ${profile.nickname}. Nothing they already had was lowered.` : `${profile.nickname} already had everything in that code.`)
        if (profile.id === activeProfileId()) window.location.reload()
      }}
    >
      <label htmlFor={`restore-${profile.id}`} className="text-sm text-[#A7B0C0]">Paste a backup code to merge it into {profile.nickname}. It never lowers anything they already have.</label>
      <textarea id={`restore-${profile.id}`} value={text} onChange={(e) => setText(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border-2 border-white/20 bg-[#111C32] p-2 font-mono text-xs text-white focus:border-amber-400 focus:outline-none" />
      <button type="submit" disabled={busy || !text.trim()} className={`mt-2 min-h-[44px] rounded-2xl bg-amber-500 px-4 font-bold text-[#1A1103] hover:bg-amber-400 disabled:opacity-60 ${focus}`}>
        {busy ? 'Restoring…' : `Restore into ${profile.nickname}`}
      </button>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-300">{error}</p>}
    </form>
  )
}
