// app/api/search-index/route.ts
//
// Serves the site-wide search index as JSON. The palette fetches this the
// first time it opens, not on page load: the index is ~900 rows, and putting
// it in every route's first-load bundle would undo the weight work that got
// shared JS to ~103 kB.
//
// Cached for an hour, same as the sitemap, so a new Atlas entry is findable
// within an hour of deploying without rebuilding this on every keystroke.

import { NextResponse } from 'next/server'
import { buildSearchIndex } from '@/lib/site-search'

export const revalidate = 3600

export async function GET() {
  const nodes = await buildSearchIndex()
  return NextResponse.json(
    { count: nodes.length, nodes },
    {
      headers: {
        // Shared cache for an hour; serve stale for a day rather than block a
        // keystroke on a cold regeneration.
        'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  )
}
