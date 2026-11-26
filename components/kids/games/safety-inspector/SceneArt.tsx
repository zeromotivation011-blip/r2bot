// components/kids/games/safety-inspector/SceneArt.tsx
// Painted backdrops for the four inspection scenes (100 × 70 canvas). Pure SVG,
// no hooks: drawn inside the game's <svg>. Nothing here is tappable.

import type { Scene } from './scenes'

export function SceneArt({ id }: { id: Scene['id'] }) {
  if (id === 'factory') return <Factory />
  if (id === 'home') return <Home />
  if (id === 'street') return <Street />
  return <Hospital />
}

function Factory() {
  return (
    <g aria-hidden>
      <defs>
        <linearGradient id="si-f-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B2A47" />
          <stop offset="1" stopColor="#14213A" />
        </linearGradient>
        <linearGradient id="si-f-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B3852" />
          <stop offset="1" stopColor="#1E293F" />
        </linearGradient>
      </defs>
      <rect width="100" height="40" fill="url(#si-f-wall)" />
      <rect y="40" width="100" height="30" fill="url(#si-f-floor)" />
      {/* high windows */}
      {[8, 30, 52].map((x) => (
        <g key={x}>
          <rect x={x} y="3" width="16" height="7" rx="1" fill="#0E1A30" stroke="#3B4B6B" strokeWidth="0.4" />
          <path d={`M${x + 8} 3 V10`} stroke="#3B4B6B" strokeWidth="0.4" />
        </g>
      ))}
      {/* roof beams */}
      <path d="M0 1.5 H100" stroke="#2F3E5E" strokeWidth="1" />
      {/* floor perspective lines */}
      {[0, 20, 40, 60, 80, 100].map((x) => (
        <path key={x} d={`M${x} 40 L${50 + (x - 50) * 1.6} 70`} stroke="#33425E" strokeWidth="0.25" />
      ))}
      {/* walkway */}
      <rect x="30" y="54" width="70" height="14" fill="#2A3550" />
      <path d="M30 54 H100 M30 68 H100" stroke="#FACC15" strokeWidth="0.8" strokeDasharray="3 2" />
      <text x="97" y="66" fontSize="2.4" fill="#FACC15" textAnchor="end" opacity="0.8">WALKWAY</text>
      {/* conveyor */}
      <rect x="30" y="44" width="46" height="5" rx="2.5" fill="#0F172A" stroke="#475569" strokeWidth="0.5" />
      {[34, 42, 50, 58, 66, 72].map((x) => (
        <circle key={x} cx={x} cy="46.5" r="1.6" fill="#64748B" />
      ))}
      <rect x="58" y="41" width="5" height="3" rx="0.5" fill="#FC6818" />
      <rect x="66" y="41" width="5" height="3" rx="0.5" fill="#FC6818" />
      {/* arm base area (no fence!) */}
      <ellipse cx="20" cy="40" rx="11" ry="3" fill="#0F172A" opacity="0.6" />
      {/* welding cell with fence */}
      <rect x="69" y="8" width="21" height="22" fill="#0F172A" opacity="0.35" />
      <g stroke="#94A3B8" strokeWidth="0.35" opacity="0.8">
        {[69, 72, 75, 78, 81, 84, 87, 90].map((x) => (
          <path key={x} d={`M${x} 8 V30`} />
        ))}
        {[8, 12, 16, 20, 24, 28].map((y) => (
          <path key={y} d={`M69 ${y} H90`} />
        ))}
      </g>
      <rect x="69" y="27" width="5" height="3" fill="#22C55E" opacity="0.9" />
      {/* workbench */}
      <rect x="32" y="27" width="16" height="3" rx="0.6" fill="#475569" />
      <path d="M33 30 V36 M47 30 V36" stroke="#475569" strokeWidth="0.8" />
      {/* cobot table */}
      <rect x="53" y="30" width="12" height="2.5" rx="0.6" fill="#475569" />
    </g>
  )
}

function Home() {
  return (
    <g aria-hidden>
      <defs>
        <linearGradient id="si-h-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#23304F" />
          <stop offset="1" stopColor="#1B2742" />
        </linearGradient>
        <linearGradient id="si-h-garden" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38BDF8" stopOpacity="0.5" />
          <stop offset="1" stopColor="#16A34A" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <rect width="100" height="48" fill="url(#si-h-wall)" />
      {/* wooden floor */}
      <rect y="48" width="100" height="22" fill="#5B3A23" />
      {[52, 57, 62, 67].map((y) => (
        <path key={y} d={`M0 ${y} H100`} stroke="#4A2F1C" strokeWidth="0.35" />
      ))}
      {/* rug */}
      <ellipse cx="40" cy="60" rx="22" ry="6" fill="#0E7490" opacity="0.45" />
      {/* window to the garden */}
      <rect x="48" y="4" width="26" height="20" rx="1" fill="url(#si-h-garden)" stroke="#C9D4E5" strokeWidth="0.6" />
      <path d="M61 4 V24 M48 14 H74" stroke="#C9D4E5" strokeWidth="0.4" />
      {/* picture */}
      <rect x="8" y="10" width="14" height="10" rx="0.8" fill="#0F172A" stroke="#FC6818" strokeWidth="0.5" />
      <path d="M9 19 L13 14 L16 17 L18 15 L21 19 Z" fill="#FF8A4C" opacity="0.7" />
      {/* side table with speaker */}
      <rect x="33" y="31" width="10" height="2" rx="0.5" fill="#7C5A3F" />
      <path d="M35 33 V44 M41 33 V44" stroke="#7C5A3F" strokeWidth="0.8" />
      {/* kitchen counter */}
      <rect x="66" y="35" width="20" height="13" fill="#334155" />
      <rect x="65" y="34" width="22" height="2" rx="0.5" fill="#94A3B8" />
      {/* back door */}
      <rect x="88" y="12" width="10" height="36" rx="0.5" fill="#3F2A1C" stroke="#7C5A3F" strokeWidth="0.5" />
      <circle cx="89.8" cy="31" r="0.6" fill="#FACC15" />
    </g>
  )
}

function Street() {
  return (
    <g aria-hidden>
      <defs>
        <linearGradient id="si-s-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1E1B4B" />
          <stop offset="1" stopColor="#F97316" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect width="100" height="26" fill="url(#si-s-sky)" />
      {/* buildings */}
      {[
        [0, 8, 22, 18],
        [24, 12, 14, 14],
        [40, 6, 16, 20],
        [58, 10, 12, 16],
        [72, 4, 14, 22],
        [86, 9, 14, 17],
      ].map(([x, y, w, h]) => (
        <g key={x}>
          <rect x={x} y={y} width={w} height={h} fill="#111C32" />
          {Array.from({ length: Math.floor(w / 4) }).map((_, i) => (
            <rect key={i} x={x + 1.5 + i * 4} y={y + 3} width="1.6" height="2" fill="#FACC15" opacity={(i + x) % 3 === 0 ? 0.8 : 0.25} />
          ))}
        </g>
      ))}
      {/* depot sign */}
      <rect x="2" y="22" width="18" height="4" rx="0.6" fill="#FC6818" />
      <text x="11" y="25" fontSize="2.6" fontWeight="700" fill="#1A1103" textAnchor="middle">DEPOT</text>
      {/* far pavement */}
      <rect y="26" width="100" height="10" fill="#3B4A63" />
      {/* road */}
      <rect y="36" width="100" height="18" fill="#1F2937" />
      <path d="M0 45 H100" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="4 3" />
      {/* zebra crossing */}
      {[37.5, 40.5, 43.5, 46.5, 49.5, 52.5].map((y) => (
        <rect key={y} x="46" y={y - 0.8} width="9" height="1.6" fill="#E5E7EB" opacity="0.85" />
      ))}
      {/* near pavement */}
      <rect y="54" width="100" height="16" fill="#475569" />
      {[10, 30, 50, 70, 90].map((x) => (
        <path key={x} d={`M${x} 54 V70`} stroke="#3B4A63" strokeWidth="0.3" />
      ))}
      <path d="M0 54 H100" stroke="#94A3B8" strokeWidth="0.6" />
      {/* bench for the report */}
      <rect x="83" y="53" width="11" height="1.5" rx="0.4" fill="#7C5A3F" />
    </g>
  )
}

function Hospital() {
  return (
    <g aria-hidden>
      <defs>
        <linearGradient id="si-m-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1C3349" />
          <stop offset="1" stopColor="#16283D" />
        </linearGradient>
      </defs>
      <rect width="100" height="44" fill="url(#si-m-wall)" />
      <rect y="44" width="100" height="26" fill="#2B4A55" />
      {[0, 25, 50, 75, 100].map((x) => (
        <path key={x} d={`M${x} 44 L${50 + (x - 50) * 1.5} 70`} stroke="#355C68" strokeWidth="0.25" />
      ))}
      {/* hand rail */}
      <path d="M0 38 H100" stroke="#5EEAD4" strokeWidth="0.6" opacity="0.5" />
      {/* nurses' station */}
      <rect x="22" y="26" width="18" height="10" rx="0.8" fill="#0F2A3A" stroke="#2DD4BF" strokeWidth="0.4" />
      {/* green cross sign */}
      <rect x="4" y="6" width="10" height="10" rx="1.5" fill="#0F2A3A" />
      <path d="M9 8 V14 M6 11 H12" stroke="#22C55E" strokeWidth="1.6" />
      {/* lift */}
      <rect x="82" y="18" width="14" height="26" fill="#334155" stroke="#94A3B8" strokeWidth="0.5" />
      <path d="M89 18 V44" stroke="#94A3B8" strokeWidth="0.4" />
      {/* fire alarm + exit sign */}
      <rect x="77" y="10" width="5" height="4" rx="0.6" fill="#DC2626" />
      <rect x="84" y="8" width="10" height="4" rx="0.6" fill="#16A34A" />
      <text x="89" y="11" fontSize="2.4" fontWeight="700" fill="#F0FDF4" textAnchor="middle">EXIT</text>
      {/* charging bay */}
      <rect x="58" y="28" width="12" height="10" rx="0.8" fill="#0F2A3A" stroke="#22C55E" strokeWidth="0.4" strokeDasharray="1 0.8" />
      {/* robot lane */}
      <path d="M0 62 H70" stroke="#FACC15" strokeWidth="0.5" />
      <path d="M0 66 H70" stroke="#FACC15" strokeWidth="0.5" />
      {/* day room floor */}
      <rect x="70" y="50" width="30" height="20" fill="#2F5560" />
    </g>
  )
}
