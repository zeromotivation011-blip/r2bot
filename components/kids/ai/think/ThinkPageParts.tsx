// components/kids/ai/think/ThinkPageParts.tsx
// Server-rendered pieces shared by the AI Academy pages (/kids/ai and the
// three How Robots Think labs): the canonical base URL, the JSON-LD builder
// and the page header. No client code here.

import Link from 'next/link'

export const KIDS_BASE =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

export interface LabLd {
  name: string
  description: string
  url: string
  teaches: string[]
  crumb: string
}

/** LearningResource + BreadcrumbList for one lab page. */
export function labJsonLd(l: LabLd) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LearningResource',
        name: l.name,
        description: l.description,
        url: l.url,
        learningResourceType: 'Interactive simulation',
        educationalLevel: 'Ages 5–17',
        audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
        teaches: l.teaches,
        isAccessibleForFree: true,
        inLanguage: 'en',
        isPartOf: { '@type': 'CollectionPage', name: 'R2BOT Kids AI Academy', url: `${KIDS_BASE}/kids/ai` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'R2BOT Kids', item: `${KIDS_BASE}/kids` },
          { '@type': 'ListItem', position: 2, name: 'AI Academy', item: `${KIDS_BASE}/kids/ai` },
          { '@type': 'ListItem', position: 3, name: l.crumb, item: l.url },
        ],
      },
    ],
  }
}

export function LabHeader({ title, lead }: { title: string; lead: string }) {
  return (
    <header className="mx-auto max-w-6xl px-4 pb-4 pt-3">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center text-sm font-bold uppercase tracking-wider text-amber-300">
        <Link href="/kids" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
          R2BOT Kids
        </Link>
        <span aria-hidden className="mx-1.5 text-slate-500">
          /
        </span>
        <Link href="/kids/ai" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
          AI Academy
        </Link>
      </nav>
      <h1 className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-[17px] text-slate-200">{lead}</p>
    </header>
  )
}

export function MoreLabs({ current }: { current: 'neural' | 'learn' | 'sensors' }) {
  const labs = [
    { id: 'neural', href: '/kids/ai/neural', name: 'Neural Playground', line: 'Train a tiny brain on your own dots.' },
    { id: 'learn', href: '/kids/ai/learn', name: 'Learning Robot', line: 'A robot learns by trial and error.' },
    { id: 'sensors', href: '/kids/ai/sensors', name: 'Robot Senses', line: 'See a room the way a robot does.' },
    { id: 'vision', href: '/kids/ai/vision', name: 'Vision Lab', line: 'Teach your robot to recognise things.' },
  ].filter((l) => l.id !== current)
  return (
    <nav aria-label="More AI labs" className="mx-auto max-w-3xl px-4 pb-24">
      <h2 className="font-display text-xl font-bold text-white">More AI labs</h2>
      <ul className="mt-2 grid gap-2 sm:grid-cols-3">
        {labs.map((l) => (
          <li key={l.id}>
            <Link
              href={l.href}
              className="block min-h-12 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3 transition active:scale-[.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              <span className="block font-display font-bold text-white">{l.name}</span>
              <span className="block text-sm text-slate-300">{l.line}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
