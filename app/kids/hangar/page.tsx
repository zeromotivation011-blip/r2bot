// app/kids/hangar/page.tsx — the Robot Hangar, the child's one Garage (server component).
//
// The child's robot in a 3D hangar bay, customised with looks they have
// earned (paints, decals, trails, skins), its robot card (name + shareable
// picture, formerly /kids/my-robot, which now 308s here), the Spark Trail
// parts they earned (each fits a real Workshop slot), plus their badge wall,
// personal bests, course progress per planet and certificates. The Workshop
// stays the 3D builder and AR view. The interactive parts are
// two client islands (components/kids/hangar/); the 3D bay is next/dynamic
// behind a same-size poster. Everything a search engine or a parent needs to
// understand the page is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { GarageClient, type TrailPartInfo } from '@/components/kids/hangar/GarageClient'
import { HangarClient } from '@/components/kids/hangar/HangarClient'
import ConceptConstellationClient from '@/components/kids/galaxy/ConceptConstellationClient'
import { HangarRecordsClient, type CourseBadgeInfo } from '@/components/kids/hangar/HangarRecordsClient'
// Read-only, server-side: the real names of the course badges. Only the small
// map below reaches the client, never the (large) curriculum itself.
import { LEVEL1_SESSIONS } from '@/lib/kids/curriculum/level1'
import { LEVEL2_SESSIONS } from '@/lib/kids/curriculum/level2'
import { LEVEL3_SESSIONS } from '@/lib/kids/curriculum/level3'
import { LEVEL4_SESSIONS } from '@/lib/kids/curriculum/level4'
import { HangarCertificatesClient } from '@/components/kids/hangar/HangarCertificatesClient'
// Loaded after first paint (the Robodex catalogue and the Passport panel are the page's heaviest islands).
import { LazyBackupCode, LazyRobodexShelf } from '@/components/kids/hangar/HangarLazyClient'
import { byWorld } from '@/lib/kids/activities/content'
import { WORLDS } from '@/lib/kids/universe/worlds'
// Server-side only: the Spark Trail parts and zone names (the big zone data stays off the client).
import { KIDS_ZONES, ROBOT_PARTS } from '@/lib/kids-world-data'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

const TITLE = 'Robot Hangar for Kids: Your Robot Garage, Parts and Badges'
const DESCRIPTION =
  'The R2BOT Kids hangar is your robot’s garage: see your robot in 3D, name it, share its robot card, fit the parts you earned on the Spark Trail, add looks earned by learning, and check your badges and best scores. Ages 5–17.'

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

const trailParts: TrailPartInfo[] = ROBOT_PARTS.map((p) => ({
  id: p.id,
  name: p.name,
  emoji: p.emoji,
  description: p.description,
  zoneName: KIDS_ZONES.find((z) => z.id === p.zone)?.name ?? 'a Spark Trail zone',
}))

const courseBadges: Record<string, CourseBadgeInfo> = Object.fromEntries(
  [...LEVEL1_SESSIONS, ...LEVEL2_SESSIONS, ...LEVEL3_SESSIONS, ...LEVEL4_SESSIONS].map((s) => [s.badge.id, { name: s.badge.name, icon: s.badge.icon, earnedFor: s.badge.earnedFor }]),
)

/** Each world's activity ids (server-side), so the Hangar can show world progress without loading activity params. */
const worldActivityIds: Record<string, string[]> = Object.fromEntries(WORLDS.map((w) => [w.id, byWorld(w.id).map((a) => a.id)]))

export default function HangarPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />
      <header className="mx-auto max-w-6xl px-4 pb-4 pt-6">
        <p className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">Robot Hangar · My robot’s garage</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">Your robot’s garage</h1>
        <p className="mt-2 max-w-3xl text-[#A7B0C0]">
          Your one robot lives here. Spin it around, name it, share its robot card, fit the parts you found on the Spark Trail and try on
          the looks you have earned. Your XP, stars, badges and best scores are here too.
        </p>
        <Link
          href="/kids/workshop"
          className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 font-display text-base font-bold text-amber-200 transition hover:border-amber-400 hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        >
          Build or change parts in the Workshop →
        </Link>
        <Link
          href="/kids/portfolio"
          className="ml-0 mt-3 inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-4 font-display text-base font-bold text-[#EEF2F8] transition hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 sm:ml-3"
        >
          📁 My portfolio and certificates →
        </Link>
      </header>

      <HangarClient />
      <GarageClient trailParts={trailParts} />
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <ConceptConstellationClient compact />
      </div>
      <HangarRecordsClient courseBadges={courseBadges} worldActivityIds={worldActivityIds} />
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <LazyRobodexShelf />
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-6">
        <HangarCertificatesClient />
      </div>

      <div id="backup" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-6">
        <LazyBackupCode />
      </div>

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
        <h3 className="mt-6 font-display text-xl font-bold text-white">One robot, with a name and a robot card</h3>
        <p className="mt-2">
          There is only one robot, and this is its garage. Its name is the name the Code Lab, the Classroom and the course certificates
          use, so changing it here changes it everywhere. Robot names use letters and numbers only, and we ask for a made-up robot name rather
          than the child&rsquo;s own. &ldquo;Share robot card&rdquo; draws a picture of the robot, its parts and its level on the device; it
          never includes the child&rsquo;s name, and nothing is uploaded.
        </p>
        <h3 className="mt-6 font-display text-xl font-bold text-white">Parts found on the Spark Trail</h3>
        <p className="mt-2">
          Finishing a zone on the{' '}
          <Link href="/kids/spark-trail" className="-my-3 inline-block py-3 font-semibold text-amber-300 underline-offset-4 hover:underline">
            Spark Trail
          </Link>{' '}
          earns a robot part. Each one fits a real slot on the robot: Spark&rsquo;s Head fits as a Camera Eye, the Mighty Arm as a Gripper
          Claw, the Sensor Backpack as a Colour Sensor, Speedy Wheels as two motor wheels and the Control Center Body as a Box Body. Fitting
          one gives the robot that part&rsquo;s abilities in the Code Lab, just like choosing it in the Workshop. The Rocket Booster is just
          for show: real ground robots do not fly on rockets, so it only appears in the hangar bay.
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
        <h3 className="mt-6 font-display text-xl font-bold text-white">XP and stars: one way to measure progress</h3>
        <p className="mt-2">
          XP is the only thing a child collects. Course sessions, games, Skill Galaxy activities and the AI labs earn it, and it grows their
          rank. Stars (one to three) say how well something went, and the hangar adds up the best stars from everything they have
          finished. There are no coins, gems or shop: looks unlock with ranks and badges.
        </p>
        <h3 className="mt-6 font-display text-xl font-bold text-white">Private by design</h3>
        <p className="mt-2">
          Everything in the hangar is saved on the device. Children never give an email address, phone number or birthday. If they join a
          teacher&rsquo;s class with a code and a nickname, their progress is shared with that teacher only.
        </p>
        <h3 className="mt-6 font-display text-xl font-bold text-white">A backup code instead of an account</h3>
        <p className="mt-2">
          Because there is no account, a lost or reset device would lose a child&rsquo;s robot and progress. &ldquo;Save code&rdquo; makes a
          backup code (copy it, or download it as a text file) that a grown-up keeps somewhere safe. &ldquo;Restore from a code&rdquo; brings
          everything back on any device. Restoring only ever adds: the highest XP and stars are kept, and badges and finished lessons from both
          devices are combined. The code contains robot progress only, never a name, email or anything else personal.
        </p>
      </section>
    </>
  )
}
