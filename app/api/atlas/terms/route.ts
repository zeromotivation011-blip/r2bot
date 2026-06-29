import { getAllAtlasEntries } from '@/lib/atlas';

// Cache the term map for an hour — the Atlas only changes on deploy.
export const revalidate = 3600;

export async function GET() {
  const entries = getAllAtlasEntries();
  const map: Record<string, string> = {};

  for (const e of entries) {
    const href = `/atlas/${e.type}/${e.slug}`;
    // Title — the canonical label that appears in chat bubbles.
    if (e.title && e.title.length >= 3) {
      // Only the first registration wins, so leave existing keys alone.
      const key = e.title;
      if (!map[key]) map[key] = href;
    }
    // Slug-as-term ("slam", "lidar") for entries whose title doesn't match
    // common usage (e.g. "Simultaneous Localization and Mapping" vs "SLAM").
    if (e.slug && e.slug.length >= 3 && !e.slug.includes('-')) {
      if (!map[e.slug]) map[e.slug] = href;
    }
  }

  return Response.json(map, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
