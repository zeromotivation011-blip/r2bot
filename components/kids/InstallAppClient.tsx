'use client'

// components/kids/InstallAppClient.tsx
// "Install the app" for R2BOT Kids (a PWA scoped to /kids — see
// app/kids/manifest.webmanifest/route.ts and public/kids-sw.js).
//   - Android / desktop Chrome & Edge: uses the captured beforeinstallprompt.
//   - iPhone / iPad Safari: there is no prompt API, so show the two taps.
//   - Already installed (standalone display): says so.
// The service worker saves the main screens on install, so the installed app opens
// with no network (see public/kids-sw.js); the help text says so.

import { useEffect, useState } from 'react'
import { KIDS_STANDALONE } from '@/lib/kids/app-context'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Mode = 'unknown' | 'prompt' | 'ios' | 'installed' | 'manual'

// One captured install event shared by every button on the page (the hub shows
// two). The browser allows prompt() once per event, so whoever uses it clears it
// for everyone; without this the second button held a spent event and did nothing.
let sharedEvt: BeforeInstallPromptEvent | null = null
let captured = false
const subscribers = new Set<() => void>()
const publish = () => subscribers.forEach((fn) => fn())

function ensureCapture() {
  if (captured || typeof window === 'undefined') return
  captured = true
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    sharedEvt = e as BeforeInstallPromptEvent
    publish()
  })
  window.addEventListener('appinstalled', () => {
    sharedEvt = null
    publish()
  })
}

export function InstallAppClient({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>('unknown')
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) {
      setMode('installed')
      return
    }
    const ua = navigator.userAgent
    const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
    const fallback: Mode = isIos ? 'ios' : 'manual'

    ensureCapture()
    const sync = () => {
      setEvt(sharedEvt)
      setMode((m) => (m === 'installed' ? m : sharedEvt ? 'prompt' : fallback))
    }
    const onInstalled = () => setMode('installed')
    sync()
    subscribers.add(sync)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      subscribers.delete(sync)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    const e = sharedEvt
    sharedEvt = null
    publish()
    if (!e) return
    try {
      await e.prompt()
      const choice = await e.userChoice
      if (choice.outcome === 'accepted') setMode('installed')
    } catch {
      /* event already used or browser refused — the manual instructions remain */
    }
  }

  const base =
    'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-5 font-black transition hover:scale-[1.03] focus-visible:outline focus-visible:outline-4 focus-visible:outline-amber-300'

  // The standalone app IS the installed app: nothing to install.
  if (KIDS_STANDALONE) return null

  if (mode === 'installed') {
    return compact ? null : <p className="font-bold text-emerald-300">✓ Installed — open it from your home screen. It works offline too.</p>
  }

  if (mode === 'prompt' && evt) {
    return (
      <button
        type="button"
        className={`${base} bg-amber-400 text-slate-900 ${compact ? 'min-h-[44px] px-3 text-sm' : ''}`}
        onClick={install}
      >
        📲 {compact ? 'Install' : 'Install the app'}
      </button>
    )
  }

  if (compact) return null

  return (
    <div className="relative">
      <button type="button" className={`${base} bg-amber-400 text-slate-900`} onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>
        📲 How to install
      </button>
      {showHelp && (
        <div className="mt-3 max-w-xs rounded-2xl border border-white/15 bg-slate-900/95 p-4 text-sm text-white/85 sm:absolute sm:right-0 sm:z-20">
          {mode === 'ios' ? (
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Tap the <strong>Share</strong> button <span aria-hidden>⬆️</span> in Safari.
              </li>
              <li>
                Choose <strong>Add to Home Screen</strong>.
              </li>
            </ol>
          ) : (
            <ol className="list-decimal space-y-1 pl-5">
              <li>Open the browser menu (⋮ or ⋯).</li>
              <li>
                Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
              </li>
            </ol>
          )}
          <p className="mt-2 text-white/70">Once installed, your robot, games and saved stories work without the internet.</p>
        </div>
      )}
    </div>
  )
}
