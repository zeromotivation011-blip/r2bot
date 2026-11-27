// components/kids/episodes/EpisodesTheatreShelf.tsx
// Server component: the Episodes Theatre shelf (roadmap #8) — the 24
// Piper-voiced 3D episodes of Level 1, each with "Watch" and "Play this
// mission". Mounted on /kids/stories above the Story Theatre cartoons. Real
// links and words in the server HTML; nothing here needs JavaScript.

import Link from 'next/link'
import { THEATRE_EPISODES } from '@/lib/kids/episodes/theatre'

const card =
  'flex h-full flex-col rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3 shadow-[0_8px_24px_rgba(0,0,0,.45)]'
const link =
  'inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-2 text-center text-sm font-bold leading-tight transition active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export function EpisodesTheatreShelf({ headingId = 'theatre-episodes' }: { headingId?: string }) {
  const minutes = THEATRE_EPISODES.reduce((n, e) => n + e.minutes, 0)
  return (
    <section aria-labelledby={headingId} className="mt-10" data-testid="episodes-theatre">
      <p className="text-sm font-black uppercase tracking-widest text-amber-300">🎬 Now showing</p>
      <h2 id={headingId} className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
        Lantern Hill: the 3D episodes
      </h2>
      <p className="mt-2 max-w-3xl text-base text-[#A7B0C0]">
        {THEATRE_EPISODES.length} animated 3D episodes, voiced by a full cast: Spark, Amara, Nana Lucía, Bolt the robot puppy and
        your own robot. Each one is a few minutes long, asks you to join in, and ends on a problem that only your code can fix —
        so under every episode is the mission that goes with it. About {minutes} minutes of story in all, made for ages 5 to 7 and
        fun at any age.
      </p>
      <ol className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
        {THEATRE_EPISODES.map((e) => (
          <li key={e.sessionId}>
            <article className={card} aria-labelledby={`${headingId}-${e.sessionId}`}>
              <p className="font-display text-xs font-bold uppercase tracking-wider text-amber-300">
                Episode {e.number} · {e.minutes} min
              </p>
              <h3 id={`${headingId}-${e.sessionId}`} className="mt-1 font-display text-lg font-bold leading-snug text-white">
                {e.title}
              </h3>
              <p className="mt-1 flex-1 text-sm text-[#A7B0C0]">Mission: {e.sessionTitle}</p>
              <div className="mt-3 grid gap-2">
                <Link href={e.href} className={`${link} bg-amber-500 text-[#1A1103] hover:bg-amber-400`}>
                  <span aria-hidden className="mr-1.5">
                    ▶
                  </span>
                  Watch<span className="sr-only"> episode {e.number}: {e.title}</span>
                </Link>
                <Link href={e.missionHref} className={`${link} border border-white/15 text-white hover:border-amber-400`}>
                  Play this mission<span className="sr-only">: {e.sessionTitle}</span>
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default EpisodesTheatreShelf
