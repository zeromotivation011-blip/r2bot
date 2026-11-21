import type { ReactNode } from 'react'
import { SiteChrome } from '@/components/SiteChrome'

/** Language wrapper plus the site header, as for /es, /hi and /zh. */
export default function PTLayout({ children }: { children: ReactNode }) {
  return (
    <div lang="pt-BR" style={{ fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif' }}>
      <SiteChrome>{children}</SiteChrome>
    </div>
  )
}
