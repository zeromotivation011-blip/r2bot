import type { ReactNode } from 'react'
import { SiteChrome } from '@/components/SiteChrome'

/**
 * Language wrapper plus the site header and footer.
 *
 * The translated pages had neither: a Chinese or Hindi reader landing on a
 * lesson had no way to reach anything else, which made the localised sections
 * feel like orphaned leaflets rather than part of the site.
 */
export default function ZHLayout({ children }: { children: ReactNode }) {
  return (
    <div lang="zh-CN" style={{ fontFamily: '"PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif' }}>
      <SiteChrome>{children}</SiteChrome>
    </div>
  )
}
