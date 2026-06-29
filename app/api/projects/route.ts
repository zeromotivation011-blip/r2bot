// Public list + auth-required submit endpoint for the project showcase.

import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  type ProjectTrack,
  isAllowedVideoUrl,
  youtubeThumbnailUrl,
  youtubeVideoId,
} from '@/lib/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_TRACKS: ProjectTrack[] = ['spark', 'wire', 'forge', 'edge'];

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const url = new URL(req.url);
  const track = url.searchParams.get('track');
  const sort = url.searchParams.get('sort') === 'top' ? 'top' : 'newest';
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(48, Math.max(1, Number(url.searchParams.get('limit') ?? '12')));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('projects')
    .select(
      'id, user_id, title, description, track, video_url, github_url, demo_url, thumbnail_url, tags, upvotes, status, featured, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('status', 'approved');

  if (track && VALID_TRACKS.includes(track as ProjectTrack)) {
    query = query.eq('track', track);
  }

  query =
    sort === 'top'
      ? query.order('upvotes', { ascending: false }).order('created_at', { ascending: false })
      : query.order('created_at', { ascending: false });

  const { data, count, error } = await query.range(from, to);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ projects: data ?? [], total: count ?? 0 });
}

type SubmitBody = {
  title?: unknown;
  description?: unknown;
  track?: unknown;
  video_url?: unknown;
  github_url?: unknown;
  demo_url?: unknown;
  tags?: unknown;
};

function asString(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function asUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to submit a project.' }, { status: 401 });

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const title = asString(body.title, 100);
  const description = asString(body.description, 2000);
  const trackRaw = typeof body.track === 'string' ? body.track : '';
  const track = VALID_TRACKS.includes(trackRaw as ProjectTrack) ? (trackRaw as ProjectTrack) : null;

  if (!title || title.length < 5) {
    return Response.json({ error: 'Title must be 5–100 characters.' }, { status: 400 });
  }
  if (!description || description.length < 50) {
    return Response.json({ error: 'Description must be 50–2000 characters.' }, { status: 400 });
  }
  if (!track) {
    return Response.json({ error: 'Track is required (spark/wire/forge/edge).' }, { status: 400 });
  }

  const video_url = asUrl(body.video_url);
  if (video_url && !isAllowedVideoUrl(video_url)) {
    return Response.json({ error: 'Video must be a YouTube or Loom URL.' }, { status: 400 });
  }

  const github_url = asUrl(body.github_url);
  const demo_url = asUrl(body.demo_url);

  let tags: string[] = [];
  if (Array.isArray(body.tags)) {
    tags = body.tags
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.length <= 20)
      .slice(0, 5);
  } else if (typeof body.tags === 'string') {
    tags = body.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.length <= 20)
      .slice(0, 5);
  }

  // Derive thumbnail when we can.
  let thumbnail_url: string | null = null;
  if (video_url) {
    const yt = youtubeVideoId(video_url);
    if (yt) thumbnail_url = youtubeThumbnailUrl(yt);
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title,
      description,
      track,
      video_url,
      github_url,
      demo_url,
      thumbnail_url,
      tags,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: data?.id });
}
