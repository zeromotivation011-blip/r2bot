// Weekly personalised digest.
//
// REQUIRED ENV
//   CRON_SECRET         — Vercel cron auth (Authorization: Bearer <secret>)
//   RESEND_API_KEY      — get from resend.com
//   RESEND_FROM_EMAIL   — e.g. "R2BOT <digest@r2bot.in>"
//   SUPABASE_SERVICE_ROLE_KEY — to read auth.users.email and bypass RLS
//
// Triggered by Vercel cron every Friday at 08:00 UTC.

import type { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getAllAtlasEntries } from '@/lib/atlas';
import { getAcademyLesson } from '@/lib/academy';
import { getNewsData } from '@/lib/news';
import { WeeklyDigest, buildSubject, type DigestProps } from '@/components/emails/WeeklyDigest';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

function weekNumberUTC(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((today - start) / (7 * 86_400_000));
}

function humaniseLessonSlug(slug: string): string {
  const [track, num] = slug.split('/');
  if (!track || !num) return slug;
  return `${track.charAt(0).toUpperCase() + track.slice(1)} · Lesson ${num}`;
}

function lessonHrefFor(slug: string): string {
  return `/academy/${slug}`;
}

function atlasHrefFor(slug: string): string {
  return `/atlas/${slug}`;
}

async function GET_or_POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return Response.json(
      { error: 'RESEND_API_KEY and RESEND_FROM_EMAIL must be set' },
      { status: 500 },
    );
  }
  const resend = new Resend(apiKey);
  const supabase = createSupabaseAdminClient();

  // 1. Profiles with digest enabled.
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(
      'id, email, display_name, streak_count, digest_unsubscribe_token, email_digest_enabled',
    )
    .eq('email_digest_enabled', true);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 2. Pre-compute shared data — same for every recipient this week.
  const allAtlas = getAllAtlasEntries();
  const sortedAtlas = [...allAtlas].sort((a, b) => a.slug.localeCompare(b.slug));
  const weeklyIdx = sortedAtlas.length > 0 ? weekNumberUTC(new Date()) % sortedAtlas.length : 0;
  const termOfWeek = sortedAtlas[weeklyIdx] ?? null;

  // Top 3 stories from the live automated news aggregator (was static Pulse).
  let pulseTop3: Array<{ title: string; summary: string; href: string }> = [];
  try {
    const news = await getNewsData();
    pulseTop3 = news.articles.slice(0, 3).map((a) => ({
      title: a.title,
      summary: a.aiSummary || a.description,
      href: a.url,
    }));
  } catch {
    pulseTop3 = [];
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const sent: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ email: string; error: string }> = [];

  // 3. Process in batches of 10 so we don't burst the Resend rate limit.
  const list = (profiles ?? []).filter((p) => !!p.email);
  for (let i = 0; i < list.length; i += 10) {
    const batch = list.slice(i, i + 10);
    await Promise.all(
      batch.map(async (p) => {
        const email = p.email as string;
        try {
          // Continue-learning row (most-recent incomplete academy lesson).
          const { data: latest } = await supabase
            .from('user_progress')
            .select('content_slug')
            .eq('user_id', p.id)
            .eq('content_type', 'academy')
            .eq('completed', false)
            .order('last_visited_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          let continueLearning: DigestProps['continueLearning'] = null;
          if (latest) {
            const slug = String(latest.content_slug);
            const [track, num] = slug.split('/');
            const lesson = track === 'spark' ? getAcademyLesson(track as 'spark', num) : null;
            continueLearning = {
              title: lesson?.title ?? humaniseLessonSlug(slug),
              href: lessonHrefFor(slug),
            };
          }

          // Counts this week.
          const [{ count: weekUnderstood }, { count: weekCompleted }] = await Promise.all([
            supabase
              .from('user_progress')
              .select('content_slug', { count: 'exact', head: true })
              .eq('user_id', p.id)
              .eq('content_type', 'atlas')
              .eq('understood', true)
              .gte('last_visited_at', sevenDaysAgo),
            supabase
              .from('user_progress')
              .select('content_slug', { count: 'exact', head: true })
              .eq('user_id', p.id)
              .eq('content_type', 'academy')
              .eq('completed', true)
              .gte('last_visited_at', sevenDaysAgo),
          ]);

          const token = (p.digest_unsubscribe_token as string) ?? '';
          const unsubscribeUrl = `${BASE_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`;
          const firstName =
            (p.display_name as string | null)?.split(' ')[0] ||
            email.split('@')[0] ||
            'there';

          const props: DigestProps = {
            baseUrl: BASE_URL,
            firstName,
            streak: (p.streak_count as number) ?? 0,
            continueLearning,
            pulse: pulseTop3,
            termOfWeek: termOfWeek
              ? {
                  title: termOfWeek.title,
                  summary: termOfWeek.summary,
                  href: atlasHrefFor(`${termOfWeek.type}/${termOfWeek.slug}`),
                }
              : null,
            understoodThisWeek: weekUnderstood ?? 0,
            lessonsCompleted: weekCompleted ?? 0,
            unsubscribeUrl,
          };

          const subject = buildSubject({
            streak: props.streak,
            pulseCount: pulseTop3.length,
          });

          const { error: sendErr } = await resend.emails.send({
            from,
            to: email,
            subject,
            react: WeeklyDigest(props),
          });
          if (sendErr) {
            errors.push({ email, error: sendErr.message });
            skipped.push(email);
          } else {
            sent.push(email);
          }
        } catch (e) {
          errors.push({ email, error: (e as Error).message });
          skipped.push(email);
        }
      }),
    );
  }

  // 4. Anonymous newsletter subscribers (public signups from the site).
  //    They get the shared content (top news + term of week) without the
  //    personalised learning stats. Deduped against profile emails above.
  //    Wrapped in try/catch so a missing 0030 migration never blocks profiles.
  const alreadySent = new Set(list.map((p) => (p.email as string).toLowerCase()));
  let subscriberSent = 0;
  try {
    const { data: subs } = await supabase
      .from('newsletter_subscribers')
      .select('email, unsubscribe_token, active')
      .eq('active', true);
    const subList = (subs ?? []).filter(
      (s) => !!s.email && !alreadySent.has(String(s.email).toLowerCase()),
    );
    for (let i = 0; i < subList.length; i += 10) {
      const batch = subList.slice(i, i + 10);
      await Promise.all(
        batch.map(async (s) => {
          const email = String(s.email);
          try {
            const token = (s.unsubscribe_token as string) ?? '';
            const props: DigestProps = {
              baseUrl: BASE_URL,
              firstName: email.split('@')[0] || 'there',
              streak: 0,
              continueLearning: null,
              pulse: pulseTop3,
              termOfWeek: termOfWeek
                ? {
                    title: termOfWeek.title,
                    summary: termOfWeek.summary,
                    href: atlasHrefFor(`${termOfWeek.type}/${termOfWeek.slug}`),
                  }
                : null,
              understoodThisWeek: 0,
              lessonsCompleted: 0,
              unsubscribeUrl: `${BASE_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`,
            };
            const subject = buildSubject({ streak: 0, pulseCount: pulseTop3.length });
            const { error: sendErr } = await resend.emails.send({
              from,
              to: email,
              subject,
              react: WeeklyDigest(props),
            });
            if (sendErr) {
              errors.push({ email, error: sendErr.message });
            } else {
              subscriberSent += 1;
            }
          } catch (e) {
            errors.push({ email, error: (e as Error).message });
          }
        }),
      );
    }
  } catch (e) {
    errors.push({ email: 'newsletter_subscribers', error: (e as Error).message });
  }

  return Response.json({
    sent: sent.length,
    subscriberSent,
    skipped: skipped.length,
    errors,
  });
}

export const GET = GET_or_POST;
export const POST = GET_or_POST;
