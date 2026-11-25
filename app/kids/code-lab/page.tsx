// app/kids/code-lab/page.tsx — Code Lab mission index (server component)

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { missionsForBand } from '@/lib/kids/code-lab/missions'
import CodeLabIndexClient, { type IndexBand } from '@/components/kids/codelab/CodeLabIndexClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

const TITLE = 'Code Lab: Block Coding Missions for Kids with Your Own 3D Robot'
const DESCRIPTION =
  'Block coding for kids aged 5–17: drive the robot you built through 3D missions with sequences, loops, if/else, sensors, line following and maze solving — and see the Python behind every program.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/kids/code-lab` },
  openGraph: {
    type: 'website',
    url: `${BASE}/kids/code-lab`,
    siteName: 'R2BOT',
    title: 'Code Lab — block coding missions for kids',
    description: 'Program your own robot through 3D missions: loops, sensors, line following and mazes.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Code Lab' }],
  },
}

export default function CodeLabPage() {
  const bands: IndexBand[] = KIDS_BANDS.map((b) => ({
    id: b.id,
    name: b.name,
    emoji: b.emoji,
    ages: b.ages,
    gradient: b.gradient,
    promise: b.promise,
    missions: missionsForBand(b.id).map((m) => ({
      id: m.id,
      title: m.title,
      emoji: m.emoji,
      task: m.task,
      learningGoal: m.learningGoal,
      needs: m.needs,
    })),
  }))
  const all = bands.flatMap((b) => b.missions)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'R2BOT Code Lab missions',
    numberOfItems: all.length,
    itemListElement: all.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE}/kids/code-lab/${m.id}`,
      name: m.title,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 text-gray-200">
        <p className="text-sm font-black uppercase tracking-wider text-amber-300">Code Lab</p>
        <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">Program your own robot</h1>
        <p className="mt-2 max-w-3xl text-purple-100">
          Snap code blocks together and watch the robot you built in the{' '}
          <Link href="/kids/workshop" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            Workshop
          </Link>{' '}
          follow them, one block at a time, through {all.length} missions in a 3D arena. Your robot&rsquo;s parts matter: without eyes it
          cannot check for walls, without a pen it cannot draw. Older coders can switch on the Python view to see the real code behind every
          program.
        </p>
        <ul className="mt-4 grid max-w-3xl gap-2 text-sm text-purple-100 sm:grid-cols-2">
          <li>🧩 Tap a block to add it — works great on phones and tablets.</li>
          <li>🔁 Loops, if/else, sensors, and mazes as you level up.</li>
          <li>⭐ Three stars for solving it within the block budget.</li>
          <li>🔒 Missions open in order inside each age group.</li>
        </ul>

        <div className="mt-8">
          <CodeLabIndexClient bands={bands} />
        </div>

        <p className="mt-12 max-w-3xl text-sm text-purple-200">
          For grown-ups: everything runs in the browser and progress is saved on this device only. No account, no personal information, and
          nothing is sent to a server.
        </p>
      </div>
    </>
  )
}
