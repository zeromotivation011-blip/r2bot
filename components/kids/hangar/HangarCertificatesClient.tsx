'use client'

// components/kids/hangar/HangarCertificatesClient.tsx
//
// The Garage's course certificates: one certificate for EVERY level the child
// has finished (all 24 sessions), plus the level to work on next, following the
// child's band (certificate-levels.ts). Reads the one progress store and
// follows KIDS_PROGRESS_EVENT, so a finished level appears without a reload.
// Before mount it reserves the height of one card (no layout shift).

import { useEffect, useState } from 'react'
import { KIDS_PROGRESS_EVENT, getProgress } from '@/lib/kids-progress'
import { CertificateButtonClient } from '@/components/kids/teach/CertificateButtonClient'
import { certificatePlan, type CertificatePlan } from './certificate-levels'

export function HangarCertificatesClient() {
  const [plan, setPlan] = useState<CertificatePlan | null>(null)

  useEffect(() => {
    const read = () => {
      const p = getProgress()
      const next = certificatePlan(p.sessionsDone, p.band)
      // Keep the same object while nothing changed, so the cards keep their typed name.
      setPlan((cur) => (cur && cur.next === next.next && cur.finished.join() === next.finished.join() ? cur : next))
    }
    read()
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    return () => window.removeEventListener(KIDS_PROGRESS_EVENT, read)
  }, [])

  return (
    <section aria-labelledby="course-certs-h">
      <h2 id="course-certs-h" className="sr-only">Course certificates</h2>
      {!plan ? (
        <div className="min-h-[132px] rounded-[20px] bg-white/[0.03]" aria-hidden />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plan.finished.map((l) => (
            <CertificateButtonClient key={`done-${l}`} level={l} />
          ))}
          {plan.next !== null && <CertificateButtonClient key={`next-${plan.next}`} level={plan.next} />}
        </div>
      )}
    </section>
  )
}

export default HangarCertificatesClient
