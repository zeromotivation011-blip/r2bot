import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import {
  ROBOTS,
  ROBOT_TYPE_LABELS,
  getRobotBySlug,
  getRelatedRobots,
  type Robot,
} from '@/lib/robots-data';
import { RobotSpecs } from './RobotSpecs';
import { RobotVote } from '@/components/robots/RobotVote';
import { RobotFamilyTree } from '@/components/robots/RobotFamilyTree';
import { getRobotExtra } from '@/lib/robots-extra';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://r2bot-psi.vercel.app';

export function generateStaticParams() {
  return ROBOTS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const robot = getRobotBySlug(slug);
  if (!robot) return { title: 'Robot not found | R2BOT' };
  const url = `${BASE_URL}/robots/${robot.slug}`;
  return {
    title: robot.metaTitle,
    description: robot.metaDescription,
    keywords: [
      `${robot.name} robot`,
      `${robot.name} specs`,
      `${robot.maker} ${robot.name}`,
      `${ROBOT_TYPE_LABELS[robot.type]} robot`,
      robot.name,
      robot.maker,
    ],
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'R2BOT',
      title: robot.metaTitle,
      description: robot.metaDescription,
      images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: robot.imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: robot.metaTitle,
      description: robot.metaDescription,
      images: ['/og-default.svg'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
  };
}

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}

function thingJsonLd(robot: Robot) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: robot.name,
    alternateName: `${robot.maker} ${robot.name}`,
    description: robot.description,
    brand: { '@type': 'Brand', name: robot.maker },
    manufacturer: { '@type': 'Organization', name: robot.maker },
    countryOfOrigin: robot.country,
    productionDate: String(robot.year),
    category: ROBOT_TYPE_LABELS[robot.type],
    additionalProperty: Object.entries(robot.specs)
      .filter(([, v]) => v)
      .map(([k, v]) => ({ '@type': 'PropertyValue', name: k, value: v })),
    url: `${BASE_URL}/robots/${robot.slug}`,
    image: `${BASE_URL}/og-default.svg`,
  };
}

export default async function RobotProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const robot = getRobotBySlug(slug);
  if (!robot) notFound();

  const related = getRelatedRobots(slug, 3);
  const embedUrl = getYouTubeEmbedUrl(robot.videoUrl);
  const extra = getRobotExtra(robot);

  return (
    <CopilotProvider>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(thingJsonLd(robot)) }}
      />
      <Nav />

      <main id="main-content" className="bg-[#050810]">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/5 px-4 pb-16 pt-32">
          <div className="mx-auto max-w-4xl">
            <Link
              href="/robots"
              className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-amber-300"
            >
              ← All famous robots
            </Link>

            <div className="mt-6 flex items-start gap-6">
              <span className="text-7xl sm:text-8xl" aria-hidden>
                {robot.emoji}
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-200">
                    Fame rank #{robot.fameRank}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-300">
                    {ROBOT_TYPE_LABELS[robot.type]} · {robot.status}
                  </span>
                </div>
                <h1 className="mt-3 font-black leading-tight text-white text-[clamp(36px,5.5vw,56px)]">
                  {robot.name}
                </h1>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-zinc-300">
                  <span><strong className="text-white">Maker:</strong> {robot.maker}</span>
                  <span><strong className="text-white">Origin:</strong> {robot.countryFlag} {robot.country}</span>
                  <span><strong className="text-white">Born:</strong> {robot.year}</span>
                </div>
              </div>
            </div>

            <p className="mt-8 max-w-3xl bg-gradient-to-r from-amber-300 via-amber-200 to-orange-300 bg-clip-text text-2xl font-extrabold leading-snug text-transparent sm:text-3xl">
              {robot.hookLine}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {robot.statChips.map((c) => (
                <span
                  key={c.text}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-200"
                >
                  <span aria-hidden>{c.icon}</span>
                  <span>{c.text}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* In one sentence */}
        <section className="px-4 py-10">
          <div className="mx-auto max-w-3xl rounded-2xl border border-cyan-400/30 bg-cyan-500/[0.06] p-6">
            <h2 className="m-0 text-xs font-bold uppercase tracking-wider text-cyan-300">
              In one sentence
            </h2>
            <p className="mt-2 text-lg leading-relaxed text-zinc-100">{robot.inOneSentence}</p>
          </div>
        </section>

        {/* Wow factor */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-extrabold text-white">The wow factor</h2>
            <p className="mt-1 text-sm text-zinc-400">Three things that make {robot.name} genuinely impressive.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {robot.wowFactors.map((wf, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/[0.07] to-orange-500/[0.03] p-4"
                >
                  <span className="font-mono text-[11px] uppercase tracking-wider text-amber-300">
                    #{i + 1}
                  </span>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-100">{wf}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Specs (collapsible) */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <RobotSpecs robot={robot} />
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-extrabold text-white">How it works</h2>
            <p className="mt-1 text-sm text-zinc-400">A step-by-step breakdown, in plain English.</p>
            <ol className="mt-5 space-y-3">
              {robot.howItWorksSteps.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-amber-500/20 font-mono text-xs font-bold text-amber-200">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-zinc-200">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pop culture & team */}
        <section className="px-4 py-8">
          <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="m-0 text-xs font-bold uppercase tracking-wider text-purple-300">
                Where you&apos;ve probably seen it
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">{robot.popCulture}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="m-0 text-xs font-bold uppercase tracking-wider text-cyan-300">
                The team behind it
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">{robot.teamBehind}</p>
            </div>
          </div>
        </section>

        {/* Description (Wikipedia-style) */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-extrabold text-white">The full story</h2>
            <p className="mt-3 text-base leading-relaxed text-zinc-300">{robot.description}</p>
          </div>
        </section>

        {/* Documentary narrative (only renders if detail exists) */}
        <DocumentaryNarrative slug={robot.slug} robotName={robot.name} />

        {/* Voting */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <RobotVote slug={robot.slug} />
          </div>
        </section>

        {/* Family tree */}
        <RobotFamilyTree family={extra.familyTree} currentName={robot.name} />

        {/* Video — Robot in 2 Minutes */}
        {embedUrl ? (
          <section className="px-4 py-8">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-extrabold text-white">{robot.name} in 2 minutes</h2>
              <div className="mt-4 aspect-video overflow-hidden rounded-2xl border border-white/10">
                <iframe
                  src={embedUrl}
                  title={`${robot.name} video`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            </div>
          </section>
        ) : null}

        {/* Atlas learn links */}
        {robot.atlasLearnLinks && robot.atlasLearnLinks.length > 0 ? (
          <section className="px-4 py-8">
            <div className="mx-auto max-w-3xl rounded-3xl border border-cyan-400/30 bg-cyan-500/[0.06] p-6">
              <h2 className="text-xl font-bold text-white">
                Learn the science behind {robot.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-300">
                Three Atlas entries that explain how {robot.name} actually works.
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-3">
                {robot.atlasLearnLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="block rounded-xl border border-cyan-400/30 bg-cyan-500/[0.06] px-3 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/15"
                    >
                      {l.label} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* Fun facts */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-extrabold text-white">Mind-blowing facts</h2>
            <div className="mt-4 grid gap-3">
              {robot.funFacts.map((fact, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-4 text-zinc-100"
                >
                  <span className="font-mono text-xs uppercase tracking-wider text-amber-300">
                    Fact #{i + 1}
                  </span>
                  <p className="mt-1 text-sm leading-relaxed">{fact}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related robots */}
        {related.length > 0 ? (
          <section className="px-4 py-16">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-2xl font-extrabold text-white">Robots like this</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/robots/${r.slug}`}
                    className="group rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-amber-400/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-4xl" aria-hidden>{r.emoji}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                        #{r.fameRank}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-extrabold text-white group-hover:text-amber-200">
                      {r.name}
                    </h3>
                    <p className="mt-2 text-sm font-bold leading-snug text-amber-300">
                      {r.hookLine}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}

// ─── Documentary narrative — pulls from lib/famous-robots.ts ────────────────
import { getRobotDetail } from '@/lib/famous-robots';

function DocumentaryNarrative({ slug, robotName }: { slug: string; robotName: string }) {
  const d = getRobotDetail(slug);
  if (!d) return null;

  return (
    <>
      {/* Why you should care */}
      <section className="px-4 py-10 bg-gradient-to-b from-amber-500/5 to-transparent border-y border-amber-500/15">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-black uppercase tracking-widest text-amber-300">Why you should care</p>
          <p className="mt-3 text-xl leading-relaxed text-white">{d.whyYouShouldCare}</p>
        </div>
      </section>

      {/* Origin */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-black text-white">The origin story</h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-300">{d.origin}</p>
          <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">The problem it solved</p>
            <p className="mt-2 text-base leading-relaxed text-zinc-200">{d.theProblemItSolved}</p>
          </div>
        </div>
      </section>

      {/* How it actually works */}
      <section className="px-4 py-10 bg-gray-900/30">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-black text-white">How it actually works</h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-300">{d.howItActuallyWorks}</p>
        </div>
      </section>

      {/* The drama */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-black text-white">The drama</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-red-300">It almost failed</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">{d.failureMoment}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">The breakthrough</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">{d.breakthroughMoment}</p>
            </div>
          </div>
          {d.controversies ? (
            <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/8 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-300">Controversies</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">{d.controversies}</p>
            </div>
          ) : null}
        </div>
      </section>

      {/* India angle */}
      <section className="px-4 py-10 bg-gradient-to-br from-amber-500/8 via-orange-500/4 to-emerald-500/6 border-y border-amber-500/15">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-black uppercase tracking-widest text-amber-300">🇮🇳 India angle</p>
          <p className="mt-3 text-base leading-relaxed text-zinc-200"><strong className="text-white">India today: </strong>{d.indiaRelevance}</p>
          <p className="mt-4 text-base leading-relaxed text-zinc-200"><strong className="text-amber-300">What India should learn: </strong>{d.indiaLearning}</p>
        </div>
      </section>

      {/* Wow facts */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-black text-white">The wow facts</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {d.wowFacts.map((f, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-3xl font-black text-amber-300">{i + 1}</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-200">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legacy */}
      <section className="px-4 py-10 bg-gray-900/30">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-black text-white">The legacy</h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-300">{d.legacy}</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Economic impact</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-200">{d.economicImpact}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Jobs affected</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-200">{d.jobsAffected}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Robot family tree (connected concepts) */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-black text-white">Connected concepts</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {d.atlasLinks.map(a => (
              <a key={a} href={`/atlas/concept/${a}`} className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20">
                📚 {a}
              </a>
            ))}
            {d.robotFamily.map(a => (
              <a key={a} href={`/robots/${a}`} className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-amber-400/40">
                🤖 {a}
              </a>
            ))}
            {d.competitorRobots.map(a => (
              <a key={a} href={`/robots/${a}`} className="rounded-full border border-rose-500/30 bg-rose-500/5 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/15">
                ⚔️ Rival: {a}
              </a>
            ))}
          </div>
          <div className="mt-5">
            <a href={`/robots/compare?a=${slug}`} className="inline-block rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-500/20">
              ⚖️ Compare {robotName} with another robot →
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
