// Mark a discovery row as added_to_atlas or dismissed.
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = { id: string; status: 'added_to_atlas' | 'dismissed' };

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile?.role as string | undefined) !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.id || !['added_to_atlas', 'dismissed'].includes(body.status)) {
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }
  const { error } = await supabase
    .from('discovery_queue')
    .update({ status: body.status })
    .eq('id', body.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
