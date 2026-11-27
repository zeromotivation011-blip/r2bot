// app/kids/course/[level]/page.tsx — one level's season map.
//
// A winding path of the 24 sessions (the four "Make it yours" projects are
// the big star stops), the season story, the robot the child ends with and
// the certificate. All four levels are written in full (Wave 2), so all four
// are playable, indexed and in the sitemap. PLAYABLE stays as the switch: a
// level that is not written shows its season as "arriving soon" and is noindex
// (CLAUDE.md §12: never advertise what you noindex).

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { jsonldScript } from '@/lib/seo/jsonld'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { LEVELS } from '@/lib/kids/curriculum/levels'
import type { Level, LevelNumber } from '@/lib/kids/curriculum/types'
import { LEVEL1_SESSIONS } from '@/lib/kids/curriculum/level1'
import { LEVEL2_SESSIONS } from '@/lib/kids/curriculum/level2'
import { LEVEL3_SESSIONS } from '@/lib/kids/curriculum/level3'
import { LEVEL4_SESSIONS } from '@/lib/kids/curriculum/level4'
import { PLANETS } from '@/lib/kids/universe/worlds'
import { CertificateButtonClient } from '@/components/kids/teach/CertificateButtonClient'
import SeasonMapClient, { type MapAct, type MapNode } from '@/components/kids/course/SeasonMapClient'

export const runtime = 'nodejs'
export const dynamicParams = false

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

/** Levels whose sessions are written in full (and so playable and indexable). */
const PLAYABLE = new Set<number>([1, 2, 3, 4])

/** Each level's written sessions, for the badge icons on the map. */
const ICONS: Record<number, { number: number; badge: { icon: string } }[]> = { 1: LEVEL1_SESSIONS, 2: LEVEL2_SESSIONS, 3: LEVEL3_SESSIONS, 4: LEVEL4_SESSIONS }

type Params = { params: Promise<{ level: string }> }

export function generateStaticParams() {
  return LEVELS.map((l) => ({ level: String(l.number) }))
}

function levelOf(raw: string): Level | undefined {
  const n = Number(raw)
  return LEVELS.find((l) => l.number === (n as LevelNumber))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const l = levelOf((await params).level)
  if (!l) return {}
  const planet = PLANETS.find((p) => p.level === l.number)
  const playable = PLAYABLE.has(l.number)
  const title = `Kids Robotics Level ${l.number} (Ages ${l.ages}): ${l.season.title}`
  const description = `${planet?.name ?? `Level ${l.number}`}: a 24-session robotics story season for ages ${l.ages}. ${l.season.premise.split('. ')[0]}.`
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/kids/course/${l.number}` },
    robots: playable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      type: 'website',
      url: `${BASE}/kids/course/${l.number}`,
      siteName: 'R2BOT',
      title: `${planet?.name ?? `Level ${l.number}`} — ${l.season.title}`,
      description,
      images: [{ url: '/og-default.png', width: 1200, height: 630, alt: `R2BOT Kids Level ${l.number}` }],
    },
  }
}

export default async function LevelPage({ params }: Params) {
  const l = levelOf((await params).level)
  if (!l) notFound()
  const planet = PLANETS.find((p) => p.level === l.number)
  const band = KIDS_BANDS.find((b) => b.id === l.band)
  const playable = PLAYABLE.has(l.number)

  const nodes: MapNode[] = l.sessions.map((s) => {
    const full = ICONS[l.number]?.find((x) => x.number === s.number)
    return { number: s.number, title: s.title, objective: s.objective, kind: s.kind, icon: full?.badge.icon }
  })
  const acts: MapAct[] = l.season.arc.map((a) => ({ title: a.title, summary: a.summary, sessions: a.sessions }))
  const prev = LEVELS.find((x) => x.number === l.number - 1)
  const next = LEVELS.find((x) => x.number === l.number + 1)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `R2BOT Kids Level ${l.number} · ${l.name}: ${l.season.title}`,
    description: l.season.premise,
    url: `${BASE}/kids/course/${l.number}`,
    provider: { '@type': 'Organization', name: 'R2BOT', url: BASE },
    educationalLevel: `Ages ${l.ages}`,
    inLanguage: 'en',
    isAccessibleForFree: true,
    audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: `children aged ${l.ages.replace('–', ' to ')}` },
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: 'PT16H' },
    syllabusSections: l.season.arc.map((a) => ({ '@type': 'Syllabus', name: a.title, description: a.summary })),
  }

  return (
    <div className="pb-16">
      {playable && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />}

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="mx-auto flex max-w-6xl items-start gap-4 px-4 pb-4 pt-5 sm:items-center sm:gap-5 sm:pt-10">
          <span
            className={`mt-8 grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br ${planet?.gradient ?? 'from-amber-300 to-orange-600'} text-3xl sm:mt-0 shadow-[inset_-10px_-12px_22px_rgba(0,0,0,.45),0_0_60px_rgba(252,104,24,.25)] sm:h-32 sm:w-32 sm:text-6xl`}
            aria-hidden
          >
            {planet?.emoji}
          </span>
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="text-sm text-[#6E7888]">
              <Link href="/kids" className="-my-3 inline-block py-3 font-semibold text-amber-300 hover:underline">
                R2BOT Kids
              </Link>{' '}
              /{' '}
              <Link href="/kids/course" className="-my-3 inline-block py-3 font-semibold text-amber-300 hover:underline">
                Course
              </Link>{' '}
              / Level {l.number}
            </nav>
            <p className="mt-1 font-display text-sm font-bold uppercase tracking-wider text-amber-300">
              Level {l.number} · {planet?.name} · {l.name} · ages {l.ages}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-[#EEF2F8] sm:text-5xl">{l.season.title}</h1>
            <p className="mt-2 line-clamp-3 max-w-3xl text-[16px] leading-relaxed text-[#A7B0C0] sm:line-clamp-none sm:text-[17px]">{l.season.premise}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="map-h" className="min-w-0 py-0">
          <h2 id="map-h" className="sr-only">
            Season map
          </h2>
          <SeasonMapClient level={l.number} playable={playable} nodes={nodes} acts={acts} />
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start" aria-label="About this season">
          <div className="rounded-[20px] border border-white/10 bg-[#111C32] p-5">
            <h2 className="font-display text-lg font-bold text-[#EEF2F8]">Where the story happens</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-[#A7B0C0]">{l.season.setting}</p>
            <h3 className="mt-4 font-display text-base font-bold text-[#EEF2F8]">The finale</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-[#A7B0C0]">{l.season.finale}</p>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-[#111C32] p-5">
            <h2 className="font-display text-lg font-bold text-[#EEF2F8]">Your robot by the end</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-[#A7B0C0]">{l.endRobot.description}</p>
          </div>
          <div className="rounded-[20px] border border-amber-400/30 bg-amber-400/[0.06] p-5">
            <h2 className="font-display text-lg font-bold text-amber-200">🎓 {l.certificate.title}</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-[#A7B0C0]">Earned by learning, never by attendance:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-snug text-[#A7B0C0]">
              {l.certificate.criteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          {playable && <CertificateButtonClient level={l.number} />}
        </aside>
      </div>

      {/* Server text: what the level teaches, for parents, teachers and search. */}
      <section aria-labelledby="learn-h" className="mx-auto max-w-3xl px-4 pb-0 pt-14 text-[#A7B0C0]">
        <h2 id="learn-h" className="font-display text-2xl font-bold text-[#EEF2F8] sm:text-3xl">
          What children learn in {l.season.title}
        </h2>
        {band && <p className="mt-3 text-[17px] leading-relaxed">{band.outcome}</p>}
        <div className="mt-6 space-y-6">
          {l.season.arc.map((a, i) => (
            <div key={a.title}>
              <h3 className="font-display text-lg font-bold text-[#EEF2F8]">
                Act {i + 1}: {a.title} <span className="font-body text-sm font-semibold text-[#6E7888]">(sessions {a.sessions[0]}–{a.sessions[1]})</span>
              </h3>
              <p className="mt-1 leading-relaxed">{a.summary}</p>
              <ol className="mt-2 space-y-0 text-[15px]" start={a.sessions[0]}>
                {l.sessions
                  .filter((s) => s.number >= a.sessions[0] && s.number <= a.sessions[1])
                  .map((s) => (
                    <li key={s.number}>
                      {playable ? (
                        <Link href={`/kids/course/${l.number}/${s.number}`} className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 underline-offset-4 hover:underline">
                          {s.number}. {s.title}
                        </Link>
                      ) : (
                        <span className="font-semibold text-[#EEF2F8]">
                          {s.number}. {s.title}
                        </span>
                      )}{' '}
                      — {s.objective}
                      {s.kind === 'project' && <span className="ml-1 text-amber-300">(Make it yours project)</span>}
                    </li>
                  ))}
              </ol>
            </div>
          ))}
        </div>

        <h2 className="mt-12 font-display text-2xl font-bold text-[#EEF2F8]">The four &ldquo;Make it yours&rdquo; projects</h2>
        <ul className="mt-3 space-y-3">
          {l.projects.map((p) => (
            <li key={p.id}>
              <span className="font-semibold text-[#EEF2F8]">
                Session {p.session}: {p.title}.
              </span>{' '}
              {p.brief}
            </li>
          ))}
        </ul>

        <h2 className="mt-12 font-display text-2xl font-bold text-[#EEF2F8]">Built for children aged {l.ages}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {l.developmentalFit.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>

        <nav aria-label="Other levels" className="mt-12 flex flex-wrap gap-3">
          {prev && (
            <Link href={`/kids/course/${prev.number}`} className="flex min-h-[48px] items-center rounded-2xl bg-white/[0.08] px-5 font-bold text-[#EEF2F8] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
              ← Level {prev.number}: {prev.season.title}
            </Link>
          )}
          <Link href="/kids/course" className="flex min-h-[48px] items-center rounded-2xl bg-white/[0.08] px-5 font-bold text-[#EEF2F8] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            All four planets
          </Link>
          {next && (
            <Link href={`/kids/course/${next.number}`} className="flex min-h-[48px] items-center rounded-2xl bg-white/[0.08] px-5 font-bold text-[#EEF2F8] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
              Level {next.number}: {next.season.title} →
            </Link>
          )}
        </nav>
      </section>
    </div>
  )
}
