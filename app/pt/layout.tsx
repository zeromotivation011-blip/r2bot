import type { ReactNode } from 'react'
import { SiteChrome } from '@/components/SiteChrome'
import { DocumentLang } from '@/components/DocumentLang'

/** Language wrapper plus the site header, as for /es, /hi and /zh. */
export default function PTLayout({ children }: { children: ReactNode }) {
  return (
    <div lang="pt-BR" style={{ fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif' }}>
      <DocumentLang lang="pt-BR" />
      <SiteChrome>{children}</SiteChrome>
    </div>
  )
}
