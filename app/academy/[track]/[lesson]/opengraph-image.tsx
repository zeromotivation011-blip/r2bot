// Per-lesson social card for /academy/<track>/<lesson>.
import { ImageResponse } from 'next/og';
import { getAcademyLesson, trackLabel, type AcademyTrack } from '@/lib/academy';
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/OgCard';

// Lessons are MDX read from disk.
export const runtime = 'nodejs';
export const alt = 'R2BOT Academy lesson';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const TRACKS = ['spark', 'wire', 'forge', 'edge'] as const;

export default async function Image({ params }: { params: Promise<{ track: string; lesson: string }> }) {
  const { track, lesson: slug } = await params;
  const valid = (TRACKS as readonly string[]).includes(track);
  const lesson = valid ? getAcademyLesson(track as AcademyTrack, slug) : null;
  return new ImageResponse(
    (
      <OgCard
        title={lesson?.title ?? 'R2BOT Academy'}
        summary={lesson?.description ?? 'Hands-on written robotics lessons, from first spark to the edge.'}
        kicker={`Academy · ${valid ? trackLabel(track as AcademyTrack) : 'Lesson'}`}
      />
    ),
    size,
  );
}
