// app/api/schools/register/route.ts
// Public school registration endpoint. Inserts into Supabase + (best-effort) sends a Resend email.

import type { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { clientIp, isRateLimited } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Payload = {
  school_name?: string;
  city?: string;
  state?: string;
  board?: string;
  teacher_name?: string;
  teacher_email?: string;
  role?: string;
  grade_range?: string;
  student_count_estimate?: string | number;
  /** Hidden fields. A person leaves them empty; a bot fills them in. */
  honeypot?: string;
  company?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Letters and spaces only, collapsed, at most 60 characters. */
function cleanName(raw: string): string {
  return raw.replace(/[^\p{L} ]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

function clip(v: unknown, max: number): string {
  return String(v ?? '').trim().slice(0, max);
}

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

  // Honeypot: answer like a success so the bot learns nothing, write nothing.
  if (String(body.honeypot ?? body.company ?? '').trim() !== '') {
    return Response.json({ classCode: genClassCode() });
  }
  if (await isRateLimited({ scope: 'schools:ip', subject: clientIp(req.headers), windowSeconds: 3600, max: 3 })) {
    return Response.json({ error: 'Too many registrations from this connection. Try again in an hour.' }, { status: 429 });
  }

  // Required-field sanity
  const required: (keyof Payload)[] = ['school_name', 'city', 'state', 'board', 'teacher_name', 'teacher_email', 'role', 'grade_range'];
  for (const k of required) {
    if (!body[k] || String(body[k]).trim().length === 0) {
      return Response.json({ error: `Missing field: ${k}` }, { status: 400 });
    }
  }
  const teacherEmail = clip(body.teacher_email, 254).toLowerCase();
  if (!EMAIL_RE.test(teacherEmail)) {
    return Response.json({ error: 'Invalid email' }, { status: 400 });
  }
  const teacherName = cleanName(String(body.teacher_name ?? ''));
  if (!teacherName) {
    return Response.json({ error: 'Please enter your name (letters and spaces only)' }, { status: 400 });
  }

  // Server-only writes (service role): the public INSERT policy on `schools` is being removed.
  const supabase = createSupabaseAdminClient();

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
    school_name: clip(body.school_name, 120),
    city: clip(body.city, 80),
    state: clip(body.state, 80),
    board: clip(body.board, 40),
    teacher_name: teacherName,
    teacher_email: teacherEmail,
    role: clip(body.role, 40),
    grade_range: clip(body.grade_range, 40),
    student_count_estimate: studentCount,
    class_code: classCode,
    status: 'pending',
  });

  if (insertErr) {
    console.error('[schools] insert failed:', insertErr);
    return Response.json({ error: 'Could not save your registration' }, { status: 500 });
  }

  // Best-effort confirmation email via Resend. Same verified sender as every
  // other email (the resend.dev sandbox only delivers to the account owner).
  // Plain text, and teacherName is letters and spaces only, so nothing a
  // stranger typed can turn this into a phishing message.
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (resendKey && from) {
    try {
      const { Resend } = await import('resend');
      await new Resend(resendKey).emails.send({
        from,
        to: teacherEmail,
        subject: 'Your R2BOT class code is ready',
        text: `Hi ${teacherName},\n\nWelcome to R2BOT for Schools.\n\nYour class code is: ${classCode}\n\nWe'll activate your school dashboard within 24 hours. Share this code with your students so they can join your class.\n\nThanks,\nR2BOT`,
      });
    } catch (err) {
      console.warn('[schools] email send failed', err);
    }
  }

  return Response.json({ classCode });
}
