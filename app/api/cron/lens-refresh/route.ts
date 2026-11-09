// Daily Lens refresh. Invoked by Vercel Cron.
// Re-ingests the curated YouTube channels and re-summarizes with Claude so the
// /lens "Fresh from YouTube" feed stays current without waiting for a visitor.
// Authenticates via Authorization: Bearer <CRON_SECRET>.

import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getLiveLensVideos } from '@/lib/lens-live';
import { isCronAuthorized } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  return isCronAuthorized(req.headers.get('authorization'));
}

async function handle(req: NextRequest): Promise<Response> {
  if (!authorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Invalidate the 6h cache, then re-populate immediately.
  revalidateTag('lens-live');
  const videos = await getLiveLensVideos();
  return Response.json({ ok: true, count: videos.length });
}

export const GET = handle;
export const POST = handle;
