// Consolidated daily cron. The Vercel Hobby plan allows only 2 cron jobs, so
// discovery + lens + news are run here in a single scheduled invocation instead
// of three separate ones. Each step is isolated: if one fails, the others still run.
// Authenticates via Authorization: Bearer <CRON_SECRET>.

import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getNewsData } from '@/lib/news';
import { getLiveLensVideos } from '@/lib/lens-live';
import { runDiscovery } from '@/lib/discovery';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (req.headers.get('authorization') ?? '') === `Bearer ${secret}`;
}

type StepResult = { ok: boolean; detail?: unknown; error?: string };

async function archiveNews(): Promise<StepResult> {
  const { articles } = await getNewsData();
  if (articles.length === 0) return { ok: true, detail: { upserted: 0 } };
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
  if (error) return { ok: false, error: error.message };
  return { ok: true, detail: { upserted: rows.length } };
}

async function refreshLens(): Promise<StepResult> {
  revalidateTag('lens-live');
  const videos = await getLiveLensVideos();
  return { ok: true, detail: { count: videos.length } };
}

async function refreshDiscovery(): Promise<StepResult> {
  const result = await runDiscovery();
  return { ok: true, detail: result };
}

async function handle(req: NextRequest): Promise<Response> {
  if (!authorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const steps: Record<string, StepResult> = {};
  for (const [name, fn] of [
    ['news', archiveNews],
    ['lens', refreshLens],
    ['discovery', refreshDiscovery],
  ] as const) {
    try {
      steps[name] = await fn();
    } catch (e) {
      steps[name] = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  const ok = Object.values(steps).every((s) => s.ok);
  return Response.json({ ok, steps }, { status: ok ? 200 : 207 });
}

export const GET = handle;
export const POST = handle;
