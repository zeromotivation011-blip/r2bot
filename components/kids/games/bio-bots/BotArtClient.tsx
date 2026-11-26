'use client'

// components/kids/games/bio-bots/BotArtClient.tsx
// SVG art for Bio-Bot Lab: the robot sprite (one body, swappable animal
// modules) and the Cadet challenge scenes. Pure drawing — every position comes
// from props, so the same frame always looks the same.

import type { CadetOutcome, CadetTask, TrickId } from './model'
import { ease, lerp, seg } from './useAnim'

const ORANGE = '#FC6818'
const ORANGE_HI = '#FF8A4C'
const NAVY = '#0A1120'
const CYAN = '#00E5FF'

interface BotProps {
  trick: TrickId
  /** seconds, drives the idle motion of legs, wings, tails */
  t: number
  x: number
  y: number
  rot?: number
  scale?: number
  /** wing beats per second as drawn */
  flapHz?: number
  moving?: boolean
  opacity?: number
}

function Body({ y = 0 }: { y?: number }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <rect x={-22} y={-36} width={44} height={22} rx={8} fill={ORANGE} />
      <rect x={-20} y={-35} width={40} height={6} rx={3} fill={ORANGE_HI} opacity={0.7} />
      <rect x={3} y={-31} width={16} height={9} rx={4.5} fill={NAVY} />
      <circle cx={8} cy={-26.5} r={2} fill={CYAN} />
      <circle cx={14} cy={-26.5} r={2} fill={CYAN} />
      <line x1={-12} y1={-36} x2={-14} y2={-44} stroke={ORANGE_HI} strokeWidth={2} />
      <circle cx={-14} cy={-45} r={2.5} fill={CYAN} />
    </g>
  )
}

export function Bot({ trick, t, x, y, rot = 0, scale = 1, flapHz = 3, moving = true, opacity = 1 }: BotProps) {
  const w = moving ? t : 0
  let parts: React.ReactNode
  switch (trick) {
    case 'wheels': {
      const a = (w * 360) % 360
      parts = (
        <>
          <Body />
          {[-13, 13].map((cx) => (
            <g key={cx} transform={`translate(${cx} -9) rotate(${a})`}>
              <circle r={9} fill="#1F2937" stroke="#94A3B8" strokeWidth={2} />
              <line x1={-7} y1={0} x2={7} y2={0} stroke="#94A3B8" strokeWidth={1.5} />
              <line x1={0} y1={-7} x2={0} y2={7} stroke="#94A3B8" strokeWidth={1.5} />
            </g>
          ))}
        </>
      )
      break
    }
    case 'legs':
    case 'gecko': {
      const legs = [-16, -8, 9, 17].map((hx, i) => {
        const ph = w * 7 + (i % 2 === 0 ? 0 : Math.PI) + (i > 1 ? Math.PI / 2 : 0)
        const fx = hx + 5 * Math.sin(ph)
        const fy = -Math.max(0, Math.cos(ph)) * 6
        return (
          <g key={hx}>
            <polyline points={`${hx},-16 ${(hx + fx) / 2 + 3},${(-16 + fy) / 2 - 2} ${fx},${fy}`} fill="none" stroke={i < 2 ? '#64748B' : '#94A3B8'} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            {trick === 'gecko' ? <ellipse cx={fx} cy={fy} rx={4.5} ry={2.2} fill="#84CC16" /> : <circle cx={fx} cy={fy} r={2.2} fill="#CBD5E1" />}
          </g>
        )
      })
      parts = (
        <>
          {legs}
          <Body y={2} />
        </>
      )
      break
    }
    case 'snake': {
      const pts: string[] = []
      for (let i = 0; i <= 14; i++) {
        const px = 22 - i * 5.5
        const py = -7 + 5 * Math.sin(i * 0.7 - w * 6)
        pts.push(`${px},${py}`)
      }
      parts = (
        <>
          <polyline points={pts.join(' ')} fill="none" stroke={ORANGE} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={pts.join(' ')} fill="none" stroke={NAVY} strokeWidth={11} strokeDasharray="2 9" strokeLinecap="butt" opacity={0.35} />
          <circle cx={24} cy={-7 + 5 * Math.sin(-w * 6)} r={7} fill={ORANGE} />
          <circle cx={27} cy={-9 + 5 * Math.sin(-w * 6)} r={2} fill={CYAN} />
        </>
      )
      break
    }
    case 'wings': {
      const a = Math.sin(w * flapHz * Math.PI * 2) * 38
      parts = (
        <>
          <g transform={`translate(-2 -34) rotate(${-a})`}>
            <path d="M0 0 L-34 -6 L-30 2 L-26 6 L0 4 Z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth={1} />
          </g>
          <Body />
          <path d="M-22 -26 L-32 -32 L-32 -18 Z" fill={ORANGE_HI} />
          <g transform={`translate(2 -32) rotate(${a})`}>
            <path d="M0 0 L-30 -8 L-27 0 L-22 5 L0 4 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth={1} />
          </g>
          <path d="M-6 -14 L-8 -6 M6 -14 L8 -6" stroke="#CBD5E1" strokeWidth={2} />
        </>
      )
      break
    }
    case 'fins': {
      const a = Math.sin(w * 5) * 24
      parts = (
        <>
          <g transform={`translate(-24 -22) rotate(${a})`}>
            <path d="M0 0 L-16 -11 L-12 0 L-16 11 Z" fill={ORANGE_HI} />
          </g>
          <ellipse cx={0} cy={-22} rx={26} ry={12} fill={ORANGE} />
          <path d="M-4 -33 L6 -40 L10 -32 Z" fill={ORANGE_HI} />
          <rect x={6} y={-27} width={13} height={8} rx={4} fill={NAVY} />
          <circle cx={13} cy={-23} r={2} fill={CYAN} />
        </>
      )
      break
    }
    case 'octopus':
    case 'crab':
      parts = <Body />
      break
    case 'claws': {
      const s = Math.abs(Math.sin(w * 30))
      parts = (
        <>
          <line x1={-30} y1={-38} x2={30} y2={-38} stroke="#94A3B8" strokeWidth={3} />
          <ellipse cx={-30} cy={-41} rx={14 * (0.3 + 0.7 * s)} ry={2.5} fill="#CBD5E1" opacity={0.8} />
          <ellipse cx={30} cy={-41} rx={14 * (0.3 + 0.7 * (1 - s))} ry={2.5} fill="#CBD5E1" opacity={0.8} />
          <Body />
          <path d="M-8 -14 L-8 -4 M-8 -4 q -5 2 -4 6 M-8 -4 q 5 2 4 6 M8 -14 L8 -4 M8 -4 q -5 2 -4 6 M8 -4 q 5 2 4 6" stroke="#FBBF24" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </>
      )
      break
    }
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`} opacity={opacity}>
      {parts}
    </g>
  )
}

// ── Cadet scenes ────────────────────────────────────────────────────────────

const GROUND = 200

function Sky({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14325A" />
          <stop offset="1" stopColor="#1E4D3A" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={400} height={240} fill={`url(#sky-${id})`} />
      <circle cx={340} cy={36} r={16} fill="#FDE68A" opacity={0.5} />
    </>
  )
}

function Ground({ from = 0, to = 400, y = GROUND }: { from?: number; to?: number; y?: number }) {
  return (
    <>
      <rect x={from} y={y} width={to - from} height={240 - y} fill="#3F6212" />
      <rect x={from} y={y} width={to - from} height={5} fill="#65A30D" />
    </>
  )
}

export interface CadetSceneProps {
  task: CadetTask
  trick: TrickId | null
  outcome: CadetOutcome | null
  /** 0→1 progress of the test run (0 while choosing). */
  p: number
  t: number
}

/** One Cadet challenge, side view. Before a test (trick null or p = 0) it shows the place and the goal. */
export function CadetScene({ task, trick, outcome, p, t }: CadetSceneProps) {
  const ok = outcome?.ok ?? false
  const run = trick !== null && outcome !== null
  const a = seg(p, 0, 0.35) // approach
  const b = seg(p, 0.35, 1) // the hard part
  let bot: React.ReactNode = null
  let fx: React.ReactNode = null
  let scene: React.ReactNode
  const moving = run && p > 0 && p < 1

  switch (task) {
    case 'glass': {
      scene = (
        <>
          <Ground />
          <rect x={250} y={40} width={110} height={160} fill="#93C5FD" opacity={0.25} stroke="#BFDBFE" strokeWidth={2} />
          <path d="M262 50 L300 90 M272 60 L320 108" stroke="#E0F2FE" strokeWidth={3} opacity={0.5} />
          <text x={305} y={32} textAnchor="middle" fill="#E0F2FE" fontSize={12} fontWeight={700}>
            dirty window ↑
          </text>
        </>
      )
      if (run && trick) {
        const x = lerp(40, 236, ease(a))
        if (ok) {
          const y = lerp(GROUND, 70, ease(b))
          bot = <Bot trick={trick} t={t} x={b > 0 ? 244 : x} y={b > 0 ? y : GROUND} rot={b > 0 ? -90 : 0} moving={moving} />
          if (b > 0.9) fx = <text x={232} y={56} fill="#BEF264" fontSize={14} fontWeight={800} textAnchor="end">sparkling! ✨</text>
        } else {
          const up = b < 0.4 ? seg(b, 0, 0.4) * 34 : Math.max(0, 34 - seg(b, 0.4, 0.6) * 34)
          bot = <Bot trick={trick} t={t} x={b > 0 ? 244 : x} y={GROUND - up} rot={b > 0 && b < 0.6 ? -60 : b >= 0.6 ? 8 * Math.sin(t * 20) * (1 - b) : 0} moving={moving} />
          if (b > 0.45) fx = <text x={236} y={150} fill="#FCA5A5" fontSize={14} fontWeight={800} textAnchor="end">slides down!</text>
        }
      } else bot = <Bot trick="legs" t={0} x={60} y={GROUND} moving={false} opacity={0.35} />
      break
    }
    case 'pipe': {
      scene = (
        <>
          <Ground />
          <rect x={180} y={160} width={220} height={40} fill="#475569" />
          <rect x={180} y={168} width={220} height={24} fill="#1E293B" />
          <ellipse cx={180} cy={180} rx={6} ry={20} fill="#64748B" />
          <circle cx={350} cy={180} r={4} fill={CYAN} opacity={0.4 + 0.4 * Math.abs(Math.sin(t * 3))} />
          <text x={350} y={154} textAnchor="middle" fill="#BAE6FD" fontSize={12} fontWeight={700}>
            leak 💧
          </text>
        </>
      )
      if (run && trick) {
        if (ok) {
          const x = lerp(40, 340, ease(p))
          bot = <Bot trick={trick} t={t} x={x} y={GROUND - 12} scale={0.8} moving={moving} />
          if (p > 0.9) fx = <text x={350} y={140} textAnchor="middle" fill="#BEF264" fontSize={14} fontWeight={800}>found it!</text>
        } else {
          const x = lerp(40, 150, ease(a)) - (b > 0 ? 6 * Math.abs(Math.sin(b * 12)) : 0)
          bot = <Bot trick={trick} t={t} x={x} y={GROUND} moving={moving} />
          if (b > 0.3) fx = <text x={150} y={120} textAnchor="middle" fill="#FCA5A5" fontSize={14} fontWeight={800}>too wide!</text>
        }
      } else bot = <Bot trick="legs" t={0} x={60} y={GROUND} moving={false} opacity={0.35} />
      break
    }
    case 'water': {
      scene = (
        <>
          <Ground from={0} to={130} />
          <Ground from={330} to={400} />
          <rect x={130} y={196} width={200} height={44} fill="#0EA5E9" opacity={0.75} />
          <path d={`M130 ${196 + Math.sin(t * 2) * 2} q 25 -6 50 0 t 50 0 t 50 0 t 50 0`} stroke="#BAE6FD" strokeWidth={2} fill="none" />
          <text x={365} y={186} textAnchor="middle" fill="#E0F2FE" fontSize={12} fontWeight={700}>
            🧪 test
          </text>
        </>
      )
      if (run && trick) {
        if (ok) {
          const x = lerp(40, 360, ease(p))
          const inWater = x > 130 && x < 330
          bot = <Bot trick={trick} t={t} x={x} y={inWater ? 214 + 2 * Math.sin(t * 4) : GROUND} moving={moving} />
        } else {
          const x = lerp(40, 150, ease(a))
          const y = GROUND + seg(b, 0, 0.6) * 60
          bot = <Bot trick={trick} t={t} x={x} y={y} moving={moving} opacity={1 - seg(b, 0.5, 1) * 0.7} />
          if (b > 0.2) fx = (
            <g>
              {[0, 1, 2].map((i) => (
                <circle key={i} cx={150 + i * 8} cy={210 - ((b * 80 + i * 14) % 30)} r={3} fill="none" stroke="#E0F2FE" />
              ))}
              <text x={150} y={150} textAnchor="middle" fill="#FCA5A5" fontSize={14} fontWeight={800}>glug… sinks!</text>
            </g>
          )
        }
      } else bot = <Bot trick="fins" t={0} x={60} y={GROUND} moving={false} opacity={0.35} />
      break
    }
    case 'gap': {
      scene = (
        <>
          <Ground from={0} to={150} />
          <Ground from={260} to={400} />
          <rect x={150} y={226} width={110} height={14} fill="#0EA5E9" />
          <path d={`M150 ${228 + Math.sin(t * 2)} q 14 -4 28 0 t 28 0 t 28 0 t 26 0`} stroke="#BAE6FD" strokeWidth={2} fill="none" />
          <path d="M150 200 L150 240 M260 200 L260 240" stroke="#3F6212" strokeWidth={4} />
          <text x={205} y={196} textAnchor="middle" fill="#FCA5A5" fontSize={11} fontWeight={700}>
            broken bridge
          </text>
        </>
      )
      if (run && trick) {
        if (ok) {
          const x = lerp(40, 330, ease(p))
          const hop = Math.sin(Math.PI * seg(p, 0.25, 0.85)) * 90
          bot = <Bot trick={trick} t={t} x={x} y={GROUND - hop} moving={moving} flapHz={4} />
        } else {
          const x = lerp(40, 165, ease(a)) + seg(b, 0, 0.2) * 10
          const y = GROUND + Math.pow(seg(b, 0.1, 0.7), 2) * 50
          bot = <Bot trick={trick} t={t} x={x} y={y} rot={seg(b, 0.1, 0.7) * 50} moving={moving} />
          if (b > 0.5) fx = <text x={205} y={150} textAnchor="middle" fill="#FCA5A5" fontSize={14} fontWeight={800}>splash!</text>
        }
      } else bot = <Bot trick="wings" t={t} x={60} y={GROUND} moving={false} opacity={0.35} />
      break
    }
    case 'rubble': {
      const rocks = [
        [150, 18],
        [180, 26],
        [212, 20],
        [244, 30],
        [276, 18],
      ] as const
      const rockY = (x: number) => {
        let h = 0
        for (const [rx, rh] of rocks) if (Math.abs(x - rx) < 18) h = Math.max(h, rh * Math.cos(((x - rx) / 18) * (Math.PI / 2)))
        return h
      }
      scene = (
        <>
          <Ground />
          {rocks.map(([rx, rh]) => (
            <path key={rx} d={`M${rx - 18} ${GROUND} Q ${rx - 10} ${GROUND - rh * 1.3} ${rx} ${GROUND - rh} Q ${rx + 12} ${GROUND - rh * 1.2} ${rx + 18} ${GROUND} Z`} fill="#78716C" stroke="#A8A29E" />
          ))}
          <text x={350} y={186} textAnchor="middle" fill="#FDE68A" fontSize={12} fontWeight={700}>
            🆘 help
          </text>
        </>
      )
      if (run && trick) {
        if (ok) {
          const x = lerp(40, 340, ease(p))
          bot = <Bot trick={trick} t={t} x={x} y={GROUND - rockY(x) - 2 * Math.abs(Math.sin(t * 7))} moving={moving} />
          if (p > 0.92) fx = <text x={340} y={140} textAnchor="middle" fill="#BEF264" fontSize={14} fontWeight={800}>made it!</text>
        } else {
          const x = lerp(40, 122, ease(a)) - (b > 0 ? 4 * Math.abs(Math.sin(b * 14)) : 0)
          bot = <Bot trick={trick} t={t} x={x} y={GROUND} moving={moving} />
          if (b > 0.3) fx = <text x={122} y={140} textAnchor="middle" fill="#FCA5A5" fontSize={14} fontWeight={800}>stuck!</text>
        }
      } else bot = <Bot trick="legs" t={0} x={60} y={GROUND} moving={false} opacity={0.35} />
      break
    }
    case 'grab': {
      const close = run ? seg(p, 0.3, 0.55) : 0
      const lift = run && ok ? seg(p, 0.6, 1) * 50 : 0
      const squashed = run && !ok && trick === 'crab' && p > 0.55
      scene = (
        <>
          <Ground />
          <rect x={200} y={170} width={100} height={8} rx={3} fill="#A16207" />
          <rect x={210} y={178} width={6} height={22} fill="#854D0E" />
          <rect x={284} y={178} width={6} height={22} fill="#854D0E" />
        </>
      )
      const tomY = 160 - lift
      fx = squashed ? (
        <g>
          <ellipse cx={250} cy={167} rx={22} ry={4} fill="#DC2626" />
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={236 + i * 10} cy={160 - (i % 2) * 6} r={2.5} fill="#EF4444" />
          ))}
          <text x={250} y={130} textAnchor="middle" fill="#FCA5A5" fontSize={14} fontWeight={800}>squashed!</text>
        </g>
      ) : (
        <g>
          <circle cx={250} cy={tomY} r={10} fill="#EF4444" />
          <path d={`M246 ${tomY - 10} l4 -4 l4 4`} stroke="#22C55E" strokeWidth={2.5} fill="none" />
          {run && ok && p > 0.9 && (
            <text x={250} y={70} textAnchor="middle" fill="#BEF264" fontSize={14} fontWeight={800}>
              not a scratch!
            </text>
          )}
        </g>
      )
      const by = 116 - lift
      if (trick === 'octopus' && run) {
        const wrap = 12 * close
        bot = (
          <g>
            <Bot trick="octopus" t={t} x={250} y={by - 6} moving={false} />
            <path d={`M244 ${by - 18} C 230 ${by + 10}, ${236 - wrap / 3} ${tomY - 4}, ${250 - 10 + wrap * 0.2} ${tomY + 6 - wrap * 0.3} C ${255} ${tomY + 14}, ${262} ${tomY + 6}, ${258 - wrap * 0.2} ${tomY - 2}`} stroke="#F472B6" strokeWidth={6} fill="none" strokeLinecap="round" />
          </g>
        )
      } else if (trick === 'crab' && run) {
        const gap = 14 - close * 12
        bot = (
          <g>
            <Bot trick="crab" t={t} x={250} y={by - 6} moving={false} />
            <path d={`M250 ${by - 18} L250 ${tomY - 16}`} stroke="#94A3B8" strokeWidth={4} />
            <path d={`M${250 - gap} ${tomY - 16} q -4 10 ${2} 18 M${250 + gap} ${tomY - 16} q 4 10 ${-2} 18`} stroke="#EF4444" strokeWidth={5} fill="none" strokeLinecap="round" />
          </g>
        )
      } else if (run && trick) {
        bot = <Bot trick={trick} t={t} x={250 + Math.sin(t * 12) * 3 * (1 - p)} y={GROUND} moving={moving} />
        if (p > 0.4) fx = (
          <g>
            <circle cx={250} cy={160} r={10} fill="#EF4444" />
            <text x={250} y={120} textAnchor="middle" fill="#FCA5A5" fontSize={14} fontWeight={800}>can’t grab!</text>
          </g>
        )
      } else bot = <Bot trick="octopus" t={0} x={250} y={110} moving={false} opacity={0.35} />
      break
    }
    case 'perch': {
      scene = (
        <>
          <Ground />
          <path d="M392 240 L384 60" stroke="#78350F" strokeWidth={14} />
          <path d="M386 112 L230 118" stroke="#92400E" strokeWidth={8} strokeLinecap="round" />
          <circle cx={250} cy={110} r={6} fill="#4D7C0F" />
          <circle cx={300} cy={106} r={7} fill="#4D7C0F" />
          <text x={300} y={92} textAnchor="middle" fill="#FDE68A" fontSize={12} fontWeight={700}>
            rest here
          </text>
        </>
      )
      if (run && trick) {
        const fly = ease(seg(p, 0, 0.45))
        const x = lerp(50, 290, fly)
        const y0 = lerp(70, 114, fly)
        if (ok) {
          bot = <Bot trick={trick === 'claws' ? 'claws' : trick} t={t} x={x} y={y0} moving={p < 0.6} />
          if (p > 0.7) fx = <text x={290} y={150} textAnchor="middle" fill="#BEF264" fontSize={14} fontWeight={800}>motors off — resting</text>
        } else {
          const fall = seg(p, 0.5, 1)
          bot = (
            <g>
              <Bot trick="claws" t={t} x={x + fall * 20} y={y0 + Math.pow(fall, 2) * 86} rot={fall * 70} moving={false} />
              <text x={x + fall * 20} y={y0 + Math.pow(fall, 2) * 86 + 14} textAnchor="middle" fontSize={16}>
                {trick === 'wheels' ? '🛞' : '🐟'}
              </text>
            </g>
          )
          if (p > 0.6) fx = <text x={290} y={160} textAnchor="middle" fill="#FCA5A5" fontSize={14} fontWeight={800}>slips off!</text>
        }
      } else bot = <Bot trick="claws" t={t} x={60} y={70} moving={false} opacity={0.35} />
      break
    }
    default:
      scene = <Ground />
  }

  return (
    <svg viewBox="0 0 400 240" className="block h-auto w-full" role="img" aria-label="Challenge scene">
      <Sky id={task} />
      {scene}
      {bot}
      {fx}
    </svg>
  )
}
