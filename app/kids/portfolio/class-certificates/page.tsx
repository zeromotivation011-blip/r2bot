// app/kids/portfolio/class-certificates/page.tsx — teachers print a class set of
// R2BOT Kids certificates (roadmap #45) with the school name and a signature
// line. Noindex (a tool, not content). Reached through the parental gate
// (GrownUpLink) from the portfolio; the classroom can link here too.
// Names are typed on the device and never sent anywhere.

import type { Metadata } from 'next'
import Link from 'next/link'
import ClassCertificatesClient from '@/components/kids/portfolio/ClassCertificatesClient'
import type { WorldInfo } from '@/components/kids/portfolio/certificates'
import { byWorld } from '@/lib/kids/activities/content'
import { WORLDS } from '@/lib/kids/universe/worlds'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

export const metadata: Metadata = {
  title: 'Class Certificates — R2BOT Kids for Teachers',
  description: 'Print a class set of R2BOT Kids certificates with your school name and signature: course levels, Worlds, milestones or taking part. Names stay on your device.',
  alternates: { canonical: `${BASE}/kids/portfolio/class-certificates` },
  robots: { index: false, follow: true },
}

const worlds: WorldInfo[] = WORLDS.map((w) => ({ id: w.id, name: w.name, emoji: w.emoji, game: w.game, activityIds: byWorld(w.id).map((a) => a.id) }))

export default function ClassCertificatesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">
      <Link href="/kids/classroom" className="inline-flex min-h-[44px] items-center rounded-lg text-[15px] text-[#A7B0C0] hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
        ← Teacher classroom
      </Link>
      <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">For teachers</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-[#EEF2F8] sm:text-4xl">Print a class set of certificates</h1>
      <p className="mt-2 text-[17px] text-[#A7B0C0]">
        Choose a certificate, add your school name and who signs it, and paste the children’s first names. You get one PDF with a page per
        child, ready to print. Every certificate lists the skills it shows, and every child who does the work earns the same one: no
        rankings. You decide who has earned it — this page cannot see the children’s devices.
      </p>
      <div className="mt-6">
        <ClassCertificatesClient worlds={worlds} />
      </div>
    </div>
  )
}
