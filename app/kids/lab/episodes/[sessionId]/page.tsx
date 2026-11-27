// app/kids/lab/episodes/[sessionId]/page.tsx — preview any Level 1 episode
// standalone in the 3D episode engine. A lab page: noindex, not in the
// sitemap, not in any nav. The episode list and the full script are server
// HTML; the 3D player (three.js) loads only after the poster is tapped.
// The public home of each episode is the Episodes Theatre
// (/kids/stories/episodes/<id>, indexable): this preview links there.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EpisodeLabClient from '@/components/kids/episodes/EpisodeLabClient'
import { PresentButton } from '@/components/kids/present/PresentButton'
import manifest from '@/lib/kids/episodes/audio-manifest.json'
import { VOICE_CREDIT } from '@/lib/kids/episodes/credits'
import { THEATRE_EPISODES } from '@/lib/kids/episodes/theatre'
import { normaliseSessionId, type EpisodeData } from '@/lib/kids/episodes/types'

export const runtime = 'nodejs'
export const dynamicParams = false

interface ManifestShape {
  episodes: Record<string, EpisodeData>
}
const EPISODES = Object.values((manifest as unknown as ManifestShape).episodes).sort((a, b) => a.number - b.number)

export function generateStaticParams() {
  return EPISODES.map((e) => ({ sessionId: e.sessionId }))
}

type Params = { params: Promise<{ sessionId: string }> }

function find(raw: string): EpisodeData | undefined {
  const id = normaliseSessionId(raw)
  return EPISODES.find((e) => e.sessionId === id)
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const ep = find((await params).sessionId)
  if (!ep) return {}
  return {
    title: `Episode ${ep.number}: ${ep.title} (episode preview)`,
    description: `Level 1, episode ${ep.number} of the Lantern Hill story: a 3D animated robotics cartoon with voices and captions.`,
    robots: { index: false, follow: false },
  }
}

const NAMES: Record<string, string> = { narrator: 'Narrator', spark: 'Spark', amara: 'Amara', lucia: 'Nana Lucía', bolt: 'Bolt', myrobot: 'Your robot' }

export default async function EpisodePreviewPage({ params }: Params) {
  const ep = find((await params).sessionId)
  if (!ep) notFound()
  const idx = EPISODES.findIndex((e) => e.sessionId === ep.sessionId)
  const next = EPISODES[idx + 1] ?? null
  const theatre = THEATRE_EPISODES.find((t) => t.sessionId === ep.sessionId) ?? null
  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:pt-6">
      <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
          Episode {ep.number}: {ep.title}
        </h1>
        <p className="text-sm text-[#A7B0C0]">
          <span className="font-bold text-amber-300">Preview</span> · Session “{ep.sessionTitle}” · Level 1 · Lantern Hill
        </p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <Link
            href={theatre?.href ?? '/kids/stories'}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-[#19263F] px-3 text-sm font-bold text-[#EEF2F8] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            🎭 {theatre ? 'Watch in the Episodes Theatre' : 'All episodes in the Theatre'}
          </Link>
          <PresentButton source={{ kind: 'session', level: 1, number: ep.number, unplugged: false }} />
        </div>
      </header>

      <EpisodeLabClient sessionId={ep.sessionId} nextId={next?.sessionId ?? null} nextTitle={next?.title ?? null} />

      <nav aria-label="All Level 1 episodes" className="mt-8">
        <h2 className="font-display text-lg font-bold text-white">All 24 episodes</h2>
        <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {EPISODES.map((e) => (
            <li key={e.sessionId}>
              <Link
                href={`/kids/lab/episodes/${e.sessionId}`}
                aria-current={e.sessionId === ep.sessionId ? 'page' : undefined}
                className={`flex min-h-12 flex-col justify-center rounded-2xl border px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                  e.sessionId === ep.sessionId ? 'border-amber-400 bg-amber-500/15 text-white' : 'border-white/10 bg-white/[0.04] text-[#A7B0C0] hover:border-white/25 hover:text-white'
                }`}
              >
                <span className="font-display text-xs font-bold text-amber-300">{e.number}</span>
                <span className="line-clamp-2 leading-snug">{e.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <details id="script" className="mt-8 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
        <summary className="cursor-pointer font-display font-bold text-white">Read the script</summary>
        {ep.previously && <p className="mt-3 italic text-[#A7B0C0]">Last time… {ep.previously.text}</p>}
        {ep.scenes.map((sc, i) => (
          <section key={i} className="mt-4">
            <h3 className="text-sm font-bold text-amber-300">{sc.setting}</h3>
            <ul className="mt-1 space-y-1 text-[#EEF2F8]">
              {sc.lines.map((l) => (
                <li key={l.i}>
                  <b className="text-white">{l.who === 'guest' ? (l.guestName ?? 'Guest').split(',')[0] : NAMES[l.who] ?? l.who}:</b> {l.text}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="mt-4 italic text-[#A7B0C0]">Next time… {ep.cliffhanger.text}</p>
        <p className="mt-4 text-[13px] text-[#A7B0C0]">{VOICE_CREDIT}</p>
      </details>
    </main>
  )
}
