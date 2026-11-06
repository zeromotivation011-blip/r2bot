'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/** Sends one anonymous page-view ping per route change (aggregate counts only). */
let first = true

export function SiteViewCounter() {
  const pathname = usePathname()
  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return
    // The referrer is only meaningful on the first page of a visit.
    const referrer = first ? document.referrer : ''
    first = false
    const body = JSON.stringify({ path: pathname, referrer })
    try {
      if (!navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) {
        fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
      }
    } catch { /* ignore */ }
  }, [pathname])
  return null
}
