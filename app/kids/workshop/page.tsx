// app/kids/workshop/page.tsx — 3D Robot Workshop (server component)
// The interactive builder is a client component whose 3D view loads with
// next/dynamic({ ssr: false }). Everything a search engine or a parent needs
// — what the child does and every part with what it does, what it makes
// possible and what goes wrong without it — is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { partsForSlot } from '@/lib/kids/robot-design'
import { SLOT_LABEL, SLOT_ORDER } from '@/lib/kids/code-lab/labels'
import WorkshopClient from '@/components/kids/three/WorkshopClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

const TITLE = '3D Robot Workshop for Kids: Build Your Own Robot'
const DESCRIPTION =
  'Kids design their own robot in 3D — body, wheels or legs, sensors and tools — and learn what every part does and what goes wrong without it. Test-drive it, see it in your room in AR, then program it in the Code Lab.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/kids/workshop` },
  openGraph: {
    type: 'website',
    url: `${BASE}/kids/workshop`,
    siteName: 'R2BOT',
    title: '3D Robot Workshop — build your own robot',
    description: 'Pick parts, watch them snap on, test-drive your robot and see it in your room.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Robot Workshop' }],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: '3D Robot Workshop',
  description: DESCRIPTION,
  url: `${BASE}/kids/workshop`,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 5–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: ['Parts of a robot', 'Sensors and actuators', 'Choosing parts for a job'],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

export default function WorkshopPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />
      <header className="mx-auto max-w-6xl px-4 pb-4 pt-6">
        <p className="text-sm font-black uppercase tracking-wider text-amber-300">Robot Workshop</p>
        <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">Build your own robot in 3D</h1>
        <p className="mt-2 max-w-3xl text-slate-200">
          Choose a body, something to move with, a head, a tool and a floor sensor. Every part snaps on and tells you what it does — and what
          would go wrong without it. Spin your robot around, take it for a test drive, and put it in your room with your phone&rsquo;s camera.
        </p>
      </header>

      <WorkshopClient />

      {/* Server-rendered parts guide: the same text the part cards show. */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 text-gray-200" aria-labelledby="parts-guide">
        <h2 id="parts-guide" className="text-2xl font-black text-white">
          Every robot part, and why it matters
        </h2>
        <p className="mt-2 max-w-3xl text-slate-200">
          Real engineers pick parts for the job the robot has to do. Here is every part in the Workshop. In the{' '}
          <Link href="/kids/code-lab" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            Code Lab
          </Link>
          , the parts you choose decide which code blocks your robot can use: no eyes, no &ldquo;wall ahead?&rdquo; block.
        </p>
        {SLOT_ORDER.map((slot) => (
          <div key={slot} className="mt-8">
            <h3 className="text-xl font-black text-white">{SLOT_LABEL[slot]}</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {partsForSlot(slot)
                .filter((p) => p.id !== 'none')
                .map((p) => (
                  <li key={`${slot}-${p.id}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <h4 className="font-black text-white">
                      <span aria-hidden>{p.emoji}</span> {p.name}
                    </h4>
                    <p className="mt-1 text-sm">{p.what}</p>
                    <p className="mt-2 text-sm">
                      <strong className="text-emerald-300">With it:</strong> {p.withIt}
                    </p>
                    <p className="mt-1 text-sm">
                      <strong className="text-rose-300">Without it:</strong> {p.withoutIt}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      <strong>Real robots:</strong> {p.realWorld}
                    </p>
                  </li>
                ))}
            </ul>
          </div>
        ))}
        <p className="mt-10 max-w-3xl text-sm text-slate-300">
          For grown-ups: the Workshop runs entirely in the browser. The robot design is saved on this device only; nothing is sent to a server
          and no account is needed. The camera is used only if your child presses &ldquo;Turn on camera&rdquo;, and the video never leaves the
          device.
        </p>
      </section>
    </>
  )
}
