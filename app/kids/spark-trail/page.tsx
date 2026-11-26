import type { Metadata } from 'next'
import Link from 'next/link'
import WorldMapWrapper from './WorldMapWrapper'
import { KIDS_ZONES } from '@/lib/kids-world-data'

export const runtime = 'nodejs'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'Spark Trail: Quick Robotics Games for Kids — R2BOT Kids',
  description:
    'Six zones of quick robotics games with Spark: spot robots at home, learn robot parts, IF–THEN logic, loops, block coding and a first look at Python. Earn stars and robot parts.',
  alternates: { canonical: `${BASE}/kids/spark-trail` },
}

export default function WorldPage() {
  return (
    <>
      <WorldMapWrapper />

      {/* Server-rendered summary. The map above is JavaScript-only; this is what
          crawlers and slow connections see, and it doubles as a text index. */}
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-10 text-gray-200">
        <h2 className="text-2xl font-black text-white">Spark Trail: six zones of quick robotics games</h2>
        <p className="mt-2 max-w-2xl text-gray-400">
          Each zone is a handful of 4–8 minute activities with Spark, a small robot who explains things using objects
          children already know. Zones unlock in order as you earn stars, and finishing a zone wins a part for your robot.
        </p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {KIDS_ZONES.map((z, i) => (
            <li key={z.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  {z.emoji}
                </span>
                <div>
                  <h3 className="font-bold text-white">
                    <Link href={`/kids/spark-trail/${z.id}`} className="hover:underline">
                      {i + 1}. {z.name}
                    </Link>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Ages {z.ageRange} · {z.levels.length} activities
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-300">{z.tagline}</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-400">
                {z.levels.map((l) => (
                  <li key={l.id}>
                    {l.title}: {l.conceptName}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <h2 className="mt-10 text-xl font-black text-white">How Spark Trail fits into R2BOT Kids</h2>
        <p className="mt-2 max-w-3xl text-gray-300">
          Spark Trail is the gentlest way in. Each activity is a short game: tap the robots hiding in a kitchen, sort
          sensors from motors, choose what a robot should do IF it bumps into a wall, or repeat a dance with a loop.
          Spark speaks the instructions out loud (a grown-up can switch the voice off in Settings), so children who are
          still learning to read can play on their own.
        </p>
        <p className="mt-3 max-w-3xl text-gray-300">
          Stars from Spark Trail count towards your explorer level and badges, just like the course, the Skill Galaxy
          and the games. When a zone is finished, a boss challenge checks the big idea once more. After the trail,
          most children move on to the Level 1 course, the themed Worlds or Code Lab, where the same ideas come back
          with real block coding. Progress is saved on this device only, and a grown-up can make a backup code in the
          Hangar to move it to another phone or tablet. No account, email or name is ever needed.
        </p>
      </section>
    </>
  )
}
