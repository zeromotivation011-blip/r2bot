'use client'

// components/SupabasePreconnectClient.tsx — the Supabase connection hint, except on R2BOT Kids.
//
// A <link rel="preconnect"> in the root layout's <head> went out on every page, /kids
// included, so a child's first page load opened a TLS connection to a third-party host
// before anything there was needed (R2BOT Kids makes no third-party connection until a
// grown-up action needs one: a classroom join, a Robot Passport save). The root layout is
// static and cannot tell /kids from the adult site, but a client component can: usePathname
// is known while the page is prerendered, and React 19 hoists preconnect()/prefetchDNS()
// called during render into <head> of the server HTML. So adult pages keep the hint in
// their first HTML exactly as before, and kids pages never carry it.

import { usePathname } from 'next/navigation'
import { preconnect, prefetchDNS } from 'react-dom'

const SUPABASE_ORIGIN = 'https://bxgtocghjypbomszwvfr.supabase.co'

export function SupabasePreconnect() {
  const pathname = usePathname() ?? ''
  if (pathname === '/kids' || pathname.startsWith('/kids/')) return null
  preconnect(SUPABASE_ORIGIN, { crossOrigin: 'anonymous' })
  prefetchDNS(SUPABASE_ORIGIN)
  return null
}
