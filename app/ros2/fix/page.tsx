// app/ros2/fix — hub for every ROS 2 error fix (data: lib/ros2-fixes.ts).
import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPage } from '@/components/StaticPage';
import { ROS2_FIXES } from '@/lib/ros2-fixes';
import { jsonldScript } from '@/lib/seo/jsonld';

export const revalidate = 86400;
const BASE = 'https://www.r2bot.in';

export const metadata: Metadata = {
  title: 'ROS 2 Errors and Fixes — Checked Against the Docs',
  description:
    'Fixes for the ROS 2 errors beginners hit first, from “ros2: command not found” to nodes that cannot see each other. Likeliest cause first, all sourced.',
  alternates: { canonical: `${BASE}/ros2/fix` },
};

export default function Ros2FixHub() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'ROS 2 errors and fixes',
    itemListElement: ROS2_FIXES.map((f, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE}/ros2/fix/${f.slug}`,
      name: f.title,
    })),
  };

  return (
    <StaticPage
      eyebrow="ROS 2 · Fixes"
      title="ROS 2 errors, fixed"
      lede="The error you searched for, what it means, and how to fix it. Causes are listed most likely first, every fix comes with a check you run before changing anything, and every command is checked against the official ROS 2 documentation."
      maxWidth={900}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />
      <section className="not-prose grid gap-4 sm:grid-cols-2">
        {ROS2_FIXES.map((f) => (
          <Link
            key={f.slug}
            href={`/ros2/fix/${f.slug}`}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-amber-400/40"
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300">Fix</p>
            <h2 className="mt-1 text-lg font-black text-white">{f.title}</h2>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-xs text-red-200">
              <code>{f.errorText.split('\n').slice(0, 2).join('\n')}</code>
            </pre>
            <p className="mt-3 text-xs text-gray-500">
              {f.causes.length} causes, most likely first · updated {f.updated}
            </p>
          </Link>
        ))}
      </section>

      <h2>Before you search for an error</h2>
      <p>
        Two commands answer a surprising share of ROS 2 questions. <code>printenv | grep -i ROS</code> shows which
        distro, domain and discovery settings this terminal is actually using, and <code>ros2 doctor --report</code>{' '}
        checks your platform, network and middleware and prints what it found. Run both and compare them across
        terminals or machines before changing any code.
      </p>
      <p className="not-prose mt-6 text-sm text-gray-400">
        Looking for commands rather than errors? See the{' '}
        <Link href="/learn/ros2-cheatsheet" className="inline-flex min-h-[44px] items-center text-amber-300 underline">ROS 2 cheatsheet</Link>, or{' '}
        <Link href="/ros2" className="inline-flex min-h-[44px] items-center text-amber-300 underline">run ROS 2 in your browser</Link> with nothing to install.
      </p>
    </StaticPage>
  );
}
