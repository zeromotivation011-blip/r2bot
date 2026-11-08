import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import {
  TRACK_ORDER,
  TRACK_BLURB,
  getLessonsForTrack,
  trackLabel,
  type AcademyLesson,
} from '@/lib/academy';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export const metadata: Metadata = {
  title: 'Academy: Written Robotics Lessons, Beginner to Research',
  description:
    'Nineteen written robotics lessons in four tracks: foundations, Arduino and ROS 2, Nav2 and MoveIt2, SLAM and multi-robot. Free, with sources on every lesson.',
  alternates: { canonical: `${BASE_URL}/academy` },
};

export const revalidate = 86400;

const TRACK_EMOJI = { spark: '⚡', wire: '🔌', forge: '🔥', edge: '🧠' } as const;
const TRACK_LEVEL = {
  spark: 'Beginner',
  wire: 'Intermediate',
  forge: 'Advanced',
  edge: 'Research',
} as const;

function minutesFor(lessons: AcademyLesson[]): number {
  return lessons.reduce((sum, l) => sum + (l.estimated_minutes ?? 12), 0);
}

export default function AcademyPage() {
  const tracks = TRACK_ORDER.map((track) => {
    const lessons = getLessonsForTrack(track);
    return { track, lessons, minutes: minutesFor(lessons) };
  }).filter((t) => t.lessons.length > 0);

  const totalLessons = tracks.reduce((n, t) => n + t.lessons.length, 0);
  const first = tracks[0]?.lessons[0];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'R2BOT Academy tracks',
    itemListElement: tracks.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/academy/${t.track}`,
      name: `${trackLabel(t.track)} — ${t.lessons.length} lessons`,
    })),
  };

  return (
    <CopilotProvider>
      <Nav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main id="main-content" className="mx-auto max-w-4xl px-5 pb-20 pt-28">
        <p className="r2-eyebrow">The Academy</p>
        <h1 className="r2-display">
          {totalLessons} written lessons, in four tracks
        </h1>
        <p className="mt-4 max-w-2xl text-gray-400">
          Read-and-understand lessons with worked examples and sources on every page. If you would
          rather watch, the{' '}
          <Link href="/courses" className="r2-link">free course path</Link>{' '}
          covers the same ground as short videos with quizzes and certificates, and{' '}
          <Link href="/shorts" className="r2-link">Quick Lessons</Link>{' '}
          explain one idea each in a minute.
        </p>

        {/* One recommended next step, not four competing ones. */}
        {first && (
          <div className="mt-8 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-5">
            <p className="r2-eyebrow">Start here</p>
            <h2 className="mt-1 text-xl font-bold text-white">{first.title}</h2>
            {first.description && <p className="mt-1 text-sm text-gray-300">{first.description}</p>}
            <Link
              href={`/academy/${first.track}/${first.slug}`}
              className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-amber-500 px-5 font-bold text-black"
            >
              Read lesson 1 →
            </Link>
          </div>
        )}

        <ol className="mt-10 space-y-5">
          {tracks.map(({ track, lessons, minutes }, i) => (
            <li key={track} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl" aria-hidden>{TRACK_EMOJI[track]}</span>
                <h2 className="text-xl font-black text-white">
                  <Link href={`/academy/${track}`} className="hover:text-amber-300">
                    {i + 1}. {trackLabel(track)}
                  </Link>
                </h2>
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-gray-300">
                  {TRACK_LEVEL[track]}
                </span>
                <span className="text-xs text-gray-500">
                  {lessons.length} lesson{lessons.length === 1 ? '' : 's'} · about {minutes} min
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-400">{TRACK_BLURB[track]}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {lessons.map((l) => (
                  <li key={l.slug}>
                    <Link
                      href={`/academy/${track}/${l.slug}`}
                      className="inline-flex min-h-[32px] items-center text-gray-300 hover:text-amber-300"
                    >
                      <span className="mr-2 font-mono text-xs text-gray-600">{l.slug}</span>
                      {l.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-sm text-gray-500">
          Not sure where you fit? The{' '}
          <Link href="/diagnostic" className="r2-link">two-minute placement test</Link>{' '}
          puts you on a track. Every lesson links to{' '}
          <Link href="/atlas" className="r2-link">the Atlas</Link> for definitions.
        </p>
      </main>

      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
