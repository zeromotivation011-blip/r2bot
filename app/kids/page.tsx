// app/kids/page.tsx — Robot World entry (server component)
import type { Metadata } from 'next'
import KidsEntryClient from './KidsEntryClient'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { KIDS_ZONES } from '@/lib/kids-world-data'

export const runtime = 'nodejs'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'Robot World: Robotics Games and Activities for Kids 5–14',
  description:
    'Spark the robot takes kids on an adventure through 6 worlds of robotics. Ages 5–14. No experience needed. Free!',
  keywords: [
    'robotics for kids',
    'learn robotics ages 5-14',
    'kids robot game',
    'free robotics for children',
    'STEM for kids',
  ],
  alternates: { canonical: `${BASE}/kids` },
  openGraph: {
    type: 'website',
    url: `${BASE}/kids`,
    siteName: 'R2BOT',
    title: 'Robot World — Robotics adventures for kids 5–14',
    description: 'Meet Spark. Explore 6 worlds. Build your own robot. Free, fun, no account needed.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Robot World — R2BOT' }],
  },
}

const appJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalApplication',
  name: 'Robot World — R2BOT for Kids',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any (browser)',
  description: '6-zone robotics adventure for kids ages 5–14. Spark the robot guides every lesson.',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: `${BASE}/kids`,
}

// Visible Q&A for parents. Emitted as text only — FAQPage rich results are no
// longer shown for sites like this one, so the JSON-LD was dropped (9 Nov 2026).
const KIDS_FAQ: { q: string; a: string }[] = [
  { q: 'Is Robot World free for kids?', a: 'Yes — Robot World on R2BOT is completely free for all kids aged 5–14. No login required to start.' },
  { q: 'What age is Robot World for?', a: 'Robot World has content for ages 5–14, divided into 6 zones that grow with your child — from spotting robots in everyday life to writing real Python code.' },
  { q: 'Do kids need any robotics experience?', a: "Zero. Spark's Garden starts from absolute scratch — what is a robot? — and every concept uses analogies kids already know (pressure cookers, ATMs, washing machines)." },
  { q: 'How long is each lesson?', a: 'Each lesson is 4 to 8 minutes — designed to fit healthy screen-time limits. Kids earn stars and unlock new zones as they go.' },
]

export default function KidsEntryPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(appJsonLd) }} />
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>Robot World: free robotics games and activities for kids aged 5 to 14</h1>
      <KidsEntryClient />

      {/* Server-rendered content. The interactive world above is JavaScript-only,
          so until 9 Nov 2026 search engines saw 13 words on a page whose title
          promises robotics games and activities for kids. */}
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-10 text-gray-200">
        <h2 className="text-2xl font-black text-white">Six worlds, from &ldquo;what is a robot?&rdquo; to real code</h2>
        <p className="mt-2 max-w-2xl text-gray-400">
          Each world is a handful of 4–8 minute activities with Spark, a small robot who explains
          things using objects kids already know. Worlds unlock in order; nothing needs an account,
          and we never collect information from children.
        </p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {KIDS_ZONES.map((z, i) => (
            <li key={z.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>{z.emoji}</span>
                <div>
                  <h3 className="font-bold text-white">
                    <Link href={`/kids/world/${z.id}`} className="hover:underline">{i + 1}. {z.name}</Link>
                  </h3>
                  <p className="text-xs text-gray-400">Ages {z.ageRange} · {z.levels.length} activities</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-300">{z.tagline}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link href="/kids/activities" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-white/20">
            <h3 className="font-bold text-white">🖨️ Printable activities</h3>
            <p className="mt-1 text-sm text-gray-400">Build-at-home projects and worksheets that need nothing but paper, scissors and a kitchen drawer.</p>
          </Link>
          <Link href="/kids/parents" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-white/20">
            <h3 className="font-bold text-white">👪 For parents and teachers</h3>
            <p className="mt-1 text-sm text-gray-400">What each world teaches, how long it takes, and how to follow along without a screen.</p>
          </Link>
        </div>

        <h2 className="mt-12 text-xl font-black text-white">Questions parents ask</h2>
        <dl className="mt-4 divide-y divide-white/10">
          {KIDS_FAQ.map((f) => (
            <div key={f.q} className="py-4">
              <dt className="font-semibold text-white">{f.q}</dt>
              <dd className="mt-1 text-sm text-gray-400">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}
