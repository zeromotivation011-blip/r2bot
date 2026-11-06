'use client'
import { usePathname } from 'next/navigation'

// Pop-ups, banners and prompts must not appear inside embedded demos on other sites.
export function HideOnEmbed({ children }: { children: React.ReactNode }) {
  const p = usePathname() ?? ''
  if (p.startsWith('/embed')) return null
  return <>{children}</>
}
