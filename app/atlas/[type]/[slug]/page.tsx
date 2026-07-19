import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  getAllAtlasEntries,
  getRelatedEntries,
  typeLabel,
  type AtlasType,
} from '@/lib/atlas';
import { getAtlasEntryMerged, getAllAtlasEntriesMerged } from '@/lib/atlas-db';

// Regenerate periodically so Content-Manager edits appear on the live page.
export const revalidate = 300;
import { getAcademyLessonForAtlasTerm, TRACK_EMOJI, TRACK_NAME } from '@/lib/atlas-academy-map';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider, CopilotContextBinder } from '@/components/CopilotProvider';
import { AskAboutThisButton } from '@/components/AskAboutThisButton';
import { Breadcrumbs, type Crumb } from '@/components/Breadcrumbs';
import { ReadingProgress } from '@/components/ReadingProgress';
import { BackToTop } from '@/components/BackToTop';
import { ShareRow } from '@/components/ShareRow';
import { CopyHeadingPlugin } from '@/components/CopyHeadingPlugin';
import { AtlasLinkTooltips } from '@/components/AtlasLinkTooltips';
import { AskR2Inline } from '@/components/AskR2Inline';
import { Quiz, type QuizQuestion } from '@/components/atlas/Quiz';
import { AtlasDiagram, type DiagramSpec } from '@/components/atlas/AtlasDiagram';
import { AtlasCompare, type AtlasCompareEntry } from '@/components/atlas/AtlasCompare';
import { PythonPlayground } from '@/components/atlas/PythonPlayground';
import { ConceptHero } from '@/components/atlas/ConceptHero';
import { NextTopicBar } from '@/components/atlas/NextTopicBar';
import { ConceptLayers } from '@/components/atlas/ConceptLayers';
import { Reveal } from '@/components/Reveal';

const PROGRAMMING_BUCKETS = new Set([
  'programming-software',
  'control-systems',
  'ai-machine-learning',
  'computer-vision',
  'navigation-localization',
  'ros2-ecosystem',
]);
import { RecentlyViewedTracker } from '@/components/RecentlyViewedTracker';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { BookmarkButton } from '@/components/BookmarkButton';
import { MarkUnderstood } from '@/components/MarkUnderstood';
import { PageViewTracker } from '@/components/PageViewTracker';
import { PronounceButton } from '@/components/PronounceButton';
import { SenseThinkActVisual } from '@/components/visuals/SenseThinkActVisual';
import { PIDSimulator } from '@/components/visuals/PIDSimulator';
import { LabThread } from '@/components/lab/LabThread';
import { readTime, plainTextFromMd } from '@/lib/reading';

type Params = { type: AtlasType; slug: string };

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export async function generateStaticParams() {
  return (await getAllAtlasEntriesMerged()).map((e) => ({ type: e.type, slug: e.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { type, slug } = await params;
  const entry = await getAtlasEntryMerged(type, slug);
  if (!entry) return { title: 'Not found · Atlas' };
  const canonical = `${BASE_URL}/atlas/${type}/${slug}`;

  // SEO title: target real search intent ("[concept] explained") instead of the
  // bare term. This is exactly the query pattern CLAUDE.md wants Atlas to own —
  // "X explained", "how X works" — and it captures far more long-tail traffic
  // than the raw entry name. The visible <h1> stays the clean term; only the
  // <title>/OG string changes. We skip the suffix for entries whose title is
  // already a phrase (company/robot names, or titles that already say
  // "Explained"/"How"/a question) so we never produce awkward doubled titles.
  const rawTitle = entry.title.trim();
  const alreadyIntentful = /(explained|how |what |guide|\?|:)/i.test(rawTitle);
  const suffix = ' Explained — How It Works';
  const seoTitle =
    type === 'concept' && !alreadyIntentful && (rawTitle.length + suffix.length) <= 60
      ? `${rawTitle} Explained — How It Works`
      : type === 'concept' && !alreadyIntentful
        ? `${rawTitle} Explained`
        : rawTitle;

  return {
    title: seoTitle,
    description: entry.summary,
    alternates: { canonical },
    openGraph: {
      title: `${seoTitle} | R2BOT`,
      description: entry.summary,
      url: canonical,
      type: 'article',
    },
  };
}

/** Pull out "Check your understanding" Q&A blocks for FAQ JSON-LD. */
function extractFAQItems(body: string): Array<{ q: string; a: string }> {
  const idx = body.toLowerCase().indexOf('check your understanding');
  if (idx === -1) return [];
  const section = body.slice(idx).split(/^---\s*$/m)[0] ?? '';
  // Match lines like "**1.** Question…" up to the next bold-numbered or end.
  const matches = [...section.matchAll(/\*\*\d+\.\*\*\s*([\s\S]+?)(?=\*\*\d+\.\*\*|\n---|\n$|$)/g)];
  return matches
    .map((m) => {
      const text = m[1].trim();
      // Split on the first sentence break — heuristic.
      const sentences = text.split(/(?<=[.?!])\s+/);
      const q = sentences.shift() ?? text;
      const a = sentences.join(' ').trim();
      return { q, a: a || 'See the lesson body for the full answer.' };
    })
    .filter((qa) => qa.q.length > 5);
}

export default async function AtlasEntryPage(
  { params }: { params: Promise<Params> },
) {
  const { type, slug } = await params;
  const entry = await getAtlasEntryMerged(type, slug);
  if (!entry) notFound();

  const related = getRelatedEntries(entry, 3);
  const allEntries = getAllAtlasEntries();
  // Build slug→summary map for hover tooltips.
  const summaries: Record<string, string> = {};
  for (const e of allEntries) summaries[e.slug] = e.summary;

  const canonical = `${BASE_URL}/atlas/${type}/${slug}`;
  const plain = plainTextFromMd(entry.body);
  const rt = readTime(plain);
  const sourceCount = entry.sources?.length ?? 0;
  const faqItems = extractFAQItems(entry.body);
  const academyLesson = getAcademyLessonForAtlasTerm(slug);

  // Trail label for breadcrumbs.
  const catLabel = entry.category ? entry.category.replace(/-/g, ' ') : typeLabel(type);
  const trail: Crumb[] = [
    { label: 'Atlas', href: '/atlas' },
    { label: catLabel, href: '/atlas' },
    { label: entry.title },
  ];

  // Schema.org JSON-LD
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type === 'concept' ? 'DefinedTerm' : 'Article',
    name: entry.title,
    headline: entry.title,
    description: entry.summary,
    dateModified: entry.lastReviewed,
    url: canonical,
    author: { '@type': 'Organization', name: 'R2BOT' },
    publisher: { '@type': 'Organization', name: 'R2BOT' },
    ...(type === 'concept'
      ? {
          inDefinedTermSet: {
            '@type': 'DefinedTermSet',
            name: 'R2BOT Robotics Atlas',
            url: `${BASE_URL}/atlas`,
          },
        }
      : {}),
  };

  const faqSchema =
    faqItems.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqItems.map((qa) => ({
            '@type': 'Question',
            name: qa.q.replace(/[*_]/g, '').trim(),
            acceptedAnswer: {
              '@type': 'Answer',
              text: qa.a.replace(/[*_]/g, '').trim(),
            },
          })),
        }
      : null;

  return (
    <CopilotProvider>
      <ReadingProgress />
      <ParticleField />
      <CursorTrail />
      <Nav />
      <KeyboardShortcuts />
      <PageViewTracker contentType="atlas" contentSlug={`${type}/${slug}`} />
      <CopilotContextBinder context={{ title: entry.title, summary: entry.summary, kind: 'atlas' }} />
      <RecentlyViewedTracker type={type} slug={slug} title={entry.title} />
      <AtlasLinkTooltips targetSelector="#atlas-body" summaries={summaries} />
      <CopyHeadingPlugin targetSelector="#atlas-body" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <article id="main-content" style={{ paddingTop: 140, paddingBottom: 100, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 800 }}>
          {/* Category hero */}
          {entry.category && (
            <div
              style={{
                marginBottom: 32,
                borderRadius: 16,
                overflow: 'hidden',
                border: '1px solid var(--border-2)',
                aspectRatio: '2 / 1',
                background: '#050810',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/images/atlas/${entry.category}.svg`}
                alt={`Illustration representing the ${entry.category.replace(/-/g, ' ')} category`}
                width={800}
                height={400}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            </div>
          )}

          <Breadcrumbs trail={trail} />

          {/* Meta */}
          <div className="atlas-meta">
            <span className="tag">{typeLabel(type)}</span>
            <span className="muted-tag">Last reviewed · {entry.lastReviewed}</span>
          </div>

          {/* Title */}
          <h1
            className="display"
            style={{
              fontSize: 'clamp(40px, 5.5vw, 64px)',
              lineHeight: 1.05,
              margin: '0 0 14px',
              color: 'var(--mist)',
            }}
          >
            {entry.title}
            <PronounceButton word={entry.title} phonetic={entry.phonetic} />
          </h1>

          {/* Hindi gloss */}
          {entry.hindi_name && (
            <div style={{ margin: '0 0 14px' }}>
              <span
                title="Hindi name for this term"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(148,163,184,.4)',
                  background: 'rgba(148,163,184,.08)',
                  color: '#94A3B8',
                  fontSize: 12,
                  letterSpacing: '.02em',
                }}
              >
                <span style={{ opacity: 0.7, fontFamily: 'var(--font-mono), monospace' }}>हिंदी:</span> {entry.hindi_name}
              </span>
            </div>
          )}

          {/* Word count · read time · sources line */}
          <p
            style={{
              fontSize: 13,
              color: 'var(--muted)',
              fontFamily: 'var(--font-mono), monospace',
              letterSpacing: '.05em',
              margin: '0 0 26px',
            }}
          >
            {rt.words.toLocaleString()} words · {rt.label}
            {sourceCount > 0 ? ` · ${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}` : ''}
          </p>

          {/* Prerequisites */}
          {entry.prerequisites && entry.prerequisites.length > 0 && (
            <div style={{ margin: '0 0 24px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 11,
                  letterSpacing: '.2em',
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Builds on
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {entry.prerequisites.map((pSlug) => {
                  const p = allEntries.find((x) => x.slug === pSlug);
                  if (!p) return null;
                  return (
                    <a
                      key={pSlug}
                      href={`/atlas/${p.type}/${p.slug}`}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 999,
                        border: '1px solid var(--border-2)',
                        background: 'rgba(0,184,212,.08)',
                        color: 'var(--cyan)',
                        fontSize: 13,
                      }}
                    >
                      {p.title}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lede / summary */}
          <p
            style={{
              fontSize: 22,
              lineHeight: 1.5,
              color: '#C8D0DC',
              margin: '0 0 28px',
              borderLeft: '3px solid var(--cyan)',
              paddingLeft: 22,
            }}
          >
            {entry.summary}
          </p>

          {/* Share + bookmark + understood */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
            <ShareRow title={entry.title} url={canonical} />
            <BookmarkButton
              contentType="atlas"
              contentSlug={`${type}/${slug}`}
              contentTitle={entry.title}
            />
            <MarkUnderstood contentType="atlas" contentSlug={`${type}/${slug}`} />
            <a
              href={`/copilot?q=${encodeURIComponent(`Teach me ${entry.title} in simple terms`)}`}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
            >
              🤖 Ask R2 to teach me {entry.title} →
            </a>
          </div>

          {/* v3 hero — hook line + image + video above the fold */}
          <ConceptHero
            title={entry.title}
            hookLine={entry.hookLine}
            conceptImage={entry.conceptImage}
            youtubeId={entry.youtubeId}
            difficultyLevel={entry.difficultyLevel}
            estimatedReadTime={entry.estimatedReadTime}
            xpValue={entry.xpValue}
            bucketLabel={entry.bucket?.replace(/-/g, ' ')}
          />

          {/* v2 enrichment hero — appears when any new fields are present */}
          <AtlasEnrichmentHero entry={entry} />

          {/* Atlas 1000 layered sections */}
          <ConceptLayers entry={entry} />

          {/* Compare with another term */}
          <div style={{ marginBottom: 28 }}>
            <AtlasCompare
              current={{ slug, type, title: entry.title, summary: entry.summary } as AtlasCompareEntry}
              all={allEntries.map((e) => ({ slug: e.slug, type: e.type, title: e.title, summary: e.summary }))}
              currentBody={entry.body}
            />
          </div>

          {/* Body */}
          <div id="atlas-body" className="prose">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code(props) {
                  const { className, children } = props as { className?: string; children?: React.ReactNode };
                  if (/language-quiz/.exec(className || '')) {
                    try {
                      const raw = String(children).trim();
                      const questions = JSON.parse(raw) as QuizQuestion[];
                      return <Quiz questions={questions} />;
                    } catch {
                      return <code className={className}>{children}</code>;
                    }
                  }
                  if (/language-diagram/.exec(className || '')) {
                    try {
                      const raw = String(children).trim();
                      const spec = JSON.parse(raw) as DiagramSpec;
                      return <AtlasDiagram spec={spec} />;
                    } catch {
                      return <code className={className}>{children}</code>;
                    }
                  }
                  return <code className={className}>{children}</code>;
                },
              }}
            >
              {entry.body}
            </ReactMarkdown>
          </div>

          {/* Python Playground (only on programming-ish buckets) */}
          {entry.bucket && PROGRAMMING_BUCKETS.has(entry.bucket) ? (
            <PythonPlayground />
          ) : null}

          {/* Inline "Ask R2" CTA */}
          <div style={{ margin: '40px 0' }}>
            <AskR2Inline topic={entry.title} />
          </div>

          {/* Ask-this card (legacy — kept for the existing follow-up prompt UX) */}
          <div
            style={{
              margin: '20px 0 40px',
              padding: 26,
              background: 'linear-gradient(135deg, rgba(0,184,212,.06), rgba(165,107,255,.04))',
              border: '1px solid var(--border-2)',
              borderRadius: 16,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono), monospace',
                fontSize: 11,
                letterSpacing: '.3em',
                color: 'var(--cyan)',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Still curious?
            </div>
            <p style={{ fontSize: 17, color: '#C8D0DC', margin: '0 0 18px' }}>
              Ask R2 Co-pilot anything you didn&apos;t understand about {entry.title}. It&apos;ll explain it plainly.
            </p>
            <AskAboutThisButton topic={entry.title} />
          </div>

          {/* Interactive visualiser for select concepts */}
          {entry.slug === 'sense-think-act-loop' && (
            <section style={{ margin: '40px 0' }}>
              <div className="section-eyebrow">Try it</div>
              <h2 className="display" style={{ fontSize: 24, margin: '0 0 14px' }}>
                The loop, animated
              </h2>
              <SenseThinkActVisual />
            </section>
          )}
          {entry.slug === 'pid-controller' && (
            <section style={{ margin: '40px 0' }}>
              <div className="section-eyebrow">Try it</div>
              <h2 className="display" style={{ fontSize: 24, margin: '0 0 14px' }}>
                Tune a PID controller
              </h2>
              <PIDSimulator />
            </section>
          )}

          {/* Learn this in the Academy */}
          {academyLesson && (
            <div className="mt-8 mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <p className="text-xs text-amber-500/70 uppercase tracking-wider font-semibold mb-3">Learn this in the Academy</p>
              <Link href={`/academy/${academyLesson.track}/${academyLesson.slug}`} className="flex items-center gap-3 group">
                <span className="text-3xl">{TRACK_EMOJI[academyLesson.track]}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white group-hover:text-amber-400 transition-colors text-sm">{academyLesson.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Hands-on lesson · {TRACK_NAME[academyLesson.track]} track</p>
                </div>
                <span className="text-amber-500 group-hover:translate-x-1 transition-transform flex-shrink-0 text-lg">→</span>
              </Link>
            </div>
          )}

          {/* You might also like */}
          {related.length > 0 && (
            <Reveal>
              <section style={{ margin: '50px 0' }}>
                <div className="section-eyebrow">You might also like</div>
                <h2 className="display" style={{ fontSize: 24, margin: '0 0 18px' }}>
                  Keep going
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  {related.slice(0, 3).map((r) => (
                    <a key={r.slug} href={`/atlas/${r.type}/${r.slug}`} className="pulse-card">
                      <span
                        className={`pulse-tag ${
                          r.type === 'concept'
                            ? 'usa'
                            : r.type === 'company'
                            ? 'india'
                            : 'china'
                        }`}
                      >
                        {typeLabel(r.type)}
                      </span>
                      <h3>{r.title}</h3>
                      <p style={{ marginBottom: 0 }}>
                        {r.summary.slice(0, 110)}
                        {r.summary.length > 110 ? '…' : ''}
                      </p>
                    </a>
                  ))}
                </div>
              </section>
            </Reveal>
          )}

          {/* Last updated */}
          <p
            style={{
              marginTop: 40,
              fontSize: 12,
              color: 'var(--muted)',
              fontFamily: 'var(--font-mono), monospace',
              letterSpacing: '.05em',
            }}
          >
            Last updated · {entry.lastReviewed}
          </p>

          {/* Sources */}
          {entry.sources && entry.sources.length > 0 && (
            <Reveal>
              <section style={{ margin: '30px 0 20px', paddingTop: 24, borderTop: '1px solid var(--border)' }}>
                <div className="section-eyebrow">Sources</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {entry.sources.map((s) => (
                    <li key={s.url} style={{ marginBottom: 10 }}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--cyan)', fontSize: 14.5 }}
                      >
                        {s.title} →
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}

          {/* Community Lab thread for this entry */}
          <LabThread contentType="atlas" contentSlug={`${type}/${slug}`} />

          {/* Report an error */}
          <p style={{ marginTop: 50, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
            Spotted something off?{' '}
            <a
              href={`mailto:hello@r2bot.in?subject=${encodeURIComponent(
                `Error report: ${entry.title}`,
              )}&body=${encodeURIComponent(
                `Page: ${canonical}\nIssue: `,
              )}`}
              style={{
                color: 'var(--cyan)',
                borderBottom: '1px dashed var(--border-2)',
              }}
            >
              Report an error →
            </a>
          </p>
        </div>
      </article>

      <NextTopicBar
        currentSlug={slug}
        unlocksTerms={entry.unlocksTerms}
        bucket={entry.bucket}
        allNodes={allEntries.map((e) => ({
          slug: e.slug,
          type: e.type,
          title: e.title,
          bucket: e.bucket,
          hookLine: e.hookLine,
          oneLiner: e.oneLiner,
        }))}
      />

      <BackToTop />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// v2 enrichment block — renders only the fields that are populated.
// Empty fields stay invisible; populated fields show structured cards.
// ────────────────────────────────────────────────────────────────────────────
function AtlasEnrichmentHero({ entry }: { entry: import('@/lib/atlas').AtlasEntry }) {
  const {
    oneLiner, difficultyLevel, difficultyLabel, laymanExplanation,
    analogy, indianExample, whyItMatters, realRobotsThatUseThis,
    mindBlowingFact, industryApplications,
  } = entry;

  const hasAny =
    oneLiner || laymanExplanation || analogy || indianExample ||
    whyItMatters || mindBlowingFact ||
    (realRobotsThatUseThis && realRobotsThatUseThis.length > 0) ||
    (industryApplications && industryApplications.length > 0);

  if (!hasAny) return null;

  return (
    <section
      style={{
        margin: '0 0 32px',
        padding: 18,
        background: 'rgba(245,158,11,.05)',
        border: '1px solid rgba(245,158,11,.18)',
        borderRadius: 16,
      }}
    >
      {oneLiner && (
        <p style={{ color: '#fde047', fontSize: 19, fontWeight: 700, lineHeight: 1.4, margin: 0 }}>
          {oneLiner}
        </p>
      )}
      {difficultyLevel && (
        <span style={{
          display: 'inline-block', marginTop: 10,
          fontSize: 11, color: '#fbbf24',
          background: 'rgba(0,0,0,.35)',
          padding: '4px 10px', borderRadius: 999, fontWeight: 800, letterSpacing: 0.8,
        }}>
          Difficulty {difficultyLevel}/5 · {difficultyLabel ?? 'Classroom'}
        </span>
      )}

      {laymanExplanation && (
        <p style={{ marginTop: 14, fontSize: 17, color: '#e5e7eb', lineHeight: 1.55 }}>
          {laymanExplanation}
        </p>
      )}

      {analogy && (
        <div style={{
          marginTop: 14,
          background: 'rgba(245,158,11,.1)',
          border: '1px solid rgba(245,158,11,.3)',
          borderRadius: 12, padding: 12,
        }}>
          <p style={{ fontSize: 11, color: '#fbbf24', fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>
            💡 Think of it like…
          </p>
          <p style={{ fontSize: 14, color: '#fde68a', marginTop: 4, lineHeight: 1.5 }}>{analogy}</p>
        </div>
      )}

      {indianExample && (
        <div style={{
          marginTop: 10,
          background: 'linear-gradient(135deg, rgba(245,158,11,.1), rgba(16,185,129,.06))',
          border: '1px solid rgba(245,158,11,.25)',
          borderRadius: 12, padding: 12,
        }}>
          <p style={{ fontSize: 11, color: '#fbbf24', fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>
            🇮🇳 In India
          </p>
          <p style={{ fontSize: 14, color: '#fde68a', marginTop: 4, lineHeight: 1.5 }}>{indianExample}</p>
        </div>
      )}

      {whyItMatters && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>
            Why it matters
          </p>
          <p style={{ fontSize: 14, color: '#e5e7eb', marginTop: 4, lineHeight: 1.5 }}>{whyItMatters}</p>
        </div>
      )}

      {realRobotsThatUseThis && realRobotsThatUseThis.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Real robots:</span>
          {realRobotsThatUseThis.map((r) => (
            <a
              key={r}
              href={`/robots/${r}`}
              style={{
                fontSize: 11, padding: '3px 8px',
                background: '#11112a', color: '#fde68a',
                border: '1px solid #2a2a45', borderRadius: 999,
                textDecoration: 'none',
              }}
            >{r}</a>
          ))}
        </div>
      )}

      {industryApplications && industryApplications.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Used in:</span>
          {industryApplications.map((a) => (
            <span
              key={a}
              style={{
                fontSize: 11, padding: '3px 8px',
                background: '#11112a', color: '#fde68a',
                border: '1px solid #2a2a45', borderRadius: 999,
              }}
            >{a}</span>
          ))}
        </div>
      )}

      {mindBlowingFact && (
        <p style={{
          marginTop: 14, fontSize: 14, color: '#fde047',
          fontStyle: 'italic', lineHeight: 1.5,
          background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.3)',
          padding: 12, borderRadius: 12,
        }}>🤯 {mindBlowingFact}</p>
      )}
    </section>
  );
}
