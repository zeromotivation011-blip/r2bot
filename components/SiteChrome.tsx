import type { ReactNode } from 'react'
import { Nav } from '@/components/Nav'
import { SiteFooter } from '@/components/SiteFooter'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'

/**
 * Header, footer and Co-pilot around a page.
 *
 * About forty indexable pages had no navigation at all — the whole Quick
 * Lessons section, the whole course path, /start, /ai-robotics, /about, and
 * every translated page. Someone arriving on a lesson from YouTube or Google
 * could not get anywhere else on the site except through links in the prose,
 * which is the single worst thing you can do to a visitor you just earned.
 *
 * Applied through a `layout.tsx` per section rather than by editing each page,
 * so a new page inside those sections gets the chrome automatically. Pages that
 * already render their own <Nav /> are left alone — wrapping those would give
 * them two.
 *
 * Nav is a client component that reads the Co-pilot context, so the provider
 * has to sit above it.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <CopilotProvider>
      <Nav />
      {children}
      <SiteFooter />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
