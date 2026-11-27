// components/kids/classroom/LessonPlanPanel.tsx
// The suggested six-week plan for a band. Native <details>, no hooks, so it
// renders on the server (schools page) and in the teacher dashboard alike.
// Each week links the exact episode and missions it names.

import Link from 'next/link'
import { getBand, type BandId } from '@/lib/kids/bands'
import { CLASS_PLANS, LESSON_SHAPE, PLAN_LINKS, episodeHref, missionHref } from '@/lib/kids/classroom-plan'

const CHIP = 'inline-flex min-h-[44px] items-center rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 text-sm font-semibold text-amber-100 underline-offset-2 hover:bg-amber-500/20 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400'

export function LessonPlanPanel({ band, headingLevel = 2 }: { band: BandId; headingLevel?: 2 | 3 }) {
  const weeks = CLASS_PLANS[band]
  const b = getBand(band)
  const H = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <section aria-labelledby={`plan-${band}`} className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 sm:p-6">
      <H id={`plan-${band}`} className="text-lg font-extrabold text-white">
        Six-week plan{b ? ` · ${b.emoji} ${b.name} (${b.grades.split(' · ')[0]})` : ''}
      </H>
      <p className="mt-1 text-sm text-slate-400">
        One 40-minute lesson a week:{' '}
        {LESSON_SHAPE.map((s, i) => (
          <span key={s.label}>{i > 0 ? ' → ' : ''}{s.minutes} min {s.label.toLowerCase()}</span>
        ))}
        .
      </p>
      <div className="mt-4 space-y-2">
        {weeks.map((w) => (
          <details key={w.week} className="group rounded-2xl border border-white/10 bg-black/30 open:bg-black/40" open={w.week === 1}>
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-2">
              <span>
                <span className="mr-2 font-mono text-xs font-bold text-amber-300">WEEK {w.week}</span>
                <span className="font-bold text-white">{w.concept}</span>
              </span>
              <span aria-hidden className="text-slate-400 transition group-open:rotate-180">▾</span>
            </summary>
            <div className="space-y-3 px-4 pb-4 text-sm text-slate-200">
              <p className="text-slate-300"><strong className="text-white">By the end:</strong> {w.goal}</p>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-amber-200">🎬 <Link href={PLAN_LINKS.story} className="inline-flex min-h-[44px] items-center underline-offset-2 hover:underline">Story Theatre</Link></dt>
                  <dd className="mt-0.5">
                    <Link href={episodeHref(w.episode.slug)} className={CHIP}>▶ {w.episode.title}</Link>
                    <p className="mt-1.5">{w.story}</p>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-amber-200">✋ Unplugged (no screens)</dt>
                  <dd className="mt-0.5">{w.unplugged}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-amber-200">🔧 <Link href={PLAN_LINKS.workshop} className="inline-flex min-h-[44px] items-center underline-offset-2 hover:underline">Workshop</Link></dt>
                  <dd className="mt-0.5">{w.workshop}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-amber-200">🧩 <Link href={PLAN_LINKS.codeLab} className="inline-flex min-h-[44px] items-center underline-offset-2 hover:underline">Code Lab</Link></dt>
                  <dd className="mt-0.5">
                    {w.missions.length > 0 && (
                      <ul className="mb-1.5 flex flex-wrap gap-2" aria-label={`Code Lab missions for week ${w.week}`}>
                        {w.missions.map((m) => (
                          <li key={m.id}><Link href={missionHref(m.id)} className={CHIP}>{m.title}</Link></li>
                        ))}
                      </ul>
                    )}
                    <p>{w.codeLab}</p>
                  </dd>
                </div>
              </dl>
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
