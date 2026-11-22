import type { ReactNode } from 'react'
import { SiteChrome } from '@/components/SiteChrome'
import { DocumentLang } from '@/components/DocumentLang'

/**
 * Language wrapper plus the site header and footer.
 *
 * The translated pages had neither: a Chinese or Hindi reader landing on a
 * lesson had no way to reach anything else, which made the localised sections
 * feel like orphaned leaflets rather than part of the site.
 */
export default function ESLayout({ children }: { children: ReactNode }) {
  return (
    <div lang="es" style={{ fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif' }}>
      <DocumentLang lang="es" />
      <SiteChrome>{children}</SiteChrome>
    </div>
  )
}
