// app/glossary/page.tsx — Robotics glossary, A–Z.
//
// A flat alphabetical list of every Atlas concept with its one-line answer.
// Targets "robotics glossary" / "robotics terms", which a hub with buckets and
// a concept map does not rank for, and gives every one of the 500+ concept
// pages one more inbound internal link from a single, crawlable page.
import type { Metadata } from 'next';
import { getAllAtlasEntries, type AtlasEntry } from '@/lib/atlas';
import { StaticPage } from '@/components/StaticPage';
import { jsonldScript } from '@/lib/seo/jsonld';
import { pageUpdated } from '@/lib/content-dates';

export const revalidate = 86400;

const BASE = 'https://www.r2bot.in';

export const metadata: Metadata = {
  title: 'Robotics Glossary — 500+ Terms Explained in One Line Each',
  description:
    'Every robotics term from actuator to ZMP, defined in one plain-English sentence with a link to the full explanation. Sensors, motors, control, ROS 2, AI and more.',
  alternates: { canonical: `${BASE}/glossary` },
  openGraph: {
    type: 'website',
    url: `${BASE}/glossary`,
    siteName: 'R2BOT',
    title: 'Robotics Glossary — every term in one line',
    description: '500+ robotics terms, each defined in one sentence and linked to a full plain-English explanation.',
  },
};

function firstSentence(s: string): string {
  const t = s.trim();
  const m = /^(.{40,160}?[.!?])(\s|$)/.exec(t);
  return (m ? m[1] : t.length > 150 ? `${t.slice(0, 147).trimEnd()}…` : t);
}

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function glossaryHtml(letters: string[], groups: Map<string, AtlasEntry[]>): string {
  let out = '';
  for (const l of letters) {
    const id = `letter-${l === '#' ? 'other' : l}`;
    out += `<section id="${id}"><h2>${l === '#' ? 'Numbers &amp; symbols' : l}</h2><dl>`;
    for (const e of groups.get(l) ?? []) {
      out += `<div><dt><a href="/atlas/concept/${esc(e.slug)}">${esc(e.title)}</a></dt><dd>${esc(firstSentence(e.summary))}</dd></div>`;
    }
    out += '</dl></section>';
  }
  return out;
}

function letterOf(title: string): string {
  const c = title.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

export default function GlossaryPage() {
  const entries = getAllAtlasEntries()
    .filter((e) => e.type === 'concept' && e.summary.trim())
    .sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }));

  const groups = new Map<string, AtlasEntry[]>();
  for (const e of entries) {
    const k = letterOf(e.title);
    const arr = groups.get(k) ?? [];
    arr.push(e);
    groups.set(k, arr);
  }
  const letters = [...groups.keys()].sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': `${BASE}/glossary`,
    name: 'R2BOT Robotics Glossary',
    description: metadata.description,
    url: `${BASE}/glossary`,
    dateModified: pageUpdated('/glossary').toISOString(),
    hasDefinedTerm: entries.slice(0, 60).map((e) => ({
      '@type': 'DefinedTerm',
      name: e.title,
      description: firstSentence(e.summary),
      url: `${BASE}/atlas/concept/${e.slug}`,
    })),
  };

  return (
    <StaticPage
      eyebrow="Reference"
      title="Robotics glossary"
      lede={`${entries.length} terms, each in one sentence. Click any term for the full explanation, with how it works, where you will see it, and sources.`}
      maxWidth={900}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />

      <nav aria-label="Jump to letter" className="not-prose sticky top-[72px] z-10 -mx-2 mb-6 flex flex-wrap gap-1 rounded-xl border border-white/10 bg-[var(--surface-1,#0e1627)]/95 px-2 py-2 backdrop-blur">
        {letters.map((l) => (
          <a key={l} href={`#letter-${l === '#' ? 'other' : l}`} className="min-w-[32px] rounded-md px-2 py-1 text-center text-sm font-bold text-gray-300 hover:bg-white/10 hover:text-white">
            {l}
          </a>
        ))}
      </nav>

      {/* Rendered as one HTML string on purpose. As 500 JSX nodes the page was
          540 KB: the React Server Components payload repeats the element tree
          as JSON alongside the HTML. One escaped string ships once. */}
      <div className="r2-glossary not-prose" dangerouslySetInnerHTML={{ __html: glossaryHtml(letters, groups) }} />

      <p className="not-prose mt-12 text-sm text-gray-500">
        Missing a term? Every entry is written by one person and reviewed against its sources;
        tell us what to add at <a className="underline" href="mailto:hello@r2bot.in">hello@r2bot.in</a>.
        For the AI-specific vocabulary (VLA models, world models, sim-to-real) see the{' '}
        <a href="/ai-robotics/glossary" className="underline">AI + Robotics glossary</a>.
      </p>
    </StaticPage>
  );
}
