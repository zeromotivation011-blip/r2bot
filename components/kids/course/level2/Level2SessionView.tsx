// components/kids/course/level2/Level2SessionView.tsx
// SERVER component: one Level 2 session page body — the runner (a client
// island fed with THIS session's resolved data only) and, below it, server HTML
// that says what the session is: the goal, the island story in its own words,
// what the child practises and plays, and what a grown-up can do at home.
// Used by app/kids/course/[level]/[session]/page.tsx for level 2 (noindex,
// follow — the level page is the indexed one).

import Link from 'next/link'
import type { Level2SessionData } from '@/lib/kids/curriculum/level2/resolve'
import type { CharacterId } from '@/lib/kids/curriculum/types'
import Level2SessionRunnerClient from './Level2SessionRunnerClient'

const SPEAKER: Record<CharacterId, string> = {
  narrator: 'Narrator',
  spark: 'Spark',
  amara: 'Amara',
  lucia: 'Nana Lucía',
  bolt: 'Bolt',
  myrobot: 'Your robot',
  guest: 'A visitor',
}

const navLink =
  'flex min-h-[48px] items-center rounded-2xl bg-white/[0.08] px-5 font-bold text-[#EEF2F8] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export default function Level2SessionView({ data }: { data: Level2SessionData }) {
  const { session: s, arena, activities, game, theatre, prev, next } = data
  const lines = s.episode.scenes.flatMap((sc) => sc.lines.slice(0, 2)).slice(0, 8)

  return (
    <div>
      <Level2SessionRunnerClient data={data} />

      <section aria-labelledby="about-session" className="mx-auto max-w-3xl px-4 pb-16 pt-8 text-[#A7B0C0]">
        <h2 id="about-session" className="font-display text-2xl font-bold text-[#EEF2F8]">
          About session {s.number}: {s.title}
        </h2>
        <p className="mt-2 text-[17px] leading-relaxed">
          <span className="font-semibold text-[#EEF2F8]">Goal:</span> {s.objective}
        </p>

        <h3 className="mt-6 font-display text-lg font-bold text-[#EEF2F8]">The story: “{s.episode.title}”</h3>
        {s.episode.previously && <p className="mt-1 italic">{s.episode.previously}</p>}
        <ul className="mt-2 space-y-1.5 leading-relaxed">
          {lines.map((l, i) => (
            <li key={i}>
              <span className="font-semibold text-[#EEF2F8]">{l.who === 'guest' && l.guestName ? l.guestName : SPEAKER[l.who]}:</span> “{l.line}”
            </li>
          ))}
        </ul>
        <p className="mt-1 leading-relaxed">Next time: {s.episode.cliffhanger}</p>
        {theatre && <p className="mt-1 leading-relaxed">Bonus cartoon about the same idea: “{theatre.title}” in Story Theatre.</p>}

        <h3 className="mt-6 font-display text-lg font-bold text-[#EEF2F8]">What your child learns</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {s.objectives.map((o) => (
            <li key={o.id}>{o.kidText}</li>
          ))}
        </ul>

        <h3 className="mt-6 font-display text-lg font-bold text-[#EEF2F8]">The six steps</h3>
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          <li>Episode: “{s.episode.title}”, an illustrated island story read aloud, about {Math.max(1, Math.round(s.episode.runtimeSec / 60))} minutes.</li>
          <li>Build: {s.build.why}</li>
          <li>
            Practise: {arena.title} — {s.arena.task} Then {activities.length} Skill Galaxy activities: {activities.map((a) => a.title).join(', ')}.
          </li>
          <li>
            Challenge: {game.name} on the {game.tierName} tier — {s.challenge.goal}
          </li>
          <li>Check: three questions, each followed by the reason. Wrong answers are never marked “wrong”; the explanation follows either way.</li>
          <li>
            Badge: {s.badge.icon} {s.badge.name} — {s.badge.earnedFor}
          </li>
        </ol>
        {s.project && (
          <>
            <h3 className="mt-6 font-display text-lg font-bold text-[#EEF2F8]">Make it yours: {s.project.title}</h3>
            <p className="mt-1 leading-relaxed">{s.project.brief}</p>
          </>
        )}

        <h3 className="mt-6 font-display text-lg font-bold text-[#EEF2F8]">At home</h3>
        <p className="mt-1 leading-relaxed">{s.parent.tryAtHome}</p>
        <p className="mt-1 leading-relaxed">Ask your child: “{s.parent.askYourChild}”</p>

        <nav aria-label="Sessions" className="mt-10 flex flex-wrap gap-3">
          {prev && (
            <Link href={`/kids/course/2/${prev.number}`} className={navLink}>
              ← Session {prev.number}: {prev.title}
            </Link>
          )}
          <Link href="/kids/course/2" className={navLink}>
            Season map
          </Link>
          {next && (
            <Link href={`/kids/course/2/${next.number}`} className={navLink}>
              Session {next.number}: {next.title} →
            </Link>
          )}
        </nav>
      </section>
    </div>
  )
}
