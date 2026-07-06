import { Breadcrumbs } from './Breadcrumbs';
import { ReadingProgress } from './ReadingProgress';
import { BackToTop } from './BackToTop';
import { ShareRow } from './ShareRow';
import { ConfusedButton } from './AskR2Inline';
import { CopyHeadingPlugin } from './CopyHeadingPlugin';
import { CopilotContextBinder } from './CopilotProvider';
import { BookmarkButton } from './BookmarkButton';
import { PageViewTracker } from './PageViewTracker';
import { LessonComplete } from './LessonComplete';
import { LessonCertificate } from './LessonCertificate';
import { LabThread } from './lab/LabThread';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.r2bot.in';

const KEY_CONCEPTS: Record<string, string[]> = {
  '01': ['sense-think-act-loop', 'robot', 'autonomy'],
  '02': ['dc-motor', 'servo-motor', 'stepper-motor'],
  '03': ['camera-vision', 'lidar', 'encoder', 'imu', 'sensor-fusion'],
  '04': ['microcontroller', 'single-board-computer', 'ros'],
  '05': ['graceful-degradation', 'redundancy', 'embedded-system'],
  '06': ['reinforcement-learning', 'embodied-ai'],
};

export function LessonHeader({
  track,
  lessonSlug,
  lessonTitle,
}: {
  track: 'spark';
  lessonSlug: string;
  lessonTitle: string;
}) {
  const concepts = KEY_CONCEPTS[lessonSlug] ?? [];
  const contentSlug = `${track}/${lessonSlug}`;
  return (
    <>
      <ReadingProgress />
      <PageViewTracker contentType="academy" contentSlug={contentSlug} />
      <CopilotContextBinder
        context={{ title: lessonTitle, kind: 'academy' }}
      />
      <CopyHeadingPlugin targetSelector="#lesson-body" />
      <Breadcrumbs
        trail={[
          { label: 'Academy', href: '/academy' },
          { label: track === 'spark' ? 'Spark' : track, href: `/academy/${track}/01` },
          { label: `Lesson ${lessonSlug}` },
        ]}
      />
      {concepts.length > 0 && (
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
            In this lesson
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {concepts.map((slug) => (
              <a
                key={slug}
                href={`/atlas/concept/${slug}`}
                style={{
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--border-2)',
                  background: 'rgba(0,184,212,.08)',
                  color: 'var(--cyan)',
                  fontSize: 13,
                }}
              >
                {slug.replace(/-/g, ' ')}
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

const NEXT_SLUG_AFTER: Record<string, string | null> = {
  '01': '02',
  '02': '03',
  '03': '04',
  '04': '05',
  '05': '06',
  '06': null,
};

export function LessonFooter({
  lessonTitle,
  lessonSlug,
  track,
  xp,
}: {
  lessonTitle: string;
  lessonSlug: string;
  track: 'spark';
  xp?: number;
}) {
  const url = `${BASE_URL}/academy/${track}/${lessonSlug}`;
  const contentSlug = `${track}/${lessonSlug}`;
  const nextSlug = NEXT_SLUG_AFTER[lessonSlug];
  const nextHref = nextSlug ? `/academy/${track}/${nextSlug}` : undefined;

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', margin: '40px 0 24px' }}>
        <ShareRow title={lessonTitle} url={url} />
        <BookmarkButton contentType="academy" contentSlug={contentSlug} contentTitle={lessonTitle} />
      </div>
      <div style={{ margin: '24px 0 12px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <LessonComplete
          track={track}
          lessonSlug={lessonSlug}
          lessonTitle={lessonTitle}
          nextHref={nextHref}
          xp={xp}
        />
        <LessonCertificate track={track} lessonSlug={lessonSlug} lessonTitle={lessonTitle} />
        <ConfusedButton lessonTitle={lessonTitle} />
      </div>

      {/* Community Lab thread for this lesson */}
      <LabThread contentType="academy" contentSlug={`${track}/${lessonSlug}`} />
      <p style={{ marginTop: 32, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
        Spotted something off?{' '}
        <a
          href={`mailto:ravi6703@gmail.com?subject=${encodeURIComponent(
            `Error report: ${lessonTitle}`,
          )}&body=${encodeURIComponent(`Page: ${url}\nIssue: `)}`}
          style={{ color: 'var(--cyan)', borderBottom: '1px dashed var(--border-2)' }}
        >
          Report an error →
        </a>
      </p>
      <BackToTop />
    </>
  );
}

export function lessonCanonical(track: 'spark', lessonSlug: string): string {
  return `${BASE_URL}/academy/${track}/${lessonSlug}`;
}
