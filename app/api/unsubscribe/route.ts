// Token-based one-click unsubscribe for the weekly digest. The token is the
// per-profile `digest_unsubscribe_token`. We deliberately bypass RLS here
// because the unsubscribe link is followed from email by a non-authenticated
// recipient — token possession is the authentication.

import type { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function page(body: string, accent = '#00B8D4'): Response {
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>R2BOT — Unsubscribed</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      body { background:#0A0E17; color:#E8ECF1; font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; margin:0; }
      main { max-width:520px; margin:0 auto; padding:80px 24px; text-align:center; }
      h1 { font-family:"Space Grotesk",sans-serif; font-size:32px; margin:0 0 14px; }
      p { color:#B0B8C5; font-size:16px; line-height:1.55; }
      a { color:${accent}; }
    </style>
  </head>
  <body><main>${body}</main></body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')?.trim();
  if (!token) {
    return page('<h1>Missing token</h1><p>This unsubscribe link is incomplete.</p>');
  }
  try {
    const supabase = createSupabaseAdminClient();

    // 1. Registered users unsubscribe via their profile token.
    const { data: profile } = await supabase
      .from('profiles')
      .update({ email_digest_enabled: false })
      .eq('digest_unsubscribe_token', token)
      .select('email')
      .maybeSingle();
    if (profile) {
      return page(
        `<h1>You&rsquo;re unsubscribed</h1><p>You&rsquo;ll no longer receive the R2BOT weekly digest. Want to come back any time? <a href="/dashboard">Re-enable from your dashboard</a>.</p>`,
      );
    }

    // 2. Anonymous newsletter subscribers unsubscribe via their own token.
    const { data: subscriber } = await supabase
      .from('newsletter_subscribers')
      .update({ active: false, unsubscribed_at: new Date().toISOString() })
      .eq('unsubscribe_token', token)
      .select('email')
      .maybeSingle();
    if (subscriber) {
      return page(
        `<h1>You&rsquo;re unsubscribed</h1><p>You&rsquo;ll no longer receive R2BOT Weekly. You can re-subscribe any time from the <a href="/news">News page</a>.</p>`,
      );
    }

    return page(
      '<h1>Link not recognised</h1><p>Either this link has already been used or it never existed. If you keep receiving emails, reply to one and we will sort it out.</p>',
    );
  } catch {
    return page('<h1>Something went wrong</h1><p>Try again in a moment.</p>');
  }
}
