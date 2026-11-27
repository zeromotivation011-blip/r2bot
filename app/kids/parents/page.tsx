// app/kids/parents/page.tsx — R2BOT Kids for parents.
//
// Server-rendered and indexable: how R2BOT Kids works for families, privacy and
// safety, and screen-free ideas. The parent HUB (this week's learning, the
// robot, Galaxy tracks, the device controls and the optional weekly email) sits
// behind the parental gate, so a child cannot change the controls by tapping.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { LEVEL1_SESSIONS } from '@/lib/kids/curriculum/level1'
import { ALL_ACTIVITIES } from '@/lib/kids/activities/content'
import { TRACKS } from '@/lib/kids/activities/types'
import { ParentalGate } from '@/components/kids/app/ParentalGateClient'
import { GrownUpLink } from '@/components/kids/app/GrownUpLinkClient'
import ParentHubClient, { type HubSession, type HubTrack } from '@/components/kids/parents/ParentHubClient'

export const runtime = 'nodejs'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')
const PAGE_URL = `${BASE}/kids/parents`
const TITLE = 'For Parents: R2BOT Kids parent hub, controls and privacy'
const DESCRIPTION =
  'What your child learns in R2BOT Kids, how progress and privacy work, gentle screen-time controls you set on the device, and robotics ideas to try together at home.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { type: 'website', url: PAGE_URL, siteName: 'R2BOT', title: 'R2BOT Kids for parents', description: DESCRIPTION, images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids for parents' }] },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebPage', '@id': `${PAGE_URL}#page`, url: PAGE_URL, name: TITLE, description: DESCRIPTION, isPartOf: { '@id': `${BASE}/#website` } },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'R2BOT Kids', item: `${BASE}/kids` },
        { '@type': 'ListItem', position: 2, name: 'For parents', item: PAGE_URL },
      ],
    },
  ],
}

const SAFETY = [
  'No ads, no chat between children, no public profiles and no leaderboards. Children are never compared with each other.',
  'Children are never asked for an email, a phone number, a birthday or a real name. An explorer name is optional and stays on the device.',
  'Progress saves on this device. If your child joins a teacher’s class, only their nickname and progress are shared with that teacher.',
  'The camera is used only in two places, “See it in my room” in the Workshop and “Use my camera” in the Vision Lab, and only when a grown-up allows it. You can switch both off in the parent hub. The picture stays on the device and is never uploaded.',
  'Links that leave R2BOT Kids, the grown-up pages and the camera all ask a grown-up a quick sum first.',
]

export default function ParentsPage() {
  const sessions: HubSession[] = LEVEL1_SESSIONS.map((s) => ({
    id: s.id,
    number: s.number,
    title: s.title,
    badgeId: s.badge.id,
    badgeName: s.badge.name,
    badgeIcon: s.badge.icon,
    today: s.parent.today,
    tryAtHome: s.parent.tryAtHome,
  }))
  const index = new Map(TRACKS.map((t, i) => [t.id, i]))
  const tracks: HubTrack[] = TRACKS.map((t) => ({ id: t.id, name: t.name, icon: t.icon, total: 0 }))
  const activityTrack: Record<string, number> = {}
  for (const a of ALL_ACTIVITIES) {
    const i = index.get(a.track)
    if (i === undefined) continue
    tracks[i].total += 1
    activityTrack[a.id] = i
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />
      <header className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-wider text-amber-300">For parents and carers</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#EEF2F8] sm:text-4xl">Your child’s robotics adventure, and the controls behind it</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-[#A7B0C0]">
          R2BOT Kids teaches real robotics to children aged 5 to 17: story episodes, a 3D robot they design themselves, block coding
          that drives that robot, hands-on games built on real physics, and short Skill Galaxy activities. The parent hub below shows
          what your child learned this week and lets you set gentle limits on this device.
        </p>
      </header>

      <section aria-label="Parent hub" className="mt-8">
        <ParentalGate title="Parent hub" lead="This week’s learning, your child’s robot, and the controls for this device.">
          <ParentHubClient sessions={sessions} tracks={tracks} activityTrack={activityTrack} />
        </ParentalGate>
      </section>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="p-how" className="rounded-[28px] border border-white/10 bg-[#111C32] p-6">
          <h2 id="p-how" className="font-display text-2xl font-bold text-[#EEF2F8]">How children learn here</h2>
          <ul className="mt-3 space-y-2.5 text-[15px] leading-relaxed text-[#A7B0C0]">
            <li><strong className="text-[#EEF2F8]">Story first.</strong> Each idea arrives inside a short episode, then the child builds and codes it.</li>
            <li><strong className="text-[#EEF2F8]">Build, then test.</strong> A robot with no distance sensor really does drive into the wall, so children see why each part matters.</li>
            <li><strong className="text-[#EEF2F8]">Kind mistakes.</strong> A wrong try gets a specific hint, never “Wrong!”. Rewards are for learning and effort, not for time spent.</li>
            <li><strong className="text-[#EEF2F8]">Short sessions.</strong> Most activities take 3 to 10 minutes, and course sessions are designed to be done together the first time.</li>
          </ul>
        </section>
        <section aria-labelledby="p-ages" className="rounded-[28px] border border-white/10 bg-[#111C32] p-6">
          <h2 id="p-ages" className="font-display text-2xl font-bold text-[#EEF2F8]">Four age groups</h2>
          <ul className="mt-3 space-y-2.5 text-[15px] leading-relaxed text-[#A7B0C0]">
            {KIDS_BANDS.map((b) => (
              <li key={b.id}><strong className="text-[#EEF2F8]">{b.name} ({b.ages})</strong>: {b.outcome}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-[#A7B0C0]">The same games have four difficulty tiers, so brothers and sisters of different ages can play side by side.</p>
        </section>
      </div>

      <section aria-labelledby="p-safe" className="mt-6 rounded-[28px] border border-white/10 bg-[#111C32] p-6">
        <h2 id="p-safe" className="font-display text-2xl font-bold text-[#EEF2F8]">Safety and privacy</h2>
        <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-[#A7B0C0]">
          {SAFETY.map((s) => <li key={s} className="border-l-4 border-amber-500/70 pl-3">{s}</li>)}
        </ul>
        <p className="mt-4 text-sm text-[#A7B0C0]">
          Full details: the children’s section of our{' '}
          <GrownUpLink href="/privacy#kids" className="font-semibold text-amber-300 underline-offset-2 hover:underline">privacy policy</GrownUpLink>.
          Teaching a class? See{' '}
          <GrownUpLink href="/kids/schools" className="font-semibold text-amber-300 underline-offset-2 hover:underline">R2BOT Kids for schools</GrownUpLink>.
        </p>
      </section>

      <section aria-labelledby="p-home" className="mt-6 rounded-[28px] border border-white/10 bg-[#111C32] p-6">
        <h2 id="p-home" className="font-display text-2xl font-bold text-[#EEF2F8]">Screen-free robotics at home</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[#A7B0C0]">
          Ten minutes, things you already have. Robot Safari: walk round your home and list every machine that follows instructions on
          its own, from a washing machine to an automatic door. Direction Robot: one person closes their eyes and the other gives only
          exact steps to cross the room. Robot Recipe: write the steps to make a sandwich for a robot that does exactly what it reads,
          then follow them literally. More in <Link href="/kids/printables" className="font-semibold text-amber-300 underline-offset-2 hover:underline">Make at Home</Link>.
        </p>
      </section>
    </div>
  )
}
