// app/api/kids/talk/route.ts
//
// OPTIONAL AI upgrade for "Talk to your robot" (/kids/ai/talk). The free,
// on-device parser (lib/kids/ai/talk/parser.ts) handles everything it can;
// only a phrase it could not understand is sent here, and only when the child
// presses "Ask the AI helper".
//
// Cost control (the founder does not want extra cost):
//   * OFF unless the server env var KIDS_AI_ENABLED === 'true' (503 otherwise —
//     the page then simply keeps the on-device parser);
//   * the cheapest Haiku model already used in this repo, max_tokens 400;
//   * strict caps through lib/rate-limit.ts: per IP 4 a minute and 20 a day,
//     and a site-wide ceiling (KIDS_AI_DAILY_CAP, default 300 calls a day).
//
// Safety: the system prompt is fixed here — the client sends only the child's
// words (≤ 300 characters). The answer must be a block program that passes
// the strict schema (lib/kids/ai/talk/schema.ts); anything else is refused.
// Nothing the child types is stored or logged; only hashed rate-limit
// counters are kept.

import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import { anyRateLimited, clientIp } from '@/lib/rate-limit'
import { validateProgram } from '@/lib/kids/ai/talk/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 400
const MAX_CHARS = 300

function enabled(): boolean {
  return process.env.KIDS_AI_ENABLED === 'true' && Boolean(process.env.ANTHROPIC_API_KEY)
}

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

const SYSTEM = `You convert a child's instructions for a small floor robot into a block program as JSON. You output ONLY one JSON object, no prose, no code fences.

Shape: {"body": [Stmt, ...]}
Stmt is one of:
{"op":"drive_distance","cm":N,"speedPct":N}  (cm may be negative = backwards; speedPct 10..100)
{"op":"drive_for","speedPct":N,"seconds":N}
{"op":"turn_degrees","deg":N,"speedPct":N}  (POSITIVE deg = LEFT, negative = right)
{"op":"set_motors","leftPct":N,"rightPct":N}
{"op":"stop"} {"op":"wait","seconds":N}
{"op":"repeat","times":N,"body":[...]} {"op":"repeat_until","cond":C,"body":[...]} {"op":"forever","body":[...]}
{"op":"if","cond":C,"then":[...],"else":[...]}
{"op":"grip_close"} {"op":"grip_open"} {"op":"pen_down"} {"op":"pen_up"} {"op":"light_on"} {"op":"light_off"} {"op":"beep"}
{"op":"say","text":{"k":"text","v":"words the child asked the robot to say"}}
N is {"k":"number","v":number}.
C is {"k":"compare","op":"<"|">"|"=","a":E,"b":E} or {"k":"sensor","s":"bumped"|"line_seen"} or {"k":"not","a":C} or {"k":"and"|"or","a":C,"b":C}.
E is N, {"k":"sensor","s":"distance_cm"|"floor_color"|"line_offset"|"heading_deg"|"timer_s"}, or {"k":"text","v":"red"|"green"|"blue"|"yellow"|"black"|"white"} (only to compare floor_color).
Driving until something is close: set_motors both 50, then repeat_until distance_cm < 20 with an empty body, then stop.
Limits: at most 40 blocks, nesting at most 4 deep, distances up to 300 cm, turns up to 720 degrees, waits up to 30 s.
The robot can only drive on the floor, turn, grab, draw, light up, beep and talk. If the request is impossible, unsafe or not about moving the robot, output {"body":[]}.`

function extractJson(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1)) as unknown
  } catch {
    return null
  }
}

/** Tells the page whether to offer the AI helper at all. */
export async function GET(): Promise<Response> {
  return reply(200, { enabled: enabled() })
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!enabled()) return reply(503, { ok: false, reason: 'disabled', message: 'The AI helper is switched off. Your robot’s own brain still works!' })

  const raw = await req.text().catch(() => '')
  if (!raw || raw.length > 2000) return reply(400, { ok: false, reason: 'bad-request', message: 'That message was too long.' })
  let text = ''
  try {
    const body = JSON.parse(raw) as { text?: unknown }
    text = typeof body.text === 'string' ? body.text : ''
  } catch {
    return reply(400, { ok: false, reason: 'bad-request', message: 'Malformed request.' })
  }
  text = text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS)
  if (text.length < 2) return reply(400, { ok: false, reason: 'bad-request', message: 'Say what your robot should do first.' })

  const ip = clientIp(req.headers)
  const dailyCap = Math.max(0, Math.min(5000, Number(process.env.KIDS_AI_DAILY_CAP ?? 300) || 300))
  if (
    await anyRateLimited([
      { scope: 'kids-talk:ip-min', subject: ip, windowSeconds: 60, max: 4 },
      { scope: 'kids-talk:ip-day', subject: ip, windowSeconds: 86_400, max: 20 },
      { scope: 'kids-talk:all-day', subject: 'all', windowSeconds: 86_400, max: dailyCap },
    ])
  ) {
    return reply(429, { ok: false, reason: 'rate-limited', message: 'The AI helper has had enough questions for today. Your robot’s own brain still works — try simpler words!' })
  }

  let out: string
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 10_000, maxRetries: 0 })
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Child's instructions: """${text.replace(/"""/g, '"')}"""` }],
    })
    out = msg.content.map((c) => (c.type === 'text' ? c.text : '')).join('')
  } catch {
    // No details: never echo what the child typed into logs.
    console.error('[kids-talk] model call failed')
    return reply(502, { ok: false, reason: 'unavailable', message: 'The AI helper is not answering right now. Try the on-device brain with simpler words.' })
  }

  const v = validateProgram(extractJson(out), text)
  if (!v.ok) return reply(422, { ok: false, reason: 'not-understood', message: 'Even the AI helper could not turn that into robot blocks. Try saying it in small steps.' })
  return reply(200, { ok: true, program: v.program, dropped: v.dropped })
}
