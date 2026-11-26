'use client'

// components/GoogleAnalyticsClient.tsx — GA4, except on R2BOT Kids.
//
// R2BOT Kids is a children's product and ships in the Play Families / App Store
// Kids categories, which do not allow third-party analytics. So:
//   - a visit that starts on /kids never loads gtag at all (the tag is not in
//     the server HTML either: usePathname is known at render);
//   - inside the store app (lib/kids/app-context.ts) gtag never loads, on any page;
//   - a visitor who arrives on the adult site and then opens /kids already has
//     gtag in memory, so the documented opt-out flag `ga-disable-<ID>` is set
//     while they are on a kids page; GA sends nothing until they leave.
// Our own anonymous page counter (components/SiteViewCounter.tsx) is first-party
// and carries no identifier; it is described in the privacy policy.

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { detectKidsApp } from '@/lib/kids/app-context'

function isKidsPath(p: string): boolean {
  return p === '/kids' || p.startsWith('/kids/')
}

export function GoogleAnalytics({ id }: { id: string }) {
  const pathname = usePathname() ?? ''
  const kids = isKidsPath(pathname)
  // Decided after mount (the app check needs the browser); lazyOnload waits for
  // the page's load event anyway, so nothing is lost. Once loaded, never unloaded.
  const [load, setLoad] = useState(false)

  useEffect(() => {
    const off = kids || detectKidsApp()
    ;(window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = off
    if (!off) setLoad(true)
  }, [kids, id])

  if (!load) return null
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="lazyOnload" />
      <Script id="ga4-init" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  )
}
