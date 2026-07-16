import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

// The only host that should ever be indexed. Any other host that serves this
// app (Vercel preview aliases like r2bot-navy.vercel.app, the *.vercel.app
// deployment URLs, the bare apex before its redirect, etc.) must be marked
// noindex so Google doesn't index duplicate copies of every page and split
// ranking signals away from the canonical domain.
const CANONICAL_HOST = 'www.r2bot.in';

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  const host = request.headers.get('host') ?? '';
  if (host !== CANONICAL_HOST) {
    // Belt-and-suspenders: canonical tags already point at www.r2bot.in, but a
    // response header is the strongest signal and covers non-HTML responses too.
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

// Skip middleware on static assets — running Supabase on every favicon hit is wasteful.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
