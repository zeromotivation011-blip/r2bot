// app/kids/course/[level]/[session]/page.tsx — one playable course session.
//
// The child-facing runner (episode → build → code → challenge → check → badge)
// is a client island fed with THIS session's data only. Below it, server HTML
// says what the session is: its objective, the story so far, what the child
// learns and what a grown-up can do at home. Session pages are app screens,
// so they are noindex,follow; the level page (/kids/course/1) is the indexed
// one and links every session.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LEVEL1_SESSIONS } from '@/lib/kids/curriculum/level1'
import { LEVEL2_SESSIONS } from '@/lib/kids/curriculum/level2'
import { level2SessionData } from '@/lib/kids/curriculum/level2/resolve'
import { LEVEL3_SESSIONS, level3Reuse } from '@/lib/kids/curriculum/level3'
import { LEVEL4_SESSIONS, level4Reuse } from '@/lib/kids/curriculum/level4'
import { playForL34 } from '@/lib/kids/curriculum/level3/teacher-guide'
import { levelByNumber } from '@/lib/kids/curriculum/levels'
import type { CharacterId, EpisodeScene, LevelNumber, Session } from '@/lib/kids/curriculum/types'
import Level2SessionView from '@/components/kids/course/level2/Level2SessionView'
import { getPart, type Slot } from '@/lib/kids/robot-design'
import SessionRunnerClient from '@/components/kids/course/SessionRunnerClient'

export const runtime = 'nodejs'
export const dynamicParams = false

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

type Params = { params: Promise<{ level: string; session: string }> }

/** Levels that use the shared Session type and runner. Level 2 has its own (L2Session, Level2SessionView). */
const BY_LEVEL: Record<string, Session[]> = { '1': LEVEL1_SESSIONS, '3': LEVEL3_SESSIONS, '4': LEVEL4_SESSIONS }

export function generateStaticParams() {
  return [
    ...Object.entries(BY_LEVEL).flatMap(([level, list]) => list.map((s) => ({ level, session: String(s.number) }))),
    ...LEVEL2_SESSIONS.map((s) => ({ level: '2', session: String(s.number) })),
  ]
}

function find(level: string, session: string): Session | undefined {
  const list = BY_LEVEL[level]
  if (!list || !/^\d{1,2}$/.test(session)) return undefined
  return list.find((s) => s.number === Number(session))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await params
  if (p.level === '2') {
    const l2 = /^\d{1,2}$/.test(p.session) ? LEVEL2_SESSIONS.find((s) => s.number === Number(p.session)) : undefined
    if (!l2) return {}
    return {
      title: `Session ${l2.number}: ${l2.title} — Kids Robotics Level 2`,
      description: `${l2.objective} A story, a robot build, a practice arena, a game challenge and a skill badge. Ages ${levelByNumber(2).ages}.`,
      alternates: { canonical: `${BASE}/kids/course/2/${l2.number}` },
      robots: { index: false, follow: true },
    }
  }
  const s = find(p.level, p.session)
  if (!s) return {}
  const lvl = levelByNumber(Number(p.level) as LevelNumber)
  return {
    title: `Session ${s.number}: ${s.title} — Kids Robotics Level ${lvl.number}`,
    description: `${s.objective} Episode “${s.episode.title}”, a robot build, a challenge and a skill badge (${s.badge.name}). Ages ${lvl.ages}.`,
    alternates: { canonical: `${BASE}/kids/course/${lvl.number}/${s.number}` },
    robots: { index: false, follow: true },
  }
}

const SPEAKER: Record<CharacterId, string> = {
  narrator: 'Narrator',
  spark: 'Spark',
  amara: 'Amara',
  lucia: 'Nana Lucía',
  bolt: 'Bolt',
  myrobot: 'Your robot',
  guest: 'A visitor',
}

/**
 * The story in the episode's own words, for a grown-up: every narrator line
 * and the first spoken line of each scene (scene.action is a director's note
 * for the 3D team, not prose for a reader).
 */
function storyLines(scenes: EpisodeScene[]): { who: string; line: string }[] {
  const out: { who: string; line: string }[] = []
  for (const sc of scenes) {
    const narr = sc.lines.filter((l) => l.who === 'narrator')
    const picks = narr.length > 0 ? narr : sc.lines.slice(0, 1)
    for (const l of picks) out.push({ who: l.who === 'guest' && l.guestName ? l.guestName : SPEAKER[l.who], line: l.line.replace(/^[“"]|[”"]$/g, '') })
  }
  return out.slice(0, 8)
}

export default async function SessionPage({ params }: Params) {
  const p = await params
  if (p.level === '2') {
    const data = /^\d{1,2}$/.test(p.session) ? level2SessionData(Number(p.session)) : null
    if (!data) notFound()
    return <Level2SessionView data={data} />
  }
  const s = find(p.level, p.session)
  if (!s) notFound()
  const list = BY_LEVEL[p.level]
  const level = levelByNumber(Number(p.level) as LevelNumber)
  const L = level.number
  const act = level.season.arc.find((a) => s.number >= a.sessions[0] && s.number <= a.sessions[1])
  const nextS = list.find((x) => x.number === s.number + 1)
  const prevS = list.find((x) => x.number === s.number - 1)
  const reuse = L === 3 ? level3Reuse(s.id) : L === 4 ? level4Reuse(s.id) : undefined
  const play = reuse ? playForL34(s.id) : null
  const part = s.build.part.id === 'child-choice' ? undefined : getPart(s.build.part.slot as Slot, s.build.part.id)

  return (
    <div>
      <SessionRunnerClient
        session={s}
        level={L}
        levelTitle={level.season.title}
        actTitle={act ? `Act ${level.season.arc.indexOf(act) + 1}: ${act.title}` : level.name}
        next={nextS ? { number: nextS.number, title: nextS.title } : null}
        reuse={reuse}
        play={play}
      />

      {/* Server text: what this session is, for grown-ups and assistive tech. */}
      <section aria-labelledby="about-session" className="mx-auto max-w-3xl px-4 pb-16 pt-8 text-[#A7B0C0]">
        <h2 id="about-session" className="font-display text-2xl font-bold text-[#EEF2F8]">
          About session {s.number}: {s.title}
        </h2>
        <p className="mt-2 text-[17px] leading-relaxed">
          <span className="font-semibold text-[#EEF2F8]">Goal:</span> {s.objective}
        </p>
        <h3 className="mt-6 font-display text-lg font-bold text-[#EEF2F8]">The story: “{s.episode.title}”</h3>
        {s.episode.previously && <p className="mt-1 italic">Previously: {s.episode.previously}</p>}
        <ul className="mt-2 space-y-1.5 leading-relaxed">
          {storyLines(s.episode.scenes).map((l, i) => (
            <li key={i}>
              <span className="font-semibold text-[#EEF2F8]">{l.who}:</span> “{l.line}”
            </li>
          ))}
        </ul>
        <p className="mt-1 leading-relaxed">Next time: {s.episode.cliffhanger}</p>
        <h3 className="mt-6 font-display text-lg font-bold text-[#EEF2F8]">What your child learns</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {s.objectives.map((o) => (
            <li key={o.id}>{o.kidText}</li>
          ))}
        </ul>
        <h3 className="mt-6 font-display text-lg font-bold text-[#EEF2F8]">The six steps</h3>
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          <li>
            Episode: “{s.episode.title}”, about {Math.round(s.episode.runtimeSec / 60)} minutes, {L === 1 ? 'with captions' : 'as a read-aloud storybook'}.
          </li>
          <li>
            Build: {part ? part.name : 'the child’s own choice of part'} — {s.build.why}
          </li>
          <li>
            Code: “{s.code.title}” — {s.code.mission}
          </li>
          <li>
            Challenge: “{s.challenge.title}” — {s.challenge.mission}
            {play && play.title && <> Played today as {play.title}: {play.detail}</>}
          </li>
          <li>Check: three spoken questions, each followed by the reason.</li>
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
          {prevS && (
            <Link href={`/kids/course/${L}/${prevS.number}`} className="flex min-h-[48px] items-center rounded-2xl bg-white/[0.08] px-5 font-bold text-[#EEF2F8] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
              ← Session {prevS.number}: {prevS.title}
            </Link>
          )}
          <Link href={`/kids/course/${L}`} className="flex min-h-[48px] items-center rounded-2xl bg-white/[0.08] px-5 font-bold text-[#EEF2F8] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            Season map
          </Link>
          {nextS && (
            <Link href={`/kids/course/${L}/${nextS.number}`} className="flex min-h-[48px] items-center rounded-2xl bg-white/[0.08] px-5 font-bold text-[#EEF2F8] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
              Session {nextS.number}: {nextS.title} →
            </Link>
          )}
        </nav>
      </section>
    </div>
  )
}
