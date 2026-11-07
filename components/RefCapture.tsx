'use client'
import { useEffect } from 'react'

// Remembers a friend's invite code (?ref=CODE) for 30 days so the sign-up
// is credited to them. The code is random and carries no personal data.
export function RefCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref')
      if (ref && /^[A-Za-z0-9]{4,16}$/.test(ref) && !document.cookie.includes('r2ref=')) {
        document.cookie = `r2ref=${ref}; max-age=${30 * 86400}; path=/; SameSite=Lax`
      }
    } catch { /* ignore */ }
  }, [])
  return null
}
