// app/compare/page.tsx — hub for every side-by-side comparison on the site.
import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPage } from '@/components/StaticPage';
import { COMPARISONS, BLOG_COMPARISONS } from '@/lib/compare';

export const revalidate = 86400;
const BASE = 'https://www.r2bot.in';

export const metadata: Metadata = {
  title: 'Robotics Comparisons — X vs Y, Decided With Evidence',
  description:
    'Lidar vs camera SLAM, Arduino vs ESP32 vs Raspberry Pi, DC vs servo vs stepper motors and more: side-by-side tables, when to choose which, and sources.',
  alternates: { canonical: `${BASE}/compare` },
};

export default function ComparePage() {
  return (
    <StaticPage
      eyebrow="Reference"
      title="Compare"
      lede="Two options, one table, a clear answer. Every comparison states what each side is better at and when you should pick it, with sources."
      maxWidth={900}
    >
      <section className="not-prose grid gap-4 sm:grid-cols-2">
        {COMPARISONS.map((c) => (
          <Link key={c.slug} href={`/compare/${c.slug}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-amber-400/40">
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300">Side by side</p>
            <h2 className="mt-1 text-lg font-black text-white">{c.title}</h2>
            <p className="mt-2 text-sm text-gray-400">{c.question}</p>
            <p className="mt-3 text-xs text-gray-500">{c.rows.length} aspects compared · updated {c.updated}</p>
          </Link>
        ))}
        {BLOG_COMPARISONS.map((b) => (
          <Link key={b.href} href={b.href} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-amber-400/40">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Guide</p>
            <h2 className="mt-1 text-lg font-black text-white">{b.title}</h2>
          </Link>
        ))}
      </section>
      <p className="not-prose mt-10 text-sm text-gray-500">
        Want a comparison that is not here? <a className="underline" href="mailto:hello@r2bot.in">Ask for it</a> — the most-requested pair gets written next.
      </p>
    </StaticPage>
  );
}
