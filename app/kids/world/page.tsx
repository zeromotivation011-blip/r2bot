import type { Metadata } from 'next'
import Link from 'next/link'
import WorldMapWrapper from './WorldMapWrapper'
import { KIDS_ZONES } from '@/lib/kids-world-data'

export const runtime = 'nodejs'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const metadata: Metadata = {
  title: 'Robot World: Robotics Games for Kids — R2BOT Kids',
  description:
    'Six worlds of quick robotics games with Spark: spot robots at home, learn robot parts, IF–THEN logic, loops, block coding and a first look at Python. Earn stars and robot parts.',
  alternates: { canonical: `${BASE}/kids/world` },
}

export default function WorldPage() {
  return (
    <>
      <WorldMapWrapper />

      {/* Server-rendered summary. The map above is JavaScript-only; this is what
          crawlers and slow connections see, and it doubles as a text index. */}
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-10 text-gray-200">
        <h2 className="text-2xl font-black text-white">Robot World: six worlds of robotics games</h2>
        <p className="mt-2 max-w-2xl text-gray-400">
          Each world is a handful of 4–8 minute activities with Spark, a small robot who explains things using objects
          children already know. Worlds unlock in order as you earn stars, and finishing a world wins a part for your robot.
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
                    <Link href={`/kids/world/${z.id}`} className="hover:underline">
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
      </section>
    </>
  )
}
