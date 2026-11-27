// app/kids/together/page.tsx — "Play together" (roadmap #90): two children on
// one device, a navigator with the map and a driver with the controls.
// Server shell with real words; the mission itself is client-side and needs
// the profiles on this device, so the page is noindex.
import type { Metadata } from 'next'
import PlayTogetherClient from '@/components/kids/profiles/PlayTogetherClient'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'Play together — R2BOT Kids',
  description: 'Two explorers, one tablet: one navigates with the map, the other drives the robot. A teamwork mission for siblings and friends.',
  alternates: { canonical: `${BASE}/kids/together` },
  // Depends on the profiles saved on this device: an app screen, not content.
  robots: { index: false, follow: true },
}

export default function KidsTogetherPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:pt-12">
      <p className="text-sm font-bold uppercase tracking-wider text-amber-300">Play together</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-[#EEF2F8] sm:text-4xl">Navigator and driver</h1>
      <p className="mt-2 max-w-2xl text-lg text-[#A7B0C0]">
        Real rover teams split the work: one person reads the map and plans, the other drives. Here the navigator can open the
        map but cannot touch the controls, and the driver only sees a small window around the robot. Talk to each other, find
        both samples and bring the robot home with as few bumps as you can.
      </p>
      <div className="mt-6">
        <PlayTogetherClient />
      </div>
    </div>
  )
}
