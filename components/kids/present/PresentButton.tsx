// components/kids/present/PresentButton.tsx — the one-line entry to Present
// mode (roadmap #42) for episode, session, simulator and replay pages:
//
//   <PresentButton source={{ kind: 'episode', slug: ep.slug }} />
//   <PresentButton source={{ kind: 'session', level: 1, number: 5, unplugged: false }} />
//   <PresentButton source={{ kind: 'sim', id: 'lab' }} />
//
// Present mode is a grown-up tool, so on a child's page the link goes through
// the parental gate (<GrownUpLink>). On teacher pages pass gate={false}.

import Link from 'next/link'
import { GrownUpLink } from '@/components/kids/app/GrownUpLinkClient'
import { presentHref, type PresentSource } from '@/lib/kids/teach/present-href'

const CLS =
  'inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

function Icon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M12 16v4M8 20h8" />
    </svg>
  )
}

export function PresentButton({ source, gate = true, label = 'Present to the class', className }: { source: PresentSource; gate?: boolean; label?: string; className?: string }) {
  const href = presentHref(source)
  const cls = className ?? CLS
  if (!gate) {
    return (
      <Link href={href} className={cls}>
        <Icon />
        {label}
      </Link>
    )
  }
  return (
    <GrownUpLink href={href} className={cls} message="Present mode is for teachers: it shows this on a classroom screen.">
      <Icon />
      {label}
    </GrownUpLink>
  )
}

export default PresentButton
