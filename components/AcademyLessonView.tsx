import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { LessonHeader, LessonFooter } from '@/components/LessonChrome';
import {
  LessonPdfButton,
  LessonBookmarkButton,
  LessonAskR2Bubble,
  LessonScrollResume,
  LessonDiscussion,
} from '@/components/academy/LessonExtras';
import type { AcademyLesson, AcademyTrack } from '@/lib/academy';
import { getLessonsForTrack, TRACK_ACCENT, trackLabel, isoDuration } from '@/lib/academy';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://r2bot-psi.vercel.app';

export function AcademyLessonView({ lesson }: { lesson: AcademyLesson }) {
  const accent = TRACK_ACCENT[lesson.track];
  const all = getLessonsForTrack(lesson.track);
  const idx = all.findIndex((l) => l.slug === lesson.slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
  const lessonNumLabel = lesson.slug.padStart(2, '0');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: lesson.title,
    description: lesson.description,
    educationalLevel: lesson.track,
    timeRequired: isoDuration(lesson.estimated_minutes),
    inLanguage: ['en', 'hi'],
    url: `${BASE_URL}/academy/${lesson.track}/${lesson.slug}`,
    publisher: { '@type': 'Organization', name: 'R2BOT', url: BASE_URL },
    learningResourceType: 'Lesson',
    keywords: (lesson.atlas_links ?? []).join(', '),
  };

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article id="main-content" className="academy-lesson" style={{ paddingTop: 140, paddingBottom: 100, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <LessonHeader track={lesson.track as 'spark'} lessonSlug={lesson.slug} lessonTitle={lesson.title} />

          <a
            href={`/academy/${lesson.track}`}
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 13,
              letterSpacing: '.15em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginBottom: 28,
            }}
          >
            ← {trackLabel(lesson.track)} track
          </a>

          <div
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 12,
              letterSpacing: '.35em',
              color: accent,
              textTransform: 'uppercase',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ width: 24, height: 1, background: accent }} />
            {trackLabel(lesson.track)} · Lesson {lessonNumLabel}
            {lesson.xp ? (
              <span style={{
                padding: '2px 10px',
                borderRadius: 999,
                border: `1px solid ${accent}`,
                background: `${accent}22`,
                color: accent,
                fontSize: 10.5,
                letterSpacing: '.15em',
                fontFamily: 'var(--font-mono), monospace',
              }}>
                +{lesson.xp} XP
              </span>
            ) : null}
            {lesson.hindi_name ? (
              <span style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 0, textTransform: 'none' }}>
                {lesson.hindi_name}
              </span>
            ) : null}
          </div>

          <h1
            className="display"
            style={{
              fontSize: 'clamp(40px, 5.5vw, 60px)',
              lineHeight: 1.08,
              margin: '0 0 18px',
              color: 'var(--mist)',
            }}
          >
            {lesson.title}
          </h1>

          <div
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 13,
              color: 'var(--muted)',
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              marginBottom: 36,
            }}
          >
            {lesson.duration}
            {lesson.estimated_minutes ? ` · ~${lesson.estimated_minutes} min` : ''}
          </div>

          <p
            style={{
              fontSize: 22,
              lineHeight: 1.5,
              color: '#C8D0DC',
              margin: '0 0 44px',
              borderLeft: `3px solid ${accent}`,
              paddingLeft: 22,
            }}
          >
            {lesson.description}
          </p>

          {/* Extras: bookmark + PDF row, scroll-resume banner */}
          <div className="not-prose mb-4 flex flex-wrap items-center gap-2 print:hidden">
            <LessonBookmarkButton track={lesson.track} slug={lesson.slug} title={lesson.title} />
            <LessonPdfButton />
          </div>
          <LessonScrollResume track={lesson.track} slug={lesson.slug} />
          <div id="lesson-body" className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.body}</ReactMarkdown>
          </div>
          <LessonDiscussion track={lesson.track} slug={lesson.slug} />
          <LessonAskR2Bubble track={lesson.track} slug={lesson.slug} lessonTitle={lesson.title} />

          {lesson.sources.length > 0 && (
            <section style={{ margin: '50px 0', paddingTop: 30, borderTop: '1px solid var(--border)' }}>
              <div className="section-eyebrow">Sources</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {lesson.sources.map((s) => (
                  <li key={s.url} style={{ marginBottom: 10 }}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--cyan)', fontSize: 14.5 }}
                    >
                      {s.name} →
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Prev / Next nav */}
          <nav
            style={{
              marginTop: 50,
              paddingTop: 28,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            {prev ? (
              <a
                href={`/academy/${prev.track}/${prev.slug}`}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--border-2)',
                  color: 'var(--mist)',
                  fontSize: 13.5,
                  textDecoration: 'none',
                  fontFamily: 'var(--font-mono), monospace',
                }}
              >
                ← {trackLabel(prev.track)} · {prev.slug}
              </a>
            ) : <span />}
            {next ? (
              <a
                href={`/academy/${next.track}/${next.slug}`}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: `1px solid ${accent}`,
                  background: `${accent}1a`,
                  color: accent,
                  fontSize: 14,
                  textDecoration: 'none',
                  fontFamily: 'var(--font-mono), monospace',
                  letterSpacing: '.05em',
                }}
              >
                Next: {trackLabel(next.track)} · {next.slug} →
              </a>
            ) : <span />}
          </nav>

          <LessonFooter track={lesson.track as 'spark'} lessonSlug={lesson.slug} lessonTitle={lesson.title} xp={lesson.xp} />
        </div>
      </article>

      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
