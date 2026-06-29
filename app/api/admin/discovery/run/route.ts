// Admin "Run now" — session-authed proxy to the discovery pipeline so
// we don't expose CRON_SECRET in the browser.

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { runDiscovery } from '@/lib/discovery';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((data?.role as string | undefined) !== 'admin') return { ok: false as const, status: 403 };
  return { ok: true as const };
}

export async function POST() {
  const gate = await requireAdmin();
  if (!gate.ok) return Response.json({ error: 'Forbidden' }, { status: gate.status });
  const result = await runDiscovery();
  return Response.json({ ok: true, ...result });
}
