// app/api/robots/vote/route.ts
import type { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Payload = { robot_slug?: string; vote_type?: 'cool' | 'creepy' };

export async function POST(req: NextRequest) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const slug = (body.robot_slug ?? '').trim();
  const vote = body.vote_type;
  if (!slug || !/^[a-z0-9-]{2,40}$/.test(slug)) {
    return Response.json({ error: 'robot_slug required' }, { status: 400 });
  }
  if (vote !== 'cool' && vote !== 'creepy') {
    return Response.json({ error: "vote_type must be 'cool' or 'creepy'" }, { status: 400 });
  }
  const ip = (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '').split(',')[0]?.trim() || null;

  // Server-only writes (service role): the public INSERT policy on robot_votes is being removed,
  // so votes can no longer be stuffed directly through the public REST API.
  const supabase = createSupabaseAdminClient();

  // One vote per IP per robot per 24h (best-effort: skipped when the IP is unknown).
  let duplicate = false;
  if (ip) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('robot_votes')
      .select('id', { count: 'exact', head: true })
      .eq('robot_slug', slug)
      .eq('user_ip', ip)
      .gte('created_at', since);
    duplicate = (count ?? 0) > 0;
  }

  if (!duplicate) {
    const { error: insertErr } = await supabase.from('robot_votes').insert({ robot_slug: slug, vote_type: vote, user_ip: ip });
    if (insertErr) {
      console.error('[robots/vote] insert failed', insertErr);
      return Response.json({ error: 'Could not record vote' }, { status: 500 });
    }
  }

  const { data: tally } = await supabase
    .from('robot_vote_tally')
    .select('cool_votes, creepy_votes')
    .eq('robot_slug', slug)
    .maybeSingle();

  return Response.json({
    cool_count: (tally?.cool_votes as number) ?? 0,
    creepy_count: (tally?.creepy_votes as number) ?? 0,
    duplicate,
  });
}
