import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAcademyLesson } from '@/lib/academy';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { LessonHeader, LessonFooter, lessonCanonical } from '@/components/LessonChrome';

const TRACK = 'spark' as const;
const SLUG = '03';
const ACCENT = '#00B8D4';

export async function generateMetadata(): Promise<Metadata> {
  const lesson = getAcademyLesson(TRACK, SLUG);
  if (!lesson) return { title: 'Not found · Academy' };
  const canonical = lessonCanonical(TRACK, SLUG);
  return {
    title: lesson.title,
    description: lesson.description,
    alternates: { canonical },
    openGraph: {
      url: canonical,
      title: lesson.title,
      description: lesson.description,
      type: 'article',
    },
  };
}

export default function SparkLessonPage() {
  const lesson = getAcademyLesson(TRACK, SLUG);
  if (!lesson) notFound();

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />

      <article id="main-content" style={{ paddingTop: 140, paddingBottom: 100, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <LessonHeader track={TRACK} lessonSlug={SLUG} lessonTitle={lesson.title} />
          <a href="/academy"
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 13,
              letterSpacing: '.15em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginBottom: 28,
              transition: 'color .2s',
            }}
          >
            ← Back to Academy
          </a>

          <div
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 12,
              letterSpacing: '.35em',
              color: ACCENT,
              textTransform: 'uppercase',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ width: 24, height: 1, background: ACCENT }} />
            Spark · Lesson {lesson.lesson}
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
          </div>

          <p
            style={{
              fontSize: 22,
              lineHeight: 1.5,
              color: '#C8D0DC',
              margin: '0 0 44px',
              borderLeft: `3px solid ${ACCENT}`,
              paddingLeft: 22,
            }}
          >
            {lesson.description}
          </p>

          <div id="lesson-body" className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.body}</ReactMarkdown>
          </div>

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

          <div
            style={{
              marginTop: 60,
              paddingTop: 30,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <a
              href="/academy/spark/04"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 18px',
                borderRadius: 10,
                border: `1px solid ${ACCENT}`,
                color: ACCENT,
                fontSize: 14,
                fontFamily: 'var(--font-mono), monospace',
                letterSpacing: '.05em',
                transition: 'all .2s',
              }}
            >
              Next: Spark 04 →
            </a>
          </div>
          <LessonFooter track={TRACK} lessonSlug={SLUG} lessonTitle={lesson.title} xp={lesson.xp} />
        </div>

      </article>

      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
