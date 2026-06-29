// Replies to a lab post: list (GET) and create (POST).
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { deriveAuthorDisplay } from '@/lib/lab';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id) return Response.json({ error: 'Bad id' }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('lab_replies')
    .select('id, post_id, user_id, author_display, body, upvotes, created_at')
    .eq('post_id', id)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ replies: data ?? [] });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id) return Response.json({ error: 'Bad id' }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { body?: string } | null;
  const text = (body?.body ?? '').trim();
  if (text.length < 2 || text.length > 1000) {
    return Response.json({ error: 'Body length 2-1000' }, { status: 400 });
  }

  const authorDisplay = await deriveAuthorDisplay(supabase, user.id, user.email);

  const { data: created, error } = await supabase
    .from('lab_replies')
    .insert({
      post_id: id,
      user_id: user.id,
      author_display: authorDisplay,
      body: text,
    })
    .select('id, post_id, user_id, author_display, body, upvotes, created_at')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Best-effort increment of denormalised reply_count. If it fails we still
  // succeeded on the reply itself; the count will catch up via the COUNT
  // recompute on the next mutation through the upvote/reply path.
  const { data: current } = await supabase
    .from('lab_posts')
    .select('reply_count')
    .eq('id', id)
    .maybeSingle();
  if (current) {
    await supabase
      .from('lab_posts')
      .update({ reply_count: (current.reply_count as number) + 1 })
      .eq('id', id);
  }

  return Response.json({ reply: created });
}
