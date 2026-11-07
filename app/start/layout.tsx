import type { ReactNode } from 'react'
import { SiteChrome } from '@/components/SiteChrome'

/** Header and footer for this whole section — see components/SiteChrome.tsx. */
export default function SectionLayout({ children }: { children: ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>
}
