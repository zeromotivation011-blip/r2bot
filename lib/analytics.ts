// Tiny GA4 event helper. Safe to call anywhere on the client — if gtag hasn't
// loaded (e.g. NEXT_PUBLIC_GA_ID unset, or an ad-blocker) it's a silent no-op.
//
// The event names here are the ones we mark as "Key events" (conversions) in
// GA4 so we can actually see whether traffic turns into signups, leads, and
// Co-pilot usage — not just raw sessions.

type GtagFn = (command: 'event', name: string, params?: Record<string, unknown>) => void;

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: GtagFn }).gtag;
  if (typeof gtag !== 'function') return;
  try {
    gtag('event', name, params);
  } catch {
    // Never let analytics break the app.
  }
}
