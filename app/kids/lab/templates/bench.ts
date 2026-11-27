// app/kids/lab/templates/bench.ts
// The activity-template test benches play UNREVIEWED template samples, so
// children must never reach them: they exist in development and on Vercel
// preview deployments only, and answer 404 in production. Also noindex,
// out of the sitemap and linked from nowhere.

import { notFound } from 'next/navigation'

export function templateBenchEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview'
}

/** Call at the top of every bench page. */
export function requireTemplateBench(): void {
  if (!templateBenchEnabled()) notFound()
}
