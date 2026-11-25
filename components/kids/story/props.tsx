// components/kids/story/props.tsx
// Explainer cards that pop up on stage: a drawing plus a label. Each drawing
// fits a 420 × 200 box. The card is SVG, so it scales with the stage.

import type { PropId } from '@/lib/kids/stories/types'

const T = { fontFamily: 'system-ui, sans-serif', fontWeight: 800 } as const

function Arrow({ x1, y1, x2, y2, color = '#f97316' }: { x1: number; y1: number; x2: number; y2: number; color?: string }) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  const h = 14
  return (
    <g stroke={color} strokeWidth={6} strokeLinecap="round" fill={color}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <path d={`M${x2} ${y2} L${x2 - h * Math.cos(a - 0.5)} ${y2 - h * Math.sin(a - 0.5)} L${x2 - h * Math.cos(a + 0.5)} ${y2 - h * Math.sin(a + 0.5)} Z`} strokeWidth={2} />
    </g>
  )
}

function Box({ x, y, w, h, fill, text, color = '#fff', size = 24 }: { x: number; y: number; w: number; h: number; fill: string; text: string; color?: string; size?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={14} fill={fill} />
      <text x={x + w / 2} y={y + h / 2 + size * 0.36} textAnchor="middle" fontSize={size} fill={color} {...T}>{text}</text>
    </g>
  )
}

function Light({ on }: { on: 'red' | 'yellow' | 'green' }) {
  return (
    <g>
      <rect x={170} y={10} width={80} height={180} rx={20} fill="#1e293b" />
      <circle cx={210} cy={50} r={24} fill={on === 'red' ? '#ef4444' : '#450a0a'} className={on === 'red' ? 'st-glow' : undefined} />
      <circle cx={210} cy={100} r={24} fill={on === 'yellow' ? '#facc15' : '#422006'} className={on === 'yellow' ? 'st-glow' : undefined} />
      <circle cx={210} cy={150} r={24} fill={on === 'green' ? '#22c55e' : '#052e16'} className={on === 'green' ? 'st-glow' : undefined} />
    </g>
  )
}

function Drawing({ id, label }: { id: PropId; label: string }) {
  switch (id) {
    case 'sense-think-act':
      return (
        <g>
          <Box x={0} y={60} w={120} h={80} fill="#0ea5e9" text="SENSE" />
          <Arrow x1={124} y1={100} x2={150} y2={100} />
          <Box x={150} y={60} w={120} h={80} fill="#8b5cf6" text="THINK" />
          <Arrow x1={274} y1={100} x2={300} y2={100} />
          <Box x={300} y={60} w={120} h={80} fill="#f97316" text="ACT" />
          <text x={60} y={40} textAnchor="middle" fontSize={34}>👀</text>
          <text x={210} y={40} textAnchor="middle" fontSize={34}>🧠</text>
          <text x={360} y={40} textAnchor="middle" fontSize={34}>🦾</text>
        </g>
      )
    case 'robot-vacuum':
      return (
        <g>
          <ellipse cx={210} cy={150} rx={150} ry={40} fill="#cbd5e1" />
          <ellipse cx={210} cy={130} rx={150} ry={40} fill="#334155" />
          <ellipse cx={210} cy={122} rx={130} ry={30} fill="#475569" />
          <circle cx={210} cy={112} r={14} fill="#22c55e" className="st-glow" />
          <rect x={300} y={108} width={40} height={12} rx={6} fill="#0ea5e9" />
          <path d="M60 60 q20 -30 40 0 M330 50 q20 -30 40 0" stroke="#0ea5e9" strokeWidth={5} fill="none" />
        </g>
      )
    case 'rc-car':
      return (
        <g>
          <rect x={40} y={90} width={200} height={60} rx={20} fill="#ef4444" />
          <rect x={80} y={60} width={110} height={40} rx={12} fill="#fca5a5" />
          <circle cx={85} cy={155} r={24} fill="#1e293b" /><circle cx={195} cy={155} r={24} fill="#1e293b" />
          <rect x={300} y={70} width={90} height={110} rx={14} fill="#334155" />
          <path d="M345 70 V20" stroke="#334155" strokeWidth={6} />
          <circle cx={325} cy={115} r={14} fill="#f59e0b" /><circle cx={365} cy={145} r={14} fill="#22c55e" />
          <path d="M290 50 q-20 -16 -40 0 M300 36 q-30 -26 -60 0" stroke="#94a3b8" strokeWidth={4} fill="none" className="st-glow" />
        </g>
      )
    case 'teddy':
      return (
        <g>
          <circle cx={170} cy={50} r={22} fill="#a16207" /><circle cx={250} cy={50} r={22} fill="#a16207" />
          <circle cx={210} cy={80} r={50} fill="#ca8a04" />
          <ellipse cx={210} cy={160} rx={64} ry={46} fill="#ca8a04" />
          <circle cx={192} cy={72} r={6} fill="#1e293b" /><circle cx={228} cy={72} r={6} fill="#1e293b" />
          <ellipse cx={210} cy={96} rx={16} ry={12} fill="#fde68a" /><circle cx={210} cy={92} r={5} fill="#1e293b" />
          <path d="M176 140 h68" stroke="#ef4444" strokeWidth={10} strokeLinecap="round" />
        </g>
      )
    case 'instruction-cards':
      return (
        <g>
          {['⬆ Forward', '⬆ Forward', '➡ Turn right', '⬆ Forward'].map((t, i) => (
            <g key={i} transform={`translate(${i * 104} ${30 + (i % 2) * 14}) rotate(${(i % 2 ? 4 : -4)})`}>
              <rect width={96} height={130} rx={10} fill="#fff7ed" stroke="#f97316" strokeWidth={4} />
              <text x={48} y={34} textAnchor="middle" fontSize={26} fill="#ea580c" {...T}>{i + 1}</text>
              <text x={48} y={84} textAnchor="middle" fontSize={15} fill="#7c2d12" {...T}>{t}</text>
            </g>
          ))}
        </g>
      )
    case 'street-map':
      return (
        <g>
          <rect x={20} y={10} width={380} height={180} rx={12} fill="#ecfccb" />
          <path d="M20 150 H400 M140 10 V190 M260 10 V190 M20 70 H400" stroke="#94a3b8" strokeWidth={22} />
          <path d="M40 150 H260 V70 H330" stroke="#f97316" strokeWidth={6} strokeDasharray="12 8" fill="none" />
          <text x={40} y={140} fontSize={30}>🎂</text>
          <text x={330} y={84} fontSize={34}>🏠</text>
          <text x={330} y={130} fontSize={30}>⛲</text>
        </g>
      )
    case 'bump-sensor':
      return (
        <g>
          <rect x={40} y={60} width={160} height={100} rx={16} fill="#2563eb" />
          <rect x={200} y={92} width={60} height={36} rx={8} fill="#94a3b8" />
          <path d="M260 80 Q280 110 260 140" stroke="#f97316" strokeWidth={10} fill="none" strokeLinecap="round" />
          <rect x={330} y={20} width={40} height={170} fill="#78350f" />
          <text x={290} y={60} textAnchor="middle" fontSize={26} fill="#ea580c" {...T}>click!</text>
        </g>
      )
    case 'bat-echo':
      return (
        <g>
          <path d="M40 100 Q70 60 100 90 Q110 70 120 90 Q150 60 180 100 Q140 96 110 120 Q80 96 40 100 Z" fill="#334155" />
          {[0, 1, 2].map((i) => <path key={i} d={`M${200 + i * 30} 70 q20 30 0 60`} stroke="#38bdf8" strokeWidth={5} fill="none" className="st-glow" />)}
          <rect x={340} y={30} width={50} height={140} rx={8} fill="#a16207" />
          {[0, 1].map((i) => <path key={i} d={`M${320 - i * 30} 80 q-20 20 0 40`} stroke="#f472b6" strokeWidth={5} fill="none" />)}
        </g>
      )
    case 'ultrasonic':
      return (
        <g>
          <rect x={20} y={50} width={170} height={100} rx={10} fill="#1d4ed8" />
          <circle cx={65} cy={100} r={34} fill="#cbd5e1" stroke="#64748b" strokeWidth={6} />
          <circle cx={145} cy={100} r={34} fill="#cbd5e1" stroke="#64748b" strokeWidth={6} />
          <circle cx={65} cy={100} r={16} fill="#334155" /><circle cx={145} cy={100} r={16} fill="#334155" />
          <path d="M210 80 q16 20 0 40 M236 70 q22 30 0 60" stroke="#38bdf8" strokeWidth={5} fill="none" className="st-glow" />
          <path d="M330 140 q-16 -20 0 -40" stroke="#f472b6" strokeWidth={5} fill="none" />
          <rect x={360} y={20} width={40} height={170} fill="#78350f" />
          <text x={100} y={40} textAnchor="middle" fontSize={18} fill="#475569" {...T}>send · listen</text>
        </g>
      )
    case 'repeat-block':
      return (
        <g>
          <path d="M30 20 H390 V60 H90 V140 H390 V180 H30 Z" fill="#f59e0b" stroke="#b45309" strokeWidth={4} />
          <text x={50} y={50} fontSize={26} fill="#fff" {...T}>{label.toUpperCase().startsWith('REPEAT 10') ? 'REPEAT 10 times' : 'REPEAT ? times'}</text>
          <rect x={100} y={68} width={260} height={30} rx={8} fill="#3b82f6" />
          <text x={116} y={91} fontSize={20} fill="#fff" {...T}>move forward</text>
          <rect x={100} y={104} width={260} height={30} rx={8} fill="#06b6d4" />
          <text x={116} y={127} fontSize={20} fill="#fff" {...T}>water the plant 💧</text>
        </g>
      )
    case 'traffic-light': {
      const on = /YELLOW/.test(label) ? 'yellow' : /GREEN/.test(label) ? 'green' : 'red'
      return <Light on={on} />
    }
    case 'if-else': {
      const lines = label.split('·').map((s) => s.trim())
      if (lines.length > 1) {
        return (
          <g>
            {lines.map((l, i) => (
              <Box key={i} x={20} y={10 + i * 62} w={380} h={52} size={22} fill={['#ef4444', '#f59e0b', '#22c55e'][i] ?? '#64748b'} text={l} />
            ))}
          </g>
        )
      }
      return (
        <g>
          <path d="M210 10 L300 70 L210 130 L120 70 Z" fill="#8b5cf6" />
          <text x={210} y={80} textAnchor="middle" fontSize={26} fill="#fff" {...T}>IF?</text>
          <Arrow x1={130} y1={110} x2={70} y2={150} color="#22c55e" />
          <Arrow x1={290} y1={110} x2={350} y2={150} color="#ef4444" />
          <Box x={10} y={150} w={130} h={46} size={20} fill="#22c55e" text="true: do this" />
          <Box x={280} y={150} w={130} h={46} size={20} fill="#ef4444" text="ELSE: that" />
        </g>
      )
    }
    case 'colour-sensor':
      return (
        <g>
          <rect x={60} y={50} width={130} height={100} rx={12} fill="#7c3aed" />
          <circle cx={125} cy={100} r={26} fill="#fff" className="st-glow" />
          <path d="M200 90 L300 60 M200 100 L300 100 M200 110 L300 140" stroke="#fff7" strokeWidth={4} />
          <circle cx={330} cy={60} r={20} fill="#ef4444" /><circle cx={330} cy={100} r={20} fill="#22c55e" /><circle cx={330} cy={140} r={20} fill="#3b82f6" />
          <text x={370} y={68} fontSize={20} fill="#334155" {...T}>R</text>
          <text x={370} y={108} fontSize={20} fill="#334155" {...T}>G</text>
          <text x={370} y={148} fontSize={20} fill="#334155" {...T}>B</text>
        </g>
      )
    case 'broom-balance':
      return (
        <g>
          <g transform="translate(210 180)">
            <g className="st-sway">
              <rect x={-5} y={-170} width={10} height={150} fill="#a16207" />
              <path d="M-30 -170 H30 L20 -200 H-20 Z" fill="#facc15" />
            </g>
          </g>
          <ellipse cx={210} cy={186} rx={44} ry={14} fill="#8a5a35" />
          <Arrow x1={140} y1={186} x2={100} y2={186} />
          <Arrow x1={280} y1={186} x2={320} y2={186} />
        </g>
      )
    case 'gyro':
      return (
        <g>
          <circle cx={210} cy={100} r={80} fill="none" stroke="#38bdf8" strokeWidth={8} />
          <ellipse cx={210} cy={100} rx={80} ry={26} fill="none" stroke="#a78bfa" strokeWidth={8} />
          <ellipse cx={210} cy={100} rx={26} ry={80} fill="none" stroke="#f472b6" strokeWidth={8} />
          <circle cx={210} cy={100} r={18} fill="#f97316" />
          <text x={340} y={60} fontSize={22} fill="#334155" {...T}>tilt ↻</text>
        </g>
      )
    case 'feedback-loop':
      return (
        <g>
          <Box x={140} y={0} w={140} h={54} size={22} fill="#0ea5e9" text="MEASURE" />
          <Box x={270} y={140} w={140} h={54} size={22} fill="#f97316" text="CORRECT" />
          <Box x={10} y={140} w={140} h={54} size={22} fill="#8b5cf6" text="AGAIN" />
          <Arrow x1={290} y1={50} x2={330} y2={132} />
          <Arrow x1={262} y1={168} x2={160} y2={168} />
          <Arrow x1={80} y1={132} x2={130} y2={52} />
        </g>
      )
    case 'line-sensor':
      return (
        <g>
          <rect x={0} y={120} width={420} height={70} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={2} />
          <rect x={190} y={120} width={40} height={70} fill="#0f172a" />
          <rect x={110} y={30} width={200} height={50} rx={10} fill="#84cc16" />
          {[150, 270].map((x) => <g key={x}><rect x={x - 16} y={80} width={32} height={20} fill="#334155" /><path d={`M${x} 100 L${x} 120`} stroke="#fde047" strokeWidth={6} className="st-glow" /></g>)}
          <text x={90} y={160} textAnchor="middle" fontSize={18} fill="#475569" {...T}>bright</text>
          <text x={330} y={160} textAnchor="middle" fontSize={18} fill="#475569" {...T}>bright</text>
          <text x={210} y={112} textAnchor="middle" fontSize={16} fill="#0f172a" {...T}>dark</text>
        </g>
      )
    case 'p-control':
      return label.includes('·') ? (
        <g>
          <Box x={10} y={10} w={400} h={54} size={22} fill="#f97316" text="P: how far off" />
          <Box x={10} y={72} w={400} h={54} size={22} fill="#8b5cf6" text="I: for how long" />
          <Box x={10} y={134} w={400} h={54} size={22} fill="#0ea5e9" text="D: how fast it’s changing" />
        </g>
      ) : (
        <g>
          <text x={210} y={70} textAnchor="middle" fontSize={40} fill="#0f172a" {...T}>steer = Kp × error</text>
          <path d="M30 170 C90 110 130 190 190 140 S300 150 390 150" stroke="#22c55e" strokeWidth={6} fill="none" />
          <path d="M30 170 L70 110 L110 190 L150 100 L190 200" stroke="#ef4444" strokeWidth={4} fill="none" opacity={0.6} strokeDasharray="8 6" />
          <path d="M20 150 H400" stroke="#0f172a" strokeWidth={8} opacity={0.25} />
        </g>
      )
    case 'earth-mars':
      return (
        <g>
          <circle cx={60} cy={100} r={44} fill="#2563eb" />
          <path d="M40 80 Q60 66 72 88 Q80 110 56 120 Z" fill="#22c55e" />
          <circle cx={370} cy={100} r={30} fill="#ea580c" />
          <path d="M110 100 H330" stroke="#fde047" strokeWidth={5} strokeDasharray="14 10" />
          <g className="st-scan"><circle cx={120} cy={100} r={9} fill="#fde047" /></g>
          <text x={220} y={160} textAnchor="middle" fontSize={22} fill="#334155" {...T}>≈ 3 – 22 minutes</text>
        </g>
      )
    case 'rover-cameras':
      return (
        <g>
          <rect x={150} y={20} width={120} height={60} rx={10} fill="#e2e8f0" stroke="#475569" strokeWidth={4} />
          <circle cx={185} cy={50} r={16} fill="#0f172a" /><circle cx={235} cy={50} r={16} fill="#0f172a" />
          <path d="M185 66 L90 180 M235 66 L330 180" stroke="#38bdf8" strokeWidth={3} strokeDasharray="8 6" />
          <path d="M150 180 Q160 130 210 128 Q260 130 270 180 Z" fill="#7c2d12" />
          <text x={210} y={196} textAnchor="middle" fontSize={18} fill="#334155" {...T}>rock: 2 m away</text>
        </g>
      )
  }
}

function wrap(label: string, max = 30): string[] {
  const words = label.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) {
      lines.push(cur)
      cur = w
    } else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 3)
}

const CARD_X = { left: 70, center: 570, right: 1070 } as const

export function PropCard({ id, label, at = 'center' }: { id: PropId; label: string; at?: 'left' | 'center' | 'right' }) {
  const lines = wrap(label)
  const h = 250 + lines.length * 34
  return (
    <g transform={`translate(${CARD_X[at]} 50)`}>
      <g className="st-prop">
        <rect x={6} y={10} width={460} height={h} rx={28} fill="#000" opacity={0.25} />
        <rect width={460} height={h} rx={28} fill="#fffdf7" stroke="#fb923c" strokeWidth={6} />
        <g transform="translate(20 22)">
          <Drawing id={id} label={label} />
        </g>
        {lines.map((l, i) => (
          <text key={i} x={230} y={262 + i * 34} textAnchor="middle" fontSize={27} fill="#1e1b4b" {...T}>{l}</text>
        ))}
      </g>
    </g>
  )
}
