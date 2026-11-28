'use client'
import { usePathname } from 'next/navigation'

/** True for every route that is designed to be iframed into someone else's
 *  page: /embed/*, /visualizer/embed/*, /world-map/embed. Checking only the
 *  '/embed' prefix let the site footer and banners render inside every
 *  simulator embed (found on a phone check, 28 Nov 2026). */
export function isEmbedPath(p: string): boolean {
  return p === '/embed' || p.startsWith('/embed/') || /\/embed(\/|$)/.test(p)
}

// Pop-ups, banners and prompts must not appear inside embedded demos on other sites.
export function HideOnEmbed({ children }: { children: React.ReactNode }) {
  const p = usePathname() ?? ''
  if (isEmbedPath(p)) return null
  return <>{children}</>
}
