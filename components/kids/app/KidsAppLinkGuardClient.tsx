'use client'

// components/kids/app/KidsAppLinkGuardClient.tsx — keeps the store app inside /kids.
//
// Mounted once in the kids shell. Does nothing in a normal browser. Inside the
// R2BOT Kids app (lib/kids/app-context.ts) it listens to every click in the
// capture phase — before Next's <Link> handler — and any link that would leave
// /kids (the adult site, another host, mailto:, a store page) opens the
// parental gate instead. After a correct answer the browser navigates for real;
// the native shell sends other hosts to the system browser. Exceptions: tel:
// links and anchors carrying data-kids-safety (helplines) are never gated.

import { useCallback, useEffect, useState } from 'react'
import { detectKidsApp, isInsideKids, KIDS_APP_CLASS } from '@/lib/kids/app-context'
import { ParentalGate } from './ParentalGateClient'

export function KidsAppLinkGuard() {
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    if (!detectKidsApp()) return
    document.documentElement.classList.add(KIDS_APP_CLASS)

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return
      const el = e.target instanceof Element ? e.target.closest('a[href]') : null
      if (!(el instanceof HTMLAnchorElement)) return
      if (el.hasAttribute('download')) return
      // Safety help is NEVER behind the parental gate: helpline phone numbers
      // and the helpline directory (HelplineCardClient marks its anchors).
      if (el.hasAttribute('data-kids-safety')) return
      const raw = el.getAttribute('href') ?? ''
      if (raw.startsWith('#') || /^(blob|data|javascript|tel):/i.test(raw)) return
      if (isInsideKids(el.href, window.location.origin)) return
      e.preventDefault()
      e.stopPropagation()
      setTarget(el.href)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  const pass = useCallback(() => {
    const t = target
    setTarget(null)
    if (t) window.location.href = t
  }, [target])

  const cancel = useCallback(() => setTarget(null), [])

  return <ParentalGate target={target} onPass={pass} onCancel={cancel} />
}
