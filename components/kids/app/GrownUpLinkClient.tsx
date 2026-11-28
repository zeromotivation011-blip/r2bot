'use client'

// components/kids/app/GrownUpLinkClient.tsx — a link that only a grown-up can follow.
//
// Use it for every kids link that leaves /kids (the adult site, another host,
// a new tab) and for grown-up pages (Parents, Teachers, Schools). A tap opens
// the parental gate (./ParentalGateClient.tsx); after a correct answer the
// link opens (same tab, or a new tab with `newTab`).
//
// If a parent switched outbound links off (lib/kids/parent-controls.ts), a link
// that leaves R2BOT Kids renders as plain text instead. Links inside /kids are
// never switched off, only gated.
//
//   <GrownUpLink href="https://classroom.google.com/share?…" newTab>Share</GrownUpLink>
//   <GrownUpLink href="/kids/parents" grant>Parents</GrownUpLink>

import { useRouter } from 'next/navigation'
import type { MouseEvent, ReactNode } from 'react'
import { useParentControls } from '@/lib/kids/parent-controls'
import { outboundHref } from '@/lib/kids/app-context'
import { requireGrownUp } from './ParentalGateClient'

export interface GrownUpLinkProps {
  href: string
  children: ReactNode
  className?: string
  /** Open in a new tab (target=_blank, noopener). */
  newTab?: boolean
  /** Let the next gated page (e.g. the parent hub) open without asking again. */
  grant?: boolean
  /** Shown in the gate, e.g. "This opens Google Classroom." */
  message?: string
  'aria-label'?: string
  title?: string
}

/** True when the href leaves the kids area (another host, or a path outside /kids). */
export function leavesKids(href: string): boolean {
  if (/^(mailto|tel|sms):/i.test(href)) return true
  if (/^https?:\/\//i.test(href) || href.startsWith('//')) {
    if (typeof window === 'undefined') return true
    try {
      const u = new URL(href, window.location.href)
      return u.origin !== window.location.origin || !(u.pathname === '/kids' || u.pathname.startsWith('/kids/'))
    } catch {
      return true
    }
  }
  const path = href.split(/[?#]/)[0]
  return !(path === '/kids' || path.startsWith('/kids/'))
}

export function GrownUpLink({ href, children, className, newTab = false, grant = false, message, title, ...rest }: GrownUpLinkProps) {
  const router = useRouter()
  const controls = useParentControls()
  const outside = leavesKids(href)

  if (outside && !controls.outboundLinks) {
    return (
      <span className={className} title="A grown-up switched off links that leave R2BOT Kids on this device." aria-disabled="true">
        {children}
      </span>
    )
  }

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Modified clicks (open in a new tab yourself) still have to pass the gate.
    if (e.defaultPrevented) return
    e.preventDefault()
    void requireGrownUp({ target: outside ? href : undefined, message, grant }).then((ok) => {
      if (!ok) return
      // Standalone app: a path outside /kids is not in the bundle, so it opens on www.r2bot.in.
      if (newTab) {
        window.open(outboundHref(href), '_blank', 'noopener,noreferrer')
      } else if (outside) {
        window.location.assign(outboundHref(href))
      } else {
        router.push(href)
      }
    })
  }

  return (
    <a
      href={href}
      onClick={onClick}
      className={className}
      title={title}
      aria-label={rest['aria-label']}
      {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      data-grown-up-link=""
    >
      {children}
    </a>
  )
}

export default GrownUpLink
