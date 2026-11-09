import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { getAcademyLesson, type AcademyTrack } from '@/lib/academy';

type Body = {
  track?: string;
  lessonSlug?: string;
  lessonTitle?: string;
};

const VALID_TRACKS = new Set(['spark', 'wire', 'forge', 'edge']);

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const track = String(body.track ?? '');
  const lessonSlug = String(body.lessonSlug ?? '');

  if (!VALID_TRACKS.has(track)) {
    return NextResponse.json({ error: 'Invalid track' }, { status: 400 });
  }
  // lessonSlug is "<track>/<nn>". The title comes from our own content, never
  // from the request: it is printed on a public /verify page.
  const slugPart = lessonSlug.startsWith(`${track}/`) ? lessonSlug.slice(track.length + 1) : '';
  const lesson = slugPart ? getAcademyLesson(track as AcademyTrack, slugPart) : null;
  if (!lesson) {
    return NextResponse.json({ error: 'Unknown lesson' }, { status: 400 });
  }
  const lessonTitle = lesson.title;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Writes go through the service-role client: users have no INSERT policy on
  // certificates since migration 0051 (they could mint their own before).
  const admin = createSupabaseAdminClient();

  // Check if a certificate already exists for this lesson — return existing.
  const { data: existing } = await admin
    .from('certificates')
    .select('certificate_id, issued_at, lesson_title, track')
    .eq('user_id', user.id)
    .eq('lesson_slug', lessonSlug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      certificateId: existing.certificate_id,
      issuedAt: existing.issued_at,
      lessonTitle: existing.lesson_title,
      track: existing.track,
      isNew: false,
    });
  }

  const { data, error } = await admin
    .from('certificates')
    .insert({
      user_id: user.id,
      track,
      lesson_slug: lessonSlug,
      lesson_title: lessonTitle,
    })
    .select('certificate_id, issued_at, lesson_title, track')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({
    certificateId: data.certificate_id,
    issuedAt: data.issued_at,
    lessonTitle: data.lesson_title,
    track: data.track,
    isNew: true,
  });
}
