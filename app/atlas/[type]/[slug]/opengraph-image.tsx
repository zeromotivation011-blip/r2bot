// Per-entry social card for /atlas/<type>/<slug>.
import { ImageResponse } from 'next/og';
import { getAtlasEntryMerged } from '@/lib/atlas-db';
import { typeLabel, type AtlasType } from '@/lib/atlas';
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/OgCard';

// The Atlas loaders read MDX from disk.
export const runtime = 'nodejs';
export const alt = 'R2BOT Robotics Atlas';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ type: string; slug: string }> }) {
  const { type, slug } = await params;
  const entry = await getAtlasEntryMerged(type as AtlasType, slug);
  return new ImageResponse(
    (
      <OgCard
        title={entry?.title ?? 'Robotics Atlas'}
        summary={entry?.summary ?? 'Every robotics concept, explained once and properly.'}
        kicker={`Atlas · ${entry ? typeLabel(entry.type) : 'Concept'}`}
      />
    ),
    size,
  );
}
