'use client'

// components/kids/hangar/BackupCodeClient.tsx
// "Keep your progress safe": children have no accounts, so a lost or reset
// device would lose everything. Two ways back, one card:
//
// 1. Robot Passport (roadmap #12): "Save my explorer" stores this child's
//    backup code on the server under three friendly words and a number
//    (MAGNET-OTTER-NOVA-7, lib/kids/passport.ts). Typing the words (or
//    scanning the QR code on the printed card) on any device brings it all
//    back. The server keeps only SHA-256 of the words. Until migration 0057
//    runs the Passport says "being switched on" and the backup code is shown.
// 2. Backup code (works offline): the whole progress store as a code
//    (exportProgressCode in lib/kids-progress.ts) that a grown-up can copy or
//    download as a .txt, restored with importProgressCode.
//
// Restoring merges: it never lowers anything already here. Neither way holds
// personal data — children never give any. Alongside the progress the code
// carries the robot design (encodeDesign) and the Hangar looks, restored only
// onto a device that still has the default robot / no looks, so a restore
// never overwrites a robot the child already built here.
// Printing the card and deleting a Passport ask a grown-up first (parental gate).
//
// Self-contained so other screens (e.g. /kids/settings) can mount it too.

import type React from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { exportProgressCode, getProgress, importProgressCode, type ProgressImportFailure, type ProgressImportResult } from '@/lib/kids-progress'
import { DEFAULT_DESIGN, decodeDesign, encodeDesign, loadDesign, saveDesign } from '@/lib/kids/robot-design'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { PASSPORT_PARSE_MESSAGES, parsePassport, passportFromHash, passportLink, type PassportSummary } from '@/lib/kids/passport'
import { createPassport, loadSavedPassport, openPassport, rememberPassport, savePassport, type SavedPassport } from '@/lib/kids/passport-client'
import { qrMatrix, qrSvgPath } from '@/lib/kids/teach/qr'
import { requireGrownUp } from '@/components/kids/app/ParentalGateClient'
import { deletePassportAsGrownUp } from './passport-delete'
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

/** The whole progress (plus robot, looks and the small per-child extras) as one backup code. */
async function buildBackupCode(): Promise<string> {
  // The Robodex collection rides along (loaded on demand: the card catalogue stays out of this page's first load).
  // So do the Make It at Home check-ins and the newest portfolio robot snapshots (both per child, short codes).
  const [{ robodexBackupExtra }, { buildsBackupExtra }, { portfolioBackupExtra }] = await Promise.all([
    import('@/lib/kids/robodex/store'),
    import('@/lib/kids/builds/store'),
    import('@/components/kids/portfolio/portfolio-store'),
  ])
  return exportProgressCode({
    extras: { robot: encodeDesign(loadDesign()), looks: looksExtra(), robodex: robodexBackupExtra(), builds: buildsBackupExtra(), portfolio: portfolioBackupExtra() },
  })
}

/** Restore one backup code into this device (merge, never lower). Returns the words to show. */
async function applyBackup(text: string): Promise<Exclude<Status, { kind: 'idle' }>> {
  const found = CODE_IN_TEXT.exec(text.replace(/\s+/g, ''))
  const r = await importProgressCode(found ? found[0] : text)
  if (!r.ok) return { kind: 'error', text: FAIL[r.reason] }
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
  return { kind: 'ok', text: successLine(r, robot) }
}

function niceDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function summaryLine(s: PassportSummary): string {
  const bits: string[] = []
  if (s.xp > 0) bits.push(`${s.xp.toLocaleString('en-GB')} XP`)
  if (s.badges > 0) bits.push(plural(s.badges, 'badge'))
  if (s.sessions > 0) bits.push(plural(s.sessions, 'course session'))
  return bits.length ? bits.join(' · ') : 'a fresh explorer'
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
}

/** A printable passport card in a hidden iframe (no pop-up, nothing leaves the device). */
function printPassportCard(code: string, link: string, explorer: string): boolean {
  try {
    const m = qrMatrix(link)
    const size = m.length + 8
    const words = code.split('-')
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>R2BOT Kids Robot Passport</title>
<style>
@page { margin: 14mm }
body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #0A1120; margin: 0 }
.card { width: 150mm; border: 3px solid #FC6818; border-radius: 8mm; padding: 8mm; display: flex; gap: 7mm; align-items: center }
h1 { font-size: 15pt; margin: 0 0 1mm } .sub { margin: 0 0 4mm; font-size: 10pt; color: #444 }
.words { display: flex; flex-wrap: wrap; gap: 2mm; margin: 0 0 4mm } .w { border: 2px solid #0A1120; border-radius: 3mm; padding: 1.5mm 3mm; font: 700 15pt ui-monospace, monospace; letter-spacing: .5pt }
ol { margin: 0; padding-left: 5mm; font-size: 9.5pt; line-height: 1.45 } .qr { width: 38mm; height: 38mm; flex: none }
.note { font-size: 8.5pt; color: #444; margin-top: 3mm }
</style></head><body><div class="card"><div style="flex:1">
<h1>R2BOT Kids · Robot Passport</h1>
<p class="sub">${explorer ? `Explorer: <b>${escapeHtml(explorer)}</b> · ` : ''}made ${escapeHtml(today)}</p>
<div class="words">${words.map((w) => `<span class="w">${escapeHtml(w)}</span>`).join('')}</div>
<ol><li>Open <b>www.r2bot.in/kids/hangar</b> on any phone, tablet or computer.</li><li>Under “Robot Passport”, type these words and the number — or scan the code.</li><li>Everything comes back. Nothing already there is lowered.</li></ol>
<p class="note">Keep this card private, like a library card. It holds no email or personal details. A grown-up can delete the Passport at any time, in the Garage or on the Parents page.</p>
</div><svg class="qr" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR code for this Robot Passport"><rect width="${size}" height="${size}" fill="#fff"/><path d="${qrSvgPath(m)}" fill="#000"/></svg></div></body></html>`
    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    frame.style.position = 'fixed'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    frame.style.right = '0'
    frame.style.bottom = '0'
    document.body.appendChild(frame)
    const doc = frame.contentDocument
    const win = frame.contentWindow
    if (!doc || !win) {
      frame.remove()
      return false
    }
    doc.open()
    doc.write(html)
    doc.close()
    window.setTimeout(() => {
      try {
        win.focus()
        win.print()
      } finally {
        window.setTimeout(() => frame.remove(), 60_000)
      }
    }, 150)
    return true
  } catch {
    return false
  }
}

function QrCode({ text, label }: { text: string; label: string }) {
  const m = useMemo(() => qrMatrix(text), [text])
  const size = m.length + 8
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="h-32 w-32 shrink-0 rounded-xl sm:h-36 sm:w-36" shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#FFFFFF" />
      <path d={qrSvgPath(m)} fill="#0A1120" />
    </svg>
  )
}

const statusClass = (s: Status) => `mt-3 min-h-[1.5rem] text-base font-semibold ${s.kind === 'error' ? 'text-amber-300' : s.kind === 'ok' ? 'text-emerald-300' : ''}`

export function BackupCodeClient({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  // ── Robot Passport ──
  const [passport, setPassport] = useState<SavedPassport | null>(null)
  const [origin, setOrigin] = useState('https://www.r2bot.in')
  const [ppBusy, setPpBusy] = useState<null | 'create' | 'save' | 'open' | 'delete'>(null)
  const [ppStatus, setPpStatus] = useState<Status>({ kind: 'idle' })
  const [ppNotReady, setPpNotReady] = useState(false)
  const [words, setWords] = useState('')
  const [openFromCard, setOpenFromCard] = useState(false)
  const wordsRef = useRef<HTMLInputElement>(null)

  // ── Offline backup code ──
  const [offlineOpen, setOfflineOpen] = useState(false)
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
  const H2 = headingLevel === 2 ? 'h3' : 'h4'

  useEffect(() => {
    setPassport(loadSavedPassport())
    setOrigin(window.location.origin)
    // A scanned passport card opens /kids/hangar#passport=WORDS: fill the box, then
    // take the words out of the address bar (they never reached a server).
    const fromHash = passportFromHash(window.location.hash)
    if (fromHash) {
      setWords(fromHash)
      setOpenFromCard(true)
      setPpStatus({ kind: 'ok', text: 'Passport words found. Tap “Open my Passport” to bring your progress here.' })
      try {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      } catch {
        /* noop */
      }
      window.setTimeout(() => wordsRef.current?.scrollIntoView({ block: 'center' }), 300)
    }
    // A profile switch swaps whose passport this is.
    const onProfile = () => setPassport(loadSavedPassport())
    window.addEventListener('storage', onProfile)
    return () => window.removeEventListener('storage', onProfile)
  }, [])

  const failPassport = (r: { notReady?: boolean; offline?: boolean; error: string }) => {
    playSound('wrong')
    if (r.notReady) setPpNotReady(true)
    if (r.notReady || r.offline) setOfflineOpen(true)
    setPpStatus({ kind: 'error', text: r.error })
  }

  const saveExplorer = async () => {
    primeAudio()
    playSound('click')
    setPpBusy(passport ? 'save' : 'create')
    setPpStatus({ kind: 'idle' })
    try {
      const backup = await buildBackupCode()
      if (passport) {
        const r = await savePassport(passport.code, backup)
        if (!r.ok) {
          if (r.notFound) {
            rememberPassport(null)
            setPassport(null)
          }
          failPassport(r)
          return
        }
        const next = { code: passport.code, savedAt: r.savedAt }
        rememberPassport(next)
        setPassport(next)
        playSound('correct')
        setPpStatus({ kind: 'ok', text: `Passport updated: ${summaryLine(r.summary)}.` })
      } else {
        const r = await createPassport(backup)
        if (!r.ok) {
          failPassport(r)
          return
        }
        const next = { code: r.code, savedAt: r.savedAt }
        rememberPassport(next)
        setPassport(next)
        playSound('correct')
        setPpStatus({ kind: 'ok', text: 'Your explorer is saved! Ask a grown-up to print the card or write the words down.' })
      }
    } finally {
      setPpBusy(null)
    }
  }

  const openWords = async () => {
    primeAudio()
    const p = parsePassport(words)
    if (!p.ok) {
      playSound('wrong')
      setPpStatus({ kind: 'error', text: PASSPORT_PARSE_MESSAGES[p.reason] })
      return
    }
    setWords(p.code)
    setPpBusy('open')
    setPpStatus({ kind: 'idle' })
    try {
      const r = await openPassport(p.code)
      if (!r.ok) {
        failPassport(r)
        return
      }
      const applied = await applyBackup(r.backup)
      if (applied.kind === 'error') {
        playSound('wrong')
        setPpStatus(applied)
        return
      }
      // From now on "Update my Passport" on this device writes to the same words.
      const next = { code: p.code, savedAt: r.savedAt }
      rememberPassport(next)
      setPassport(next)
      setOpenFromCard(false)
      setWords('')
      playSound('correct')
      setPpStatus({ kind: 'ok', text: `${p.corrected ? `We read that as ${p.code}. ` : ''}${applied.text}` })
    } finally {
      setPpBusy(null)
    }
  }

  const printCard = async () => {
    primeAudio()
    if (!passport) return
    const ok = await requireGrownUp({ message: 'This prints the Robot Passport card with the secret words.' })
    if (!ok) return
    const printed = printPassportCard(passport.code, passportLink(passport.code, origin), getProgress().explorerName)
    if (!printed) setPpStatus({ kind: 'error', text: 'This browser could not open printing. Write the words down instead.' })
  }

  const removePassport = async () => {
    primeAudio()
    if (!passport) return
    // One implementation for the Garage and the parent hub (./passport-delete.ts).
    setPpBusy('delete')
    try {
      const r = await deletePassportAsGrownUp(passport.code, { gate: true })
      if (r.kind === 'cancelled') return
      if (r.kind === 'failed') {
        failPassport(r)
        return
      }
      setPassport(null)
      playSound('click')
      setPpStatus({ kind: 'ok', text: r.text })
    } finally {
      setPpBusy(null)
    }
  }

  const forgetHere = () => {
    primeAudio()
    playSound('click')
    rememberPassport(null)
    setPassport(null)
    setPpStatus({ kind: 'ok', text: 'This device no longer updates that Passport. The words still work everywhere.' })
  }

  // ── Offline backup code ──
  const make = async () => {
    primeAudio()
    playSound('click')
    setMaking(true)
    setCopied(false)
    try {
      setCode(await buildBackupCode())
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
      const r = await applyBackup(text)
      playSound(r.kind === 'ok' ? 'correct' : 'wrong')
      setStatus(r)
      if (r.kind === 'ok') setPasted('')
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

  const link = passport ? passportLink(passport.code, origin) : ''

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
        Your robot, XP, stars and badges live on this device. A <strong className="text-white">Robot Passport</strong> brings them back on a new
        phone or computer. <strong className="text-white">Grown-ups:</strong> please keep the words safe for your child. They unlock only the explorer
        and robot nicknames and robot progress, never an email or anything else personal.
      </p>

      {/* ── Robot Passport ── */}
      <div className="mt-4 rounded-[20px] border border-amber-400/25 bg-amber-500/[0.06] p-3 sm:p-4" data-testid="robot-passport">
        <H2 className="font-display text-xl font-bold text-white">
          <span aria-hidden>🛂 </span>Robot Passport
        </H2>

        {passport ? (
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Your Passport words</p>
              <p className="mt-2 flex flex-wrap gap-2" aria-label={`Passport words: ${passport.code.split('-').join(' ')}`} data-testid="passport-words">
                {passport.code.split('-').map((w, i) => (
                  <span key={`${w}-${i}`} className="rounded-xl border-2 border-white/20 bg-[#0A1120] px-3 py-1.5 font-display text-xl font-bold tracking-wide text-[#EEF2F8] sm:text-2xl">
                    {w}
                  </span>
                ))}
              </p>
              {passport.savedAt && <p className="mt-2 text-sm text-[#A7B0C0]">Last saved {niceDate(passport.savedAt)}. Save again after big adventures.</p>}
            </div>
            <QrCode text={link} label={`QR code that opens this Robot Passport: ${passport.code}`} />
          </div>
        ) : (
          <p className="mt-2 max-w-2xl text-base text-[#A7B0C0]">
            Get three words and a number, like <span className="font-display font-bold text-[#EEF2F8]">MAGNET-OTTER-NOVA-7</span>. Type them on any device
            and everything comes back.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={saveExplorer} disabled={ppBusy !== null} className={primary} data-testid="passport-save">
            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
              <path fill="currentColor" d="M10 2 3 5v5c0 4.2 2.9 7.3 7 8 4.1-.7 7-3.8 7-8V5l-7-3Zm-1 11.4L5.8 10.2l1.4-1.4L9 10.6l3.8-3.8 1.4 1.4L9 13.4Z" />
            </svg>
            {ppBusy === 'create' || ppBusy === 'save' ? 'Saving…' : passport ? 'Update my Passport' : 'Save my explorer'}
          </button>
          {passport && (
            <>
              <button type="button" onClick={printCard} disabled={ppBusy !== null} className={secondary}>
                <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                  <path fill="currentColor" d="M5 2h10v4H5V2ZM3 7h14a2 2 0 0 1 2 2v5h-3v4H4v-4H1V9a2 2 0 0 1 2-2Zm3 6v3h8v-3H6Z" />
                </svg>
                Print passport card
              </button>
              <button type="button" onClick={removePassport} disabled={ppBusy !== null} className={secondary}>
                {ppBusy === 'delete' ? 'Deleting…' : 'Delete my Passport'}
              </button>
              <button type="button" onClick={forgetHere} disabled={ppBusy !== null} className={`${btn} text-[#A7B0C0] underline-offset-4 hover:text-white hover:underline`}>
                Stop updating it here
              </button>
            </>
          )}
        </div>

        <div className="mt-4 rounded-[20px] border border-white/10 bg-[#0A1120]/60 p-3">
          <label htmlFor={`${ids}-words`} className="font-display text-base font-bold text-white">
            {openFromCard ? 'Open the Passport from your card' : 'Have Passport words? Type them here'}
          </label>
          <p className="text-sm text-[#A7B0C0]">Spaces or dashes are fine. Opening adds to what is here and never takes anything away.</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id={`${ids}-words`}
              ref={wordsRef}
              value={words}
              onChange={(e) => setWords(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && words.trim() && ppBusy === null) void openWords()
              }}
              maxLength={80}
              spellCheck={false}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              enterKeyHint="go"
              placeholder="MAGNET-OTTER-NOVA-7"
              className="min-h-[48px] w-full min-w-0 flex-1 rounded-xl border border-white/15 bg-[#0A1120] px-3 font-display text-lg font-bold uppercase tracking-wide text-[#EEF2F8] placeholder:font-normal placeholder:normal-case placeholder:text-[#6E7888] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            />
            <button type="button" onClick={openWords} disabled={ppBusy !== null || !words.trim()} className={primary} data-testid="passport-open">
              {ppBusy === 'open' ? 'Opening…' : 'Open my Passport'}
            </button>
          </div>
        </div>

        <p role="status" aria-live="polite" className={statusClass(ppStatus)} data-testid="passport-status">
          {ppStatus.kind === 'idle' ? '' : ppStatus.text}
        </p>
      </div>

      {/* ── Offline backup code ── */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => {
            primeAudio()
            playSound('click')
            setOfflineOpen((v) => !v)
          }}
          aria-expanded={offlineOpen}
          aria-controls={`${ids}-offline`}
          className={`${btn} w-full justify-between border border-white/10 bg-white/[0.03] text-white hover:border-white/25 sm:w-auto`}
        >
          <span>{ppNotReady ? 'Use a backup code for now (works offline)' : 'Or use a backup code (works offline)'}</span>
          <svg viewBox="0 0 20 20" className={`h-5 w-5 transition-transform ${offlineOpen ? 'rotate-180' : ''}`} aria-hidden>
            <path fill="currentColor" d="M5.3 7.3 10 12l4.7-4.7 1.4 1.4L10 14.8 3.9 8.7l1.4-1.4Z" />
          </svg>
        </button>

        <div id={`${ids}-offline`} hidden={!offlineOpen} className="mt-3">
          <p className="max-w-3xl text-base text-[#A7B0C0]">
            A <strong className="text-white">backup code</strong> is the same progress as one long code you keep yourself. It never goes to a server.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={make} disabled={making} className={primary}>
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

          <p role="status" aria-live="polite" className={statusClass(status)}>
            {status.kind === 'idle' ? '' : status.text}
          </p>
        </div>
      </div>
    </section>
  )
}
