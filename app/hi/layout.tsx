import type { ReactNode } from 'react'
import { SiteChrome } from '@/components/SiteChrome'

/**
 * Language wrapper plus the site header and footer.
 *
 * The translated pages had neither: a Chinese or Hindi reader landing on a
 * lesson had no way to reach anything else, which made the localised sections
 * feel like orphaned leaflets rather than part of the site.
 */
export default function HILayout({ children }: { children: ReactNode }) {
  return (
    <div lang="hi" style={{ fontFamily: '"Noto Sans Devanagari","Mangal","Nirmala UI",system-ui,sans-serif' }}>
      <SiteChrome>{children}</SiteChrome>
    </div>
  )
}
