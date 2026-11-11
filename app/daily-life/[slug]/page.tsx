// app/daily-life/[slug] — one long-form "Robotics in Daily Life" article per
// published entry in DAILY_LIFE_ARTICLES. Bodies are MDX on disk, read by
// lib/daily-life-articles/loader.ts; unwritten stubs have no page (404) and
// are not in the sitemap, so nothing advertised here is empty.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StaticPage } from '@/components/StaticPage';
import InlineSignup from '@/components/InlineSignup';
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld';
import { authorRef, AUTHOR } from '@/lib/author';
import { CATEGORY_EMOJI, CATEGORY_LABEL, PUBLISHED_SLUGS, publishedDailyLifeArticles } from '@/lib/daily-life';
import { getDailyLifeArticle, type DailyLifeArticleFull } from '@/lib/daily-life-articles/loader';

export const revalidate = 86400;
export const dynamicParams = false;
const BASE = 'https://www.r2bot.in';

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return [...PUBLISHED_SLUGS].map((slug) => ({ slug }));
}

/** Title ≤ 60 chars, description ≤ 155 chars — trimmed at a word boundary, never mid-word. */
function clamp(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:—-]+$/, '')}…`;
}

const seoTitle = (a: DailyLifeArticleFull) => clamp(a.title, 60);
const seoDescription = (a: DailyLifeArticleFull) => clamp(a.excerpt, 155);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getDailyLifeArticle(slug);
  if (!a) return { title: 'Article not found' };
  const url = `${BASE}/daily-life/${a.slug}`;
  return {
    title: seoTitle(a),
    description: seoDescription(a),
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'R2BOT',
      title: a.title,
      description: seoDescription(a),
      publishedTime: `${a.publishedAt}T00:00:00.000Z`,
      modifiedTime: `${a.updatedAt}T00:00:00.000Z`,
      authors: [AUTHOR.name],
      section: CATEGORY_LABEL[a.category],
    },
    twitter: { card: 'summary_large_image', title: a.title, description: seoDescription(a) },
  };
}

/** Internal links go through next/link; external ones open in a new tab. */
function MdLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  const cls = 'text-amber-300 underline underline-offset-2 hover:text-amber-200';
  if (href && href.startsWith('/')) return <Link href={href} className={cls}>{children}</Link>;
  return <a href={href} className={cls} target="_blank" rel="noopener noreferrer">{children}</a>;
}

export default async function DailyLifeArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const a = getDailyLifeArticle(slug);
  if (!a) notFound();

  const url = `${BASE}/daily-life/${a.slug}`;
  const siblings = publishedDailyLifeArticles().filter((s) => s.category === a.category && s.slug !== a.slug).slice(0, 3);
  const more = siblings.length >= 3 ? siblings : [...siblings, ...publishedDailyLifeArticles().filter((s) => s.category !== a.category && s.slug !== a.slug)].slice(0, 3);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: seoDescription(a),
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: `${a.publishedAt}T00:00:00.000Z`,
    dateModified: `${a.updatedAt}T00:00:00.000Z`,
    articleSection: CATEGORY_LABEL[a.category],
    author: authorRef(),
    publisher: { '@type': 'Organization', name: 'R2BOT', url: BASE, logo: { '@type': 'ImageObject', url: `${BASE}/icon.svg` } },
    image: `${url}/opengraph-image`,
    citation: a.sources.map((s) => s.url),
  };
  const breadcrumbs = breadcrumbJsonLD([
    { name: 'Home', path: '/' },
    { name: 'Robotics in Daily Life', path: '/daily-life' },
    { name: a.title, path: `/daily-life/${a.slug}` },
  ]);

  return (
    <StaticPage eyebrow={`Robotics in Daily Life · ${CATEGORY_EMOJI[a.category]} ${CATEGORY_LABEL[a.category]}`} title={a.title} lede={a.excerpt} maxWidth={820}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(breadcrumbs) }} />

      <nav aria-label="Breadcrumb" className="not-prose -mt-6 mb-6 text-xs text-gray-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/" className="hover:text-white">Home</Link></li>
          <li aria-hidden>›</li>
          <li><Link href="/daily-life" className="hover:text-white">Robotics in Daily Life</Link></li>
          <li aria-hidden>›</li>
          <li className="text-gray-300">{CATEGORY_LABEL[a.category]}</li>
        </ol>
      </nav>

      <p className="not-prose mb-8 text-sm text-gray-400">
        By <Link href={AUTHOR.url} className="text-gray-200 hover:underline">{AUTHOR.name}</Link> · {a.readTime} · Published {a.publishedAt}
        {a.updatedAt !== a.publishedAt ? ` · Updated ${a.updatedAt}` : ''}
      </p>

      <article id="daily-life-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: () => null,
            h2: ({ children }) => <h2 className="mt-10 text-2xl md:text-3xl font-black text-white">{children}</h2>,
            h3: ({ children }) => <h3 className="mt-7 text-xl font-bold text-white">{children}</h3>,
            p: ({ children }) => <p className="mt-4 text-base leading-relaxed text-zinc-200">{children}</p>,
            a: ({ href, children }) => <MdLink href={href}>{children}</MdLink>,
            ul: ({ children }) => <ul className="mt-4 ml-5 list-disc space-y-2 text-zinc-200">{children}</ul>,
            ol: ({ children }) => <ol className="mt-4 ml-5 list-decimal space-y-2 text-zinc-200 break-words">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
            blockquote: ({ children }) => <blockquote className="mt-5 pl-4 border-l-4 border-amber-500 text-zinc-300 italic">{children}</blockquote>,
            hr: () => <hr className="my-8 border-white/10" />,
          }}
        >
          {a.body}
        </ReactMarkdown>
      </article>

      <InlineSignup />

      <section className="not-prose mt-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">More in {CATEGORY_LABEL[a.category]}</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {more.map((s) => (
            <li key={s.slug}>
              <Link href={`/daily-life/${s.slug}`} className="block min-h-[44px] rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:border-amber-400/40">
                <span className="block text-[10px] uppercase tracking-widest text-gray-500">{CATEGORY_EMOJI[s.category]} {CATEGORY_LABEL[s.category]}</span>
                <span className="mt-1 block text-sm font-bold text-white">{s.title}</span>
                <span className="mt-1 block text-xs text-gray-500">{s.readTime}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-gray-500"><Link href="/daily-life" className="underline">All Robotics in Daily Life articles</Link></p>
      </section>
    </StaticPage>
  );
}
