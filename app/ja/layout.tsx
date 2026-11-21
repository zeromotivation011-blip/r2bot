import type { ReactNode } from 'react'
import { SiteChrome } from '@/components/SiteChrome'

/** Language wrapper plus the site header, as for /es, /hi and /zh. */
export default function JALayout({ children }: { children: ReactNode }) {
  return (
    <div lang="ja" style={{ fontFamily: '"Hiragino Sans","Yu Gothic","Noto Sans JP",system-ui,sans-serif' }}>
      <SiteChrome>{children}</SiteChrome>
    </div>
  )
}
