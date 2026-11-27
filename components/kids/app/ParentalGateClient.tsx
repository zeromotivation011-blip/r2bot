'use client'

// components/kids/app/ParentalGateClient.tsx — the "Grown-ups only" check.
//
// A multiplication question written in words (a teen number times a single
// digit, e.g. "fourteen times seven"), answered on a keypad. Easy for an adult;
// not something a 5–10-year-old passes by tapping at random (Apple Kids
// category guideline 1.3, Google Play Families). Three wrong answers in a row
// pause the gate for 20 seconds, so random tapping cannot brute-force it. The
// count and the pause live in sessionStorage (LOCK_KEY), so Cancel + reopen
// does not reset them. No
// personal data is asked for (no birth year). Native <dialog> + showModal()
// gives focus trapping and Escape-to-cancel for free.
//
// Three ways to use it:
//
//   1. Imperative, from any click handler (camera start, settings reset, share):
//        if (await requireGrownUp({ message: 'This turns on the camera.' })) startCamera()
//
//   2. A wrapper that keeps grown-up content locked until the gate is passed:
//        <ParentalGate title="Parent hub" lead="Controls and this week's report.">…</ParentalGate>
//
//   3. The bare dialog (used by KidsAppLinkGuardClient):
//        <ParentalGate target={url | null} onPass={…} onCancel={…} />
//
// Links: use <GrownUpLink> (./GrownUpLinkClient.tsx), which calls requireGrownUp().

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
]
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'C'] as const
const MAX_WRONG = 3
const COOL_DOWN_S = 20

/** sessionStorage key: a short, one-shot "a grown-up just passed the gate" note. */
const PASS_KEY = 'r2bot_kids_grownup_pass'
const PASS_TTL_MS = 60_000

/**
 * sessionStorage key: wrong answers in a row and the cool-down end time. Kept
 * outside the dialog so Cancel + reopen (requireGrownUp mounts a fresh dialog
 * per call) cannot skip the pause. Shared by every gate in this tab; cleared
 * after a correct answer or once the cool-down has run out.
 */
const LOCK_KEY = 'r2bot_kids_gate_lock'
let memLock: { wrong: number; until: number } = { wrong: 0, until: 0 }

function readLock(): { wrong: number; until: number } {
  try {
    const raw = window.sessionStorage.getItem(LOCK_KEY)
    if (raw) {
      const v = JSON.parse(raw) as { wrong?: unknown; until?: unknown }
      const wrong = typeof v.wrong === 'number' && Number.isFinite(v.wrong) ? v.wrong : 0
      const until = typeof v.until === 'number' && Number.isFinite(v.until) ? v.until : 0
      memLock = { wrong, until }
    }
  } catch {
    /* storage blocked: the in-memory copy still holds for this page */
  }
  if (memLock.until && Date.now() >= memLock.until) memLock = { wrong: 0, until: 0 }
  return memLock
}

function writeLock(lock: { wrong: number; until: number }): void {
  memLock = lock
  try {
    if (lock.wrong || lock.until) window.sessionStorage.setItem(LOCK_KEY, JSON.stringify(lock))
    else window.sessionStorage.removeItem(LOCK_KEY)
  } catch {
    /* noop */
  }
}

function newQuestion(): { a: number; b: number } {
  return { a: 12 + Math.floor(Math.random() * 8), b: 3 + Math.floor(Math.random() * 7) }
}

/** Remember for one minute (this tab) that a grown-up passed, so the next gated page opens directly. */
export function noteGrownUpPass(): void {
  try {
    window.sessionStorage.setItem(PASS_KEY, String(Date.now()))
  } catch {
    /* noop */
  }
}

/** True (once) when a grown-up passed the gate in this tab within the last minute. */
export function consumeGrownUpPass(): boolean {
  try {
    const raw = window.sessionStorage.getItem(PASS_KEY)
    window.sessionStorage.removeItem(PASS_KEY)
    const t = raw ? Number(raw) : 0
    return Number.isFinite(t) && t > 0 && Date.now() - t < PASS_TTL_MS
  } catch {
    return false
  }
}

// ── The dialog ──────────────────────────────────────────────────────────────

export interface ParentalGateDialogProps {
  /** Where a link goes, shown to the grown-up. Null = closed (unless `open`). */
  target: string | null
  /** Open without a link target (camera, settings, a grown-up page). */
  open?: boolean
  /** What happens after the check, in plain words. Defaults to the link text. */
  message?: string
  onPass: () => void
  onCancel: () => void
}

export function ParentalGateDialog({ target, open, message, onPass, onCancel }: ParentalGateDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const uid = useId()
  const titleId = `${uid}-title`
  const qId = `${uid}-q`
  const isOpen = open ?? Boolean(target)
  // Fixed first question for the server render, randomised when opened — a
  // random initial state caused a hydration mismatch on every kids page.
  const [q, setQ] = useState({ a: 14, b: 7 })
  const [entry, setEntry] = useState('')
  const [err, setErr] = useState('')
  const [wrong, setWrong] = useState(0)
  const [waitUntil, setWaitUntil] = useState(0)
  const [now, setNow] = useState(0)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (isOpen) {
      setQ(newQuestion())
      setEntry('')
      setErr('')
      // Carry over wrong answers and any cool-down from an earlier gate in this tab.
      const lock = readLock()
      setWrong(lock.wrong)
      setWaitUntil(lock.until)
      if (!d.open) d.showModal()
    } else if (d.open) {
      d.close()
    }
  }, [isOpen])

  // Cool-down clock (only ticks while waiting).
  useEffect(() => {
    if (!waitUntil) return
    setNow(Date.now())
    const t = window.setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (n >= waitUntil) {
        setWaitUntil(0)
        setWrong(0)
        writeLock({ wrong: 0, until: 0 })
        setErr('')
        window.clearInterval(t)
      }
    }, 500)
    return () => window.clearInterval(t)
  }, [waitUntil])
  const waiting = waitUntil > 0 && now < waitUntil
  const secondsLeft = waiting ? Math.ceil((waitUntil - now) / 1000) : 0

  const press = useCallback((k: string) => {
    if (waiting) return
    setErr('')
    setEntry((e) => (k === '⌫' ? e.slice(0, -1) : k === 'C' ? '' : e.length < 3 ? e + k : e))
  }, [waiting])

  const submit = useCallback(() => {
    if (waiting) return
    if (entry !== '' && Number(entry) === q.a * q.b) {
      setWrong(0)
      writeLock({ wrong: 0, until: 0 })
      onPass()
      return
    }
    const w = wrong + 1
    setWrong(w)
    setQ(newQuestion())
    setEntry('')
    if (w >= MAX_WRONG) {
      const until = Date.now() + COOL_DOWN_S * 1000
      setWaitUntil(until)
      writeLock({ wrong: w, until })
      setErr(`Let’s pause for ${COOL_DOWN_S} seconds, then try a new question.`)
    } else {
      writeLock({ wrong: w, until: 0 })
      setErr('Not quite. Here is a new question.')
    }
  }, [entry, q, onPass, wrong, waiting])

  // Physical keyboards and switch access type the answer too. Handled on the
  // dialog itself and stopped there, so a page's own window key handlers (a
  // game's controls, the AR view's Escape and focus trap) never see them.
  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    e.stopPropagation()
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault() }
    else if (e.key === 'Backspace') { press('⌫'); e.preventDefault() }
    else if (e.key === 'Enter') {
      const t = e.target as HTMLElement | null
      if (t?.dataset.gateCancel || t?.dataset.gateKey) return
      e.preventDefault()
      submit()
    }
  }

  let host = ''
  try {
    if (target) {
      const u = new URL(target, window.location.href)
      host = u.host !== window.location.host ? u.host : ''
    }
  } catch {
    host = ''
  }
  const lead = message ?? (target
    ? <>This link leaves R2BOT Kids{host ? <> for <strong className="text-white">{host}</strong></> : null}.</>
    : 'This part is for grown-ups.')

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={qId}
      data-kids-gate=""
      onCancel={(e) => { e.preventDefault(); onCancel() }}
      onKeyDown={onKeyDown}
      onKeyUp={(e) => e.stopPropagation()}
      className="max-h-[calc(100dvh-16px)] w-[min(92vw,380px)] overflow-y-auto rounded-[28px] border border-white/15 bg-[#111C32] p-5 text-[#EEF2F8] shadow-[0_8px_24px_rgba(0,0,0,.45)] backdrop:bg-[#0A1120]/85 sm:p-6"
    >
      <h2 id={titleId} className="font-display text-2xl font-black">Grown-ups only</h2>
      <p className="mt-2 text-base text-[#A7B0C0]">{lead} Ask a grown-up to answer:</p>
      <p id={qId} data-gate-question="" className="mt-3 font-display text-xl font-bold text-amber-300" aria-live="polite">
        What is {WORDS[q.a]} times {WORDS[q.b]}?
      </p>
      <p
        className="mt-3 min-h-[56px] rounded-2xl border border-white/15 bg-[#0A1120] px-4 py-3 text-center font-display text-3xl font-black tracking-widest"
        aria-live="polite"
        aria-label={entry ? `Answer typed: ${entry}` : 'No answer typed yet'}
      >
        {entry}
      </p>
      <p className="mt-2 min-h-[1.5rem] text-sm font-bold text-rose-300" role="alert">
        {waiting ? `Let’s pause. Try again in ${secondsLeft} seconds.` : err}
      </p>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            data-gate-key="1"
            disabled={waiting}
            onClick={() => press(k)}
            aria-label={k === '⌫' ? 'Delete' : k === 'C' ? 'Clear' : k}
            className="min-h-[52px] rounded-2xl border border-white/10 bg-[#19263F] font-display text-xl font-black hover:bg-[#223252] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-40"
          >
            {k}
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          data-gate-cancel="1"
          onClick={onCancel}
          className="min-h-[48px] flex-1 rounded-2xl border border-white/20 font-bold text-[#EEF2F8] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={waiting}
          className="min-h-[48px] flex-1 rounded-2xl bg-amber-500 font-black text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </dialog>
  )
}

// ── Imperative: await requireGrownUp() ──────────────────────────────────────

export interface RequireGrownUpOptions {
  /** A link the grown-up is about to open (its host is shown). */
  target?: string
  /** What happens next, in plain words, e.g. "This turns on the camera." */
  message?: string
  /** Also note a one-minute pass so the next <ParentalGate> page opens directly. */
  grant?: boolean
}

let pending: Promise<boolean> | null = null

/**
 * Show the gate and resolve true when a grown-up answers, false on Cancel.
 * Call it straight from a click handler: the "Continue" tap is a fresh user
 * gesture, so window.open / XR sessions started in `.then` are allowed.
 */
export function requireGrownUp(opts: RequireGrownUpOptions = {}): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.resolve(false)
  if (pending) return pending
  const host = document.createElement('div')
  host.setAttribute('data-kids-parental-gate', '')
  document.body.appendChild(host)
  const root = createRoot(host)
  pending = new Promise<boolean>((resolve) => {
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      if (ok && opts.grant) noteGrownUpPass()
      resolve(ok)
      pending = null
      // Unmount after the click that closed it has finished.
      window.setTimeout(() => {
        root.unmount()
        host.remove()
      }, 0)
    }
    root.render(
      <ParentalGateDialog
        target={opts.target ?? null}
        open
        message={opts.message}
        onPass={() => finish(true)}
        onCancel={() => finish(false)}
      />,
    )
  })
  return pending
}

// ── Wrapper: <ParentalGate>children</ParentalGate> ───────────────────────────

export interface ParentalGateWrapperProps {
  children: ReactNode
  /** Heading on the locked card. */
  title?: string
  /** One line under the heading. */
  lead?: string
  /** Called once when unlocked. */
  onUnlock?: () => void
}

function ParentalGateWrapper({ children, title = 'For grown-ups', lead, onUnlock }: ParentalGateWrapperProps) {
  const [unlocked, setUnlocked] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (consumeGrownUpPass()) {
      setUnlocked(true)
      onUnlock?.()
    }
    setChecked(true)
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ask = async () => {
    if (await requireGrownUp({ message: lead ?? 'This part is for grown-ups.' })) {
      setUnlocked(true)
      onUnlock?.()
    }
  }

  if (unlocked) return <>{children}</>
  return (
    <section
      aria-labelledby="kids-gate-lock-h"
      className="mx-auto w-full max-w-xl rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-8"
    >
      <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden className="mx-auto text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="10" width="16" height="11" rx="2.5" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
      <h2 id="kids-gate-lock-h" className="mt-3 font-display text-2xl font-bold text-[#EEF2F8]">{title}</h2>
      {lead && <p className="mt-2 text-base text-[#A7B0C0]">{lead}</p>}
      <button
        type="button"
        onClick={() => void ask()}
        disabled={!checked}
        className="mt-5 inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-amber-500 px-6 font-display text-lg font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-60"
      >
        I’m a grown-up: open
      </button>
      <p className="mt-3 text-sm text-[#A7B0C0]">You’ll answer a quick sum. Nothing is saved about you.</p>
    </section>
  )
}

// ── One name, two shapes (kept for KidsAppLinkGuardClient) ──────────────────

export type ParentalGateProps = ParentalGateDialogProps | ParentalGateWrapperProps

function isWrapper(p: ParentalGateProps): p is ParentalGateWrapperProps {
  return 'children' in p && p.children !== undefined
}

/** With children: a locked card until a grown-up passes. Without: the bare dialog. */
export function ParentalGate(props: ParentalGateProps) {
  if (isWrapper(props)) return <ParentalGateWrapper {...props} />
  return <ParentalGateDialog {...props} />
}

export default ParentalGate
