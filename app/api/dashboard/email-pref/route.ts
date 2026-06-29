// Flip email_digest_enabled on/off for the current user.
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { enabled?: boolean } | null;
  if (typeof body?.enabled !== 'boolean') {
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }
  const { error } = await supabase
    .from('profiles')
    .update({ email_digest_enabled: body.enabled })
    .eq('id', user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, enabled: body.enabled });
}
