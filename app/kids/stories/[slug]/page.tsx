// app/kids/stories/[slug]/page.tsx — one Story Theatre episode.
// The animated player is browser-only and loads behind a same-size skeleton;
// everything else (synopsis, outcomes, the full transcript) is server HTML.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import { getBand } from '@/lib/kids/bands'
import { EPISODES, episodeMinutes, episodeSeconds, getEpisode, nextEpisode, transcript } from '@/lib/kids/stories'
import { AUTHOR } from '@/lib/author'
import StoryPlayerLoaderClient from '@/components/kids/story/StoryPlayerLoaderClient'

export const runtime = 'nodejs'
export const dynamicParams = false

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export function generateStaticParams() {
  return EPISODES.map((e) => ({ slug: e.slug }))
}

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const ep = getEpisode(slug)
  if (!ep) return {}
  const band = getBand(ep.band)
  const url = `${BASE}/kids/stories/${ep.slug}`
  const title = `${ep.title}: a Robotics Cartoon for Kids`
  const description = `${ep.logline} Animated story, ages ${band?.ages ?? '5–17'}.`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: 'R2BOT',
      title: `${ep.title} · R2BOT Story Theatre`,
      description: ep.logline,
      images: [{ url: '/og-default.png', width: 1200, height: 630, alt: ep.title }],
    },
  }
}

const isoDuration = (s: number) => `PT${Math.floor(s / 60)}M${s % 60}S`

export default async function EpisodePage({ params }: Params) {
  const { slug } = await params
  const ep = getEpisode(slug)
  if (!ep) notFound()
  const band = getBand(ep.band)
  const next = nextEpisode(ep.slug)
  const lines = transcript(ep)
  const url = `${BASE}/kids/stories/${ep.slug}`
  const siblings = EPISODES.filter((e) => e.band === ep.band && e.slug !== ep.slug)
  const otherHandsOn = ep.handsOn.href === '/kids/code-lab'
    ? { href: '/kids/workshop', label: 'Build a robot in the Workshop' }
    : { href: '/kids/code-lab', label: 'Program a robot in the Code Lab' }

  const learningLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: ep.title,
    description: ep.synopsis,
    url,
    inLanguage: 'en',
    learningResourceType: 'Animated interactive story',
    educationalLevel: band ? `Ages ${band.ages} (${band.grades})` : undefined,
    typicalAgeRange: band ? `${band.minAge}-${band.maxAge}` : undefined,
    teaches: ep.learns,
    about: ep.concept,
    timeRequired: isoDuration(episodeSeconds(ep)),
    isAccessibleForFree: true,
    interactivityType: 'mixed',
    audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
    dateModified: ep.updated,
    author: { '@type': 'Organization', name: AUTHOR.name, url: AUTHOR.url },
    publisher: { '@type': 'Organization', name: 'R2BOT', url: BASE },
    isPartOf: { '@type': 'CreativeWorkSeries', name: 'R2BOT Story Theatre', url: `${BASE}/kids/stories` },
  }
  const crumbs = breadcrumbJsonLD([
    { name: 'R2BOT Kids', path: '/kids' },
    { name: 'Story Theatre', path: '/kids/stories' },
    { name: ep.title, path: `/kids/stories/${ep.slug}` },
  ])

  return (
    <div className="mx-auto max-w-6xl px-3 pb-16 pt-4 text-gray-200 sm:px-4 sm:pt-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <nav aria-label="Breadcrumb" className="text-sm text-white/60">
        <Link href="/kids" className="hover:text-white hover:underline">R2BOT Kids</Link>
        <span aria-hidden className="mx-1.5">›</span>
        <Link href="/kids/stories" className="hover:text-white hover:underline">Story Theatre</Link>
        <span aria-hidden className="mx-1.5">›</span>
        <span className="text-white/90">{ep.title}</span>
      </nav>

      <header className="mt-3 mb-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          {band && (
            <span className={`rounded-full bg-gradient-to-r ${band.gradient} px-3 py-1 text-white`}>
              {band.emoji} {band.name} · ages {band.ages}
            </span>
          )}
          <span className="rounded-full bg-white/10 px-3 py-1 text-white/80">{episodeMinutes(ep)} min</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-white/80">Teaches: {ep.concept}</span>
        </div>
        <h1 className="mt-2 text-2xl font-black leading-tight text-white sm:text-4xl">{ep.title}</h1>
        <p className="mt-1 max-w-3xl text-white/75 sm:text-lg">{ep.logline}</p>
      </header>

      <StoryPlayerLoaderClient episode={ep} next={{ slug: next.slug, title: next.title }} />

      <div className="mx-auto mt-10 grid max-w-5xl gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <section aria-labelledby="about">
            <h2 id="about" className="text-xl font-black text-white">What happens</h2>
            <p className="mt-2 text-white/80">{ep.synopsis}</p>
            <p className="mt-2 text-sm text-white/55">📍 {ep.setting}</p>
          </section>

          <section aria-labelledby="learns" className="mt-8">
            <h2 id="learns" className="text-xl font-black text-white">What your child learns</h2>
            <ul className="mt-2 space-y-2">
              {ep.learns.map((l) => (
                <li key={l} className="flex gap-2 text-white/85"><span aria-hidden className="text-emerald-300">✓</span><span>{l}</span></li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="facts" className="mt-8 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
            <h2 id="facts" className="text-base font-black text-white">For grown-ups: the real science</h2>
            <p className="mt-1 text-sm text-white/70">{ep.factNote}</p>
          </section>

          <details className="group mt-8 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 open:bg-white/[0.06]">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 font-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
              <span>Read the full transcript</span>
              <span aria-hidden className="transition group-open:rotate-180">⌄</span>
            </summary>
            <div className="px-4 pb-5 text-sm leading-relaxed text-white/80">
              {lines.map((l, i) =>
                l.type === 'scene' ? (
                  <h3 key={i} className="mt-5 text-xs font-black uppercase tracking-widest text-orange-300">{l.text}</h3>
                ) : l.type === 'choice' ? (
                  <p key={i} className="mt-3 rounded-lg bg-cyan-500/10 px-3 py-2"><strong className="text-white">{l.speaker} asks you:</strong> {l.text}</p>
                ) : l.type === 'option' ? (
                  <p key={i} className="ml-4 mt-1">{l.correct ? '✓' : '·'} {l.text}{l.correct ? ' (the answer that moves the story on)' : ''}</p>
                ) : (
                  <p key={i} className="mt-2">
                    {l.speaker === 'Narrator' ? <em>{l.text}</em> : <><strong className="text-white">{l.speaker}:</strong> {l.text}</>}
                  </p>
                ),
              )}
              <h3 className="mt-6 text-xs font-black uppercase tracking-widest text-orange-300">Quiz</h3>
              <ol className="mt-2 list-decimal space-y-2 pl-5">
                {ep.quiz.map((q) => (
                  <li key={q.q}>
                    <strong className="text-white">{q.q}</strong> Answer: {q.options[q.answer]}. {q.explain}
                  </li>
                ))}
              </ol>
            </div>
          </details>
        </div>

        <aside className="space-y-4">
          <section aria-labelledby="try" className="rounded-2xl bg-gradient-to-br from-emerald-600/30 to-teal-700/20 p-4 ring-1 ring-emerald-400/30">
            <h2 id="try" className="text-lg font-black text-white">Try it hands-on</h2>
            <p className="mt-1 text-sm text-white/75">{ep.handsOn.why}</p>
            <Link href={ep.handsOn.href} className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-emerald-500 px-4 font-black text-white hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
              {ep.handsOn.label} →
            </Link>
            <Link href={otherHandsOn.href} className="mt-2 flex min-h-11 items-center justify-center rounded-xl bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/20">
              {otherHandsOn.label}
            </Link>
          </section>

          <section aria-labelledby="next" className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
            <h2 id="next" className="text-lg font-black text-white">Up next</h2>
            <Link href={`/kids/stories/${next.slug}`} className="mt-2 block rounded-xl bg-white/5 p-3 hover:bg-white/10">
              <span className="block font-black text-orange-300">{next.title}</span>
              <span className="mt-0.5 block text-sm text-white/70">{next.logline}</span>
            </Link>
            {siblings.length > 0 && (
              <>
                <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-white/50">More for {band?.name ?? 'this age'}</h3>
                <ul className="mt-1">
                  {siblings.map((s) => (
                    <li key={s.slug}>
                      <Link href={`/kids/stories/${s.slug}`} className="flex min-h-11 items-center text-sm font-bold text-white/85 hover:text-white hover:underline">{s.title}</Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Link href="/kids/stories" className="mt-3 flex min-h-11 items-center text-sm font-bold text-orange-300 hover:underline">All {EPISODES.length} episodes →</Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
