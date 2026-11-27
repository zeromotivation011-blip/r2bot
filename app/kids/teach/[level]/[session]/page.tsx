// app/kids/teach/[level]/[session]/page.tsx — a printable teacher's lesson plan
// for one R2BOT Kids course session (server component, SSG).
//
// Everything is generated from the curriculum (teacherNotes, parent note, the
// session's episode/build/code/challenge/check), so it can never drift from
// what children see. Indexable: teachers search for "robotics lesson plan for
// 5 year olds", and this is real, complete server HTML. All four levels
// (lib/kids/teach/all-guides.ts). The child's session page
// (/kids/course/<level>/N) stays noindex; the two link to each other.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { jsonldScript } from '@/lib/seo/jsonld'
import { authorRef } from '@/lib/author'
import { levelByNumber } from '@/lib/kids/curriculum/levels'
import { allGuideParams, anyGuideFor, isL34Guide, isLevel2Guide, type AnyTeacherGuide } from '@/lib/kids/teach/all-guides'
import { TRAINING_TOTAL_MINUTES } from '@/lib/kids/teach/training'
import { ShareToClassroom } from '@/components/kids/teach/ShareToClassroom'
import { GuideActionsClient } from '@/components/kids/teach/GuideActionsClient'
import { PresentButton } from '@/components/kids/present/PresentButton'

export const runtime = 'nodejs'
export const dynamicParams = false

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

type Params = { params: Promise<{ level: string; session: string }> }

export function generateStaticParams() {
  return allGuideParams()
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await params
  const g = anyGuideFor(p.level, p.session)
  if (!g) return {}
  const lvl = levelByNumber(g.level)
  const title = `Session ${g.number}: ${g.title} — Robotics Lesson Plan, Ages ${lvl.ages}`
  const description = `A ready-to-teach ${g.durationMin}-minute robotics lesson plan (Level ${g.level}, ages ${lvl.ages}): ${g.objective} Unplugged warm-up, minute-by-minute timing, discussion questions, misconceptions, differentiation and a note for families. Free, printable PDF.`
  const url = `${BASE}${g.guideHref}`
  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'R2BOT',
      title: `Teacher guide — Session ${g.number}: ${g.title}`,
      description: g.objective,
      images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids teacher guide' }],
    },
  }
}

function jsonLd(g: AnyTeacherGuide) {
  const url = `${BASE}${g.guideHref}`
  const lvl = levelByNumber(g.level)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LearningResource',
        '@id': `${url}#guide`,
        name: `Session ${g.number}: ${g.title} — teacher guide`,
        description: g.objective,
        url,
        inLanguage: 'en',
        learningResourceType: 'Lesson plan',
        educationalLevel: `Ages ${lvl.ages} (${lvl.name})`,
        audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
        timeRequired: `PT${g.durationMin}M`,
        teaches: g.objectives.map((o) => o.text),
        keywords: ['robotics lesson plan', 'computing for young children', ...g.concepts].join(', '),
        isAccessibleForFree: true,
        author: authorRef(),
        publisher: { '@type': 'Organization', name: 'R2BOT', url: BASE },
        isPartOf: { '@type': 'Course', name: `R2BOT Kids Level ${g.level} — ${lvl.name}`, url: `${BASE}/kids/course/${g.level}` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'R2BOT Kids', item: `${BASE}/kids` },
          { '@type': 'ListItem', position: 2, name: 'Teacher guides', item: `${BASE}/kids/teach` },
          { '@type': 'ListItem', position: 3, name: `Session ${g.number}: ${g.title}`, item: url },
        ],
      },
    ],
  }
}

const card = 'rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6'
const h2 = 'font-display text-xl font-bold text-white'

export default async function TeacherGuidePage({ params }: Params) {
  const p = await params
  const g = anyGuideFor(p.level, p.session)
  if (!g) notFound()
  const lvl = levelByNumber(g.level)
  const sessionCount = lvl.sessions.length
  const total = g.timing.reduce((a, t) => a + t.minutes, 0)

  return (
    <article className="teach-doc mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd(g)) }} />

      <nav aria-label="Breadcrumb" className="teach-no-print text-sm text-slate-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/kids/teach" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">Teacher guides</Link></li>
          <li aria-hidden>/</li>
          <li>Level {g.level}</li>
          <li aria-hidden>/</li>
          <li aria-current="page">Session {g.number}</li>
        </ol>
      </nav>

      <header className="mt-3">
        <p className="teach-accent text-sm font-bold uppercase tracking-wider text-amber-300">
          Teacher guide · Level {g.level} · Session {g.number} of {sessionCount}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
          {g.title}
          <span className="block text-lg font-semibold text-slate-300 sm:text-2xl">A {g.durationMin}-minute robotics lesson plan for ages {lvl.ages}</span>
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-200">{g.objective}</p>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm" aria-label="At a glance">
          <li className="rounded-full bg-amber-500/15 px-3 py-1 font-semibold text-amber-200">⏱ {g.durationMin} minutes</li>
          <li className="rounded-full bg-white/[0.06] px-3 py-1 text-slate-200">{g.kind === 'project' ? 'Project session' : 'Lesson'}</li>
          {g.act && <li className="rounded-full bg-white/[0.06] px-3 py-1 text-slate-200">Act: {g.act.title} (sessions {g.act.sessions[0]}–{g.act.sessions[1]})</li>}
          <li className="rounded-full bg-white/[0.06] px-3 py-1 text-slate-200">{lvl.name} · ages {lvl.ages}</li>
        </ul>
        <div className="teach-no-print mt-6 flex flex-wrap items-center gap-3">
          <GuideActionsClient guide={g} />
          <ShareToClassroom path={g.sessionHref} title={`Robotics: Session ${g.number} — ${g.title}`} />
          <PresentButton source={{ kind: 'session', level: g.level, number: g.number, unplugged: false }} gate={false} />
          {g.level === 1 && (
            <Link href={`/kids/teach/unplugged/${g.number}`} className="inline-flex min-h-[48px] items-center rounded-xl px-3 font-bold text-amber-300 hover:underline">No devices? Unplugged version →</Link>
          )}
          <Link href={g.sessionHref} className="inline-flex min-h-[48px] items-center rounded-xl px-3 font-bold text-amber-300 hover:underline">Open the session as a child sees it →</Link>
        </div>
      </header>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <section className={card} aria-labelledby="obj-h">
          <h2 id="obj-h" className={h2}>Learning objectives</h2>
          <ul className="mt-3 space-y-3">
            {g.objectives.map((o) => (
              <li key={o.text} className="text-[15px] leading-relaxed text-slate-200">
                {o.text}
                {o.discussionOnly && <span className="ml-1 text-xs font-semibold text-slate-400">(through discussion)</span>}
                <span className="mt-0.5 block text-sm italic text-amber-200/90">Child’s words: “{o.kidText}”</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-400">Concepts: {g.concepts.join(' · ')}</p>
        </section>

        <section className={card} aria-labelledby="mat-h">
          <h2 id="mat-h" className={h2}>Materials</h2>
          <ul className="mt-3 space-y-2">
            {g.materials.map((m) => (
              <li key={m} className="flex gap-2 text-[15px] text-slate-200"><span aria-hidden className="text-amber-400">▪</span>{m}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className={`${card} mt-5`} aria-labelledby="plan-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="plan-h" className={h2}>The {total}-minute plan</h2>
          <p className="text-sm text-slate-400">Every minute, including handing out devices.</p>
        </div>
        <ol className="mt-4 space-y-2">
          {g.timing.map((t, i) => (
            <li key={i} className="grid grid-cols-[4.5rem_1fr] items-start gap-3 rounded-2xl bg-black/20 p-3">
              <span className="rounded-xl bg-amber-500/15 py-1.5 text-center font-display text-lg font-bold text-amber-300">
                {t.minutes}<span className="text-xs font-semibold"> min</span>
              </span>
              <span className="text-[15px] leading-relaxed text-slate-200">{t.activity}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${card} mt-5`} aria-labelledby="warm-h">
        <p className="teach-accent text-xs font-bold uppercase tracking-wider text-amber-300">Unplugged warm-up · {g.warmup.minutes} min</p>
        <h2 id="warm-h" className={`${h2} mt-1`}>{g.warmup.title}</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-slate-200">
          {g.warmup.steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
        <p className="mt-3 text-sm text-slate-400">Materials: {g.warmup.materials.join(', ')}</p>
      </section>

      <section className={`${card} mt-5`} aria-labelledby="do-h">
        <h2 id="do-h" className={h2}>What children do on screen</h2>
        <ol className="mt-4 space-y-3">
          {g.activities.map((a) => (
            <li key={a.step + a.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="teach-accent text-xs font-bold uppercase tracking-wider text-amber-300">{a.step}</p>
              <p className="mt-0.5 font-display text-lg font-bold text-white">{a.title}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-300">{a.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {isLevel2Guide(g) && (
        <section className={`${card} mt-5`} aria-labelledby="practise-h">
          <h2 id="practise-h" className={h2}>Practise and challenge, as played today</h2>
          <dl className="mt-3 space-y-3 text-[15px] leading-relaxed">
            <div>
              <dt className="font-bold text-amber-200">
                Practice arena: <Link href={g.practise.arena.href} className="text-amber-300 hover:underline">{g.practise.arena.title}</Link>
              </dt>
              <dd className="text-slate-200">{g.practise.arena.task} {g.practise.arena.why}</dd>
            </div>
            <div>
              <dt className="font-bold text-amber-200">
                Challenge: <Link href={g.practise.game.href} className="text-amber-300 hover:underline">{g.practise.game.title}</Link>
              </dt>
              <dd className="text-slate-200">{g.practise.game.goal}</dd>
            </div>
          </dl>
        </section>
      )}

      {isL34Guide(g) && (
        <section className={`${card} mt-5`} aria-labelledby="play-h">
          <h2 id="play-h" className={h2}>The challenge, as played today</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-200">
            {g.play.href ? <Link href={g.play.href} className="font-bold text-amber-300 hover:underline">{g.play.title}</Link> : <span className="font-bold">{g.play.title}</span>}
            {g.play.detail ? ` — ${g.play.detail}` : ''}
          </p>
          {g.lookFor.length > 0 && (
            <>
              <h3 className="mt-4 font-bold text-emerald-300">What to look for</h3>
              <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-slate-200">
                {g.lookFor.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </>
          )}
        </section>
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className={card} aria-labelledby="disc-h">
          <h2 id="disc-h" className={h2}>Discussion questions</h2>
          <ul className="mt-3 space-y-2.5">
            {g.discussion.map((d) => <li key={d} className="text-[15px] leading-relaxed text-slate-200">“{d}”</li>)}
          </ul>
        </section>
        <section className={card} aria-labelledby="mis-h">
          <h2 id="mis-h" className={h2}>Misconceptions to listen for</h2>
          <dl className="mt-3 space-y-3">
            {g.misconceptions.map((m) => (
              <div key={m.idea}>
                <dt className="teach-accent font-semibold text-amber-200">“{m.idea}”</dt>
                <dd className="mt-0.5 text-[15px] leading-relaxed text-slate-300">{m.correction}</dd>
                {isL34Guide(g) && g.reteach.find((r) => r.idea === m.idea)?.reteach && (
                  <dd className="mt-1 text-[15px] leading-relaxed text-cyan-200">5-minute reteach: {g.reteach.find((r) => r.idea === m.idea)?.reteach}</dd>
                )}
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className={`${card} mt-5`} aria-labelledby="diff-h">
        <h2 id="diff-h" className={h2}>Differentiation</h2>
        <div className="mt-3 grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="font-bold text-emerald-300">Ready for more</h3>
            <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-slate-200">
              {g.differentiation.faster.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-cyan-300">Needs more time</h3>
            <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-slate-200">
              {g.differentiation.slower.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {g.notes.length > 0 && (
        <section className={`${card} mt-5`} aria-labelledby="notes-h">
          <h2 id="notes-h" className={h2}>Notes for the classroom</h2>
          <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-slate-300">
            {g.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      )}

      {g.extensions.length > 0 && (
        <section className="mt-8" aria-labelledby="ext-h">
          <h2 id="ext-h" className={h2}>Extend in the Skill Galaxy</h2>
          <p className="mt-1 text-sm text-slate-400">Short activities on the same ideas — for early finishers, homework, or a second lesson.</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {g.extensions.map((e) => (
              <li key={e.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400"><span aria-hidden>{e.trackIcon} </span>{e.track}</p>
                  <Link href={e.href} className="mt-1 block font-display text-lg font-bold text-white hover:text-amber-300">{e.title}</Link>
                </div>
                <ShareToClassroom path={e.href} title={e.title} variant="chip" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`${card} mt-8 border-amber-400/30`} aria-labelledby="home-h">
        <h2 id="home-h" className={h2}>Send home to families</h2>
        <dl className="mt-3 space-y-3 text-[15px] leading-relaxed">
          <div><dt className="font-bold text-amber-200">Today</dt><dd className="text-slate-200">{g.parent.today}</dd></div>
          <div><dt className="font-bold text-amber-200">Try at home (5 minutes)</dt><dd className="text-slate-200">{g.parent.tryAtHome}</dd></div>
          <div><dt className="font-bold text-amber-200">Ask your child</dt><dd className="text-slate-200">“{g.parent.askYourChild}”</dd></div>
        </dl>
      </section>

      <nav aria-label="Other sessions" className="teach-no-print mt-10 grid gap-3 sm:grid-cols-2">
        {g.prev ? (
          <Link href={`/kids/teach/${g.level}/${g.prev.number}`} className="flex min-h-[64px] flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:border-amber-400/50">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">← Session {g.prev.number}</span>
            <span className="font-bold text-white">{g.prev.title}</span>
          </Link>
        ) : <span />}
        {g.next && (
          <Link href={`/kids/teach/${g.level}/${g.next.number}`} className="flex min-h-[64px] flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-right hover:border-amber-400/50">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Session {g.next.number} →</span>
            <span className="font-bold text-white">{g.next.title}</span>
          </Link>
        )}
      </nav>

      <aside className="teach-no-print mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-white/10 bg-white/[0.03] p-5">
        <p className="text-[15px] text-slate-300">
          New to R2BOT Kids? The <Link href="/kids/teach/training" className="font-semibold text-amber-300 hover:underline">{TRAINING_TOTAL_MINUTES}-minute teacher training</Link> covers everything, with a certificate.
        </p>
        <Link href="/kids/classroom" className="inline-flex min-h-[48px] items-center rounded-xl bg-amber-500 px-5 font-bold text-[#1A1103] hover:bg-amber-400">Assign it to your class</Link>
      </aside>
    </article>
  )
}
