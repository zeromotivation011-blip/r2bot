import type { ReactNode } from 'react'
import { SiteChrome } from '@/components/SiteChrome'
import { DocumentLang } from '@/components/DocumentLang'

/** Language wrapper plus the site header, as for /es, /hi and /zh. */
export default function DELayout({ children }: { children: ReactNode }) {
  return (
    <div lang="de" style={{ fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif' }}>
      <DocumentLang lang="de" />
      <SiteChrome>{children}</SiteChrome>
    </div>
  )
}
