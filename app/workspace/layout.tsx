import type { ReactNode } from 'react'
import { SiteChrome } from '@/components/SiteChrome'

/**
 * The Workspace IDE filled the viewport and nothing else: no header, no way
 * back. Someone who landed here from search had one route out — the back
 * button. The IDE is still the whole page below the header.
 */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>
}
