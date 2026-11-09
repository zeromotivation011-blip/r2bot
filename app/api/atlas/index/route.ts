import { getAllAtlasEntriesMerged } from '@/lib/atlas-db';
import { resolveBucket } from '@/lib/atlas-buckets';

// Light-weight index of every Atlas entry — slug, type, title, one-line
// summary and bucket. Client features that used to receive the whole Atlas as
// props (compare picker, "surprise me", hub search and drawer) fetch this on
// first interaction instead, which took ~500 KB of inline RSC payload off
// every /atlas/* page. Cached for a day, like the entry pages themselves.
export const revalidate = 86400;

export type AtlasIndexItem = {
  slug: string;
  type: string;
  title: string;
  summary: string;
  bucket?: string;
};

export async function GET() {
  const entries = await getAllAtlasEntriesMerged();
  const items: AtlasIndexItem[] = entries.map((e) => {
    const bucket = resolveBucket(e);
    return {
      slug: e.slug,
      type: e.type,
      title: e.title,
      summary: e.summary,
      ...(bucket ? { bucket } : {}),
    };
  });
  return Response.json(items, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
