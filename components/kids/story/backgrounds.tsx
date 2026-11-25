// components/kids/story/backgrounds.tsx
// Painted sets for the Story Theatre, drawn in a 1600 × 900 world. Actors
// stand on FLOOR_Y. Gentle ambient motion (clouds, rain, blinking lights)
// keeps a still scene alive; reduced-motion users get it frozen.

import type { BackgroundId } from '@/lib/kids/stories/types'

export const FLOOR_Y = 812

function Sky({ id, top, bottom }: { id: string; top: string; bottom: string }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id})`} />
    </>
  )
}

function Cloud({ x, y, s = 1, slow = false }: { x: number; y: number; s?: number; slow?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={`st-drift ${slow ? 'st-drift-slow' : ''}`}>
        <g fill="#fff" opacity={0.9}>
          <ellipse cx={0} cy={0} rx={70} ry={30} />
          <ellipse cx={-50} cy={10} rx={46} ry={24} />
          <ellipse cx={54} cy={8} rx={50} ry={26} />
          <ellipse cx={10} cy={-22} rx={44} ry={30} />
        </g>
      </g>
    </g>
  )
}

function Kitchen() {
  return (
    <g>
      <rect width="1600" height="900" fill="#fde8c8" />
      <rect y="0" width="1600" height="60" fill="#f6d3a3" />
      {/* window with Lagos sky and palm */}
      <rect x="560" y="110" width="420" height="270" rx="14" fill="#7dd3fc" stroke="#b45309" strokeWidth="14" />
      <g transform="translate(-260 0)"><Cloud x={980} y={170} s={0.6} /></g>
      <rect x="560" y="300" width="420" height="80" fill="#86efac" />
      <path d="M880 380 Q870 300 900 230" stroke="#92400e" strokeWidth="12" fill="none" />
      <g transform="translate(900 230)"><g className="st-sway-top">
        <path d="M0 0 Q-60 -10 -90 30 M0 0 Q60 -20 100 20 M0 0 Q-20 -60 -70 -60 M0 0 Q30 -60 80 -50" stroke="#15803d" strokeWidth="14" fill="none" strokeLinecap="round" />
      </g></g>
      <path d="M770 110 V380 M560 245 H980" stroke="#b45309" strokeWidth="8" />
      {/* tiles */}
      <g opacity="0.35">
        {Array.from({ length: 16 }, (_, i) => (
          <rect key={i} x={i * 100} y={470} width={96} height={46} fill={i % 2 ? '#38bdf8' : '#fef3c7'} />
        ))}
      </g>
      {/* counter */}
      <rect x="0" y="520" width="1600" height="40" fill="#78350f" />
      <rect x="0" y="560" width="1600" height="200" fill="#b45309" />
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i}>
          <rect x={20 + i * 200} y={580} width={180} height={160} rx={10} fill="#c2610c" stroke="#92400e" strokeWidth="4" />
          <rect x={95 + i * 200} y={600} width={30} height={8} rx={4} fill="#fde68a" />
        </g>
      ))}
      {/* toaster + kettle */}
      <rect x="280" y="440" width="140" height="82" rx="20" fill="#cbd5e1" stroke="#475569" strokeWidth="5" />
      <rect x="305" y="430" width="34" height="14" rx="4" fill="#d97706" />
      <rect x="355" y="430" width="34" height="14" rx="4" fill="#d97706" />
      <path d="M1180 520 Q1170 440 1230 430 Q1290 440 1280 520 Z" fill="#ef4444" stroke="#991b1b" strokeWidth="5" />
      {/* fridge */}
      <rect x="1380" y="150" width="200" height="610" rx="20" fill="#e2e8f0" stroke="#64748b" strokeWidth="6" />
      <path d="M1380 380 H1580" stroke="#64748b" strokeWidth="5" />
      <rect x="1400" y="270" width="12" height="80" rx="6" fill="#64748b" />
      <rect x="1400" y="410" width="12" height="110" rx="6" fill="#64748b" />
      <circle cx="1490" cy="230" r="18" fill="#f472b6" />
      <rect x="1460" y="290" width="70" height="52" fill="#fff" transform="rotate(-6 1495 316)" />
      {/* hanging plant */}
      <path d="M180 0 V120" stroke="#78350f" strokeWidth="4" />
      <path d="M140 120 H220 L205 175 H155 Z" fill="#c2410c" />
      <g transform="translate(180 120)"><g className="st-sway-top">
        <path d="M-20 0 Q-50 60 -40 120 M20 0 Q50 70 30 130 M0 0 Q0 60 8 100" stroke="#16a34a" strokeWidth="10" fill="none" strokeLinecap="round" />
      </g></g>
      {/* floor */}
      <rect y="760" width="1600" height="140" fill="#f5c58a" />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M${i * 200} 760 L${i * 200 - 80} 900`} stroke="#e2a964" strokeWidth="4" />
      ))}
      <path d="M0 820 H1600" stroke="#e2a964" strokeWidth="3" />
    </g>
  )
}

function Street() {
  const houses = [
    { x: 0, w: 260, h: 430, c: '#f472b6' },
    { x: 260, w: 220, h: 500, c: '#fbbf24' },
    { x: 480, w: 260, h: 400, c: '#2dd4bf' },
    { x: 740, w: 240, h: 470, c: '#fb7185' },
    { x: 980, w: 220, h: 420, c: '#a78bfa' },
    { x: 1200, w: 400, h: 480, c: '#60a5fa' },
  ]
  return (
    <g>
      <Sky id="st-street-sky" top="#38bdf8" bottom="#bae6fd" />
      <Cloud x={200} y={110} s={0.9} />
      <Cloud x={900} y={70} s={0.7} slow />
      <path d="M0 330 L120 250 L260 300 L420 200 L560 290 L760 230 L1000 300 L1180 220 L1400 290 L1600 240 V420 H0 Z" fill="#94a3b8" opacity={0.5} />
      {houses.map((h, i) => (
        <g key={i}>
          <rect x={h.x} y={700 - h.h} width={h.w} height={h.h} fill={h.c} stroke="#1e293b" strokeWidth="3" />
          <rect x={h.x} y={700 - h.h} width={h.w} height={22} fill="#fff" opacity={0.35} />
          {[0, 1].map((r) =>
            [0, 1, 2].map((c) => (
              <g key={`${r}${c}`}>
                <rect x={h.x + 30 + c * (h.w - 60) / 3} y={700 - h.h + 60 + r * 120} width={(h.w - 60) / 3 - 20} height={70} rx={6} fill="#1e3a8a" opacity={0.75} />
                <rect x={h.x + 24 + c * (h.w - 60) / 3} y={700 - h.h + 128 + r * 120} width={(h.w - 60) / 3 - 8} height={8} fill="#1e293b" />
              </g>
            )),
          )}
          <rect x={h.x + h.w / 2 - 34} y={590} width={68} height={110} rx={30} fill="#78350f" />
        </g>
      ))}
      {/* papel picado bunting */}
      <path d="M0 150 Q400 230 800 160 Q1200 230 1600 150" stroke="#334155" strokeWidth="3" fill="none" />
      {Array.from({ length: 20 }, (_, i) => {
        const x = 40 + i * 80
        const t = x / 800
        const y = x < 800 ? 150 + Math.sin(t * Math.PI) * 45 : 160 + Math.sin((t - 1) * Math.PI) * 45
        const colors = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7']
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <g className="st-sway-top">
              <path d="M-22 0 H22 V40 L11 32 L0 40 L-11 32 L-22 40 Z" fill={colors[i % 5]} />
            </g>
          </g>
        )
      })}
      {/* fountain */}
      <ellipse cx="1360" cy="720" rx="150" ry="30" fill="#0ea5e9" stroke="#475569" strokeWidth="8" />
      <rect x="1345" y="610" width="30" height="110" fill="#94a3b8" />
      <ellipse cx="1360" cy="610" rx="60" ry="14" fill="#38bdf8" stroke="#475569" strokeWidth="6" />
      <path d="M1360 600 Q1330 540 1300 610 M1360 600 Q1390 540 1420 610" stroke="#7dd3fc" strokeWidth="6" fill="none" className="st-glow" />
      {/* fruit stand */}
      <rect x="120" y="610" width="200" height="90" fill="#a16207" />
      <path d="M100 610 L340 610 L320 560 L120 560 Z" fill="#f43f5e" />
      <path d="M140 560 V610 M180 560 V610 M220 560 V610 M260 560 V610 M300 560 V610" stroke="#fff" strokeWidth="8" opacity={0.6} />
      {[150, 185, 220, 255, 290].map((x, i) => <circle key={x} cx={x} cy={630} r={16} fill={['#f97316', '#facc15', '#84cc16', '#ef4444', '#f97316'][i]} />)}
      {/* pavement */}
      <rect y="700" width="1600" height="200" fill="#d6d3d1" />
      {Array.from({ length: 17 }, (_, i) => <path key={i} d={`M${i * 100} 700 V900`} stroke="#a8a29e" strokeWidth="3" />)}
      <path d="M0 760 H1600" stroke="#a8a29e" strokeWidth="3" />
    </g>
  )
}

function Workshop() {
  return (
    <g>
      <rect width="1600" height="900" fill="#7c4a2d" />
      {Array.from({ length: 16 }, (_, i) => <rect key={i} x={i * 100} y={0} width={98} height={760} fill={i % 2 ? '#8b5534' : '#7f4c2f'} />)}
      {/* stormy window */}
      <rect x="1080" y="90" width="380" height="260" rx="10" fill="#1e293b" stroke="#451a03" strokeWidth="14" />
      <g clipPath="url(#st-ws-clip)">
        <defs><clipPath id="st-ws-clip"><rect x="1080" y="90" width="380" height="260" /></clipPath></defs>
        <g className="st-rain">
          {Array.from({ length: 30 }, (_, i) => (
            <path key={i} d={`M${1080 + (i * 37) % 400} ${60 + (i * 53) % 300} l-10 30`} stroke="#93c5fd" strokeWidth="3" opacity={0.7} />
          ))}
        </g>
        <path d="M1300 90 L1270 170 L1300 170 L1260 260" stroke="#fde047" strokeWidth="6" fill="none" className="st-blinker" />
      </g>
      <path d="M1270 90 V350 M1080 220 H1460" stroke="#451a03" strokeWidth="8" />
      {/* pegboard with tools */}
      <rect x="120" y="100" width="600" height="300" rx="10" fill="#d6b48a" stroke="#5b3416" strokeWidth="8" />
      {Array.from({ length: 60 }, (_, i) => <circle key={i} cx={150 + (i % 12) * 48} cy={130 + Math.floor(i / 12) * 56} r={4} fill="#8b6a46" />)}
      <path d="M200 140 V300 M180 140 H220" stroke="#475569" strokeWidth="12" strokeLinecap="round" />
      <path d="M300 150 L300 300" stroke="#f97316" strokeWidth="14" strokeLinecap="round" />
      <path d="M300 150 L300 200" stroke="#94a3b8" strokeWidth="8" />
      <circle cx="430" cy="210" r="56" fill="none" stroke="#334155" strokeWidth="10" />
      <path d="M560 140 L640 300 M640 140 L560 300" stroke="#64748b" strokeWidth="10" strokeLinecap="round" />
      {/* gears */}
      <g transform="translate(860 200)"><g className="st-gear">
        <circle r="60" fill="#f59e0b" stroke="#78350f" strokeWidth="6" strokeDasharray="20 10" />
        <circle r="18" fill="#78350f" />
      </g></g>
      {/* bench */}
      <rect x="40" y="520" width="900" height="34" fill="#a16207" stroke="#451a03" strokeWidth="5" />
      <rect x="80" y="554" width="30" height="210" fill="#713f12" />
      <rect x="870" y="554" width="30" height="210" fill="#713f12" />
      <rect x="160" y="470" width="120" height="50" rx="8" fill="#1d4ed8" />
      <rect x="320" y="450" width="80" height="70" rx="6" fill="#16a34a" />
      {[340, 360, 380].map((x) => <circle key={x} cx={x} cy={470} r={5} fill="#fde047" className="st-blinker" />)}
      <path d="M600 520 Q620 440 700 450" stroke="#ef4444" strokeWidth="6" fill="none" />
      {/* shelves */}
      <rect x="1100" y="430" width="400" height="16" fill="#451a03" />
      <rect x="1100" y="560" width="400" height="16" fill="#451a03" />
      {[1120, 1200, 1290, 1380].map((x, i) => <rect key={x} x={x} y={370 + (i % 2) * 10} width={60} height={60 - (i % 2) * 10} rx={6} fill={['#38bdf8', '#f472b6', '#a3e635', '#fbbf24'][i]} />)}
      <rect x="1140" y="500" width="120" height="60" rx="8" fill="#e2e8f0" />
      <circle cx="1400" cy="530" r="28" fill="#f97316" />
      <rect y="760" width="1600" height="140" fill="#57534e" />
      <path d="M0 760 H1600" stroke="#292524" strokeWidth="6" />
      <ellipse cx="500" cy="840" rx="160" ry="18" fill="#44403c" />
    </g>
  )
}

function Garden() {
  const plantX = [330, 450, 570, 690, 810, 930, 1050, 1170, 1290, 1410]
  return (
    <g>
      <Sky id="st-garden-sky" top="#7dd3fc" bottom="#fef9c3" />
      <circle cx="1400" cy="130" r="60" fill="#fde047" className="st-glow" />
      <Cloud x={300} y={120} s={0.8} />
      <Cloud x={1000} y={90} s={0.6} slow />
      <path d="M0 470 Q200 330 420 420 Q640 300 900 410 Q1150 320 1400 410 Q1520 380 1600 400 V700 H0 Z" fill="#4ade80" />
      <path d="M0 540 Q300 450 620 530 Q900 460 1200 530 Q1420 480 1600 520 V700 H0 Z" fill="#22c55e" />
      {/* tea-garden rows */}
      {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M0 ${560 + i * 22} Q800 ${520 + i * 22} 1600 ${560 + i * 22}`} stroke="#15803d" strokeWidth="6" fill="none" opacity={0.5} />)}
      {/* coconut palms */}
      {[120, 1520].map((x) => (
        <g key={x}>
          <path d={`M${x} 700 Q${x - 20} 500 ${x + 20} 330`} stroke="#92400e" strokeWidth="18" fill="none" />
          <g transform={`translate(${x + 20} 330)`}><g className="st-sway-top">
            <path d="M0 0 Q-90 -20 -140 40 M0 0 Q90 -30 150 30 M0 0 Q-30 -90 -110 -80 M0 0 Q40 -90 120 -80 M0 0 Q0 60 -30 110" stroke="#15803d" strokeWidth="16" fill="none" strokeLinecap="round" />
            <circle cx="-6" cy="12" r="12" fill="#78350f" /><circle cx="12" cy="14" r="12" fill="#78350f" />
          </g></g>
        </g>
      ))}
      {/* house with tiled roof */}
      <rect x="1220" y="450" width="230" height="170" fill="#fef3c7" stroke="#92400e" strokeWidth="5" />
      <path d="M1190 460 L1335 360 L1480 460 Z" fill="#c2410c" stroke="#7c2d12" strokeWidth="5" />
      <rect x="1310" y="520" width="50" height="100" fill="#92400e" />
      {/* soil bed + tomato plants */}
      <rect y="690" width="1600" height="210" fill="#a16207" />
      <path d="M0 690 H1600" stroke="#713f12" strokeWidth="8" />
      <rect x="260" y="700" width="1240" height="60" rx="20" fill="#78350f" />
      {plantX.map((x, i) => (
        <g key={x} transform={`translate(${x} 735)`}>
          <g className="st-sway [animation-delay:-1s]">
            <path d="M0 0 V-120" stroke="#166534" strokeWidth="6" />
            <path d="M0 -40 Q-40 -60 -50 -30 M0 -70 Q40 -90 48 -60 M0 -100 Q-30 -130 -40 -100" stroke="#16a34a" strokeWidth="10" fill="none" strokeLinecap="round" />
            <circle cx={-18} cy={-56} r={12} fill={i % 3 === 0 ? '#facc15' : '#ef4444'} />
            <circle cx={20} cy={-86} r={11} fill="#ef4444" />
          </g>
        </g>
      ))}
      <rect y="760" width="1600" height="140" fill="#b45309" />
    </g>
  )
}

function Classroom() {
  return (
    <g>
      <rect width="1600" height="900" fill="#dbeafe" />
      <rect y="0" width="1600" height="40" fill="#bfdbfe" />
      {/* whiteboard */}
      <rect x="140" y="110" width="620" height="300" rx="10" fill="#fff" stroke="#64748b" strokeWidth="10" />
      <text x="190" y="190" fontSize="48" fontWeight="800" fill="#1d4ed8" fontFamily="system-ui, sans-serif">로봇 동아리</text>
      <text x="190" y="246" fontSize="34" fontWeight="700" fill="#475569" fontFamily="system-ui, sans-serif">Robot Club</text>
      <text x="190" y="320" fontSize="30" fontWeight="700" fill="#16a34a" fontFamily="ui-monospace, monospace">IF red → STOP</text>
      <text x="190" y="366" fontSize="30" fontWeight="700" fill="#ef4444" fontFamily="ui-monospace, monospace">ELSE → GO</text>
      {/* window */}
      <rect x="900" y="100" width="560" height="320" rx="10" fill="#7dd3fc" stroke="#475569" strokeWidth="10" />
      <g clipPath="url(#st-cls-clip)">
        <defs><clipPath id="st-cls-clip"><rect x="900" y="100" width="560" height="320" /></clipPath></defs>
        <Cloud x={1000} y={160} s={0.6} />
        <path d="M900 420 L960 300 L1010 340 L1080 250 L1160 330 L1230 280 L1300 320 L1380 260 L1460 330 V420 Z" fill="#64748b" />
        <path d="M1180 420 V280 h50 v140 M1260 420 V250 h60 v170" fill="#94a3b8" />
        <path d="M940 420 Q1000 360 1060 420" fill="#f9a8d4" />
      </g>
      <path d="M1180 100 V420 M900 260 H1460" stroke="#475569" strokeWidth="8" />
      {/* posters */}
      <rect x="40" y="460" width="120" height="160" rx="8" fill="#fde68a" />
      <circle cx="100" cy="520" r="30" fill="#f97316" />
      <rect x="1480" y="460" width="100" height="140" rx="8" fill="#c4b5fd" />
      {/* floor with toy-city mat */}
      <rect y="660" width="1600" height="240" fill="#d6b48a" />
      {Array.from({ length: 20 }, (_, i) => <path key={i} d={`M${i * 90} 660 V900`} stroke="#c49b6a" strokeWidth="3" />)}
      <rect x="120" y="690" width="1360" height="190" rx="18" fill="#4ade80" opacity={0.9} />
      <rect x="120" y="760" width="1360" height="70" fill="#475569" />
      <path d="M140 795 H1460" stroke="#fde047" strokeWidth="6" strokeDasharray="30 24" />
      {/* toy buildings + bus + light */}
      {[200, 330, 470].map((x, i) => <rect key={x} x={x} y={600 - i * 20} width={90} height={110 + i * 20} rx={6} fill={['#f472b6', '#60a5fa', '#facc15'][i]} stroke="#1e293b" strokeWidth="3" />)}
      <rect x="1250" y="690" width="170" height="70" rx="14" fill="#f59e0b" stroke="#92400e" strokeWidth="4" />
      {[1268, 1310, 1352].map((x) => <rect key={x} x={x} y={702} width={30} height={22} rx={4} fill="#bae6fd" />)}
      <circle cx="1290" cy="762" r="12" fill="#1e293b" /><circle cx="1390" cy="762" r="12" fill="#1e293b" />
      <rect x="1176" y="610" width="10" height="150" fill="#334155" />
      <rect x="1160" y="560" width="42" height="100" rx="10" fill="#1e293b" />
      <circle cx="1181" cy="582" r="11" fill="#ef4444" className="st-glow" />
      <circle cx="1181" cy="610" r="11" fill="#78350f" />
      <circle cx="1181" cy="638" r="11" fill="#14532d" />
    </g>
  )
}

function Hospital() {
  return (
    <g>
      <rect width="1600" height="900" fill="#d1fae5" />
      {/* corridor perspective */}
      <path d="M560 200 H1040 V620 H560 Z" fill="#a7f3d0" />
      <path d="M0 0 L560 200 V620 L0 760 Z" fill="#bbf7d0" />
      <path d="M1600 0 L1040 200 V620 L1600 760 Z" fill="#bbf7d0" />
      <path d="M0 0 L560 200 H1040 L1600 0 Z" fill="#f0fdf4" />
      {/* ceiling lights */}
      {[300, 800, 1300].map((x) => <rect key={x} x={x - 70} y={x === 800 ? 210 : 70} width="140" height="14" rx="7" fill="#fff" className="st-glow" />)}
      {/* doors */}
      <path d="M140 220 L320 280 V660 L140 700 Z" fill="#60a5fa" stroke="#1e40af" strokeWidth="5" />
      <path d="M1460 220 L1280 280 V660 L1460 700 Z" fill="#60a5fa" stroke="#1e40af" strokeWidth="5" />
      <rect x="170" y="300" width="70" height="44" fill="#fff" transform="skewY(18)" />
      <text x="1318" y="330" fontSize="34" fontWeight="800" fill="#1e3a8a" fontFamily="system-ui, sans-serif">Ward 3</text>
      <path d="M380 300 V600 M1220 300 V600" stroke="#86efac" strokeWidth="10" />
      {/* window at the end with an acacia tree */}
      <rect x="680" y="250" width="240" height="180" rx="8" fill="#fde68a" stroke="#94a3b8" strokeWidth="8" />
      <path d="M700 430 Q760 380 800 380 Q840 380 900 430 Z" fill="#a16207" opacity={0.5} />
      <path d="M800 400 V330" stroke="#78350f" strokeWidth="8" />
      <ellipse cx="800" cy="322" rx="80" ry="22" fill="#4d7c0f" />
      {/* handrails */}
      <path d="M0 520 L560 470 M1600 520 L1040 470" stroke="#0ea5e9" strokeWidth="10" />
      {/* red cross sign */}
      <rect x="770" y="140" width="60" height="60" rx="10" fill="#fff" />
      <path d="M800 152 V188 M782 170 H818" stroke="#ef4444" strokeWidth="12" />
      {/* shiny floor */}
      <path d="M0 760 L560 620 H1040 L1600 760 V900 H0 Z" fill="#e2e8f0" />
      <path d="M560 620 L300 900 M1040 620 L1300 900 M800 620 V900" stroke="#cbd5e1" strokeWidth="4" />
      <ellipse cx="800" cy="800" rx="400" ry="30" fill="#fff" opacity={0.5} />
    </g>
  )
}

function Factory() {
  return (
    <g>
      <rect width="1600" height="900" fill="#cbd5e1" />
      {/* roof trusses */}
      {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${i * 200} 0 L${i * 200 + 100} 120 L${i * 200 + 200} 0`} stroke="#64748b" strokeWidth="8" fill="none" />)}
      <path d="M0 120 H1600" stroke="#475569" strokeWidth="12" />
      {[200, 600, 1000, 1400].map((x) => <g key={x}><path d={`M${x} 120 V170`} stroke="#334155" strokeWidth="4" /><path d={`M${x - 50} 170 H${x + 50} L${x + 30} 200 H${x - 30} Z`} fill="#334155" /><ellipse cx={x} cy={206} rx={40} ry={8} fill="#fef9c3" className="st-glow" /></g>)}
      {/* banner */}
      <rect x="520" y="230" width="560" height="90" rx="10" fill="#f97316" />
      <text x="800" y="290" textAnchor="middle" fontSize="44" fontWeight="900" fill="#fff" fontFamily="system-ui, sans-serif">¡CARRERA DE ROBOTS!</text>
      {/* conveyor + arm */}
      <rect x="60" y="470" width="440" height="40" rx="20" fill="#334155" />
      {[90, 160, 230, 300, 370, 440].map((x) => <circle key={x} cx={x} cy={490} r={14} fill="#94a3b8" />)}
      {[120, 260, 400].map((x) => <rect key={x} x={x} y={430} width={60} height={40} fill="#a16207" />)}
      <path d="M560 510 V420 L640 360 L700 400" stroke="#f59e0b" strokeWidth="26" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="560" cy="510" r="30" fill="#334155" />
      {/* parked yellow AGVs */}
      {[1150, 1350].map((x) => (
        <g key={x}>
          <rect x={x} y={560} width={150} height={70} rx={12} fill="#facc15" stroke="#854d0e" strokeWidth="5" />
          <rect x={x + 20} y={540} width={50} height={24} rx={6} fill="#1e293b" />
          <circle cx={x + 30} cy={636} r={12} fill="#1e293b" /><circle cx={x + 120} cy={636} r={12} fill="#1e293b" />
          <circle cx={x + 130} cy={574} r={6} fill="#22c55e" className="st-blinker" />
        </g>
      ))}
      <path d="M0 640 H1600" stroke="#facc15" strokeWidth="10" strokeDasharray="40 30" />
      {/* floor + black line track */}
      <rect y="660" width="1600" height="240" fill="#f1f5f9" />
      <path d="M0 850 C300 790 500 880 800 830 S1300 780 1600 840" stroke="#0f172a" strokeWidth="18" fill="none" />
      {/* start/finish chequer */}
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={1460 + (i % 2) * 20} y={680 + Math.floor(i / 2) * 20} width={20} height={20} fill={(i + Math.floor(i / 2)) % 2 ? '#0f172a' : '#fff'} />)}
      <rect x="1458" y="560" width="6" height="250" fill="#334155" />
    </g>
  )
}

function ControlRoom() {
  return (
    <g>
      <rect width="1600" height="900" fill="#0b1638" />
      {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={(i * 397) % 1600} cy={(i * 131) % 120 + 10} r={1.5 + (i % 3)} fill="#fff" opacity={0.25} />)}
      {/* big screens */}
      <rect x="120" y="120" width="620" height="340" rx="16" fill="#0f172a" stroke="#38bdf8" strokeWidth="6" />
      <defs>
        <linearGradient id="st-cr-mars" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#e4a46a" /><stop offset="1" stopColor="#b45309" /></linearGradient>
      </defs>
      <rect x="140" y="140" width="580" height="300" rx="8" fill="url(#st-cr-mars)" />
      <path d="M140 360 L260 330 L400 360 L520 320 L720 350 V440 H140 Z" fill="#9a3412" />
      <circle cx="300" cy="390" r="22" fill="#7c2d12" />
      <rect x="140" y="140" width="580" height="300" rx="8" fill="none" stroke="#38bdf8" strokeWidth="2" opacity={0.4} />
      <g clipPath="url(#st-cr-clip)">
        <defs><clipPath id="st-cr-clip"><rect x="140" y="140" width="580" height="300" /></clipPath></defs>
        <rect x="140" y="140" width="40" height="300" fill="#38bdf8" opacity={0.12} className="st-scan" />
      </g>
      <text x="160" y="176" fontSize="24" fontWeight="700" fill="#e0f2fe" fontFamily="ui-monospace, monospace">ROVER CAM · MARS</text>
      <rect x="860" y="120" width="620" height="340" rx="16" fill="#0f172a" stroke="#38bdf8" strokeWidth="6" />
      <circle cx="1000" cy="290" r="70" fill="#2563eb" />
      <path d="M960 250 Q990 230 1010 260 Q1030 300 990 320 Q960 300 960 250 Z" fill="#22c55e" />
      <circle cx="1360" cy="290" r="40" fill="#ea580c" />
      <path d="M1070 290 H1320" stroke="#fde047" strokeWidth="4" strokeDasharray="14 12" className="st-glow" />
      <text x="880" y="160" fontSize="24" fontWeight="700" fill="#e0f2fe" fontFamily="ui-monospace, monospace">SIGNAL ⟶ ⟶ ⟶</text>
      <text x="1170" y="420" fontSize="28" fontWeight="800" fill="#fde047" textAnchor="middle" fontFamily="ui-monospace, monospace">IN TRANSIT…</text>
      {/* consoles */}
      <path d="M0 620 L1600 620 L1600 700 L0 700 Z" fill="#1e293b" />
      <path d="M0 600 H1600 V630 H0 Z" fill="#334155" />
      {Array.from({ length: 24 }, (_, i) => (
        <circle key={i} cx={40 + i * 66} cy={650} r={7} fill={['#22c55e', '#f59e0b', '#38bdf8', '#ef4444'][i % 4]} className={i % 3 === 0 ? 'st-blinker' : undefined} />
      ))}
      {[200, 700, 1200].map((x) => <rect key={x} x={x} y={530} width={200} height={72} rx={8} fill="#0f172a" stroke="#38bdf8" strokeWidth="3" />)}
      <rect y="700" width="1600" height="200" fill="#111827" />
      <path d="M0 760 H1600" stroke="#1f2937" strokeWidth="4" />
    </g>
  )
}

const DUST_DELAY = ['[animation-delay:0s]', '[animation-delay:-1.7s]', '[animation-delay:-3.4s]', '[animation-delay:-5.1s]']

function Mars() {
  return (
    <g>
      <Sky id="st-mars-sky" top="#d6a46b" bottom="#f1c999" />
      <circle cx="1280" cy="150" r="30" fill="#fff7ed" opacity={0.8} />
      <path d="M0 460 L140 380 L260 420 L360 330 L520 420 L700 400 L860 300 L980 380 L1120 360 L1260 420 L1420 340 L1600 400 V600 H0 Z" fill="#c2703d" opacity={0.7} />
      <path d="M0 560 Q400 480 800 540 Q1200 490 1600 540 V900 H0 Z" fill="#b45f2b" />
      <path d="M0 680 Q500 640 1000 690 Q1300 660 1600 690 V900 H0 Z" fill="#c76b33" />
      {/* crater edge on the right */}
      <path d="M1300 700 Q1450 640 1600 660 V760 Q1460 720 1340 760 Z" fill="#8a3f17" />
      {/* rocks */}
      {[{ x: 520, s: 1.4 }, { x: 760, s: 0.7 }, { x: 980, s: 1 }, { x: 240, s: 0.6 }, { x: 1150, s: 0.5 }].map((r, i) => (
        <g key={i} transform={`translate(${r.x} 770) scale(${r.s})`}>
          <path d="M-60 0 Q-70 -50 -20 -64 Q30 -76 56 -34 Q70 -6 60 0 Z" fill="#7c2d12" />
          <path d="M-30 -50 Q0 -64 30 -46" stroke="#a8542a" strokeWidth="6" fill="none" />
        </g>
      ))}
      {/* soft sand patch */}
      <ellipse cx="900" cy="820" rx="160" ry="20" fill="#e0a26a" />
      {/* drifting dust */}
      {Array.from({ length: 14 }, (_, i) => (
        <g key={i} transform={`translate(${(i * 233) % 1500} ${520 + (i * 47) % 300})`}>
          <circle r={3 + (i % 3)} fill="#fde6c8" className={`st-dust ${DUST_DELAY[i % DUST_DELAY.length]}`} />
        </g>
      ))}
    </g>
  )
}

export function Background({ id }: { id: BackgroundId }) {
  switch (id) {
    case 'kitchen': return <Kitchen />
    case 'street': return <Street />
    case 'workshop': return <Workshop />
    case 'garden': return <Garden />
    case 'classroom': return <Classroom />
    case 'hospital': return <Hospital />
    case 'factory': return <Factory />
    case 'control-room': return <ControlRoom />
    case 'mars': return <Mars />
  }
}
