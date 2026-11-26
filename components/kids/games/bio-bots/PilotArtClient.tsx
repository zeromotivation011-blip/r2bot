'use client'

// components/kids/games/bio-bots/PilotArtClient.tsx
// SVG views for the three Pilot stations. Every number drawn here comes from
// model.ts: the feet and the support polygon are the real quadFeet() output,
// the snake’s wall contacts come from the same squeeze the friction uses, and
// the lift and weight arrows are the computed forces.

import { Bot } from './BotArtClient'
import { FLAP, QUAD, SNAKE, quadFeet, convexHull, stabilityMargin, type FlapResult, type QuadResult, type SnakeResult } from './model'
import { ease, lerp, seg } from './useAnim'

const ORANGE = '#FC6818'
const NAVY = '#0A1120'
const CYAN = '#00E5FF'

// ── Station 1: four-legged crawl ────────────────────────────────────────────

const PX = 150 // px per metre in the side view

function bridgeY(x: number) {
  return 150 + 12 * Math.sin((Math.PI * (x - 10)) / 380)
}

export interface QuadFrame {
  /** fraction of the bridge crossed */
  d: number
  /** gait phase 0–1 */
  phase: number
  /** 0–1 how far it has toppled */
  fall: number
  /** sim seconds */
  simS: number
}

export function quadFrame(r: QuadResult, p: number, idleT: number, running: boolean): QuadFrame {
  const cycleS = QUAD.swingS / (1 - r.beta)
  if (!running) return { d: 0, phase: (idleT / cycleS) % 1, fall: 0, simS: 0 }
  const reach = r.stable ? 1 : r.tipAt
  const walkP = r.stable ? p : seg(p, 0, 0.75)
  const d = walkP * reach
  const simS = d * r.timeS
  const fall = r.stable ? 0 : seg(p, 0.75, 1)
  return { d, phase: (simS / cycleS) % 1, fall, simS }
}

export function QuadSideView({ beta, frame }: { beta: number; frame: QuadFrame }) {
  const feet = quadFeet(beta, frame.phase)
  const cx = 40 + 300 * frame.d
  const gy = bridgeY(cx)
  const tilt = frame.fall * 80
  const drop = Math.pow(frame.fall, 2) * 70
  const ropes: string[] = []
  for (let x = 10; x <= 390; x += 10) ropes.push(`${x},${bridgeY(x)}`)
  return (
    <svg viewBox="0 0 400 220" className="block h-auto w-full" role="img" aria-label="Side view of the four-legged robot on the rope bridge">
      <rect width={400} height={220} fill="#12324F" />
      <rect y={185} width={400} height={35} fill="#0E7490" opacity={0.6} />
      <polyline points={ropes.join(' ')} fill="none" stroke="#A16207" strokeWidth={5} />
      <polyline points={ropes.map((s) => { const [x, y] = s.split(',').map(Number); return `${x},${y - 30}` }).join(' ')} fill="none" stroke="#CA8A04" strokeWidth={2} />
      {Array.from({ length: 20 }, (_, i) => 15 + i * 19).map((x) => (
        <line key={x} x1={x} y1={bridgeY(x) - 30} x2={x} y2={bridgeY(x)} stroke="#CA8A04" strokeWidth={1} opacity={0.6} />
      ))}
      <rect x={4} y={120} width={10} height={70} fill="#78350F" />
      <rect x={386} y={120} width={10} height={70} fill="#78350F" />
      <text x={392} y={112} textAnchor="end" fill="#FDE68A" fontSize={11} fontWeight={700}>
        🥚 safe side
      </text>
      <g transform={`translate(${cx} ${gy + drop}) rotate(${tilt})`}>
        {/* far legs (right side) faded, near legs (left side) bright */}
        {feet
          .slice()
          .sort((a) => (a.id.startsWith('R') ? -1 : 1))
          .map((f) => {
            const hx = (f.id.endsWith('F') ? QUAD.hipX : -QUAD.hipX) * PX
            const fx = f.x * PX
            const fy = -f.lift * 12
            const near = f.id.startsWith('L')
            return (
              <g key={f.id} opacity={near ? 1 : 0.45}>
                <polyline points={`${hx},-24 ${(hx + fx) / 2 + 4},${-14 + fy / 2} ${fx},${fy}`} fill="none" stroke={near ? '#CBD5E1' : '#64748B'} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={fx} cy={fy} r={3.5} fill={f.down ? '#22C55E' : '#94A3B8'} />
              </g>
            )
          })}
        <rect x={-38} y={-42} width={76} height={20} rx={8} fill={ORANGE} />
        <rect x={20} y={-38} width={14} height={8} rx={4} fill={NAVY} />
        <circle cx={27} cy={-34} r={2} fill={CYAN} />
        <ellipse cx={-6} cy={-48} rx={7} ry={8} fill="#FEF3C7" stroke="#FDE68A" />
        <circle cx={0} cy={-32} r={3} fill="#fff" stroke={NAVY} strokeWidth={1.5} />
      </g>
    </svg>
  )
}

const TOP = 300 // px per metre in the top view

export function QuadTopView({ beta, phase }: { beta: number; phase: number }) {
  const feet = quadFeet(beta, phase)
  const down = feet.filter((f) => f.down)
  const margin = stabilityMargin(down)
  const safe = margin >= QUAD.swayM
  const hull = convexHull(down)
  const toPx = (x: number, y: number) => `${100 + x * TOP},${70 - y * TOP}`
  return (
    <svg viewBox="0 0 200 140" className="block h-auto w-full" role="img" aria-label={`Top view: ${down.length} feet down, centre of mass ${safe ? 'inside' : 'outside or on the edge of'} the support polygon`}>
      <rect width={200} height={140} rx={14} fill="#0B1628" />
      <rect x={100 - 0.24 * TOP} y={70 - 0.13 * TOP} width={0.48 * TOP} height={0.26 * TOP} rx={10} fill="none" stroke="#334155" strokeDasharray="4 4" />
      <text x={8} y={14} fill="#6E7888" fontSize={9}>
        from above · front →
      </text>
      {hull.length >= 3 ? (
        <polygon points={hull.map((f) => toPx(f.x, f.y)).join(' ')} fill={safe ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'} stroke={safe ? '#22C55E' : '#EF4444'} strokeWidth={2} />
      ) : hull.length === 2 ? (
        <line x1={100 + hull[0].x * TOP} y1={70 - hull[0].y * TOP} x2={100 + hull[1].x * TOP} y2={70 - hull[1].y * TOP} stroke="#EF4444" strokeWidth={3} />
      ) : null}
      {feet.map((f) => (
        <g key={f.id}>
          <circle cx={100 + f.x * TOP} cy={70 - f.y * TOP} r={f.down ? 7 : 5} fill={f.down ? '#22C55E' : 'none'} stroke={f.down ? '#BBF7D0' : '#94A3B8'} strokeWidth={2} strokeDasharray={f.down ? undefined : '3 2'} />
          <text x={100 + f.x * TOP} y={70 - f.y * TOP + (f.y > 0 ? -11 : 18)} textAnchor="middle" fill="#A7B0C0" fontSize={8}>
            {f.id}
          </text>
        </g>
      ))}
      <circle cx={100} cy={70} r={5} fill={safe ? '#FFFFFF' : '#EF4444'} stroke={NAVY} strokeWidth={2} />
      <text x={108} y={67} fill="#EEF2F8" fontSize={8}>
        CoM
      </text>
    </svg>
  )
}

// ── Station 2: snake in a sloping pipe ──────────────────────────────────────

const SPX = 5 // px per cm
const CL = 70 // pipe centre line
export function SnakeView({ amplitudeCm, result, p, t, running }: { amplitudeCm: number; result: SnakeResult; p: number; t: number; running: boolean }) {
  const fit = ((SNAKE.pipeCm - SNAKE.bodyCm) / 2) * SPX
  const wall = (SNAKE.pipeCm / 2) * SPX
  const A = amplitudeCm * SPX
  const lambda = 130
  let head = 250
  if (running) {
    if (result.mode === 'go') head = lerp(250, 470, ease(p))
    else if (result.mode === 'slide') head = lerp(250, 120, Math.pow(p, 1.6))
    else head = 250 + Math.sin(p * 40) * 2 * (1 - p)
  }
  const wavePhase = result.mode === 'jam' && running ? p * 2 : t * 2.2
  const pts: { x: number; y: number; touch: boolean }[] = []
  for (let s = 0; s <= 260; s += 4) {
    const x = head - s
    const raw = A * Math.sin((2 * Math.PI * s) / lambda + wavePhase)
    const y = Math.max(-fit, Math.min(fit, raw))
    pts.push({ x, y: CL + y, touch: Math.abs(raw) >= fit - 0.5 })
  }
  const line = pts.map((q) => `${q.x},${q.y}`).join(' ')
  return (
    <svg viewBox="0 0 400 140" className="block h-auto w-full" role="img" aria-label={`Snake robot in a pipe from above. Wave amplitude ${amplitudeCm} centimetres.`}>
      <defs>
        <clipPath id="pipe-clip">
          <rect x={0} y={CL - wall} width={400} height={wall * 2} />
        </clipPath>
      </defs>
      <rect width={400} height={140} fill="#0B1628" />
      <rect x={0} y={CL - wall - 14} width={400} height={14} fill="#64748B" />
      <rect x={0} y={CL + wall} width={400} height={14} fill="#64748B" />
      <rect x={0} y={CL - wall} width={400} height={wall * 2} fill="#1E293B" />
      <text x={8} y={CL - wall - 18} fill="#A7B0C0" fontSize={10}>
        pipe {SNAKE.pipeCm} cm wide · from above · slopes UP 30° →
      </text>
      <g clipPath="url(#pipe-clip)">
        <polyline points={line} fill="none" stroke={ORANGE} strokeWidth={SNAKE.bodyCm * SPX} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={line} fill="none" stroke={NAVY} strokeWidth={SNAKE.bodyCm * SPX} strokeDasharray="3 10" opacity={0.3} />
        {pts
          .filter((q, i) => q.touch && i % 3 === 0)
          .map((q, i) => (
            <circle key={i} cx={q.x} cy={q.y > CL ? CL + wall - 2 : CL - wall + 2} r={4} fill={result.mode === 'jam' ? '#EF4444' : CYAN} opacity={0.9} />
          ))}
        <circle cx={head + 4} cy={pts[0].y} r={11} fill={ORANGE} />
        <circle cx={head + 9} cy={pts[0].y - 3} r={2.5} fill={CYAN} />
      </g>
      {running && p > 0.5 && (
        <text x={200} y={132} textAnchor="middle" fontSize={13} fontWeight={800} fill={result.ok ? '#BEF264' : '#FCA5A5'}>
          {result.mode === 'go' ? 'climbing! ↑' : result.mode === 'slide' ? 'sliding back down…' : 'jammed — motors stalled'}
        </text>
      )}
    </svg>
  )
}

// ── Station 3: flapping hop over the river ──────────────────────────────────

export function FlapView({ result, p, t, running }: { result: FlapResult; p: number; t: number; running: boolean }) {
  let x = 44
  let y = 150
  let rot = 0
  if (running) {
    if (result.mode === 'go') {
      x = lerp(44, 362, ease(p))
      y = 150 - Math.sin(Math.PI * p) * 80
    } else if (result.mode === 'ground') {
      x = 44 + p * 8
      y = 150 - Math.sin(Math.PI * Math.min(1, p * 1.4)) * 12
    } else {
      const reachX = lerp(44, 362, result.reach)
      const fly = seg(p, 0, 0.7)
      const fall = seg(p, 0.7, 1)
      x = lerp(44, reachX, ease(fly)) + fall * 20
      y = 150 - Math.sin(Math.PI * fly * result.reach) * 80 * (fly < 1 ? 1 : 1) + fall * 60
      rot = fall * 30
    }
  }
  const flapping = !running || result.mode === 'go' || (result.mode === 'flat-battery' && p < 0.7) || result.mode === 'ground'
  const liftLen = Math.min(70, (result.liftN / result.weightN) * 30)
  return (
    <svg viewBox="0 0 400 200" className="block h-auto w-full" role="img" aria-label={`Flapping robot. Lift ${result.liftN.toFixed(2)} newtons, weight ${result.weightN.toFixed(2)} newtons.`}>
      <rect width={400} height={200} fill="#12324F" />
      <rect x={0} y={150} width={60} height={50} fill="#3F6212" />
      <rect x={340} y={150} width={60} height={50} fill="#3F6212" />
      <rect x={60} y={170} width={280} height={30} fill="#0EA5E9" opacity={0.8} />
      <path d={`M60 ${171 + Math.sin(t * 2) * 1.5} q 20 -5 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0`} stroke="#BAE6FD" strokeWidth={2} fill="none" />
      <text x={200} y={192} textAnchor="middle" fill="#E0F2FE" fontSize={11}>
        {FLAP.distanceM} m of river
      </text>
      <g>
        <Bot trick="wings" t={t} x={x} y={y} rot={rot} flapHz={flapping ? result.freqHz / 6 : 0} moving={flapping} />
        <line x1={x - 30} y1={y - 26} x2={x - 30} y2={y - 26 - liftLen} stroke={CYAN} strokeWidth={4} markerEnd="url(#arrow-c)" />
        <line x1={x - 30} y1={y - 20} x2={x - 30} y2={y - 20 + 30} stroke={ORANGE} strokeWidth={4} markerEnd="url(#arrow-o)" />
      </g>
      <defs>
        <marker id="arrow-c" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 Z" fill={CYAN} />
        </marker>
        <marker id="arrow-o" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 Z" fill={ORANGE} />
        </marker>
      </defs>
      <text x={8} y={16} fill="#A7B0C0" fontSize={10}>
        <tspan fill={CYAN}>↑ lift {result.liftN.toFixed(2)} N</tspan> · <tspan fill={ORANGE}>↓ weight {result.weightN.toFixed(2)} N</tspan> · wings drawn 6× slower
      </text>
    </svg>
  )
}
