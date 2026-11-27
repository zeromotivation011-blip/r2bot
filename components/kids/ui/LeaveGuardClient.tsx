'use client'

// components/kids/ui/LeaveGuardClient.tsx — "Leave this game?" for immersive play (roadmap #15).
//
// QA watched children lose a half-built circuit to a stray tap on a link. While a
// screen has unsaved work (`dirty`), useLeaveGuard() catches every link tap on the
// page (header logo, More menu, footer, an Exit button) BEFORE Next.js navigates,
// and asks once, in big friendly buttons, whether to leave. "Keep playing" is the
// default (Escape and a tap outside also keep playing). Nothing is asked when
// there is nothing to lose.
//
//   const guard = useLeaveGuard(dirty)
//   <ExitButton href="/kids/play" onExit={guard.requestLeave} />
//   {guard.dialog}
//
// Also used for "start a new round?" (guard.ask({...}).then(ok => ...)).
// Links inside an element carrying `data-leave-guard="off"` are never caught.

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

export interface LeaveAsk {
  title: string
  line: string
  stay: string
  go: string
}

const LEAVE_COPY: LeaveAsk = {
  title: 'Leave this game?',
  line: 'Your round is not finished, so it will not be saved.',
  stay: 'Keep playing',
  go: 'Leave',
}

export interface LeaveGuard {
  /** Ask before going to `href` (navigates straight away when nothing would be lost). */
  requestLeave: (href: string) => void
  /** Ask any yes/no question in the same dialog; resolves true for the "go" button. */
  ask: (copy?: Partial<LeaveAsk>) => Promise<boolean>
  /** Render this once (the dialog, or nothing). */
  dialog: ReactNode
}

function isPlainLeftClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
}

export function useLeaveGuard(dirty: boolean, copy: Partial<LeaveAsk> = {}): LeaveGuard {
  const router = useRouter()
  const [open, setOpen] = useState<LeaveAsk | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const base = useRef<LeaveAsk>({ ...LEAVE_COPY, ...copy })
  base.current = { ...LEAVE_COPY, ...copy }

  const ask = useCallback((c: Partial<LeaveAsk> = {}) => {
    resolver.current?.(false)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setOpen({ ...base.current, ...c })
    })
  }, [])

  const close = useCallback((ok: boolean) => {
    const r = resolver.current
    resolver.current = null
    setOpen(null)
    r?.(ok)
  }, [])

  const go = useCallback(
    (href: string) => {
      if (/^https?:\/\//i.test(href) && !href.startsWith(window.location.origin)) window.location.assign(href)
      else router.push(href)
    },
    [router],
  )

  const requestLeave = useCallback(
    (href: string) => {
      if (!dirtyRef.current) {
        go(href)
        return
      }
      void ask().then((ok) => {
        if (ok) go(href)
      })
    },
    [ask, go],
  )

  // Catch link taps anywhere on the page while there is unsaved work. Capture
  // phase on the document runs before React's own listeners (and so before
  // next/link), so the navigation never starts.
  useEffect(() => {
    if (!dirty) return
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || !isPlainLeftClick(e)) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      if (a.closest('[data-leave-guard="off"]')) return
      // Grown-up links ask the parental gate themselves; that is already a pause.
      if (a.hasAttribute('data-grown-up-link')) return
      const href = a.getAttribute('href') ?? ''
      if (!href || href.startsWith('#')) return
      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      // Same page (only the hash changes): nothing is lost.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      e.preventDefault()
      e.stopPropagation()
      const target = url.origin === window.location.origin ? url.pathname + url.search + url.hash : url.href
      void ask().then((ok) => {
        if (ok) go(target)
      })
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [dirty, ask, go])

  // Never leave a pending promise behind.
  useEffect(() => () => resolver.current?.(false), [])

  return { requestLeave, ask, dialog: open ? <LeaveDialog copy={open} onStay={() => close(false)} onGo={() => close(true)} /> : null }
}

function LeaveDialog({ copy, onStay, onGo }: { copy: LeaveAsk; onStay: () => void; onGo: () => void }) {
  const stayBtn = useRef<HTMLButtonElement>(null)
  const back = useRef<HTMLElement | null>(null)

  useEffect(() => {
    back.current = document.activeElement as HTMLElement | null
    stayBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onStay()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      back.current?.focus?.()
    }
  }, [onStay])

  // Keep Tab inside the two buttons.
  const trap = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const btns = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'))
    if (!btns.length) return
    const first = btns[0]
    const last = btns[btns.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0A1120]/80 p-4 sm:items-center"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onStay()
      }}
      data-leave-guard="off"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="kids-leave-h"
        aria-describedby="kids-leave-p"
        onKeyDown={trap}
        className="w-full max-w-sm rounded-[28px] border border-white/15 bg-[#19263F] p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,.45)] motion-safe:animate-[kidsLeaveIn_.2s_cubic-bezier(.22,.61,.36,1)]"
      >
        <svg viewBox="0 0 40 40" width="56" height="56" aria-hidden className="mx-auto">
          <rect x="9" y="11" width="22" height="18" rx="7" fill="#FF8A4C" />
          <rect x="12" y="15" width="16" height="9" rx="4" fill="#0A1120" />
          <circle cx="16.5" cy="19.5" r="2.2" fill="#00E5FF" />
          <circle cx="23.5" cy="19.5" r="2.2" fill="#00E5FF" />
          <line x1="20" y1="11" x2="20" y2="6.5" stroke="#FF8A4C" strokeWidth="2" strokeLinecap="round" />
          <circle cx="20" cy="5.5" r="2" fill="#FFA878" />
        </svg>
        <h2 id="kids-leave-h" className="mt-2 font-display text-2xl font-bold text-[#EEF2F8]">
          {copy.title}
        </h2>
        <p id="kids-leave-p" className="mt-2 text-[17px] leading-snug text-[#A7B0C0]">
          {copy.line}
        </p>
        <div className="mt-5 grid gap-3">
          <button
            ref={stayBtn}
            type="button"
            onClick={onStay}
            className="min-h-[56px] rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] shadow-lg shadow-amber-500/25 transition hover:bg-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            {copy.stay}
          </button>
          <button
            type="button"
            onClick={onGo}
            className="min-h-[52px] rounded-2xl border-2 border-white/20 px-5 font-display text-lg font-bold text-[#EEF2F8] transition hover:border-white/40 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            {copy.go}
          </button>
        </div>
      </div>
      <style>{`@keyframes kidsLeaveIn { from { opacity: 0; transform: translateY(12px) scale(.97) } to { opacity: 1; transform: none } }`}</style>
    </div>
  )
}

export interface ExitButtonProps {
  href: string
  /** Called with `href`; pass guard.requestLeave. */
  onExit: (href: string) => void
  label?: string
  className?: string
}

/** The one Exit button of an immersive screen: 48px, a real link (works without JS), asks first when work would be lost. */
export function ExitButton({ href, onExit, label = 'Exit', className = '' }: ExitButtonProps) {
  return (
    <a
      href={href}
      data-leave-guard="off"
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        onExit(href)
      }}
      className={`inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 px-3.5 font-display font-bold text-[#EEF2F8] transition hover:bg-white/10 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${className}`}
    >
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M5 5l10 10M15 5L5 15" />
      </svg>
      <span>{label}</span>
    </a>
  )
}
