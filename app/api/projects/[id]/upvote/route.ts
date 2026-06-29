// Toggle-upvote endpoint. Inserts into project_upvotes; if a row already
// exists, deletes it instead. Then rewrites projects.upvotes from the real
// count so we never drift.

import type { NextRequest } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to upvote.' }, { status: 401 });

  const { id: projectId } = await params;
  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return Response.json({ error: 'Bad project id.' }, { status: 400 });
  }

  // Check if a vote already exists.
  const { data: existing } = await supabase
    .from('project_upvotes')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  let upvoted: boolean;
  if (existing) {
    const { error } = await supabase
      .from('project_upvotes')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    upvoted = false;
  } else {
    const { error } = await supabase
      .from('project_upvotes')
      .insert({ project_id: projectId, user_id: user.id });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    upvoted = true;
  }

  // Recount. Use service role so the projects.upvotes write isn't blocked by RLS
  // (only project owners + admins can update projects directly).
  const admin = createSupabaseAdminClient();
  const { count } = await admin
    .from('project_upvotes')
    .select('user_id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const total = count ?? 0;
  await admin.from('projects').update({ upvotes: total }).eq('id', projectId);

  return Response.json({ upvoted, count: total });
}
