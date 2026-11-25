'use client'

// components/kids/games/circuit-city/CitySceneClient.tsx
// The city above the breadboard. Each building is wired to a load on the
// board (house light, streetlights, shop sign, Ferris wheel, night-light) and
// lights up from the solver's real currents. Original SVG art.

import type { Scene } from './levels'

export interface SceneLoads {
  /** 0..1 glow per load id (H, L1, L2, L3, S, N). */
  glow: Record<string, number>
  burnt: Record<string, boolean>
  /** 0..1 motor speed (Ferris wheel). */
  motor: number
  buzzer: boolean
}

interface Props {
  scene: Scene
  loads: SceneLoads
  lux: number
  storm: boolean
}

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * t))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

const STARS = Array.from({ length: 28 }, (_, i) => ({ x: (i * 97) % 600, y: 8 + ((i * 53) % 70), r: i % 4 === 0 ? 1.6 : 1 }))

export default function CitySceneClient({ scene, loads, lux, storm }: Props) {
  const day = Math.max(0, Math.min(1, Math.log10(Math.max(1, lux)) / 3))
  const skyTop = mix([8, 14, 38], [56, 152, 230], day)
  const skyBot = mix([30, 27, 75], [186, 230, 253], day)
  const g = (id: string) => loads.glow[id] ?? 0
  const lightColor = '#ffd36b'

  return (
    <svg viewBox="0 0 600 180" preserveAspectRatio="xMidYMid slice" className="h-[130px] w-full sm:h-[170px]" role="img" aria-label={sceneLabel(scene, loads)}>
      <defs>
        <linearGradient id="cc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="1" stopColor={skyBot} />
        </linearGradient>
        <radialGradient id="cc-glow">
          <stop offset="0" stopColor="#ffe28a" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cc-glow-red">
          <stop offset="0" stopColor="#ff5a4a" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ff2d2d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cc-glow-white">
          <stop offset="0" stopColor="#fffdf2" stopOpacity="0.95" />
          <stop offset="1" stopColor="#e0f2fe" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cc-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe28a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffe28a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="600" height="180" fill="url(#cc-sky)" />
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={(1 - day) * 0.8} />
      ))}
      {day > 0.5 ? (
        <circle cx={520} cy={40 - (day - 0.5) * 30} r={18} fill="#fde68a" opacity={Math.min(1, (day - 0.5) * 3)} />
      ) : (
        <g opacity={Math.min(1, (0.5 - day) * 3)}>
          <circle cx={520} cy={36} r={14} fill="#f1f5f9" />
          <circle cx={527} cy={31} r={12} fill={skyTop} />
        </g>
      )}
      {/* far skyline */}
      <g fill={mix([16, 24, 48], [120, 150, 190], day)}>
        <rect x="0" y="92" width="40" height="70" />
        <rect x="44" y="70" width="34" height="92" />
        <rect x="84" y="100" width="46" height="62" />
        <rect x="380" y="80" width="30" height="82" />
        <rect x="414" y="104" width="50" height="58" />
        <rect x="560" y="88" width="40" height="74" />
      </g>
      <rect y="150" width="600" height="30" fill={mix([20, 28, 44], [74, 98, 74], day)} />

      {scene === 'house' && <House glow={g('H')} burnt={!!loads.burnt.H} x={250} color={lightColor} />}

      {scene === 'street' && (
        <g>
          <rect y="146" width="600" height="14" fill="#1f2937" />
          {[0, 1, 2].map((k) => (
            <rect key={k} x={80 + k * 180} y="152" width="40" height="3" fill="#facc15" opacity="0.7" />
          ))}
          <House glow={0.6} burnt={false} x={20} color={lightColor} small />
          <House glow={0} burnt={false} x={470} color={lightColor} small />
          {['L1', 'L2', 'L3'].map((id, k) => (
            <StreetLamp key={id} x={170 + k * 130} glow={g(id)} broken={!!loads.burnt[id] || (storm && id === 'L2')} n={k + 1} />
          ))}
          {storm && (
            <g>
              {Array.from({ length: 40 }, (_, i) => (
                <line key={i} x1={(i * 61) % 600} y1={(i * 37) % 150} x2={((i * 61) % 600) - 6} y2={((i * 37) % 150) + 14} stroke="#bae6fd" strokeOpacity="0.5" strokeWidth="1.5" />
              ))}
              <path d="M300 0 L285 50 L302 50 L288 100" stroke="#fef9c3" strokeWidth="3" fill="none" className="motion-safe:animate-pulse" />
            </g>
          )}
        </g>
      )}

      {scene === 'fair' && (
        <g>
          {/* Shop with sign */}
          <rect x="60" y="88" width="150" height="66" fill="#273449" />
          <rect x="70" y="112" width="40" height="42" fill="#0f172a" />
          <rect x="120" y="112" width="80" height="30" fill={g('S') > 0 ? '#3b2a1f' : '#111827'} />
          <ellipse cx="135" cy="74" rx={60 + 30 * g('S')} ry={22 + 10 * g('S')} fill="url(#cc-glow-red)" opacity={g('S')} />
          <rect x="85" y="60" width="100" height="26" rx="6" fill="#0b1220" stroke={g('S') > 0 ? '#ff5a4a' : '#374151'} strokeWidth="2" />
          <text x="135" y="79" textAnchor="middle" fontSize="16" fontWeight="900" fill={loads.burnt.S ? '#3f3f46' : g('S') > 0 ? '#ff6b5b' : '#4b5563'} style={{ letterSpacing: 3 }}>
            SHOP
          </text>
          {/* Ferris wheel */}
          <g>
            <line x1="420" y1="96" x2="395" y2="154" stroke="#64748b" strokeWidth="5" />
            <line x1="420" y1="96" x2="445" y2="154" stroke="#64748b" strokeWidth="5" />
            <g
              className={loads.motor > 0 ? 'motion-safe:animate-spin' : ''}
              style={{ transformOrigin: '420px 96px', transformBox: 'view-box', animationDuration: loads.motor > 0 ? `${(9 / loads.motor).toFixed(2)}s` : undefined }}
            >
              <circle cx="420" cy="96" r="52" fill="none" stroke="#FC6818" strokeWidth="3" />
              <circle cx="420" cy="96" r="44" fill="none" stroke="#FC6818" strokeOpacity="0.4" strokeWidth="2" />
              {Array.from({ length: 8 }, (_, k) => {
                const a = (k / 8) * Math.PI * 2
                const x = 420 + Math.cos(a) * 52
                const y = 96 + Math.sin(a) * 52
                return (
                  <g key={k}>
                    <line x1="420" y1="96" x2={x} y2={y} stroke="#94a3b8" strokeWidth="1.5" />
                    <circle cx={x} cy={y} r="7" fill={['#22d3ee', '#facc15', '#22c55e', '#f472b6'][k % 4]} />
                  </g>
                )
              })}
            </g>
            <circle cx="420" cy="96" r="5" fill="#e2e8f0" />
          </g>
          {loads.buzzer && (
            <text x="520" y="70" fontSize="22" fill="#22d3ee" className="motion-safe:animate-bounce">
              ♪
            </text>
          )}
        </g>
      )}

      {scene === 'nightlight' && (
        <g>
          <House glow={0} burnt={false} x={60} color={lightColor} small />
          {/* cut-away bedroom */}
          <polygon points="230,70 330,30 430,70" fill="#7c2d12" />
          <rect x="240" y="70" width="180" height="84" fill="#1e293b" />
          <rect x="252" y="80" width="156" height="66" fill={mix([15, 23, 42], [148, 163, 184], day * 0.6)} />
          <ellipse cx="300" cy="128" rx={30 + 60 * g('N')} ry={22 + 30 * g('N')} fill="url(#cc-glow-white)" opacity={g('N')} />
          {/* bed + sleeping kid */}
          <rect x="330" y="118" width="70" height="20" rx="4" fill="#334155" />
          <rect x="330" y="112" width="22" height="10" rx="4" fill="#e2e8f0" />
          <circle cx="345" cy="110" r="7" fill="#fbbf24" />
          <rect x="350" y="112" width="48" height="10" rx="4" fill="#FC6818" />
          {/* night-light */}
          <rect x="292" y="132" width="16" height="12" rx="3" fill="#475569" />
          <circle cx="300" cy="128" r="6" fill={loads.burnt.N ? '#27272a' : g('N') > 0 ? '#fffbeb' : '#64748b'} />
          <text x="270" y="98" fontSize="11" fill="#cbd5e1">
            {day > 0.66 ? '☀︎ day' : day > 0.33 ? 'dusk' : 'z z z'}
          </text>
        </g>
      )}
    </svg>
  )
}

function sceneLabel(scene: Scene, l: SceneLoads): string {
  const on = (id: string) => ((l.glow[id] ?? 0) > 0 ? 'on' : 'off')
  switch (scene) {
    case 'house':
      return `The house light is ${on('H')}.`
    case 'street':
      return `Streetlights: 1 ${on('L1')}, 2 ${on('L2')}, 3 ${on('L3')}.`
    case 'fair':
      return `Shop sign ${on('S')}; Ferris wheel ${l.motor > 0 ? 'turning' : 'still'}.`
    default:
      return `Night-light ${on('N')}.`
  }
}

function House({ glow, burnt, x, color, small }: { glow: number; burnt: boolean; x: number; color: string; small?: boolean }) {
  const s = small ? 0.75 : 1
  return (
    <g transform={`translate(${x} ${small ? 50 : 22}) scale(${s})`}>
      {glow > 0 && <ellipse cx="60" cy="90" rx={80 * glow + 30} ry={50 * glow + 20} fill="url(#cc-glow)" opacity={glow * 0.8} />}
      <polygon points="0,55 60,10 120,55" fill="#b45309" />
      <rect x="10" y="55" width="100" height="75" fill="#334155" />
      <rect x="50" y="90" width="22" height="40" fill="#1e293b" />
      {[
        [20, 66],
        [80, 66],
        [20, 98],
        [86, 98],
      ].map(([wx, wy], k) => (
        <rect key={k} x={wx} y={wy} width="20" height="18" fill={burnt ? '#18181b' : glow > 0 ? color : '#0f172a'} opacity={glow > 0 ? 0.4 + 0.6 * glow : 1} stroke="#1e293b" strokeWidth="2" />
      ))}
    </g>
  )
}

function StreetLamp({ x, glow, broken, n }: { x: number; glow: number; broken: boolean; n: number }) {
  const on = glow > 0 && !broken
  return (
    <g>
      {on && <polygon points={`${x - 4},58 ${x - 36},150 ${x + 28},150`} fill="url(#cc-cone)" opacity={glow} />}
      <rect x={x - 3} y="56" width="6" height="94" fill="#475569" />
      <rect x={x - 20} y="50" width="24" height="7" rx="3" fill="#64748b" />
      <circle cx={x - 6} cy="60" r="7" fill={broken ? '#27272a' : on ? '#fff3c4' : '#334155'} />
      {on && <circle cx={x - 6} cy="60" r={16 + 14 * glow} fill="url(#cc-glow)" opacity={glow} />}
      {broken && <path d={`M${x - 12} 54 l6 6 l-4 3 l7 6`} stroke="#f87171" strokeWidth="2" fill="none" />}
      <text x={x} y="172" textAnchor="middle" fontSize="11" fontWeight="800" fill="#cbd5e1">
        {n}
      </text>
    </g>
  )
}
