// app/api/schools/register/route.ts
// Public school registration endpoint. Inserts into Supabase + (best-effort) sends a Resend email.

import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Payload = {
  school_name?: string;
  city?: string;
  state?: string;
  board?: string;
  teacher_name?: string;
  teacher_email?: string;
  phone?: string;
  role?: string;
  grade_range?: string;
  student_count_estimate?: string | number;
};

function genClassCode(): string {
  // 6-char alphanumeric, e.g. R2XK91 — drop ambiguous chars
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const buf = new Uint32Array(6);
  if (typeof crypto !== 'undefined') crypto.getRandomValues(buf);
  let out = 'R2';
  for (let i = 0; i < 4; i++) {
    out += alphabet[buf[i] % alphabet.length];
  }
  return out;
}

export async function POST(req: NextRequest) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Required-field sanity
  const required: (keyof Payload)[] = ['school_name', 'city', 'state', 'board', 'teacher_name', 'teacher_email', 'role', 'grade_range'];
  for (const k of required) {
    if (!body[k] || String(body[k]).trim().length === 0) {
      return Response.json({ error: `Missing field: ${k}` }, { status: 400 });
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.teacher_email!)) {
    return Response.json({ error: 'Invalid email' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // Generate unique class code with up to 5 retries on collision.
  let classCode = '';
  for (let i = 0; i < 5; i++) {
    const candidate = genClassCode();
    const { data: existing } = await supabase
      .from('schools')
      .select('id')
      .eq('class_code', candidate)
      .maybeSingle();
    if (!existing) {
      classCode = candidate;
      break;
    }
  }
  if (!classCode) {
    return Response.json({ error: 'Could not generate a class code, try again' }, { status: 500 });
  }

  const studentCount = body.student_count_estimate
    ? parseInt(String(body.student_count_estimate), 10) || null
    : null;

  const { error: insertErr } = await supabase.from('schools').insert({
    school_name: body.school_name?.trim(),
    city: body.city?.trim(),
    state: body.state?.trim(),
    board: body.board,
    teacher_name: body.teacher_name?.trim(),
    teacher_email: body.teacher_email?.trim().toLowerCase(),
    phone: body.phone?.trim() ?? null,
    role: body.role,
    grade_range: body.grade_range,
    student_count_estimate: studentCount,
    class_code: classCode,
    status: 'pending',
  });

  if (insertErr) {
    console.error('[schools] insert failed:', insertErr);
    return Response.json({ error: 'Could not save your registration' }, { status: 500 });
  }

  // Best-effort confirmation email via Resend.
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'R2BOT for Schools <onboarding@resend.dev>',
          to: body.teacher_email,
          subject: 'Your R2BOT class code is ready',
          text: `Hi ${body.teacher_name},\n\nWelcome to R2BOT for Schools.\n\nYour class code is: ${classCode}\n\nWe'll activate your school dashboard within 24 hours. Share this code with your students so they can join your class.\n\nThanks,\nR2BOT`,
        }),
      });
    } catch (err) {
      console.warn('[schools] email send failed', err);
    }
  }

  return Response.json({ classCode });
}
