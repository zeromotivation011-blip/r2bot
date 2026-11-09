// Nightly discovery cron. Invoked by Vercel Cron at 0 6 * * * UTC.
// Authenticates via Authorization: Bearer <CRON_SECRET> header.

import type { NextRequest } from 'next/server';
import { runDiscovery } from '@/lib/discovery';
import { isCronAuthorized } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  return isCronAuthorized(req.headers.get('authorization'));
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runDiscovery();
  return Response.json({ ok: true, ...result });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runDiscovery();
  return Response.json({ ok: true, ...result });
}
