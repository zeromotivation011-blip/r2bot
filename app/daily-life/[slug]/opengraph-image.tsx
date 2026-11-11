// Per-article social card for /daily-life/<slug>.
import { ImageResponse } from 'next/og';
import { getDailyLifeArticle } from '@/lib/daily-life-articles/loader';
import { CATEGORY_LABEL } from '@/lib/daily-life';
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/OgCard';

// Articles are MDX read from disk.
export const runtime = 'nodejs';
export const alt = 'R2BOT — Robotics in Daily Life';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getDailyLifeArticle(slug);
  return new ImageResponse(
    (
      <OgCard
        title={a?.title ?? 'Robotics in Daily Life'}
        summary={a?.excerpt ?? 'The robots already around you, explained.'}
        kicker={a ? `Daily Life · ${CATEGORY_LABEL[a.category]}` : 'Daily Life'}
      />
    ),
    size,
  );
}
