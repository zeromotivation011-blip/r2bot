'use client'

// components/kids/app/AppRedirectClient.tsx — a redirect that works as a static file.
//
// Only the STANDALONE app build uses it (scripts/kids-app/overrides): a static
// export has no server, so next.config redirects() cannot run there. Old kids
// URLs (/kids/my-robot, /kids/world/*, /kids/activities) become tiny pages that
// replace themselves with the new address at once: a <meta refresh> for the very
// first paint and a client-side replace (no extra history entry) once React runs.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export interface AppRedirectProps {
  /** Where to go, e.g. "/kids/hangar/" (keep the trailing slash: the app's files are <path>/index.html). */
  to: string
  /** Shown for the instant before the move, and as a link if script is slow. */
  label: string
}

export function AppRedirect({ to, label }: AppRedirectProps) {
  const router = useRouter()
  useEffect(() => {
    router.replace(to)
  }, [router, to])
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <meta httpEquiv="refresh" content={`0;url=${to}`} />
      <p className="text-lg text-[#C9D1DE]">
        Taking you to <Link href={to} replace className="font-bold text-amber-300 underline">{label}</Link>…
      </p>
    </div>
  )
}

export default AppRedirect
