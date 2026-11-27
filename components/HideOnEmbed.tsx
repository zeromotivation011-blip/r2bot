'use client'
import { usePathname } from 'next/navigation'

// Pop-ups, banners and prompts must not appear inside embedded demos on other sites.
// `kids`: also hide under /kids. R2BOT Kids has its own footer whose grown-up links
// go through the parental gate; the adult footer's links would leave /kids ungated.
export function HideOnEmbed({ children, kids = false }: { children: React.ReactNode; kids?: boolean }) {
  const p = usePathname() ?? ''
  if (p.startsWith('/embed')) return null
  if (kids && (p === '/kids' || p.startsWith('/kids/'))) return null
  return <>{children}</>
}
