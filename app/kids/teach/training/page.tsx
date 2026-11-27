// app/kids/teach/training/page.tsx — R2BOT Kids teacher training (server
// component, SSG, indexable): six short self-paced modules with a quick check
// each and a completion certificate (PDF, made in the browser).

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { authorRef } from '@/lib/author'
import { TRAINING_MODULES, TRAINING_TOTAL_MINUTES } from '@/lib/kids/teach/training'
import {
  TrainingCertificateClient,
  TrainingCheckClient,
  TrainingProgressClient,
} from '@/components/kids/teach/TrainingClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/teach/training`

const TITLE = 'Teaching Robotics to Young Children: Free Teacher Training with Certificate'
const DESCRIPTION = `A free, self-paced training for teachers using R2BOT Kids: ${TRAINING_MODULES.length} short modules (about ${TRAINING_TOTAL_MINUTES} minutes) on running a 40-minute robotics class, the physics lab, assigning and tracking work, supporting every child, and safety and privacy — with a certificate.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'R2BOT Kids teacher training',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids teacher training' }],
  },
}

export default function TrainingPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': `${PAGE_URL}#course`,
    name: 'R2BOT Kids Teacher Training',
    description: DESCRIPTION,
    url: PAGE_URL,
    inLanguage: 'en',
    isAccessibleForFree: true,
    audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
    timeRequired: `PT${TRAINING_TOTAL_MINUTES}M`,
    provider: { '@type': 'Organization', name: 'R2BOT', url: BASE },
    author: authorRef(),
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: `PT${TRAINING_TOTAL_MINUTES}M` },
    syllabusSections: TRAINING_MODULES.map((m) => ({ '@type': 'Syllabus', name: m.title, description: m.summary, timeRequired: `PT${m.minutes}M` })),
  }

  return (
    <div className="teach-doc mx-auto w-full max-w-4xl px-4 pb-24 pt-8 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />

      <nav aria-label="Breadcrumb" className="teach-no-print text-sm">
        <Link href="/kids/teach" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">← Teacher guides</Link>
      </nav>

      <header className="mt-2">
        <p className="teach-accent text-sm font-bold uppercase tracking-wider text-amber-300">R2BOT Kids · Teacher training</p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-[1.08] text-white sm:text-5xl">Teach robotics with R2BOT Kids</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-200">
          {TRAINING_MODULES.length} short modules, about {TRAINING_TOTAL_MINUTES} minutes in all. Read at your own pace, try each idea in the
          product, answer one quick question per module, and download your certificate at the end. No sign-in needed: progress is kept on this device.
        </p>
      </header>

      <div className="teach-no-print sticky top-20 z-10 mt-6">
        <TrainingProgressClient />
      </div>

      {TRAINING_MODULES.map((m) => (
        <section key={m.id} id={m.id} className="mt-10 scroll-mt-40 rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-8" aria-labelledby={`${m.id}-h`}>
          <p className="teach-accent text-xs font-bold uppercase tracking-wider text-amber-300">Module {m.number} · {m.minutes} min</p>
          <h2 id={`${m.id}-h`} className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">{m.title}</h2>
          <p className="mt-2 text-[17px] leading-relaxed text-slate-300">{m.summary}</p>

          {m.sections.map((sec) => (
            <div key={sec.heading} className="mt-6">
              <h3 className="font-display text-lg font-bold text-white">{sec.heading}</h3>
              {sec.paragraphs?.map((p) => <p key={p} className="mt-2 text-[16px] leading-relaxed text-slate-200">{p}</p>)}
              {sec.bullets && (
                <ul className="mt-2 space-y-2">
                  {sec.bullets.map((b) => (
                    <li key={b} className="flex gap-2.5 text-[16px] leading-relaxed text-slate-200">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-500/[0.06] p-4">
            <p className="flex-1 text-[15px] text-slate-200"><strong className="text-cyan-200">Try it: </strong>{m.tryIt.text}</p>
            <Link href={m.tryIt.href} className="teach-no-print inline-flex min-h-[44px] items-center rounded-xl border border-cyan-300/40 px-4 text-sm font-bold text-cyan-100 hover:bg-cyan-500/15">{m.tryIt.label} →</Link>
          </div>

          <div className="teach-no-print">
            <TrainingCheckClient moduleId={m.id} check={m.check} />
          </div>
        </section>
      ))}

      <div className="teach-no-print mt-10">
        <TrainingCertificateClient />
      </div>

      <p className="mt-8 text-sm text-slate-400">
        Next: open the <Link href="/kids/teach" className="font-semibold text-amber-300 hover:underline">lesson guides</Link> or{' '}
        <Link href="/kids/classroom" className="font-semibold text-amber-300 hover:underline">set up your class</Link>.
      </p>
    </div>
  )
}
