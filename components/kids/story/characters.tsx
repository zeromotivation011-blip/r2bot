// components/kids/story/characters.tsx
// The Story Theatre cast as SVG puppets. Each puppet draws itself with its
// feet (or wheels) at (0, 0), centred on x = 0, facing right. The stage
// positions, flips and animates them; the puppet only knows its emotion,
// whether it is talking, and its costume.
//
// Rule for animation: an element that carries a CSS animation class never
// also carries an SVG transform attribute (CSS would override it), so every
// animated part sits inside a plain positioned wrapper <g>.

import type { CharacterId, Emotion } from '@/lib/kids/stories/types'

export interface PuppetProps {
  emotion: Emotion
  talking: boolean
  variant?: 'wheels'
}

/** Height of each puppet in stage units, for placing ?, ! and sparkles. */
export const PUPPET_HEIGHT: Record<CharacterId, number> = {
  spark: 230,
  amara: 335,
  lucia: 400,
  bolt: 170,
  zippy: 140,
  rover: 360,
}

const INK = '#2a1a12'

// ─── Shared human face ─────────────────────────────────────────────────────

function Brows({ emotion, dx, y, color }: { emotion: Emotion; dx: number; y: number; color: string }) {
  const p = {
    neutral: [`M${-dx - 12} ${y} Q${-dx} ${y - 4} ${-dx + 12} ${y}`, `M${dx - 12} ${y} Q${dx} ${y - 4} ${dx + 12} ${y}`],
    happy: [`M${-dx - 12} ${y - 2} Q${-dx} ${y - 9} ${-dx + 12} ${y - 2}`, `M${dx - 12} ${y - 2} Q${dx} ${y - 9} ${dx + 12} ${y - 2}`],
    excited: [`M${-dx - 12} ${y - 6} Q${-dx} ${y - 15} ${-dx + 12} ${y - 6}`, `M${dx - 12} ${y - 6} Q${dx} ${y - 15} ${dx + 12} ${y - 6}`],
    surprised: [`M${-dx - 12} ${y - 9} Q${-dx} ${y - 19} ${-dx + 12} ${y - 9}`, `M${dx - 12} ${y - 9} Q${dx} ${y - 19} ${dx + 12} ${y - 9}`],
    sad: [`M${-dx - 12} ${y + 2} L${-dx + 11} ${y - 7}`, `M${dx + 12} ${y + 2} L${dx - 11} ${y - 7}`],
    worried: [`M${-dx - 12} ${y} Q${-dx} ${y - 2} ${-dx + 11} ${y - 10}`, `M${dx + 12} ${y} Q${dx} ${y - 2} ${dx - 11} ${y - 10}`],
    thinking: [`M${-dx - 12} ${y + 1} L${-dx + 12} ${y + 1}`, `M${dx - 12} ${y - 6} Q${dx} ${y - 16} ${dx + 12} ${y - 8}`],
  }[emotion]
  return (
    <g stroke={color} strokeWidth={5} strokeLinecap="round" fill="none">
      <path d={p[0]} />
      <path d={p[1]} />
    </g>
  )
}

function Eyes({ emotion, dx, y, r }: { emotion: Emotion; dx: number; y: number; r: number }) {
  if (emotion === 'happy') {
    return (
      <g stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none">
        <path d={`M${-dx - r} ${y + 2} Q${-dx} ${y - r * 1.2} ${-dx + r} ${y + 2}`} />
        <path d={`M${dx - r} ${y + 2} Q${dx} ${y - r * 1.2} ${dx + r} ${y + 2}`} />
      </g>
    )
  }
  const big = emotion === 'surprised' || emotion === 'excited' ? 1.22 : 1
  const squash = emotion === 'sad' ? 0.72 : 1
  const look = emotion === 'thinking' ? { x: r * 0.35, y: -r * 0.4 } : { x: r * 0.18, y: 0 }
  const pr = (emotion === 'surprised' ? 0.42 : 0.6) * r
  return (
    <g className="st-blink">
      {[-dx, dx].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy={y} rx={r * big} ry={r * 1.15 * big * squash} fill="#fff" stroke={INK} strokeWidth={2} />
          <circle cx={cx + look.x} cy={y + look.y + (squash < 1 ? r * 0.15 : 0)} r={pr * big} fill={INK} />
          <circle cx={cx + look.x - pr * 0.4} cy={y + look.y - pr * 0.5} r={pr * 0.35} fill="#fff" />
          {emotion === 'excited' && <circle cx={cx + look.x + pr * 0.4} cy={y + look.y + pr * 0.3} r={pr * 0.2} fill="#fff" />}
        </g>
      ))}
    </g>
  )
}

function Mouth({ emotion, talking, y, w }: { emotion: Emotion; talking: boolean; y: number; w: number }) {
  if (talking) {
    const smile = emotion === 'happy' || emotion === 'excited'
    return (
      <g>
        <g className="st-mouth-live">
          <path d={`M${-w} ${y} Q0 ${y + w * 1.7} ${w} ${y} Z`} fill="#5b1220" stroke={INK} strokeWidth={2.5} />
          <ellipse cx={0} cy={y + w * 0.6} rx={w * 0.5} ry={w * 0.25} fill="#e86a7a" />
        </g>
        <path d={smile ? `M${-w - 3} ${y - 3} Q0 ${y + 3} ${w + 3} ${y - 3}` : `M${-w} ${y} L${w} ${y}`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
      </g>
    )
  }
  switch (emotion) {
    case 'happy':
      return <path d={`M${-w} ${y - 2} Q0 ${y + w * 1.1} ${w} ${y - 2}`} stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
    case 'excited':
      return (
        <g>
          <path d={`M${-w - 2} ${y - 2} Q0 ${y + w * 1.7} ${w + 2} ${y - 2} Z`} fill="#5b1220" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <path d={`M${-w * 0.7} ${y + 1} L${w * 0.7} ${y + 1}`} stroke="#fff" strokeWidth={4} />
          <ellipse cx={0} cy={y + w * 0.85} rx={w * 0.45} ry={w * 0.22} fill="#e86a7a" />
        </g>
      )
    case 'sad':
      return <path d={`M${-w * 0.8} ${y + 8} Q0 ${y - 6} ${w * 0.8} ${y + 8}`} stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
    case 'worried':
      return <path d={`M${-w * 0.8} ${y + 4} q${w * 0.4} -7 ${w * 0.8} 0 t${w * 0.8} 0`} stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
    case 'surprised':
      return <ellipse cx={0} cy={y + 5} rx={w * 0.38} ry={w * 0.5} fill="#5b1220" stroke={INK} strokeWidth={3} />
    case 'thinking':
      return <path d={`M${-w * 0.2} ${y + 4} L${w * 0.9} ${y}`} stroke={INK} strokeWidth={4} strokeLinecap="round" />
    default:
      return <path d={`M${-w * 0.8} ${y} Q0 ${y + w * 0.6} ${w * 0.8} ${y}`} stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
  }
}

function Cheeks({ emotion, dx, y }: { emotion: Emotion; dx: number; y: number }) {
  if (emotion !== 'happy' && emotion !== 'excited') return null
  return (
    <g fill="#ff7a8a" opacity={0.45}>
      <ellipse cx={-dx} cy={y} rx={11} ry={6} />
      <ellipse cx={dx} cy={y} rx={11} ry={6} />
    </g>
  )
}

// ─── Amara — nine-year-old inventor ────────────────────────────────────────

export function Amara({ emotion, talking }: PuppetProps) {
  const skin = '#8a5a35'
  const skinDark = '#6e4426'
  return (
    <g>
      {/* legs */}
      <g transform="translate(-24 -96)">
        <g className="st-origin-top st-leg-a">
          <rect x={-10} y={0} width={21} height={84} rx={9} fill="#4c3a8f" />
          <path d="M-14 78 h34 a10 10 0 0 1 0 18 h-34 z" fill="#fff" stroke="#e11d48" strokeWidth={4} />
        </g>
      </g>
      <g transform="translate(24 -96)">
        <g className="st-origin-top st-leg-b">
          <rect x={-10} y={0} width={21} height={84} rx={9} fill="#4c3a8f" />
          <path d="M-14 78 h34 a10 10 0 0 1 0 18 h-34 z" fill="#fff" stroke="#e11d48" strokeWidth={4} />
        </g>
      </g>
      <g className="st-bob">
        <g className="st-breathe">
          {/* back arm */}
          <g transform="translate(-60 -196)">
            <g className="st-origin-top st-arm-a">
              <rect x={-11} y={0} width={22} height={40} rx={10} fill="#facc15" />
              <rect x={-9} y={34} width={18} height={50} rx={9} fill={skin} />
              <circle cx={0} cy={86} r={12} fill={skin} />
            </g>
          </g>
          {/* torso: yellow shirt + teal overalls */}
          <path d="M-56 -200 Q0 -214 56 -200 L60 -96 Q0 -86 -60 -96 Z" fill="#facc15" />
          <path d="M-46 -168 L46 -168 L58 -94 Q0 -84 -58 -94 Z" fill="#0d9488" />
          <path d="M-46 -168 L-38 -205 M46 -168 L38 -205" stroke="#0d9488" strokeWidth={10} strokeLinecap="round" />
          <circle cx={-38} cy={-168} r={5} fill="#fde68a" />
          <circle cx={38} cy={-168} r={5} fill="#fde68a" />
          <rect x={-24} y={-150} width={48} height={30} rx={6} fill="#0f766e" />
          <rect x={10} y={-170} width={5} height={26} rx={2} fill="#f97316" />
          <rect x={9} y={-176} width={7} height={8} rx={2} fill="#94a3b8" />
          <path d="M-58 -112 L58 -112" stroke="#115e59" strokeWidth={4} />
          {/* front arm */}
          <g transform="translate(60 -196)">
            <g className="st-origin-top st-arm-b st-arm-talk">
              <rect x={-11} y={0} width={22} height={40} rx={10} fill="#facc15" />
              <rect x={-9} y={34} width={18} height={50} rx={9} fill={skin} />
              <circle cx={0} cy={86} r={12} fill={skin} />
            </g>
          </g>
          {/* neck + head */}
          <rect x={-12} y={-218} width={24} height={22} fill={skinDark} />
          {/* hair puffs */}
          <circle cx={-56} cy={-306} r={33} fill="#24160e" />
          <circle cx={56} cy={-306} r={33} fill="#24160e" />
          <circle cx={-62} cy={-312} r={9} fill="#3a2518" />
          <circle cx={50} cy={-316} r={9} fill="#3a2518" />
          <circle cx={0} cy={-262} r={58} fill={skin} />
          <ellipse cx={-58} cy={-258} rx={9} ry={13} fill={skinDark} />
          <ellipse cx={58} cy={-258} rx={9} ry={13} fill={skinDark} />
          <path d="M-58 -270 Q-60 -330 0 -326 Q60 -330 58 -270 Q40 -300 0 -298 Q-40 -300 -58 -270 Z" fill="#24160e" />
          <path d="M-54 -292 Q0 -318 54 -292" stroke="#f59e0b" strokeWidth={8} fill="none" strokeLinecap="round" />
          {/* goggles on forehead */}
          <g>
            <circle cx={-20} cy={-305} r={14} fill="#67e8f9" stroke="#334155" strokeWidth={5} />
            <circle cx={20} cy={-305} r={14} fill="#67e8f9" stroke="#334155" strokeWidth={5} />
            <rect x={-7} y={-308} width={14} height={6} fill="#334155" />
            <circle cx={-24} cy={-309} r={4} fill="#fff" opacity={0.8} />
            <circle cx={16} cy={-309} r={4} fill="#fff" opacity={0.8} />
          </g>
          <Brows emotion={emotion} dx={22} y={-280} color="#24160e" />
          <Eyes emotion={emotion} dx={22} y={-260} r={10} />
          <Cheeks emotion={emotion} dx={36} y={-240} />
          <path d="M-3 -248 Q0 -242 4 -246" stroke={skinDark} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Mouth emotion={emotion} talking={talking} y={-232} w={13} />
        </g>
      </g>
    </g>
  )
}

// ─── Nana Lucía — retired engineer, Amara's grandmother ────────────────────

export function Lucia({ emotion, talking }: PuppetProps) {
  const skin = '#c98e5c'
  const skinDark = '#a96f40'
  return (
    <g>
      <g transform="translate(-18 -70)">
        <g className="st-origin-top st-leg-a">
          <rect x={-8} y={0} width={16} height={62} rx={7} fill={skin} />
          <path d="M-12 56 h30 a8 8 0 0 1 0 14 h-30 z" fill="#3f1d38" />
        </g>
      </g>
      <g transform="translate(18 -70)">
        <g className="st-origin-top st-leg-b">
          <rect x={-8} y={0} width={16} height={62} rx={7} fill={skin} />
          <path d="M-12 56 h30 a8 8 0 0 1 0 14 h-30 z" fill="#3f1d38" />
        </g>
      </g>
      <g className="st-bob">
        <g className="st-breathe">
          {/* skirt */}
          <path d="M-52 -178 L52 -178 L74 -62 Q0 -50 -74 -62 Z" fill="#1e6f8f" />
          <path d="M-62 -100 Q0 -88 62 -100" stroke="#f0abfc" strokeWidth={5} fill="none" strokeDasharray="10 8" />
          <g transform="translate(-62 -258)">
            <g className="st-origin-top st-arm-a">
              <rect x={-12} y={0} width={24} height={96} rx={11} fill="#7e3fa6" />
              <circle cx={0} cy={100} r={12} fill={skin} />
            </g>
          </g>
          {/* cardigan + blouse */}
          <path d="M-58 -262 Q0 -276 58 -262 L56 -170 Q0 -160 -56 -170 Z" fill="#8b46b8" />
          <path d="M-14 -268 L0 -236 L14 -268 Z" fill="#fff7ed" />
          <path d="M0 -236 L0 -172" stroke="#6b2f91" strokeWidth={3} />
          {[-220, -200, -182].map((cy) => <circle key={cy} cx={7} cy={cy} r={3.5} fill="#fde68a" />)}
          <rect x={-46} y={-212} width={26} height={20} rx={4} fill="#6b2f91" />
          <rect x={-40} y={-222} width={4} height={16} fill="#38bdf8" />
          <rect x={-33} y={-224} width={4} height={18} fill="#f97316" />
          <g transform="translate(62 -258)">
            <g className="st-origin-top st-arm-b st-arm-talk">
              <rect x={-12} y={0} width={24} height={96} rx={11} fill="#7e3fa6" />
              <circle cx={0} cy={100} r={12} fill={skin} />
            </g>
          </g>
          <rect x={-11} y={-282} width={22} height={20} fill={skinDark} />
          {/* hair + bun */}
          <circle cx={0} cy={-392} r={26} fill="#d7d3cf" />
          <path d="M-14 -394 q14 -10 28 0" stroke="#b8b2ac" strokeWidth={3} fill="none" />
          <circle cx={0} cy={-322} r={54} fill={skin} />
          <path d="M-56 -320 Q-62 -380 0 -378 Q62 -380 56 -320 Q50 -350 20 -356 Q0 -340 -26 -356 Q-50 -350 -56 -320 Z" fill="#e7e3df" />
          <ellipse cx={-54} cy={-316} rx={8} ry={12} fill={skinDark} />
          <ellipse cx={54} cy={-316} rx={8} ry={12} fill={skinDark} />
          <circle cx={-54} cy={-300} r={5} fill="#f59e0b" />
          <circle cx={54} cy={-300} r={5} fill="#f59e0b" />
          <Brows emotion={emotion} dx={21} y={-342} color="#9c948d" />
          <Eyes emotion={emotion} dx={21} y={-322} r={8.5} />
          {/* glasses */}
          <g fill="none" stroke="#7c2d12" strokeWidth={3.5}>
            <circle cx={-21} cy={-322} r={16} />
            <circle cx={21} cy={-322} r={16} />
            <path d="M-5 -324 Q0 -328 5 -324 M-37 -324 L-52 -328 M37 -324 L52 -328" />
          </g>
          <Cheeks emotion={emotion} dx={34} y={-298} />
          <path d="M-4 -306 Q0 -298 5 -303" stroke={skinDark} strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d="M-30 -292 q-4 6 0 10 M30 -292 q4 6 0 10" stroke={skinDark} strokeWidth={2} fill="none" opacity={0.6} />
          <Mouth emotion={emotion} talking={talking} y={-288} w={12} />
        </g>
      </g>
    </g>
  )
}

// ─── Robot faces (Spark, Bolt, Zippy, Rover) ───────────────────────────────

function ScreenEyes({ emotion, lx, rx, y, r, color }: { emotion: Emotion; lx: number; rx: number; y: number; r: number; color: string }) {
  if (emotion === 'happy') {
    return (
      <g stroke={color} strokeWidth={r * 0.45} strokeLinecap="round" fill="none">
        <path d={`M${lx - r} ${y + r * 0.3} Q${lx} ${y - r} ${lx + r} ${y + r * 0.3}`} />
        <path d={`M${rx - r} ${y + r * 0.3} Q${rx} ${y - r} ${rx + r} ${y + r * 0.3}`} />
      </g>
    )
  }
  if (emotion === 'thinking') {
    return (
      <g>
        <path d={`M${lx - r} ${y} L${lx + r} ${y}`} stroke={color} strokeWidth={r * 0.45} strokeLinecap="round" />
        <g className="st-blink"><circle cx={rx} cy={y - r * 0.2} r={r} fill={color} /></g>
        <circle cx={rx + r * 0.35} cy={y - r * 0.55} r={r * 0.3} fill="#fff" />
      </g>
    )
  }
  const big = emotion === 'surprised' || emotion === 'excited' ? 1.3 : 1
  const sadOrWorried = emotion === 'sad' || emotion === 'worried'
  return (
    <g>
      <g className="st-blink">
        <circle cx={lx} cy={y} r={r * big} fill={color} />
        <circle cx={rx} cy={y} r={r * big} fill={color} />
      </g>
      <circle cx={lx - r * 0.35} cy={y - r * 0.4} r={r * 0.3} fill="#fff" />
      <circle cx={rx - r * 0.35} cy={y - r * 0.4} r={r * 0.3} fill="#fff" />
      {emotion === 'excited' && (
        <g fill="#fff">
          <circle cx={lx + r * 0.4} cy={y + r * 0.35} r={r * 0.18} />
          <circle cx={rx + r * 0.4} cy={y + r * 0.35} r={r * 0.18} />
        </g>
      )}
      {sadOrWorried && (
        <g stroke={color} strokeWidth={r * 0.35} strokeLinecap="round">
          <path d={`M${lx - r * 1.2} ${y - r * 1.2} L${lx + r} ${y - r * (emotion === 'worried' ? 2 : 1.7)}`} />
          <path d={`M${rx + r * 1.2} ${y - r * 1.2} L${rx - r} ${y - r * (emotion === 'worried' ? 2 : 1.7)}`} />
        </g>
      )}
      {emotion === 'sad' && (
        <g fill="#070F1D">
          <rect x={lx - r * 1.4} y={y - r * 1.4} width={r * 2.8} height={r * 0.9} />
          <rect x={rx - r * 1.4} y={y - r * 1.4} width={r * 2.8} height={r * 0.9} />
        </g>
      )}
    </g>
  )
}

function ScreenMouth({ emotion, talking, y, w, color }: { emotion: Emotion; talking: boolean; y: number; w: number; color: string }) {
  if (talking) {
    return (
      <g className="st-mouth-live">
        <ellipse cx={0} cy={y + w * 0.45} rx={w} ry={w * 0.6} fill="#070F1D" stroke={color} strokeWidth={3} />
      </g>
    )
  }
  switch (emotion) {
    case 'happy':
    case 'excited':
      return <path d={`M${-w} ${y} Q0 ${y + w * 1.2} ${w} ${y}`} stroke={color} strokeWidth={4} fill={emotion === 'excited' ? '#070F1D' : 'none'} strokeLinecap="round" />
    case 'sad':
      return <path d={`M${-w * 0.8} ${y + 8} Q0 ${y - 4} ${w * 0.8} ${y + 8}`} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" />
    case 'worried':
      return <path d={`M${-w * 0.8} ${y + 3} q${w * 0.4} -6 ${w * 0.8} 0 t${w * 0.8} 0`} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" />
    case 'surprised':
      return <ellipse cx={0} cy={y + 4} rx={w * 0.4} ry={w * 0.5} fill="#070F1D" stroke={color} strokeWidth={3} />
    case 'thinking':
      return <path d={`M${-w * 0.3} ${y + 4} L${w * 0.7} ${y}`} stroke={color} strokeWidth={4} strokeLinecap="round" />
    default:
      return <path d={`M${-w * 0.8} ${y} Q0 ${y + w * 0.7} ${w * 0.8} ${y}`} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" />
  }
}

// ─── Spark — the orange robot (same design as components/kids/SparkCharacter) ─

export function Spark({ emotion, talking, variant }: PuppetProps) {
  const wheels = variant === 'wheels'
  return (
    <g transform="translate(-100 -222)">
      {!wheels && (
        <g transform="translate(100 198)">
          <g className="st-flame">
            <path d="M-18 0 Q0 46 18 0 Z" fill="#fde047" opacity={0.9} />
            <path d="M-9 0 Q0 26 9 0 Z" fill="#fff" />
          </g>
        </g>
      )}
      {wheels && (
        <g>
          <g transform="translate(62 200)"><g className="st-wheel"><circle r={22} fill="#1f2937" stroke="#111827" strokeWidth={4} /><circle r={8} fill="#9ca3af" /><path d="M0 -18 L0 18 M-18 0 L18 0" stroke="#4b5563" strokeWidth={4} /></g></g>
          <g transform="translate(138 200)"><g className="st-wheel"><circle r={22} fill="#1f2937" stroke="#111827" strokeWidth={4} /><circle r={8} fill="#9ca3af" /><path d="M0 -18 L0 18 M-18 0 L18 0" stroke="#4b5563" strokeWidth={4} /></g></g>
          <rect x={56} y={186} width={88} height={10} rx={5} fill="#475569" />
        </g>
      )}
      <g className="st-lean">
        <g className="st-breathe">
          <line x1="100" y1="8" x2="100" y2="32" stroke="#FF8A4C" strokeWidth="4" strokeLinecap="round" />
          <circle className="st-glow" cx="100" cy="6" r="9" fill="#fde047" />
          <rect x="34" y="32" width="132" height="98" rx="22" fill="#2563eb" stroke="#1e3a8a" strokeWidth="3" />
          <rect x="40" y="36" width="120" height="20" rx="10" fill="#60a5fa" opacity={0.5} />
          <rect x="46" y="46" width="108" height="64" rx="14" fill="#070F1D" />
          <g transform="translate(0 0)">
            <ScreenEyes emotion={emotion} lx={74} rx={126} y={76} r={11} color="#fde047" />
          </g>
          <g transform="translate(100 98)">
            <ScreenMouth emotion={emotion} talking={talking} y={0} w={14} color="#fde047" />
          </g>
          {(emotion === 'happy' || emotion === 'excited') && (
            <g opacity="0.7">
              <ellipse cx="58" cy="100" rx="8" ry="4.5" fill="#fb7185" />
              <ellipse cx="142" cy="100" rx="8" ry="4.5" fill="#fb7185" />
            </g>
          )}
          <rect x="46" y="134" width="108" height="62" rx="14" fill="#f97316" stroke="#9a3412" strokeWidth="3" />
          <rect x="70" y="148" width="60" height="32" rx="6" fill="#070F1D" />
          <circle className="st-blinker" cx="84" cy="164" r="4" fill="#fde047" />
          <circle className="st-glow" cx="100" cy="164" r="4" fill="#10b981" />
          <circle className="st-blinker [animation-delay:-.6s]" cx="116" cy="164" r="4" fill="#60a5fa" />
          <g transform="translate(29 140)">
            <g className={`st-origin-top ${emotion === 'excited' ? '' : 'st-arm-a'}`}>
              <g transform={emotion === 'excited' ? 'rotate(150 0 0)' : undefined}>
                <rect x="-11" y="0" width="22" height="40" rx="10" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2" />
                <circle cx="0" cy="44" r="9" fill="#FF8A4C" />
              </g>
            </g>
          </g>
          <g transform="translate(171 140)">
            <g className={`st-origin-top ${emotion === 'excited' ? '' : 'st-arm-b st-arm-talk'}`}>
              <g transform={emotion === 'excited' ? 'rotate(-150 0 0)' : undefined}>
                <rect x="-11" y="0" width="22" height="40" rx="10" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2" />
                <circle cx="0" cy="44" r="9" fill="#FF8A4C" />
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  )
}

// ─── Bolt — robot puppy (side view) ────────────────────────────────────────

export function Bolt({ emotion, talking }: PuppetProps) {
  const leg = (x: number, cls: string) => (
    <g transform={`translate(${x} -56)`} key={x}>
      <g className={`st-origin-top ${cls}`}>
        <rect x={-8} y={0} width={16} height={46} rx={7} fill="#64748b" />
        <ellipse cx={2} cy={48} rx={13} ry={8} fill="#334155" />
      </g>
    </g>
  )
  const wagFast = emotion === 'happy' || emotion === 'excited'
  return (
    <g>
      {leg(-44, 'st-leg-b')}
      {leg(30, 'st-leg-a')}
      <g className="st-bob">
        <g transform="translate(-62 -96)">
          <g className={`st-wag ${wagFast ? 'st-wag-fast' : ''}`}>
            <path d="M0 0 Q-18 -30 -8 -58" stroke="#475569" strokeWidth={5} fill="none" strokeLinecap="round" />
            <circle className="st-glow" cx={-8} cy={-60} r={8} fill="#f43f5e" />
          </g>
        </g>
        <g className="st-breathe">
          <rect x={-70} y={-110} width={124} height={62} rx={28} fill="#93c5fd" stroke="#1e40af" strokeWidth={3} />
          <rect x={-46} y={-100} width={60} height={14} rx={7} fill="#dbeafe" opacity={0.7} />
          <circle cx={-30} cy={-70} r={7} fill="#1e40af" opacity={0.5} />
          <circle cx={-8} cy={-70} r={7} fill="#1e40af" opacity={0.5} />
          <rect x={22} y={-122} width={14} height={34} rx={6} fill="#ef4444" />
          <circle cx={30} cy={-92} r={6} fill="#fbbf24" />
        </g>
        {leg(-26, 'st-leg-a')}
        {leg(44, 'st-leg-b')}
        <g transform="translate(66 -128)">
          <g className="st-breathe">
            <path d="M-20 -42 L-30 -78 L-2 -50 Z" fill="#60a5fa" stroke="#1e40af" strokeWidth={3} strokeLinejoin="round" />
            <path d="M18 -44 L36 -70 L30 -36 Z" fill="#60a5fa" stroke="#1e40af" strokeWidth={3} strokeLinejoin="round" />
            <rect x={-40} y={-50} width={80} height={70} rx={24} fill="#bfdbfe" stroke="#1e40af" strokeWidth={3} />
            <rect x={-30} y={-40} width={66} height={46} rx={14} fill="#070F1D" />
            <ScreenEyes emotion={emotion} lx={-12} rx={18} y={-20} r={7} color="#67e8f9" />
            <g transform="translate(3 -4)"><ScreenMouth emotion={emotion} talking={talking} y={0} w={8} color="#67e8f9" /></g>
            <ellipse cx={40} cy={4} rx={9} ry={7} fill="#1e293b" />
          </g>
        </g>
      </g>
    </g>
  )
}

// ─── Zippy (racer) and Rover (Mars) — wheeled robots ───────────────────────

function Wheel({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="st-wheel">
        <circle r={r} fill="#1f2937" stroke="#0f172a" strokeWidth={4} />
        <circle r={r * 0.62} fill="#475569" />
        <path d={`M0 ${-r * 0.6} L0 ${r * 0.6} M${-r * 0.6} 0 L${r * 0.6} 0`} stroke="#cbd5e1" strokeWidth={3} />
        <circle r={r * 0.2} fill="#e2e8f0" />
      </g>
    </g>
  )
}

export function Zippy({ emotion, talking }: PuppetProps) {
  return (
    <g>
      <g className="st-bob">
        <g className="st-breathe">
          <path d="M-86 -44 Q-90 -86 -50 -92 L56 -92 Q92 -86 90 -44 Z" fill="#84cc16" stroke="#3f6212" strokeWidth={4} />
          <path d="M-70 -78 L70 -78" stroke="#ecfccb" strokeWidth={5} strokeLinecap="round" opacity={0.6} />
          <text x={-46} y={-52} fontSize={26} fontWeight={900} fill="#365314" fontFamily="system-ui, sans-serif">7</text>
          <rect x={-76} y={-46} width={152} height={8} rx={4} fill="#3f6212" />
          <circle cx={-30} cy={-34} r={5} fill="#ef4444" className="st-glow" />
          <circle cx={30} cy={-34} r={5} fill="#ef4444" className="st-glow" />
          <rect x={-8} y={-142} width={76} height={54} rx={18} fill="#d9f99d" stroke="#3f6212" strokeWidth={4} />
          <rect x={0} y={-134} width={60} height={38} rx={10} fill="#070F1D" />
          <ScreenEyes emotion={emotion} lx={16} rx={44} y={-118} r={6} color="#a3e635" />
          <g transform="translate(30 -106)"><ScreenMouth emotion={emotion} talking={talking} y={0} w={7} color="#a3e635" /></g>
          <path d="M-60 -92 L-70 -136" stroke="#3f6212" strokeWidth={4} />
          <g transform="translate(-70 -136)"><g className="st-sway-top"><path d="M0 0 L26 8 L0 16 Z" fill="#f43f5e" /></g></g>
        </g>
      </g>
      <Wheel x={-50} y={-26} r={26} />
      <Wheel x={52} y={-26} r={26} />
    </g>
  )
}

export function Rover({ emotion, talking }: PuppetProps) {
  return (
    <g>
      {/* rocker-bogie */}
      <path d="M-96 -30 L-50 -112 L-6 -30 M-50 -112 L20 -150 L82 -30" stroke="#94a3b8" strokeWidth={9} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Wheel x={-96} y={-30} r={30} />
      <Wheel x={-6} y={-30} r={30} />
      <Wheel x={82} y={-30} r={30} />
      <g className="st-bob">
        <g className="st-breathe">
          <rect x={-120} y={-210} width={210} height={64} rx={10} fill="#e2e8f0" stroke="#475569" strokeWidth={4} />
          <rect x={-112} y={-202} width={92} height={48} rx={6} fill="#facc15" opacity={0.85} />
          <path d="M-112 -186 h92 M-112 -170 h92" stroke="#ca8a04" strokeWidth={2} />
          <rect x={-150} y={-204} width={34} height={52} rx={8} fill="#334155" />
          {[-196, -184, -172, -160].map((y) => <rect key={y} x={-158} y={y} width={50} height={5} fill="#1e293b" />)}
          <path d="M-60 -210 L-60 -238" stroke="#64748b" strokeWidth={5} />
          <ellipse cx={-60} cy={-244} rx={30} ry={9} fill="#cbd5e1" stroke="#475569" strokeWidth={3} />
          <rect x={56} y={-310} width={10} height={100} fill="#94a3b8" />
          <rect x={20} y={-362} width={86} height={52} rx={10} fill="#e2e8f0" stroke="#475569" strokeWidth={4} />
          <rect x={28} y={-354} width={70} height={36} rx={8} fill="#0f172a" />
          <ScreenEyes emotion={emotion} lx={48} rx={78} y={-336} r={8} color="#38bdf8" />
          <g transform="translate(63 -318)">
            {talking ? (
              <g className="st-mouth-live"><rect x={-18} y={0} width={36} height={8} rx={3} fill="#38bdf8" /></g>
            ) : (
              <rect x={-14} y={2} width={28} height={3} rx={1.5} fill="#38bdf8" opacity={0.6} />
            )}
          </g>
        </g>
      </g>
    </g>
  )
}

export const PUPPETS: Record<CharacterId, (p: PuppetProps) => React.ReactElement> = {
  spark: Spark,
  amara: Amara,
  lucia: Lucia,
  bolt: Bolt,
  zippy: Zippy,
  rover: Rover,
}
