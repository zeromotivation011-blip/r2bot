'use client'

// components/kids/InstallAppClient.tsx
// "Install the app" for R2BOT Kids (a PWA scoped to /kids — see
// app/kids/manifest.webmanifest/route.ts and public/kids-sw.js).
//   - Android / desktop Chrome & Edge: uses the captured beforeinstallprompt.
//   - iPhone / iPad Safari: there is no prompt API, so show the two taps.
//   - Already installed (standalone display): says so.

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Mode = 'unknown' | 'prompt' | 'ios' | 'installed' | 'manual'

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
    setMode(isIos ? 'ios' : 'manual')

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvt(e as BeforeInstallPromptEvent)
      setMode('prompt')
    }
    const onInstalled = () => setMode('installed')
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const base =
    'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-5 font-black transition hover:scale-[1.03] focus-visible:outline focus-visible:outline-4 focus-visible:outline-amber-300'

  if (mode === 'installed') {
    return compact ? null : <p className="font-bold text-emerald-300">✓ Installed — open it from your home screen.</p>
  }

  if (mode === 'prompt' && evt) {
    return (
      <button
        type="button"
        className={`${base} bg-amber-400 text-slate-900 ${compact ? 'min-h-[44px] px-3 text-sm' : ''}`}
        onClick={async () => {
          await evt.prompt()
          const choice = await evt.userChoice
          if (choice.outcome === 'accepted') setMode('installed')
          setEvt(null)
        }}
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
        </div>
      )}
    </div>
  )
}
