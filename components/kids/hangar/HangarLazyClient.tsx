'use client'

// components/kids/hangar/HangarLazyClient.tsx
//
// The two heavy islands near the bottom of the Garage, loaded after the page
// is interactive instead of in its first load: the Robodex shelf (it needs the
// whole lib/kids/robodex/cards.ts catalogue) and the Passport + backup-code
// panel (BackupCodeClient). Both read device storage, so neither has anything
// useful to say on the server. Each shows a same-size skeleton while it loads,
// so nothing below them jumps (heights measured on a fresh device, 390 and 1280 wide).

import dynamic from 'next/dynamic'

function Skeleton({ label, className }: { label: string; className: string }) {
  return (
    <div role="status" aria-label={label} className={`motion-safe:animate-pulse rounded-[20px] border border-white/[0.08] bg-[#111C32] ${className}`}>
      <span className="sr-only">{label}</span>
    </div>
  )
}

export const LazyRobodexShelf = dynamic(() => import('@/components/kids/robodex/RobodexShelfClient'), {
  ssr: false,
  loading: () => <Skeleton label="Loading your Robodex…" className="min-h-[547px] sm:min-h-[367px]" />,
})

export const LazyBackupCode = dynamic(() => import('@/components/kids/hangar/BackupCodeClient').then((m) => m.BackupCodeClient), {
  ssr: false,
  loading: () => <Skeleton label="Loading your Robot Passport…" className="min-h-[913px] sm:min-h-[600px]" />,
})
