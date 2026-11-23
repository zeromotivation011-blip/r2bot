// app/ros2/fix/[slug] — one page per ROS 2 error (data: lib/ros2-fixes.ts).
// Owns the "<exact error text>" query; see lib/canonical-map.ts.
//
// Layout follows how someone with a broken terminal reads: the error they
// searched for, the short answer, a copy-paste fix, then the causes in order
// of likelihood — each with a CHECK before the FIX, so nobody changes their
// setup on a guess.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StaticPage } from '@/components/StaticPage';
import { CopyButtonClient } from '@/components/CopyButtonClient';
import InlineSignup from '@/components/InlineSignup';
import { ROS2_FIXES, getRos2Fix, type FixCode } from '@/lib/ros2-fixes';
import { jsonldScript } from '@/lib/seo/jsonld';
import { authorRef } from '@/lib/author';

export const revalidate = 86400;
export const dynamicParams = false;
const BASE = 'https://www.r2bot.in';

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return ROS2_FIXES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const f = getRos2Fix(slug);
  if (!f) return { title: 'Fix not found' };
  const url = `${BASE}/ros2/fix/${f.slug}`;
  return {
    title: f.seoTitle,
    description: f.description,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, siteName: 'R2BOT', title: f.title, description: f.description },
  };
}

/** Prose with `inline code` — the data files use backticks for commands and paths. */
function Rich({ text }: { text: string }) {
  const parts = text.split('`');
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.9em] text-amber-200">{p}</code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function CodeBlock({ block, tone = 'default' }: { block: FixCode; tone?: 'default' | 'check' | 'fix' }) {
  const label =
    tone === 'check' ? 'text-sky-300' : tone === 'fix' ? 'text-emerald-300' : 'text-amber-300';
  return (
    <div className="not-prose mt-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {block.label && <p className={`text-[11px] font-bold uppercase tracking-widest ${label}`}>{block.label}</p>}
        <CopyButtonClient code={block.code} />
      </div>
      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-[13px] leading-relaxed text-gray-100">
        <code>{block.code}</code>
      </pre>
    </div>
  );
}

export default async function Ros2FixPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const f = getRos2Fix(slug);
  if (!f) notFound();

  const url = `${BASE}/ros2/fix/${f.slug}`;
  const others = ROS2_FIXES.filter((x) => x.slug !== f.slug);
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: f.title,
      description: f.description,
      url,
      mainEntityOfPage: url,
      dateModified: `${f.updated}T00:00:00.000Z`,
      author: authorRef(),
      publisher: { '@type': 'Organization', name: 'R2BOT', url: BASE },
      proficiencyLevel: 'Beginner',
      about: [{ '@type': 'SoftwareApplication', name: 'ROS 2 (Robot Operating System 2)' }],
      citation: f.sources.map((s) => s.url),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ROS 2', item: `${BASE}/ros2` },
        { '@type': 'ListItem', position: 2, name: 'ROS 2 fixes', item: `${BASE}/ros2/fix` },
        { '@type': 'ListItem', position: 3, name: f.title, item: url },
      ],
    },
  ];

  return (
    <StaticPage eyebrow="ROS 2 · Fix" title={f.title} lede={f.lede} maxWidth={880}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="not-prose -mt-6 mb-4 text-xs text-gray-500">
        <Link href="/ros2" className="inline-flex min-h-[44px] items-center hover:text-white hover:underline">ROS 2</Link>
        <span aria-hidden> / </span>
        <Link href="/ros2/fix" className="inline-flex min-h-[44px] items-center hover:text-white hover:underline">Fixes</Link>
        <span aria-hidden> / </span>
        <span className="text-gray-400">{f.title}</span>
      </nav>

      <article>
        <div className="not-prose rounded-2xl border border-red-400/30 bg-red-500/[0.07] p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-red-300">The error</p>
          <pre className="mt-2 overflow-x-auto font-mono text-[13px] leading-relaxed text-red-100"><code>{f.errorText}</code></pre>
        </div>

        <div className="not-prose mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300">The short answer</p>
          <p className="mt-2 text-lg leading-relaxed text-white"><Rich text={f.shortAnswer} /></p>
        </div>

        <CodeBlock block={f.quickFix} />

        <h2 id="whats-happening">What is actually going on</h2>
        {f.explainer.map((p, i) => (
          <p key={i}><Rich text={p} /></p>
        ))}

        <h2 id="causes">Find your cause</h2>
        <p>Most likely first. Run the check before you change anything; stop at the first one that matches.</p>
        <ol className="not-prose mt-3 text-sm">
          {f.causes.map((c, i) => (
            <li key={c.id}>
              <a href={`#${c.id}`} className="inline-flex min-h-[44px] items-center text-amber-300 hover:underline">
                {i + 1}. <Rich text={c.title} />
              </a>
            </li>
          ))}
        </ol>

        {f.causes.map((c, i) => (
          <section key={c.id} id={c.id} className="scroll-mt-28">
            <h2>
              {i + 1}. <Rich text={c.title} />
            </h2>
            <p>
              <strong>You will see:</strong> <Rich text={c.symptom} />
            </p>
            <p>
              <strong>Why:</strong> <Rich text={c.why} />
            </p>
            {c.check && <CodeBlock block={c.check} tone="check" />}
            {c.fix.map((b) => (
              <CodeBlock key={b.code} block={b} tone="fix" />
            ))}
            {c.note && (
              <p className="mt-4 text-[0.95em] text-gray-400">
                <Rich text={c.note} />
              </p>
            )}
          </section>
        ))}

        {f.more.map((m) => (
          <section key={m.title}>
            <h2>
              <Rich text={m.title} />
            </h2>
            {m.body.map((p, i) => (
              <p key={i}><Rich text={p} /></p>
            ))}
            {m.code?.map((b) => <CodeBlock key={b.code} block={b} />)}
          </section>
        ))}

        <h2 id="prevent">Stop it happening again</h2>
        <ul>
          {f.prevent.map((p) => (
            <li key={p}><Rich text={p} /></li>
          ))}
        </ul>

        <h2 id="faq">Questions people ask</h2>
        {f.faq.map((q) => (
          <div key={q.q}>
            <h3>{q.q}</h3>
            <p><Rich text={q.a} /></p>
          </div>
        ))}
      </article>

      <InlineSignup />

      <section className="not-prose mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Read next</h2>
          <ul className="mt-2 text-sm">
            {f.related.map((r) => (
              <li key={r.href}><Link href={r.href} className="inline-flex min-h-[44px] items-center text-amber-300 hover:underline">{r.label}</Link></li>
            ))}
            {others
              .filter((o) => !f.related.some((r) => r.href === `/ros2/fix/${o.slug}`))
              .map((o) => (
                <li key={o.slug}><Link href={`/ros2/fix/${o.slug}`} className="inline-flex min-h-[44px] items-center text-amber-300 hover:underline">{o.title}</Link></li>
              ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Sources</h2>
          <ol className="mt-2 text-sm text-gray-400">
            {f.sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center hover:text-white hover:underline">{s.name}</a></li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-gray-500">
            Checked against: {f.verifiedOn}. Updated {f.updated} · <Link href="/ros2/fix" className="inline-flex min-h-[44px] items-center underline">All ROS 2 fixes</Link>
          </p>
        </div>
      </section>
    </StaticPage>
  );
}
