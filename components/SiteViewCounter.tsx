'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * One anonymous page-view ping per route change (aggregate counts only).
 *
 * It also reports one word — 'new' or 'returning' — on the first ping of a
 * visit, so returning-visitor rate becomes measurable. The decision is made
 * here, in the browser, from a first-party flag; no identifier, hash or cookie
 * is sent. The server only increments a counter. Clearing site data reads as a
 * new visitor, which is the right trade for a site that promises not to follow
 * people around.
 */
let first = true

const SEEN_KEY = 'r2bot_seen_before'

function visitKind(): 'new' | 'returning' | '' {
  try {
    const seen = window.localStorage.getItem(SEEN_KEY)
    window.localStorage.setItem(SEEN_KEY, '1')
    return seen ? 'returning' : 'new'
  } catch {
    // Storage blocked (private mode, strict settings): report nothing rather
    // than guessing, so the ratio stays honest.
    return ''
  }
}

/** Count a named funnel milestone. Fire-and-forget; never blocks the UI. */
export function trackEvent(event: string): void {
  try {
    const body = JSON.stringify({ path: window.location.pathname, event })
    if (!navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) {
      void fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    /* ignore */
  }
}

export function SiteViewCounter() {
  const pathname = usePathname()
  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return
    // The referrer and the visit kind are only meaningful on the first ping.
    const referrer = first ? document.referrer : ''
    const visit = first ? visitKind() : ''
    first = false
    const body = JSON.stringify({ path: pathname, referrer, visit })
    try {
      if (!navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) {
        void fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {})
      }
    } catch {
      /* ignore */
    }
  }, [pathname])
  return null
}
