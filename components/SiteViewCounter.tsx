'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/** Sends one anonymous page-view ping per route change (aggregate counts only). */
export function SiteViewCounter() {
  const pathname = usePathname()
  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return
    const body = JSON.stringify({ path: pathname })
    try {
      if (!navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) {
        fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
      }
    } catch { /* ignore */ }
  }, [pathname])
  return null
}
