// Toggle an upvote on a post or reply. Returns the new state.
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = { target_type?: 'post' | 'reply'; target_id?: string };

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  const targetType = body?.target_type;
  const targetId = body?.target_id;
  if (!targetId || (targetType !== 'post' && targetType !== 'reply')) {
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }

  // Is this user already up-voted? Toggle.
  const { data: existing } = await supabase
    .from('lab_upvotes')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle();

  let upvoted: boolean;
  if (existing) {
    const { error } = await supabase
      .from('lab_upvotes')
      .delete()
      .eq('id', existing.id as string);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    upvoted = false;
  } else {
    const { error } = await supabase
      .from('lab_upvotes')
      .insert({ user_id: user.id, target_type: targetType, target_id: targetId });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    upvoted = true;
  }

  // Recompute denormalised count on the target row.
  const { count } = await supabase
    .from('lab_upvotes')
    .select('id', { count: 'exact', head: true })
    .eq('target_type', targetType)
    .eq('target_id', targetId);
  const total = count ?? 0;
  const table = targetType === 'post' ? 'lab_posts' : 'lab_replies';
  await supabase.from(table).update({ upvotes: total }).eq('id', targetId);

  return Response.json({ upvoted, count: total });
}
