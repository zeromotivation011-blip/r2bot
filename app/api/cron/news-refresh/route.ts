// Daily news archive. Invoked by Vercel Cron.
// Fetches the live aggregated feed and upserts each story into the `news` table
// (0033) so news becomes a browsable, SEO-indexable, curatable archive.
// Only ingest columns are written — pinned/hidden/curated_summary are preserved.
// Authenticates via Authorization: Bearer <CRON_SECRET>.

import type { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getNewsData } from '@/lib/news';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (req.headers.get('authorization') ?? '') === `Bearer ${secret}`;
}

async function handle(req: NextRequest): Promise<Response> {
  if (!authorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { articles } = await getNewsData();
  if (articles.length === 0) return Response.json({ ok: true, upserted: 0 });

  const supabase = createSupabaseAdminClient();
  const rows = articles.map((a) => ({
    url: a.url,
    title: a.title,
    source: a.source,
    topic: a.topic,
    published_at: a.publishedAt,
    image_url: a.imageUrl ?? null,
    summary: a.aiSummary || a.description || '',
    article: a,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('news').upsert(rows, { onConflict: 'url' });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, upserted: rows.length });
}

export const GET = handle;
export const POST = handle;
