// app/kids/careers/[maker]/page.tsx — one Maker (roadmap #34). Server
// component, indexable, one page per Maker in lib/kids/makers/makers.ts. Both
// stories are in the server HTML; the client island only adds read-aloud and
// the band-aware "Start here" marker.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MakerAvatar } from '@/components/kids/makers/MakerAvatar'
import MakerStoryClient from '@/components/kids/makers/MakerStoryClient'
import { breadcrumbJsonLD, jsonldScript } from '@/lib/seo/jsonld'
import { MAKERS, getMaker, makerFirstName } from '@/lib/kids/makers/makers'
import { getRobodexCard } from '@/lib/kids/robodex/cards'
import { CONCEPT_INFO } from '@/lib/kids/universe/mastery'
import { GAMES, WORLDS } from '@/lib/kids/universe/worlds'

export const runtime = 'nodejs'
export const dynamicParams = false

const BASE = 'https://www.r2bot.in'

export function generateStaticParams() {
  return MAKERS.map((m) => ({ maker: m.id }))
}

interface Props {
  params: Promise<{ maker: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { maker } = await params
  const m = getMaker(maker)
  if (!m) return {}
  const url = `${BASE}/kids/careers/${m.id}`
  const title = `What does ${aRole(m.role)} do? A robotics career for kids`
  const description = `${m.tagline} Meet ${m.name}, ${aRole(m.role)}, ${m.place.startsWith('A ') ? `at a${m.place.slice(1)}` : `in ${m.place}`}: a short story for young children, how they got into the job, a day at work and the skills it uses.`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, siteName: 'R2BOT', title: `${m.role} — Meet the Makers, R2BOT Kids`, description, images: [{ url: '/og-default.png', width: 1200, height: 630, alt: `${m.role}, R2BOT Kids` }] },
  }
}

/** "a Mars rover driver", "an underwater robot (ROV) pilot": keeps capitals such as Mars and ROV. */
function aRole(role: string): string {
  const r = /^[A-Z][a-z]/.test(role) && !/^Mars\b/.test(role) ? role[0].toLowerCase() + role.slice(1) : role
  return `${/^[aeiou]/i.test(r) ? 'an' : 'a'} ${r}`
}

const link = 'rounded font-semibold text-amber-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export default async function MakerPage({ params }: Props) {
  const { maker } = await params
  const m = getMaker(maker)
  if (!m) notFound()
  const first = makerFirstName(m)
  const world = WORLDS.find((w) => w.id === m.world)
  const game = GAMES.find((g) => g.id === m.tryGame)
  const robots = m.robots.map(getRobodexCard).filter((c): c is NonNullable<typeof c> => !!c)
  const i = MAKERS.findIndex((x) => x.id === m.id)
  const next = MAKERS[(i + 1) % MAKERS.length]

  const crumbs = breadcrumbJsonLD([
    { name: 'R2BOT Kids', path: '/kids' },
    { name: 'Robotics careers', path: '/kids/careers' },
    { name: m.role, path: `/kids/careers/${m.id}` },
  ])
  const occupationLd = {
    '@context': 'https://schema.org',
    '@type': 'Occupation',
    name: m.role,
    description: m.tagline,
    skills: m.skills.map((s) => CONCEPT_INFO[s].name).join(', '),
    url: `${BASE}/kids/careers/${m.id}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(occupationLd) }} />
      <div className="mx-auto w-full max-w-4xl px-3 pb-24 pt-4 sm:px-5">
        <nav aria-label="Breadcrumb" className="text-[15px] text-[#A7B0C0]">
          <Link href="/kids/careers" className="inline-flex min-h-[44px] items-center rounded-lg hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            ← Meet the Makers
          </Link>
        </nav>
        <header className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-center">
          <MakerAvatar look={m.look} size={112} label={`Portrait of ${m.name}`} />
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">
              {m.continent} · {m.place}
            </p>
            <h1 className="mt-1 font-display text-[32px] font-bold leading-tight text-[#EEF2F8] sm:text-[44px]">{m.role}</h1>
            <p className="mt-1 text-lg text-[#A7B0C0]">
              {m.name}
              {m.from ? `, from ${m.from}` : ''}. {m.tagline}
            </p>
          </div>
        </header>

        <div className="mt-5 flex flex-wrap gap-2">
          {game && (
            <Link
              href={`/kids/play/${game.id}`}
              className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              <span aria-hidden>{game.emoji}</span> Try my job: {game.name}
            </Link>
          )}
          {world && (
            <Link
              href={`/kids/worlds/${world.id}`}
              className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl border border-white/[0.16] px-5 font-bold text-[#EEF2F8] hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              <span aria-hidden>{world.emoji}</span> Visit {world.name}
            </Link>
          )}
        </div>

        <div className="mt-6">
          <MakerStoryClient makerId={m.id} firstName={first} story={m.story} journey={m.journey} day={m.day} routes={m.routes} advice={m.advice} />
        </div>

        <section aria-labelledby="maker-skills-h" className="mt-8">
          <h2 id="maker-skills-h" className="font-display text-2xl font-bold text-[#EEF2F8]">
            Skills {first} uses most
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {m.skills.map((s) => (
              <li key={s} className="rounded-2xl border border-white/[0.08] bg-[#111C32] p-3">
                <p className="font-bold text-[#EEF2F8]">
                  <span aria-hidden>{CONCEPT_INFO[s].icon}</span> {CONCEPT_INFO[s].name}
                </p>
                <p className="text-[15px] text-[#A7B0C0]">{CONCEPT_INFO[s].kid}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[16px] text-[#A7B0C0]">
            See which of these you already have in your{' '}
            <Link href="/kids/careers" className={link}>
              Career Constellation
            </Link>{' '}
            or practise them in the{' '}
            <Link href="/kids/galaxy/concepts" className={link}>
              Skill Galaxy
            </Link>
            .
          </p>
        </section>

        {robots.length > 0 && (
          <section aria-labelledby="maker-robots-h" className="mt-8">
            <h2 id="maker-robots-h" className="font-display text-2xl font-bold text-[#EEF2F8]">
              Robots {first} works with
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {robots.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/kids/robodex#card-${r.id}`}
                    className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#111C32] p-3 hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                  >
                    <span className="text-3xl" aria-hidden>
                      {r.emoji}
                    </span>
                    <span>
                      <span className="block font-bold text-[#EEF2F8]">{r.name}</span>
                      <span className="block text-[14px] text-[#A7B0C0]">{r.front}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[15px] text-[#6E7888]">Each one is a card in the Robodex. Play in {world?.name ?? 'the Worlds'} to discover it.</p>
          </section>
        )}

        <p className="mt-10 text-[15px] text-[#6E7888]">
          {m.name} is an original character created for R2BOT Kids. The job, the robots and the routes into the work are real.
        </p>
        <nav aria-label="More makers" className="mt-4">
          <Link
            href={`/kids/careers/${next.id}`}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-white/[0.16] px-4 font-bold text-[#EEF2F8] hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            Next maker: {next.role} →
          </Link>
        </nav>
      </div>
    </>
  )
}
