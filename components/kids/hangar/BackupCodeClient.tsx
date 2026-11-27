'use client'

// components/kids/hangar/BackupCodeClient.tsx
// "Keep your progress safe": children have no accounts, so a lost or reset
// device would lose everything. This card turns the whole progress store into
// a backup code (exportProgressCode in lib/kids-progress.ts) that a grown-up
// can copy or download as a .txt, and restores one on any device
// (importProgressCode). Restoring merges: it never lowers anything already here.
//
// The code holds no personal data — children never give any. Alongside the
// progress it carries the robot design (encodeDesign) and the Hangar looks, which
// are restored only onto a device that still has the default robot / no looks,
// so a restore never overwrites a robot the child already built here.
//
// Self-contained so other screens (e.g. /kids/settings) can mount it too.

import type React from 'react'
import { useId, useRef, useState } from 'react'
import { exportProgressCode, importProgressCode, type ProgressImportFailure, type ProgressImportResult } from '@/lib/kids-progress'
import { DEFAULT_DESIGN, decodeDesign, encodeDesign, loadDesign, saveDesign } from '@/lib/kids/robot-design'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { EMPTY_COSMETICS, loadCosmetics, saveCosmetics, type HangarCosmetics } from './cosmetics'

/** Finds a backup code inside any pasted text or downloaded file. */
const CODE_IN_TEXT = /R2K\d+\.[zj]\.[A-Za-z0-9_-]+\.[0-9a-f]{8}/i

const FAIL: Record<ProgressImportFailure, string> = {
  empty: 'Paste a backup code first. It starts with R2K1.',
  format: 'That does not look like a whole backup code. It starts with R2K1 and has no gaps. Try copying all of it again.',
  version: 'That code comes from a newer R2BOT Kids. Reload the page and try again.',
  checksum: 'One or more letters in that code have changed. Copy it again from the file or note where it was kept.',
  unsupported: 'This browser cannot open compressed codes. Try a newer browser, like an up-to-date Chrome, Safari or Firefox.',
  corrupt: 'That code is damaged and cannot be read. Try copying it again.',
  shape: 'That code does not hold R2BOT Kids progress.',
}

const btn =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-5 font-display text-base font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-60'
const primary = `${btn} bg-amber-500 text-[#1A1103] hover:bg-amber-400 motion-safe:hover:-translate-y-0.5`
const secondary = `${btn} border border-white/15 bg-white/[0.06] text-white hover:border-white/30`

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function looksExtra(): string {
  const c = loadCosmetics()
  return JSON.stringify({ d: c.decal, t: c.trail, s: c.skin, w: c.workshopColour, b: c.booster || undefined })
}

function restoreLooks(raw: string | undefined): boolean {
  if (!raw) return false
  const cur = loadCosmetics()
  if (cur.decal || cur.trail || cur.skin || cur.workshopColour || cur.booster) return false
  try {
    const o: unknown = JSON.parse(raw)
    if (!o || typeof o !== 'object') return false
    const r = o as Record<string, unknown>
    const s = (x: unknown) => (typeof x === 'string' && x.length < 64 ? x : null)
    const next: HangarCosmetics = { ...EMPTY_COSMETICS, decal: s(r.d), trail: s(r.t), skin: s(r.s), workshopColour: s(r.w), booster: r.b === true }
    if (!next.decal && !next.trail && !next.skin && !next.workshopColour && !next.booster) return false
    // loadCosmetics() and ownedOnly() re-validate on every read, so a stale id is harmless.
    saveCosmetics(next)
    return true
  } catch {
    return false
  }
}

function restoreRobot(code: string | undefined): boolean {
  if (!code) return false
  // Only onto a device that still has the starter robot: never overwrite a robot built here.
  if (encodeDesign(loadDesign()) !== encodeDesign(DEFAULT_DESIGN)) return false
  const d = decodeDesign(code)
  if (!d || encodeDesign(d) === encodeDesign(DEFAULT_DESIGN)) return false
  saveDesign(d)
  return true
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`
}

function successLine(r: Extract<ProgressImportResult, { ok: true }>, robot: boolean): string {
  const bits: string[] = []
  if (r.added.xp > 0) bits.push(`${r.added.xp.toLocaleString('en-GB')} XP`)
  if (r.added.badges > 0) bits.push(plural(r.added.badges, 'badge'))
  if (r.added.sessions > 0) bits.push(plural(r.added.sessions, 'course session'))
  if (r.added.activities > 0) bits.push(plural(r.added.activities, 'Galaxy activity', 'Galaxy activities'))
  if (r.added.unlocks > 0) bits.push(plural(r.added.unlocks, 'look'))
  if (robot) bits.push('your robot')
  if (!r.changed && !robot) return 'Everything in that code is already on this device. Nothing was lost.'
  if (!bits.length) return 'Your progress is back. Nothing already here was lowered.'
  const list = bits.length > 1 ? `${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]}` : bits[0]
  return `Welcome back! Restored ${list}. Nothing already here was lowered.`
}

type Status = { kind: 'idle' } | { kind: 'ok'; text: string } | { kind: 'error'; text: string }

export function BackupCodeClient({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const [code, setCode] = useState('')
  const [making, setMaking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [pasted, setPasted] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const codeRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const ids = useId()
  const H = headingLevel === 2 ? 'h2' : 'h3'

  const make = async () => {
    primeAudio()
    playSound('click')
    setMaking(true)
    setCopied(false)
    try {
      // The Robodex collection rides along (loaded on demand: the card catalogue stays out of this page's first load).
      // So do the Make It at Home check-ins and the newest portfolio robot snapshots (both per child, short codes).
      const [{ robodexBackupExtra }, { buildsBackupExtra }, { portfolioBackupExtra }] = await Promise.all([
        import('@/lib/kids/robodex/store'),
        import('@/lib/kids/builds/store'),
        import('@/components/kids/portfolio/portfolio-store'),
      ])
      const c = await exportProgressCode({
        extras: { robot: encodeDesign(loadDesign()), looks: looksExtra(), robodex: robodexBackupExtra(), builds: buildsBackupExtra(), portfolio: portfolioBackupExtra() },
      })
      setCode(c)
    } finally {
      setMaking(false)
    }
  }

  const copy = async () => {
    primeAudio()
    let ok = false
    try {
      await navigator.clipboard.writeText(code)
      ok = true
    } catch {
      // Older browsers / no permission: select the text so a long-press or Ctrl+C works.
      const el = codeRef.current
      if (el) {
        el.focus()
        el.select()
        try {
          ok = document.execCommand('copy')
        } catch {
          ok = false
        }
      }
    }
    playSound(ok ? 'correct' : 'click')
    setCopied(ok)
    setStatus(ok ? { kind: 'ok', text: 'Backup code copied. Paste it somewhere a grown-up keeps safe.' } : { kind: 'error', text: 'Could not copy by itself. The code is selected: press and hold (or Ctrl+C) to copy it.' })
  }

  const download = () => {
    primeAudio()
    playSound('click')
    const text = [
      'R2BOT Kids — progress backup code',
      `Made on ${today()}`,
      '',
      'To restore: open www.r2bot.in/kids/hangar on any device,',
      'choose "Restore from a code" and paste the whole code below (or pick this file).',
      'Restoring never lowers progress that is already there.',
      'It holds the explorer and robot nicknames and robot progress only:',
      'never an email or other personal details. Keep it private.',
      '',
      code,
      '',
    ].join('\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `r2bot-kids-backup-${today()}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setStatus({ kind: 'ok', text: 'Backup file saved. Keep it somewhere safe, like a grown-up’s email or cloud folder.' })
  }

  const restore = async (text: string) => {
    primeAudio()
    setBusy(true)
    try {
      const found = CODE_IN_TEXT.exec(text.replace(/\s+/g, ''))
      const r = await importProgressCode(found ? found[0] : text)
      if (!r.ok) {
        playSound('wrong')
        setStatus({ kind: 'error', text: FAIL[r.reason] })
        return
      }
      const robot = restoreRobot(r.extras.robot)
      restoreLooks(r.extras.looks)
      if (r.extras.robodex) {
        const { restoreRobodexExtra } = await import('@/lib/kids/robodex/store')
        restoreRobodexExtra(r.extras.robodex)
      }
      if (r.extras.builds) {
        // The catalogue resolves the short tags back to build ids (loaded only on restore).
        const [{ restoreBuildsExtra }, { HOME_BUILDS }] = await Promise.all([import('@/lib/kids/builds/store'), import('@/lib/kids/builds/builds')])
        restoreBuildsExtra(r.extras.builds, HOME_BUILDS.map((b) => b.id))
      }
      if (r.extras.portfolio) {
        const { restorePortfolioExtra } = await import('@/components/kids/portfolio/portfolio-store')
        restorePortfolioExtra(r.extras.portfolio)
      }
      playSound('correct')
      setStatus({ kind: 'ok', text: successLine(r, robot) })
      setPasted('')
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > 400_000) {
      setStatus({ kind: 'error', text: 'That file is too big to be a backup code file.' })
      return
    }
    try {
      await restore(await f.text())
    } catch {
      setStatus({ kind: 'error', text: 'That file could not be read. Try pasting the code instead.' })
    }
  }

  return (
    <section
      aria-labelledby={`${ids}-h`}
      className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <H id={`${ids}-h`} className="font-display text-2xl font-bold text-white">
          Keep your progress safe
        </H>
        <p className="text-sm font-semibold text-cyan-300">No account needed</p>
      </div>
      <p className="mt-2 max-w-3xl text-base text-[#A7B0C0]">
        Your robot, XP, stars and badges live on this device. A <strong className="text-white">backup code</strong> brings them back on a new
        phone or computer. <strong className="text-white">Grown-ups:</strong> please keep the code safe for your child. It holds only the explorer and
        robot nicknames and robot progress, never an email or anything else personal.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={make} disabled={making} className={primary}>
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
            <path fill="currentColor" d="M10 2 3 5v5c0 4.2 2.9 7.3 7 8 4.1-.7 7-3.8 7-8V5l-7-3Zm-1 11.4L5.8 10.2l1.4-1.4L9 10.6l3.8-3.8 1.4 1.4L9 13.4Z" />
          </svg>
          {making ? 'Making…' : code ? 'Make a fresh code' : 'Save code'}
        </button>
        <button
          type="button"
          onClick={() => {
            primeAudio()
            playSound('click')
            setRestoreOpen((v) => !v)
          }}
          aria-expanded={restoreOpen}
          aria-controls={`${ids}-restore`}
          className={secondary}
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
            <path fill="currentColor" d="M10 3a7 7 0 1 1-6.6 9.3l1.9-.6A5 5 0 1 0 6.5 6.4L8 8H3V3l2 2A7 7 0 0 1 10 3Z" />
          </svg>
          Restore from a code
        </button>
      </div>

      {code && (
        <div className="mt-4 rounded-[20px] border border-amber-400/25 bg-amber-500/[0.06] p-3">
          <label htmlFor={`${ids}-code`} className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Your backup code
          </label>
          <textarea
            id={`${ids}-code`}
            ref={codeRef}
            readOnly
            value={code}
            rows={4}
            spellCheck={false}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-2 block w-full resize-none break-all rounded-xl border border-white/10 bg-[#0A1120] p-3 font-mono text-sm leading-snug text-[#EEF2F8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={copy} className={primary}>
              <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                <path fill="currentColor" d="M7 2h9a2 2 0 0 1 2 2v9h-2V4H7V2ZM4 6h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm0 2v8h9V8H4Z" />
              </svg>
              {copied ? 'Copied!' : 'Copy code'}
            </button>
            <button type="button" onClick={download} className={secondary}>
              <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                <path fill="currentColor" d="M9 2h2v8.6l2.8-2.8 1.4 1.4L10 14.4 4.8 9.2l1.4-1.4L9 10.6V2ZM3 16h14v2H3v-2Z" />
              </svg>
              Download .txt
            </button>
          </div>
          <p className="mt-2 text-sm text-[#A7B0C0]">The code is a snapshot. Make a fresh one after big adventures.</p>
        </div>
      )}

      <div id={`${ids}-restore`} hidden={!restoreOpen} className="mt-4 rounded-[20px] border border-white/10 bg-[#0A1120]/60 p-3">
        <label htmlFor={`${ids}-paste`} className="font-display text-base font-bold text-white">
          Paste a backup code
        </label>
        <p className="text-sm text-[#A7B0C0]">Restoring adds to what is here. It never takes anything away.</p>
        <textarea
          id={`${ids}-paste`}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={3}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          placeholder="R2K1.z.…"
          className="mt-2 block w-full resize-y break-all rounded-xl border border-white/15 bg-[#0A1120] p-3 font-mono text-sm leading-snug text-[#EEF2F8] placeholder:text-[#6E7888] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        />
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" onClick={() => restore(pasted)} disabled={busy || !pasted.trim()} className={primary}>
            {busy ? 'Restoring…' : 'Restore'}
          </button>
          <button
            type="button"
            onClick={() => {
              primeAudio()
              fileRef.current?.click()
            }}
            disabled={busy}
            className={secondary}
          >
            Open a backup .txt
          </button>
          <input ref={fileRef} type="file" accept=".txt,text/plain" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
        </div>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={`mt-3 min-h-[1.5rem] text-base font-semibold ${status.kind === 'error' ? 'text-amber-300' : status.kind === 'ok' ? 'text-emerald-300' : ''}`}
      >
        {status.kind === 'idle' ? '' : status.text}
      </p>
    </section>
  )
}
