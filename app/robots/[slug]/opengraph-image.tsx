// Per-robot social card for /robots/<slug>.
import { ImageResponse } from 'next/og';
import { getRobotBySlug, ROBOT_TYPE_LABELS } from '@/lib/robots-data';
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/OgCard';

export const runtime = 'nodejs';
export const alt = 'Robot profile on R2BOT';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const robot = getRobotBySlug(slug);
  return new ImageResponse(
    (
      <OgCard
        title={robot ? `${robot.name} by ${robot.maker}` : 'Robots'}
        summary={robot?.oneLiner ?? robot?.description ?? 'Specs, story and context for the robots that matter.'}
        kicker={robot ? `Robots · ${ROBOT_TYPE_LABELS[robot.type]}` : 'Robots'}
      />
    ),
    size,
  );
}
