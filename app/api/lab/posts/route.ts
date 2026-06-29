// Lab posts: list (GET) and create (POST).
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { deriveAuthorDisplay, isContentType, type LabContentType } from '@/lib/lab';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const contentType = url.searchParams.get('content_type');
  const contentSlug = url.searchParams.get('content_slug');
  const page = Math.max(0, Number(url.searchParams.get('page') ?? '0'));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '20')));

  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from('lab_posts')
    .select(
      'id, user_id, author_display, content_type, content_slug, title, body, upvotes, reply_count, is_pinned, created_at',
      { count: 'exact' },
    )
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(page * limit, page * limit + limit - 1);

  if (contentType && isContentType(contentType)) {
    q = q.eq('content_type', contentType);
    if (contentSlug) q = q.eq('content_slug', contentSlug);
  }

  const { data, error, count } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ posts: data ?? [], total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    content_type?: string;
    content_slug?: string | null;
    title?: string;
    body?: string;
  } | null;
  if (!body) return Response.json({ error: 'Bad request' }, { status: 400 });
  if (!isContentType(body.content_type)) return Response.json({ error: 'Bad content_type' }, { status: 400 });
  const title = (body.title ?? '').trim();
  const text = (body.body ?? '').trim();
  if (title.length < 5 || title.length > 150) return Response.json({ error: 'Title length 5-150' }, { status: 400 });
  if (text.length < 10 || text.length > 2000) return Response.json({ error: 'Body length 10-2000' }, { status: 400 });

  const authorDisplay = await deriveAuthorDisplay(supabase, user.id, user.email);
  const contentSlug = (body.content_slug ?? '').trim() || null;
  const contentType = body.content_type as LabContentType;

  const { data, error } = await supabase
    .from('lab_posts')
    .insert({
      user_id: user.id,
      author_display: authorDisplay,
      content_type: contentType,
      content_slug: contentSlug,
      title,
      body: text,
    })
    .select(
      'id, user_id, author_display, content_type, content_slug, title, body, upvotes, reply_count, is_pinned, created_at',
    )
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ post: data });
}
