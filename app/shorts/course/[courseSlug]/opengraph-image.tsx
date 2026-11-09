// Per-mini-course social card for /shorts/course/<courseSlug>.
import { ImageResponse } from 'next/og';
import { SHORT_COURSES, shortsInCourse } from '@/lib/shorts';
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/OgCard';

export const runtime = 'nodejs';
export const alt = 'R2BOT Quick Lessons mini-course';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const course = SHORT_COURSES.find((c) => c.slug === courseSlug);
  const n = course ? shortsInCourse(course.slug).length : 0;
  return new ImageResponse(
    (
      <OgCard
        title={course?.title ?? 'Quick Lessons'}
        summary={course?.blurb ?? 'One-minute robotics lessons with a demo and one question each.'}
        kicker={course ? `Quick Lessons · ${n} one-minute lessons` : 'Quick Lessons'}
      />
    ),
    size,
  );
}
