// Per-post social card for /blog/<slug>.
import { ImageResponse } from 'next/og';
import { getPostBySlugMerged } from '@/lib/blog-db';
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/OgCard';

// Posts are MDX read from disk (merged with the CMS table).
export const runtime = 'nodejs';
export const alt = 'R2BOT blog post';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlugMerged(slug);
  return new ImageResponse(
    (
      <OgCard
        title={post?.title ?? 'R2BOT Blog'}
        summary={post?.description ?? 'Explainers and comparisons from the robotics knowledge base.'}
        kicker="Blog"
      />
    ),
    size,
  );
}
