// app/kids/hangar/page.tsx — the Robot Hangar (server component).
//
// The child's robot in a 3D hangar bay, customised with looks they have
// earned (paints, decals, trails, skins), plus their badge wall, personal
// bests, course progress per planet and certificates. The interactive parts are
// two client islands (components/kids/hangar/); the 3D bay is next/dynamic
// behind a same-size poster. Everything a search engine or a parent needs to
// understand the page is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { HangarClient } from '@/components/kids/hangar/HangarClient'
import { HangarRecordsClient, type CourseBadgeInfo } from '@/components/kids/hangar/HangarRecordsClient'
// Read-only, server-side: the real names of the course badges. Only the small
// map below reaches the client, never the (large) curriculum itself.
import { LEVEL1_SESSIONS } from '@/lib/kids/curriculum/level1'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

const TITLE = 'Robot Hangar for Kids: Your Robot, Badges and Rewards'
const DESCRIPTION =
  'The R2BOT Kids hangar: see your own robot in 3D, paint it and add decals, trails and skins you earned by learning, and check your badge wall, personal bests and course progress. Ages 5–17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/kids/hangar` },
  openGraph: {
    type: 'website',
    url: `${BASE}/kids/hangar`,
    siteName: 'R2BOT',
    title: 'Robot Hangar — your robot, your badges, your looks',
    description: 'Your robot in a 3D hangar bay, with paints, decals, trails and skins earned by learning robotics.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Robot Hangar' }],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Robot Hangar',
  description: DESCRIPTION,
  url: `${BASE}/kids/hangar`,
  isPartOf: { '@type': 'WebApplication', name: 'R2BOT Kids', url: `${BASE}/kids` },
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children aged 5 to 17' },
  inLanguage: 'en',
}

const courseBadges: Record<string, CourseBadgeInfo> = Object.fromEntries(
  LEVEL1_SESSIONS.map((s) => [s.badge.id, { name: s.badge.name, icon: s.badge.icon, earnedFor: s.badge.earnedFor }]),
)

export default function HangarPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />
      <header className="mx-auto max-w-6xl px-4 pb-4 pt-6">
        <p className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">Robot Hangar</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">Your robot’s home base</h1>
        <p className="mt-2 max-w-3xl text-[#A7B0C0]">
          Spin your robot around, try on the looks you have earned, and see every badge and best score in one place.
        </p>
      </header>

      <HangarClient />
      <HangarRecordsClient courseBadges={courseBadges} />

      {/* Server-rendered explanation for parents, teachers and search engines. */}
      <section aria-labelledby="about-hangar" className="mx-auto max-w-3xl px-4 pb-16 pt-10 text-[#A7B0C0]">
        <h2 id="about-hangar" className="font-display text-2xl font-bold text-white">
          What is the Robot Hangar?
        </h2>
        <p className="mt-3">
          The hangar is where a child&rsquo;s robot lives between missions. It is the same robot they designed in the{' '}
          <Link href="/kids/workshop" className="-my-3 inline-block py-3 font-semibold text-amber-300 underline-offset-4 hover:underline">
            3D Robot Workshop
          </Link>{' '}
          and drive in the{' '}
          <Link href="/kids/code-lab" className="-my-3 inline-block py-3 font-semibold text-amber-300 underline-offset-4 hover:underline">
            Code Lab
          </Link>
          : one body, one set of parts, one name. Here they can turn it around under the lights, take it for a short test drive and change how
          it looks. To change what it can <em>do</em> — wheels or legs, a gripper or a headlight, a line sensor or a bumper — they go back to the
          Workshop, because parts are an engineering choice, not a costume.
        </p>
        <h3 className="mt-6 font-display text-xl font-bold text-white">Looks are earned by learning</h3>
        <p className="mt-2">
          Paints, decals, trails and skins unlock as a child levels up or earns a skill badge. A Lightning Bolt decal comes from making a robot
          move with their own program; the Plasma Trail from tuning a controller until it stops wobbling; the Circuit Board skin from building
          a circuit that works. Nothing can be bought. Each locked look says exactly what earns it, so the reward always points back at
          something worth learning.
        </p>
        <h3 className="mt-6 font-display text-xl font-bold text-white">Badges, personal bests and progress</h3>
        <p className="mt-2">
          The badge wall groups badges by skill track — motion, sensing, logic, control, mechanics, electronics, AI, design, exploring and grit —
          and shows the date each one was earned. Personal bests show a child&rsquo;s own best score in every game and difficulty tier. There
          are no leaderboards and no comparing children: the only person to beat is yourself. Course progress counts finished sessions on each
          of the four planets, and a certificate appears at the end of each level.
        </p>
        <h3 className="mt-6 font-display text-xl font-bold text-white">Private by design</h3>
        <p className="mt-2">
          Everything in the hangar is saved on the device. Children never give an email address, phone number or birthday. If they join a
          teacher&rsquo;s class with a code and a nickname, their progress is shared with that teacher only.
        </p>
      </section>
    </>
  )
}
