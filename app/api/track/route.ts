// POST /api/track — count one page view (aggregate only; no cookies, IPs or user ids).
// Also tallies referrer source (first page of a visit), country and device class.
import type { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { clientIp, isRateLimited } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|monitor|curl|wget/i
// Lower-case internal route only: every public route on the site is lower-case,
// and anything else is either noise or an attempt to fill the metrics table.
const OK_PATH = /^\/[a-z0-9\-/_.]*$/
const PATH_MAX = 180
// The only funnel milestones the client may count. Everything else is dropped
// silently; server-side events (lead:*) never pass through this route.
const EVENTS = new Set(['lesson_quiz_correct', 'course_lesson_open'])
const OWN = /(^|\.)r2bot\.in$/i

function refSource(raw: string): string {
  if (!raw) return ''
  let host = ''
  try { host = new URL(raw).hostname.toLowerCase().replace(/^www\./, '') } catch { return '' }
  if (!host || OWN.test(host) || host.endsWith('.vercel.app') || host === 'localhost') return ''
  if (/(^|\.)google\./.test(host)) return 'google'
  if (/bing\.com$/.test(host)) return 'bing'
  if (/duckduckgo\.com$/.test(host)) return 'duckduckgo'
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return 'youtube'
  if (/instagram\.com$/.test(host)) return 'instagram'
  if (/(facebook\.com|fb\.com)$/.test(host)) return 'facebook'
  if (/(twitter\.com|^x\.com|t\.co)$/.test(host)) return 'x/twitter'
  if (/linkedin\.com$/.test(host)) return 'linkedin'
  if (/reddit\.com$/.test(host)) return 'reddit'
  if (/(chatgpt\.com|openai\.com)$/.test(host)) return 'chatgpt'
  if (/perplexity\.ai$/.test(host)) return 'perplexity'
  if (/(gemini\.google\.com|bard\.google\.com)$/.test(host)) return 'gemini'
  if (/claude\.ai$/.test(host)) return 'claude'
  return host.slice(0, 50)
}

export async function POST(req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? ''
  if (BOT.test(ua)) return new Response(null, { status: 204 })
  if (await isRateLimited({ scope: 'track:ip', subject: clientIp(req.headers), windowSeconds: 60, max: 120 })) {
    return new Response(null, { status: 204 })
  }
  let path = '', referrer = '', visit = '', event = ''
  try {
    const b = await req.json()
    path = String(b?.path ?? '')
    referrer = String(b?.referrer ?? '')
    // 'new' | 'returning', decided by the browser from a first-party flag. No
    // identifier is sent or stored — see migration 0048.
    visit = b?.visit === 'new' || b?.visit === 'returning' ? String(b.visit) : ''
    // A named funnel milestone, e.g. 'lesson_quiz_correct'.
    event = typeof b?.event === 'string' && EVENTS.has(b.event) ? b.event : ''
  } catch { return new Response(null, { status: 400 }) }
  path = path.split('?')[0].split('#')[0]
  if (path.length > 1) path = path.replace(/\/+$/, '')
  if (
    path.length > PATH_MAX || !OK_PATH.test(path) || path.includes('//') ||
    path.startsWith('/admin') || path.startsWith('/api') || path.startsWith('/_next')
  ) {
    return new Response(null, { status: 204 })
  }
  const country = (req.headers.get('x-vercel-ip-country') ?? '').toUpperCase().slice(0, 2)
  const device = /ipad|tablet/i.test(ua) ? 'tablet' : /mobi|android|iphone/i.test(ua) ? 'mobile' : 'desktop'
  const admin = createSupabaseAdminClient()
  try {
    const { error } = await admin.rpc('track_view', {
      p_path: path, p_country: country, p_device: device, p_ref: refSource(referrer), p_visit: visit || null,
    })
    if (error) {
      // Migration 0048 not applied yet: try the four-argument form from 0045,
      // then the plain page counter. Tracking must never break a page.
      const { error: legacy } = await admin.rpc('track_view', {
        p_path: path, p_country: country, p_device: device, p_ref: refSource(referrer),
      })
      if (legacy) await admin.rpc('increment_page_view', { p_path: path })
    }
    if (event) await admin.rpc('track_event', { p_event: event }).then(() => undefined, () => undefined)
  } catch { /* never break the page */ }
  return new Response(null, { status: 204 })
}
