// lib/indexnow.ts
//
// IndexNow: tell Bing (and therefore Copilot and ChatGPT's web results) about a
// URL within minutes instead of waiting for a crawl. Yandex, Seznam and Naver
// share the same endpoint. Google does not participate — Google gets the
// sitemap, which is now honest about lastmod.
//
// Why it matters here: this domain is two months old with no authority, so
// discovery is the bottleneck, not ranking. A page nobody has crawled cannot
// rank at all. The sitemap handles Google; this handles everyone else, and it
// is the one indexing lever that works on the day a page goes up.
//
// Verification: IndexNow requires a key file served at
// https://www.r2bot.in/<key>.txt whose body is exactly the key. That file lives
// in /public and is committed, so it ships with every deploy. INDEXNOW_KEY must
// match its name — if the env var is unset we fall back to the committed key so
// this keeps working without any Vercel configuration.

const DEFAULT_KEY = 'd0bc705d5159ce054cfc727d7b12dd95'
const ENDPOINT = 'https://api.indexnow.org/indexnow'
const MAX_URLS_PER_REQUEST = 10_000

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

function key(): string {
  return (process.env.INDEXNOW_KEY || DEFAULT_KEY).trim()
}

function host(): string {
  return new URL(SITE).host
}

export interface IndexNowResult {
  ok: boolean
  submitted: number
  status?: number
  skipped?: string
  error?: string
}

/**
 * Submit a batch of absolute URLs. Anything not on our own host is dropped —
 * IndexNow rejects the whole batch if one URL belongs elsewhere.
 */
export async function submitUrls(urls: string[]): Promise<IndexNowResult> {
  const k = key()
  const h = host()
  const clean = [...new Set(urls)]
    .filter((u) => {
      try {
        return new URL(u).host === h
      } catch {
        return false
      }
    })
    .slice(0, MAX_URLS_PER_REQUEST)

  if (clean.length === 0) return { ok: true, submitted: 0, skipped: 'no valid URLs' }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: h,
        key: k,
        keyLocation: `${SITE}/${k}.txt`,
        urlList: clean,
      }),
    })
    // 200 accepted, 202 accepted but key still being validated. Both are fine.
    return { ok: res.status === 200 || res.status === 202, submitted: clean.length, status: res.status }
  } catch (e) {
    return { ok: false, submitted: 0, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Submit every URL in the sitemap. Called weekly from the daily cron: a full
 * resubmit is cheap, and it is the only way a page added by the CMS (rather
 * than by a deploy) ever gets announced.
 */
export async function submitSitemap(): Promise<IndexNowResult> {
  try {
    const { default: sitemap } = await import('@/app/sitemap')
    const rows = await sitemap()
    return await submitUrls(rows.map((r) => String(r.url)))
  } catch (e) {
    return { ok: false, submitted: 0, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Weekly submit, from the daily cron. Runs on Thursdays so it does not share a
 * run with the Monday backup — both read a lot and the Hobby plan gives one
 * cron a 300-second ceiling.
 */
export async function runWeeklyIndexNow(force = false): Promise<IndexNowResult> {
  if (!force && new Date().getUTCDay() !== 4) {
    return { ok: true, submitted: 0, skipped: 'not Thursday (UTC)' }
  }
  return submitSitemap()
}
