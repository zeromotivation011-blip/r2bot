// Admin moderation endpoint for the project showcase.
//
// GET   — list pending projects (admins only).
// PATCH — { id, status?: 'approved'|'rejected', featured?: boolean }.

import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null, isAdmin: false };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  return { supabase, user, isAdmin: profile?.role === 'admin' };
}

export async function GET() {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return Response.json({ error: 'Admin only.' }, { status: 403 });

  const { data, error } = await supabase
    .from('projects')
    .select(
      'id, user_id, title, description, track, video_url, github_url, demo_url, thumbnail_url, tags, upvotes, status, featured, created_at, updated_at',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ projects: data ?? [] });
}

type PatchBody = {
  id?: unknown;
  status?: unknown;
  featured?: unknown;
};

export async function PATCH(req: NextRequest) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return Response.json({ error: 'Admin only.' }, { status: 403 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: 'Bad project id.' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.status === 'approved' || body.status === 'rejected') {
    update.status = body.status;
  }
  if (typeof body.featured === 'boolean') {
    update.featured = body.featured;
    // Featuring a project implies approval — saves a second click.
    if (body.featured && update.status === undefined) {
      update.status = 'approved';
    }
  }
  if (Object.keys(update).length === 0) {
    return Response.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const { error } = await supabase.from('projects').update(update).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
