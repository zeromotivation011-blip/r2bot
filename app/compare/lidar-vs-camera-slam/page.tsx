// app/compare/[slug] is deliberately NOT a dynamic route yet: one comparison
// exists, and a static folder keeps the URL honest until there are several.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StaticPage } from '@/components/StaticPage';
import { getComparison } from '@/lib/compare';
import { jsonldScript } from '@/lib/seo/jsonld';
import { authorRef } from '@/lib/author';
import InlineSignup from '@/components/InlineSignup';

export const revalidate = 86400;
const BASE = 'https://www.r2bot.in';
const SLUG = 'lidar-vs-camera-slam';

export const metadata: Metadata = {
  title: 'Lidar SLAM vs Camera (Visual) SLAM — Which Should Your Robot Use?',
  description:
    'Lidar vs visual SLAM compared on 12 aspects: lighting, cost, weight, compute, loop closure, scale, glass, open-source stacks. When to choose each, with sources.',
  alternates: { canonical: `${BASE}/compare/${SLUG}` },
  openGraph: { type: 'article', url: `${BASE}/compare/${SLUG}`, siteName: 'R2BOT', title: 'Lidar SLAM vs visual SLAM', description: 'Twelve aspects, one answer, with sources.' },
};

const VERDICT_STYLE: Record<'a' | 'b' | 'tie', string> = {
  a: 'bg-amber-500/15 text-amber-200',
  b: 'bg-sky-500/15 text-sky-200',
  tie: 'bg-white/10 text-gray-300',
};

export default function LidarVsCameraPage() {
  const c = getComparison(SLUG);
  if (!c) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: c.title,
    description: metadata.description,
    url: `${BASE}/compare/${c.slug}`,
    mainEntityOfPage: `${BASE}/compare/${c.slug}`,
    dateModified: `${c.updated}T00:00:00.000Z`,
    author: authorRef(),
    publisher: { '@type': 'Organization', name: 'R2BOT', url: BASE },
    about: [{ '@type': 'Thing', name: c.a }, { '@type': 'Thing', name: c.b }],
    citation: c.sources.map((s) => s.url),
  };

  return (
    <StaticPage eyebrow="Compare" title={c.title} lede={c.question} maxWidth={960}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />

      <div className="not-prose rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300">The short answer</p>
        <p className="mt-2 text-lg leading-relaxed text-white">{c.oneLineAnswer}</p>
      </div>

      <p className="mt-6 text-gray-300">{c.summary}</p>

      <div className="not-prose mt-8 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Aspect</th>
              <th className="px-4 py-3 font-semibold text-amber-200">{c.a}</th>
              <th className="px-4 py-3 font-semibold text-sky-200">{c.b}</th>
              <th className="px-4 py-3 font-semibold">Edge</th>
            </tr>
          </thead>
          <tbody>
            {c.rows.map((r) => (
              <tr key={r.aspect} className="border-t border-white/10 align-top">
                <th scope="row" className="px-4 py-3 text-left font-semibold text-white">{r.aspect}</th>
                <td className="px-4 py-3 text-gray-300">{r.a}</td>
                <td className="px-4 py-3 text-gray-300">{r.b}</td>
                <td className="px-4 py-3">
                  {r.verdict && (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${VERDICT_STYLE[r.verdict]}`}>
                      {r.verdict === 'a' ? c.a.split(' ')[0] : r.verdict === 'b' ? c.b.split(' ')[0] : 'Even'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="not-prose mt-8 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-amber-400/30 bg-white/[0.03] p-5">
          <h2 className="text-lg font-black text-amber-200">Choose {c.a.toLowerCase()} when…</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-300">{c.chooseA.map((x) => <li key={x} className="flex gap-2"><span aria-hidden>→</span><span>{x}</span></li>)}</ul>
        </section>
        <section className="rounded-2xl border border-sky-400/30 bg-white/[0.03] p-5">
          <h2 className="text-lg font-black text-sky-200">Choose {c.b.toLowerCase()} when…</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-300">{c.chooseB.map((x) => <li key={x} className="flex gap-2"><span aria-hidden>→</span><span>{x}</span></li>)}</ul>
        </section>
      </div>

      <section className="not-prose mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-lg font-black text-white">What most real robots do</h2>
        <p className="mt-2 text-sm text-gray-300">
          Robot vacuums show the split at consumer scale: Roborock, Dreame and most Xiaomi models carry a small spinning lidar in the turret; iRobot&apos;s Roomba j-series uses a front camera instead. Above that price point the argument mostly disappears — Spot, warehouse AMRs and self-driving cars run lidar <em>and</em> cameras <em>and</em> an IMU through a <Link href="/atlas/concept/sensor-fusion" className="text-amber-300 underline">sensor-fusion</Link> stack, because each sensor covers the other&apos;s blind spot.
        </p>
      </section>

      <InlineSignup />

      <section className="not-prose mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Read next</h2>
          <ul className="mt-2 space-y-1 text-sm">{c.related.map((r) => <li key={r.href}><Link href={r.href} className="text-amber-300 hover:underline">{r.label}</Link></li>)}</ul>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Sources</h2>
          <ol className="mt-2 space-y-1 text-sm text-gray-400">{c.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline">{s.name}</a></li>)}</ol>
          <p className="mt-3 text-xs text-gray-500">Updated {c.updated} · <Link href="/compare" className="underline">All comparisons</Link></p>
        </div>
      </section>
    </StaticPage>
  );
}
