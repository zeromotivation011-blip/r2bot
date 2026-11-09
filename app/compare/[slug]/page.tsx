// app/compare/[slug] — one structured comparison page per entry in COMPARISONS.
// Two-way and three-way comparisons share this template: a third column and a
// third "choose … when" card render only when `c` is set on the comparison.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StaticPage } from '@/components/StaticPage';
import { COMPARISONS, getComparison, type Comparison, type Verdict } from '@/lib/compare';
import { jsonldScript } from '@/lib/seo/jsonld';
import { authorRef } from '@/lib/author';
import InlineSignup from '@/components/InlineSignup';

export const revalidate = 86400;
export const dynamicParams = false;
const BASE = 'https://www.r2bot.in';

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

/** Title ≤ 60 chars, description ≤ 155 chars — trimmed at a word boundary, never mid-word. */
function clamp(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:—-]+$/, '')}…`;
}

function seoTitle(c: Comparison): string {
  const suffix = ' — Which to Choose?';
  return clamp(c.title.length + suffix.length <= 60 ? `${c.title}${suffix}` : c.title, 60);
}

function seoDescription(c: Comparison): string {
  if (c.description) return clamp(c.description, 155);
  const names = c.c ? `${c.a} vs ${c.b} vs ${c.c}` : `${c.a} vs ${c.b}`;
  return clamp(`${names} compared on ${c.rows.length} aspects: ${c.rows.slice(0, 5).map((r) => r.aspect.toLowerCase()).join(', ')}. When to choose each, with sources.`, 155);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) return { title: 'Comparison not found' };
  const url = `${BASE}/compare/${c.slug}`;
  const title = seoTitle(c);
  const description = seoDescription(c);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, siteName: 'R2BOT', title: c.title, description: c.question },
  };
}

const VERDICT_STYLE: Record<Verdict, string> = {
  a: 'bg-amber-500/15 text-amber-200',
  b: 'bg-sky-500/15 text-sky-200',
  c: 'bg-emerald-500/15 text-emerald-200',
  tie: 'bg-white/10 text-gray-300',
};

function verdictLabel(c: Comparison, v: Verdict): string {
  if (v === 'tie') return 'Even';
  const name = v === 'a' ? c.a : v === 'b' ? c.b : (c.c ?? '');
  return name.split(' ')[0];
}

function ChooseCard({ title, items, tone }: { title: string; items: string[]; tone: 'a' | 'b' | 'c' }) {
  const border = tone === 'a' ? 'border-amber-400/30' : tone === 'b' ? 'border-sky-400/30' : 'border-emerald-400/30';
  const text = tone === 'a' ? 'text-amber-200' : tone === 'b' ? 'text-sky-200' : 'text-emerald-200';
  return (
    <section className={`rounded-2xl border ${border} bg-white/[0.03] p-5`}>
      <h2 className={`text-lg font-black ${text}`}>Choose {title} when…</h2>
      <ul className="mt-3 space-y-2 text-sm text-gray-300">
        {items.map((x) => (
          <li key={x} className="flex gap-2"><span aria-hidden>→</span><span>{x}</span></li>
        ))}
      </ul>
    </section>
  );
}

export default async function ComparePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) notFound();

  const three = Boolean(c.c);
  const url = `${BASE}/compare/${c.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: c.title,
    description: seoDescription(c),
    url,
    mainEntityOfPage: url,
    dateModified: `${c.updated}T00:00:00.000Z`,
    author: authorRef(),
    publisher: { '@type': 'Organization', name: 'R2BOT', url: BASE },
    about: [{ '@type': 'Thing', name: c.a }, { '@type': 'Thing', name: c.b }, ...(c.c ? [{ '@type': 'Thing', name: c.c }] : [])],
    citation: c.sources.map((s) => s.url),
  };

  return (
    <StaticPage eyebrow="Compare" title={c.title} lede={c.question} maxWidth={three ? 1100 : 960}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />

      <div className="not-prose rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300">The short answer</p>
        <p className="mt-2 text-lg leading-relaxed text-white">{c.oneLineAnswer}</p>
      </div>

      <p className="mt-6 text-gray-300">{c.summary}</p>

      <div className="not-prose mt-8 overflow-x-auto rounded-2xl border border-white/10">
        <table className={`w-full border-collapse text-sm ${three ? 'min-w-[820px]' : 'min-w-[640px]'}`}>
          <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Aspect</th>
              <th className="px-4 py-3 font-semibold text-amber-200">{c.a}</th>
              <th className="px-4 py-3 font-semibold text-sky-200">{c.b}</th>
              {three && <th className="px-4 py-3 font-semibold text-emerald-200">{c.c}</th>}
              <th className="px-4 py-3 font-semibold">Edge</th>
            </tr>
          </thead>
          <tbody>
            {c.rows.map((r) => (
              <tr key={r.aspect} className="border-t border-white/10 align-top">
                <th scope="row" className="px-4 py-3 text-left font-semibold text-white">{r.aspect}</th>
                <td className="px-4 py-3 text-gray-300">{r.a}</td>
                <td className="px-4 py-3 text-gray-300">{r.b}</td>
                {three && <td className="px-4 py-3 text-gray-300">{r.c ?? 'not published'}</td>}
                <td className="px-4 py-3">
                  {r.verdict && (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${VERDICT_STYLE[r.verdict]}`}>
                      {verdictLabel(c, r.verdict)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`not-prose mt-8 grid gap-4 ${three ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <ChooseCard title={c.a} items={c.chooseA} tone="a" />
        <ChooseCard title={c.b} items={c.chooseB} tone="b" />
        {c.c && c.chooseC && <ChooseCard title={c.c} items={c.chooseC} tone="c" />}
      </div>

      {c.slug === 'lidar-vs-camera-slam' && (
        <section className="not-prose mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-black text-white">What most real robots do</h2>
          <p className="mt-2 text-sm text-gray-300">
            Robot vacuums show the split at consumer scale: Roborock, Dreame and most Xiaomi models carry a small spinning lidar in the turret; iRobot&apos;s Roomba j-series uses a front camera instead. Above that price point the argument mostly disappears — Spot, warehouse AMRs and self-driving cars run lidar <em>and</em> cameras <em>and</em> an IMU through a <Link href="/atlas/concept/sensor-fusion" className="text-amber-300 underline">sensor-fusion</Link> stack, because each sensor covers the other&apos;s blind spot.
          </p>
        </section>
      )}

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
