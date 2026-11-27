// app/api/kids/classroom/power-up/route.ts
//
// Class Power-Up (roadmap #40) for a joined child's home card. The browser
// sends its member token (the same token-only identity as /api/kids/sync) and
// its local day. The answer is the class goal, ONE class total, the number of
// children who helped this week (ticks, no names) and whether this child
// helped. Never another child's name or any per-child number.
//
// 503 before migration 0054 (classroom) or 0056 (goals): the card stays
// hidden. A removed member gets 404 { removed: true }, as in sync.

import type { NextRequest } from 'next/server'
import { anyRateLimited, clientIp } from '@/lib/rate-limit'
import { EMPTY_SNAPSHOT, parseSnapshot } from '@/lib/kids/classroom'
import { goalProgress, helpedThisWeek, isDay, type ChildPowerUp } from '@/lib/kids/classroom-goal'
import {
  adminOrNull,
  goalsNotReadyResponse,
  hashToken,
  isMissingTable,
  isTokenShape,
  jsonError,
  loadClassGoal,
  notReadyResponse,
  readJsonCapped,
} from '@/lib/kids/classroom-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<Response> {
  const raw = await readJsonCapped(req, 512)
  if (!raw || typeof raw !== 'object') return jsonError(400, 'Malformed request.')
  const body = raw as { token?: unknown; today?: unknown }
  if (!isTokenShape(body.token)) return jsonError(400, 'Missing member token.')

  const ip = clientIp(req.headers)
  if (await anyRateLimited([
    { scope: 'kids-powerup:token', subject: body.token, windowSeconds: 600, max: 30 },
    { scope: 'kids-powerup:ip', subject: ip, windowSeconds: 600, max: 900 },
  ])) {
    return jsonError(429, 'Slow down — the class meter will load in a moment.')
  }

  const admin = adminOrNull()
  if (!admin) return notReadyResponse()

  const { data: member, error } = await admin
    .from('kids_class_members')
    .select('id, class_id, snapshot')
    .eq('token_hash', hashToken(body.token))
    .maybeSingle()
  if (error) return isMissingTable(error) ? notReadyResponse() : jsonError(500, 'Could not load the class goal.')
  if (!member) return Response.json({ ok: false, removed: true }, { status: 404 })
  const me = member as { id: string; class_id: string; snapshot: unknown }

  const goal = await loadClassGoal(admin, me.class_id)
  if (goal === 'not-ready') return goalsNotReadyResponse()
  if (!goal) return Response.json({ ok: true, powerUp: null }, { headers: { 'Cache-Control': 'no-store' } })

  const { data: rows, error: rErr } = await admin
    .from('kids_class_members')
    .select('snapshot')
    .eq('class_id', me.class_id)
  if (rErr) return jsonError(500, 'Could not load the class goal.')

  // The child's own local day keeps "this week" right in every time zone; a
  // nonsense value falls back to the server's day.
  const serverDay = new Date().toISOString().slice(0, 10)
  const today = isDay(body.today) && Math.abs(Date.parse(`${body.today}T12:00:00Z`) - Date.parse(`${serverDay}T12:00:00Z`)) <= 2 * 86_400_000 ? body.today : serverDay
  const diaries = ((rows ?? []) as { snapshot: unknown }[]).map((r) => (parseSnapshot(r.snapshot) ?? EMPTY_SNAPSHOT).days)
  const p = goalProgress(goal, diaries, today)
  const mine = (parseSnapshot(me.snapshot) ?? EMPTY_SNAPSHOT).days
  const powerUp: ChildPowerUp = {
    goal,
    done: p.done,
    target: p.target,
    helpers: p.helpers,
    youHelped: helpedThisWeek(mine, today),
    status: p.status,
    daysLeft: p.daysLeft,
  }
  return Response.json({ ok: true, powerUp }, { headers: { 'Cache-Control': 'no-store' } })
}
