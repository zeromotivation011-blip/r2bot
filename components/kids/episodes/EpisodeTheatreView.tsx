// components/kids/episodes/EpisodeTheatreView.tsx
// Server component: one Episodes Theatre page, /kids/stories/episodes/<sessionId>
// (roadmap #8). Everything a reader or search engine needs is server HTML —
// what the episode is about, the mission it opens, the full voiced script —
// and the 3D player (three.js, behind its own poster tap) is the only client part.
// The route file only has to re-export what is below (see the bottom).

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EpisodeTheatreClient from './EpisodeTheatreClient'
import { PresentButton } from '@/components/kids/present/PresentButton'
import { breadcrumbJsonLD, jsonldScript } from '@/lib/seo/jsonld'
import { VOICE_CREDIT } from '@/lib/kids/episodes/credits'
import { THEATRE_EPISODES, speakerName, theatreEpisode } from '@/lib/kids/episodes/theatre'

const SITE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

export function theatreStaticParams(): { sessionId: string }[] {
  return THEATRE_EPISODES.map((e) => ({ sessionId: e.sessionId }))
}

export function theatreMetadata(raw: string): Metadata {
  const found = theatreEpisode(raw)
  if (!found) return {}
  const { meta } = found
  const url = `${SITE}${meta.href}`
  const description = `Episode ${meta.number} of Lantern Hill, a voiced 3D robotics cartoon for kids: ${meta.objective || meta.sessionTitle}. Watch it, then play the mission.`
  return {
    title: `Episode ${meta.number}: ${meta.title} — 3D robotics cartoon for kids`,
    description: description.slice(0, 300),
    alternates: { canonical: url },
    openGraph: { type: 'video.episode', url, siteName: 'R2BOT', title: `Lantern Hill, episode ${meta.number}: ${meta.title}`, description },
  }
}

export function EpisodeTheatreView({ sessionId }: { sessionId: string }) {
  const found = theatreEpisode(sessionId)
  if (!found) notFound()
  const { meta, data } = found
  const i = THEATRE_EPISODES.findIndex((e) => e.sessionId === meta.sessionId)
  const next = THEATRE_EPISODES[i + 1] ?? null
  const prev = i > 0 ? THEATRE_EPISODES[i - 1] : null
  const crumbs = breadcrumbJsonLD([
    { name: 'R2BOT Kids', path: '/kids' },
    { name: 'Story Theatre', path: '/kids/stories' },
    { name: `Episode ${meta.number}`, path: meta.href },
  ])
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: `Lantern Hill, episode ${meta.number}: ${meta.title}`,
    url: `${SITE}${meta.href}`,
    inLanguage: 'en',
    educationalLevel: 'Ages 5–7',
    learningResourceType: 'Animated story',
    teaches: meta.objective || meta.sessionTitle,
    isPartOf: { '@type': 'CreativeWorkSeries', name: 'Lantern Hill (R2BOT Kids, Level 1)' },
    isAccessibleForFree: true,
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:pt-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <nav aria-label="Breadcrumb" className="text-sm text-[#A7B0C0]">
        <Link href="/kids" className="inline-flex min-h-[44px] items-center hover:text-white hover:underline">
          R2BOT Kids
        </Link>
        <span aria-hidden className="mx-1.5">
          ›
        </span>
        <Link href="/kids/stories" className="inline-flex min-h-[44px] items-center hover:text-white hover:underline">
          Story Theatre
        </Link>
        <span aria-hidden className="mx-1.5">
          ›
        </span>
        <span className="text-[#EEF2F8]">Episode {meta.number}</span>
      </nav>

      <header className="mb-3 mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
          Episode {meta.number}: {meta.title}
        </h1>
        <p className="text-sm text-[#A7B0C0]">
          Lantern Hill · Level 1 · about {meta.minutes} {meta.minutes === 1 ? 'minute' : 'minutes'} · voiced, with captions
        </p>
        <div className="w-full sm:ml-auto sm:w-auto">
          <PresentButton source={{ kind: 'session', level: 1, number: meta.number, unplugged: false }} />
        </div>
      </header>

      <EpisodeTheatreClient
        sessionId={meta.sessionId}
        missionHref={meta.missionHref}
        missionTitle={meta.sessionTitle}
        nextHref={next?.href ?? null}
        nextTitle={next?.title ?? null}
      />

      <section aria-labelledby="ep-about" className="mt-8 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 id="ep-about" className="font-display text-xl font-bold text-white">
            What this episode is about
          </h2>
          <p className="mt-2 text-base text-[#EEF2F8]">
            Lantern Hill is a small town where Amara, a young inventor, her grandmother Nana Lucía, Spark the orange robot and Bolt the robot
            puppy solve problems with robots — and with you. This is episode {meta.number} of {THEATRE_EPISODES.length}. It sets up the mission
            “{meta.sessionTitle}”{meta.objective ? `: ${meta.objective.charAt(0).toLowerCase()}${meta.objective.slice(1)}` : ''}
            {/[.!?]$/.test(meta.objective) ? '' : '.'}
          </p>
          <p className="mt-2 text-base text-[#A7B0C0]">
            Every voice was recorded ahead of time, so the episode sounds the same on every phone, tablet and computer, and it plays offline once
            it has been watched. Captions follow each word. Grown-ups can switch voices and sound off in Settings.
          </p>
        </div>
        <div className="rounded-[20px] border border-amber-400/25 bg-amber-500/[0.06] p-4">
          <h2 className="font-display text-lg font-bold text-white">Your mission</h2>
          <p className="mt-1 text-base text-[#A7B0C0]">
            {meta.sessionTitle}: build the robot, code it, then try the challenge. It takes about one lesson and earns up to three stars.
          </p>
          <Link
            href={meta.missionHref}
            className="mt-3 inline-flex min-h-12 items-center rounded-full bg-amber-500 px-5 font-display font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            Play this mission
          </Link>
        </div>
      </section>

      <section id="script" aria-labelledby="ep-script" className="mt-8 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
        <h2 id="ep-script" className="font-display text-xl font-bold text-white">
          The script
        </h2>
        {data.previously && <p className="mt-3 italic text-[#A7B0C0]">Last time… {data.previously.text}</p>}
        {data.scenes.map((sc, n) => (
          <div key={n} className="mt-4">
            <h3 className="text-sm font-bold text-amber-300">{sc.setting}</h3>
            <ul className="mt-1 space-y-1 text-[#EEF2F8]">
              {sc.lines.map((l) => (
                <li key={l.i}>
                  <b className="text-white">{speakerName(l.who, l.guestName)}:</b> {l.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="mt-4 italic text-[#A7B0C0]">Next time… {data.cliffhanger.text}</p>
        <p className="mt-4 text-[13px] text-[#A7B0C0]">{VOICE_CREDIT}</p>
      </section>

      <nav aria-label="More episodes" className="mt-8 flex flex-wrap gap-3">
        {prev && (
          <Link href={prev.href} className="inline-flex min-h-12 items-center rounded-full border border-white/15 px-5 font-display font-bold text-white hover:border-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            ← Episode {prev.number}: {prev.title}
          </Link>
        )}
        <Link href={`/kids/stories#theatre-episodes`} className="inline-flex min-h-12 items-center rounded-full border border-white/15 px-5 font-display font-bold text-white hover:border-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
          All {THEATRE_EPISODES.length} episodes
        </Link>
      </nav>
    </div>
  )
}

export default EpisodeTheatreView
