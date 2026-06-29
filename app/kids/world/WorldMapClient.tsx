'use client'

// app/kids/world/WorldMapClient.tsx
// Illustrated SVG storybook map. Each zone is a place on a fantasy island.
// Pure SVG + CSS animations. Responsive; pan/zoom on mobile via touch.

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { KIDS_ZONES, ROBOT_PARTS, ZONE_UNLOCK_STARS, getZone } from '@/lib/kids-world-data'
import { getProgress, isZoneUnlocked } from '@/lib/kids-progress'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { useKidsVoice } from '@/lib/kids-voice'
import { SparkCharacter } from '@/components/kids/SparkCharacter'

// Geographic positions inside the SVG viewBox (1200×800).
const ZONE_POS: Record<string, { x: number; y: number; theme: ZoneTheme }> = {
  'spark-garden':  { x: 220,  y: 620, theme: 'garden'   },
  'robot-home':    { x: 540,  y: 660, theme: 'house'    },
  'build-it-bay':  { x: 900,  y: 540, theme: 'factory'  },
  'think-tank':    { x: 280,  y: 360, theme: 'brain'    },
  'code-cave':     { x: 620,  y: 280, theme: 'cave'     },
  'launch-pad':    { x: 980,  y: 200, theme: 'rocket'   },
}

type ZoneTheme = 'garden' | 'house' | 'factory' | 'brain' | 'cave' | 'rocket'

const PATH_BETWEEN: Array<[string, string]> = [
  ['spark-garden', 'robot-home'],
  ['robot-home', 'build-it-bay'],
  ['build-it-bay', 'think-tank'],
  ['think-tank', 'code-cave'],
  ['code-cave', 'launch-pad'],
]

export default function WorldMapClient() {
  const [stars, setStars] = useState(0)
  const [completedZones, setCompletedZones] = useState<string[]>([])
  const [earnedParts, setEarnedParts] = useState<string[]>([])
  const [currentZone, setCurrentZone] = useState('spark-garden')
  const [openZone, setOpenZone] = useState<string | null>(null)
  const [robotName, setRobotName] = useState('Spark Jr.')
  const { speak } = useKidsVoice()
  const greeted = useRef(false)

  useEffect(() => {
    const tick = () => {
      const p = getProgress()
      setStars(p.totalStars)
      setCompletedZones(p.completedZones)
      setEarnedParts(p.earnedParts)
      setCurrentZone(p.currentZone || 'spark-garden')
      setRobotName(p.robotName || 'Spark Jr.')
    }
    tick()
    const t = setInterval(tick, 1500)
    return () => clearInterval(t)
  }, [])

  // Spoken intro on first load
  useEffect(() => {
    if (greeted.current) return
    const t = setTimeout(() => {
      greeted.current = true
      speak('Welcome to Robot World! Tap a place to start exploring.')
    }, 600)
    return () => clearTimeout(t)
  }, [speak])

  const sparkPos = useMemo(() => ZONE_POS[currentZone] ?? ZONE_POS['spark-garden'], [currentZone])

  const handleZoneTap = (zoneId: string) => {
    primeAudio()
    const unlocked = isZoneUnlocked(zoneId)
    if (!unlocked) {
      playSound('wrong')
      const need = (ZONE_UNLOCK_STARS[zoneId] ?? 0) - stars
      speak(`You need ${Math.max(1, need)} more stars to unlock this place!`)
      return
    }
    playSound('click')
    setOpenZone(zoneId)
  }

  return (
    <div className="wm-root">
      <header className="wm-header">
        <Link href="/kids" className="wm-back" aria-label="Back to home">‹ Back</Link>
        <h1 className="wm-title">Robot World</h1>
        <div className="wm-stars" aria-label={`${stars} stars`}>⭐ {stars} / 50</div>
      </header>

      <div className="wm-canvas-wrap">
        <svg
          className="wm-canvas"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Map of Robot World"
        >
          <defs>
            <radialGradient id="wm-sky" cx="50%" cy="0%" r="100%">
              <stop offset="0%"  stopColor="#1e1b4b" />
              <stop offset="60%" stopColor="#0f0a1e" />
              <stop offset="100%" stopColor="#000" />
            </radialGradient>
            <linearGradient id="wm-ground" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"  stopColor="#2a1860" />
              <stop offset="100%" stopColor="#0f0a1e" />
            </linearGradient>
            <linearGradient id="wm-hill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"  stopColor="#10b981" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>
            <pattern id="wm-stars-pat" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
              <circle cx="20"  cy="50"  r="1.2" fill="#fff" opacity=".6" />
              <circle cx="120" cy="20"  r="0.8" fill="#fff" opacity=".5" />
              <circle cx="160" cy="120" r="1.4" fill="#fff" opacity=".7" />
              <circle cx="80"  cy="150" r="0.9" fill="#fff" opacity=".4" />
              <circle cx="30"  cy="180" r="1.1" fill="#fff" opacity=".5" />
            </pattern>
          </defs>

          {/* Sky + twinkle */}
          <rect width="1200" height="800" fill="url(#wm-sky)" />
          <rect width="1200" height="800" fill="url(#wm-stars-pat)" opacity=".6">
            <animate attributeName="opacity" values="0.4;0.85;0.4" dur="6s" repeatCount="indefinite" />
          </rect>

          {/* Rolling ground silhouettes */}
          <path d="M0 720 Q200 660 420 700 T800 700 T1200 690 L1200 800 L0 800 Z" fill="url(#wm-ground)" />
          <path d="M0 760 Q300 700 600 750 T1200 740 L1200 800 L0 800 Z" fill="#0f0a1e" opacity=".7" />

          {/* Path between zones */}
          {PATH_BETWEEN.map(([from, to]) => {
            const a = ZONE_POS[from]
            const b = ZONE_POS[to]
            if (!a || !b) return null
            const cx = (a.x + b.x) / 2 + (a.y > b.y ? -40 : 40)
            const cy = (a.y + b.y) / 2 + (a.x > b.x ? -40 : 40)
            return (
              <path
                key={`${from}-${to}`}
                d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
                fill="none"
                stroke="#fde047"
                strokeWidth="3"
                strokeDasharray="2 12"
                strokeLinecap="round"
                opacity=".7"
              />
            )
          })}

          {/* Zones */}
          {KIDS_ZONES.map((z) => {
            const pos = ZONE_POS[z.id]
            if (!pos) return null
            const unlocked = stars >= (ZONE_UNLOCK_STARS[z.id] ?? 0)
            const complete = completedZones.includes(z.id)
            const current = currentZone === z.id && !complete
            const earnedHere = z.levels.reduce(
              (s, l) => s + (getProgress().starsByLevel[`${z.id}/${l.id}`] || 0),
              0,
            )
            return (
              <ZoneNode
                key={z.id}
                x={pos.x}
                y={pos.y}
                theme={pos.theme}
                color={z.color}
                emoji={z.emoji}
                name={z.name}
                unlocked={unlocked}
                complete={complete}
                current={current}
                stars={earnedHere}
                onClick={() => handleZoneTap(z.id)}
              />
            )
          })}

        </svg>
        {/* Spark avatar overlay — positioned via percentage of canvas */}
        <div
          className="wm-spark-overlay"
          style={{
            left: `${(sparkPos.x / 1200) * 100}%`,
            top:  `${(sparkPos.y / 800)  * 100}%`,
          }}
          aria-hidden="true"
        >
          <SparkCharacter mood="happy" size={64} />
        </div>
      </div>

      {/* Parts strip */}
      <div className="wm-parts">
        <span className="wm-parts-label">Robot parts:</span>
        {ROBOT_PARTS.map(p => {
          const owned = earnedParts.includes(p.id)
          return (
            <div key={p.id} className={`wm-part ${owned ? 'is-owned' : ''}`} title={p.name}>
              <span>{owned ? p.emoji : '🔒'}</span>
            </div>
          )
        })}
        <Link href="/kids/my-robot" className="wm-myrobot">
          🤖 {robotName}
        </Link>
      </div>

      {openZone && (
        <ZoneModal
          zoneId={openZone}
          onClose={() => setOpenZone(null)}
        />
      )}

      <WorldMapStyles />
    </div>
  )
}

// ─── Zone node (illustrated landmark + label) ──────────────────────────────

interface ZoneNodeProps {
  x: number
  y: number
  theme: ZoneTheme
  color: string
  emoji: string
  name: string
  unlocked: boolean
  complete: boolean
  current: boolean
  stars: number
  onClick: () => void
}

function ZoneNode({
  x, y, theme, color, emoji, name, unlocked, complete, current, stars, onClick,
}: ZoneNodeProps) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      style={{ cursor: unlocked ? 'pointer' : 'not-allowed' }}
      onClick={onClick}
      role="button"
      aria-label={name}
    >
      {/* Glow halo for current zone */}
      {current && (
        <circle r="70" fill="none" stroke={color} strokeWidth="3" opacity=".4">
          <animate attributeName="r" values="60;82;60" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.55;0.05;0.55" dur="2.4s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Themed scene */}
      <g style={{ filter: unlocked ? 'none' : 'grayscale(1) opacity(0.55)' }}>
        <ZoneScene theme={theme} color={color} />
      </g>

      {/* Big emoji label */}
      <circle r="36" fill="#1a1040" stroke={color} strokeWidth="4" cy="0" cx="0" opacity={unlocked ? 1 : 0.7} />
      <text x="0" y="14" fontSize="40" textAnchor="middle" style={{ pointerEvents: 'none' }}>
        {emoji}
      </text>

      {/* Name plate */}
      <g transform="translate(0 64)">
        <rect x="-72" y="-2" width="144" height="30" rx="6" fill="#0f0a1e" stroke={color} strokeWidth="1.5" />
        <text x="0" y="18" fill={color} fontWeight="900" fontSize="14" textAnchor="middle" style={{ pointerEvents: 'none' }}>
          {name}
        </text>
      </g>

      {/* Stars chip */}
      {stars > 0 && (
        <g transform="translate(34 -34)">
          <rect x="0" y="-12" width="44" height="22" rx="11" fill="#fbbf24" stroke="#a16207" strokeWidth="1.5" />
          <text x="22" y="3" fontWeight="900" fontSize="13" fill="#0f0a1e" textAnchor="middle" style={{ pointerEvents: 'none' }}>
            ⭐ {stars}
          </text>
        </g>
      )}

      {/* Completion check */}
      {complete && (
        <g transform="translate(-30 -34)">
          <circle r="14" fill="#10b981" stroke="#0f0a1e" strokeWidth="2.5" />
          <text x="0" y="5" textAnchor="middle" fontWeight="900" fontSize="16" fill="#fff" style={{ pointerEvents: 'none' }}>✓</text>
        </g>
      )}

      {/* Lock badge */}
      {!unlocked && (
        <g transform="translate(28 32)">
          <circle r="14" fill="#1a1040" stroke="#4c1d95" strokeWidth="2.5" />
          <text x="0" y="5" textAnchor="middle" fontSize="14" fill="#fde047" style={{ pointerEvents: 'none' }}>🔒</text>
        </g>
      )}
    </g>
  )
}

// Each zone is illustrated with a small themed scene that surrounds the emoji circle.
function ZoneScene({ theme, color }: { theme: ZoneTheme; color: string }) {
  if (theme === 'garden') {
    return (
      <g>
        <ellipse cx="0" cy="46" rx="80" ry="14" fill="#0f0a1e" opacity=".5" />
        <path d="M-70 30 Q-30 -10 0 14 Q40 -8 80 26 Q60 50 -60 50 Z" fill="url(#wm-hill)" />
        <g>
          <circle cx="-40" cy="20" r="4" fill="#fb7185" />
          <circle cx="40"  cy="22" r="4" fill="#fde047" />
          <circle cx="-22" cy="36" r="3" fill="#fff" />
          <circle cx="26"  cy="38" r="3" fill="#a855f7" />
        </g>
      </g>
    )
  }
  if (theme === 'house') {
    return (
      <g>
        <ellipse cx="0" cy="46" rx="68" ry="10" fill="#0f0a1e" opacity=".5" />
        <rect x="-44" y="-4" width="88" height="46" rx="4" fill="#1e3a8a" />
        <path d="M-50 -4 L0 -48 L50 -4 Z" fill={color} stroke="#0f0a1e" strokeWidth="1.5" />
        <rect x="-10" y="14" width="20" height="28" rx="2" fill="#fbbf24" />
        <rect x="22" y="6" width="14" height="14" rx="2" fill="#fde047">
          <animate attributeName="fill" values="#fde047;#fbbf24;#fde047" dur="2s" repeatCount="indefinite" />
        </rect>
      </g>
    )
  }
  if (theme === 'factory') {
    return (
      <g>
        <ellipse cx="0" cy="46" rx="78" ry="12" fill="#0f0a1e" opacity=".5" />
        <rect x="-56" y="-12" width="112" height="56" rx="4" fill="#475569" />
        <rect x="-46" y="6" width="14" height="36" fill="#0f0a1e" />
        <rect x="-26" y="6" width="14" height="36" fill="#0f0a1e" />
        <rect x="14" y="-32" width="20" height="42" fill="#7c2d12" />
        <circle cx="24" cy="-44" r="9" fill="#94a3b8" opacity=".6">
          <animate attributeName="cy" values="-44;-70;-44" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values=".6;0;.6" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="-24" cy="20" r="9" fill="none" stroke={color} strokeWidth="2">
          <animateTransform attributeName="transform" type="rotate" from="0 -24 20" to="360 -24 20" dur="4s" repeatCount="indefinite" />
        </circle>
      </g>
    )
  }
  if (theme === 'brain') {
    return (
      <g>
        <ellipse cx="0" cy="46" rx="74" ry="12" fill="#0f0a1e" opacity=".5" />
        <ellipse cx="-20" cy="14" rx="38" ry="30" fill="#a855f7" opacity=".4" />
        <ellipse cx="20"  cy="14" rx="38" ry="30" fill="#a855f7" opacity=".4" />
        <g stroke={color} strokeWidth="1.4" fill="none" opacity=".85">
          <path d="M-40 10 q20 -10 40 0 q20 10 40 0" />
          <path d="M-46 24 q24 -8 46 0 q22 8 46 0" />
        </g>
        <g fill={color}>
          <circle cx="-30" cy="14" r="3">
            <animate attributeName="opacity" values=".3;1;.3" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="30"  cy="14" r="3">
            <animate attributeName="opacity" values=".3;1;.3" dur="2.1s" repeatCount="indefinite" />
          </circle>
          <circle cx="0"   cy="-10" r="3">
            <animate attributeName="opacity" values=".3;1;.3" dur="2.3s" repeatCount="indefinite" />
          </circle>
        </g>
      </g>
    )
  }
  if (theme === 'cave') {
    return (
      <g>
        <ellipse cx="0" cy="46" rx="76" ry="12" fill="#0f0a1e" opacity=".5" />
        <path d="M-60 40 Q-60 -34 0 -36 Q60 -34 60 40 Z" fill="#1e293b" />
        <path d="M-50 40 Q-50 -22 0 -24 Q50 -22 50 40 Z" fill="#0f172a" />
        <g fontFamily="monospace" fontWeight="700" fill={color} fontSize="9">
          <text x="-30" y="-8">10110</text>
          <text x="-22" y="6">{`if()`}</text>
          <text x="-12" y="22">{`{ run }`}</text>
        </g>
      </g>
    )
  }
  // rocket / launch-pad
  return (
    <g>
      <ellipse cx="0" cy="46" rx="76" ry="12" fill="#0f0a1e" opacity=".5" />
      <rect x="-48" y="20" width="96" height="20" fill="#475569" />
      <path d="M0 -52 L18 6 L-18 6 Z" fill={color} stroke="#0f0a1e" strokeWidth="1.6" />
      <rect x="-8" y="6" width="16" height="22" fill="#fbbf24" />
      <circle cx="0" cy="-14" r="6" fill="#0f0a1e" />
      <path d="M-6 28 L0 50 L6 28 Z" fill="#f97316">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="0.6s" repeatCount="indefinite" />
      </path>
    </g>
  )
}

// ─── Zone modal (kept similar in spirit to before, restyled) ───────────────

function ZoneModal({ zoneId, onClose }: { zoneId: string; onClose: () => void }) {
  const zone = getZone(zoneId)
  const { speak } = useKidsVoice()
  useEffect(() => {
    if (zone) speak(`${zone.name}. ${zone.tagline}`)
  }, [zone, speak])

  if (!zone) return null
  const progress = getProgress()
  const unlocked = isZoneUnlocked(zoneId)
  const earned = zone.levels.reduce(
    (s, l) => s + (progress.starsByLevel[`${zone.id}/${l.id}`] || 0), 0,
  )
  const max = zone.levels.reduce((s, l) => s + l.starReward, 0)

  return (
    <div className="wm-modal-backdrop" onClick={onClose}>
      <div
        className="wm-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ '--zone-color': zone.color } as React.CSSProperties}
      >
        <button className="wm-modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="wm-modal-banner">
          <span style={{ fontSize: 56 }}>{zone.emoji}</span>
          <h2>{zone.name}</h2>
          <p>{zone.tagline}</p>
          <p className="wm-modal-age">Ages {zone.ageRange}</p>
        </div>

        <p className="wm-modal-levels-h">
          {zone.levels.length} levels · ⭐ {earned} / {max}
        </p>
        <div className="wm-modal-levels">
          {zone.levels.map((l) => {
            const key = `${zone.id}/${l.id}`
            const done = progress.completedLevels.includes(key)
            const lvlStars = progress.starsByLevel[key] || 0
            return (
              <div key={l.id} className="wm-modal-level">
                <span style={{ fontSize: 22 }}>{l.emoji}</span>
                <div className="wm-modal-level-body">
                  <p>{l.title}</p>
                  <small>{l.duration} · ⭐ {l.starReward}</small>
                </div>
                {done && <span className="wm-modal-stars-earned">⭐{lvlStars}</span>}
              </div>
            )
          })}
        </div>

        <div className="wm-modal-boss">
          <p className="wm-modal-boss-label">⚡ Boss challenge</p>
          <p className="wm-modal-boss-title">{zone.bossChallenge.title}</p>
          <small>Needs ⭐ {zone.bossChallenge.starsToUnlock} total</small>
        </div>

        {unlocked ? (
          <Link
            href={`/kids/world/${zone.id}`}
            className="wm-modal-cta"
            onClick={() => playSound('unlock')}
          >
            Enter Zone! →
          </Link>
        ) : (
          <p className="wm-modal-locked">
            Earn ⭐ {ZONE_UNLOCK_STARS[zone.id]} to unlock this place
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

function WorldMapStyles() {
  return (
    <style jsx global>{`
      .wm-root {
        max-width: 1100px;
        margin: 0 auto;
        padding: 14px 16px 24px;
        position: relative;
      }
      .wm-header {
        display: flex; align-items: center; justify-content: space-between;
        gap: 10px; margin-bottom: 14px;
      }
      .wm-title {
        font-size: clamp(20px, 4vw, 32px);
        color: #fde047;
        font-weight: 900;
        text-shadow: 0 0 24px rgba(253,224,71,.4);
        margin: 0;
      }
      .wm-back {
        min-height: 44px; padding: 0 14px;
        background: #1a1040; color: #fde68a;
        border-radius: 12px; border: 2px solid #4c1d95;
        text-decoration: none; font-weight: 800;
        display: inline-flex; align-items: center;
      }
      .wm-stars {
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: #1a1040;
        padding: 8px 14px; border-radius: 999px;
        font-weight: 900;
      }
      .wm-canvas-wrap {
        position: relative;
        width: 100%;
        aspect-ratio: 3 / 2;
        border-radius: 20px;
        overflow: hidden;
        background: #0f0a1e;
        border: 2px solid rgba(124,58,237,0.35);
        box-shadow: 0 18px 60px rgba(0,0,0,0.55);
      }
      .wm-canvas { width: 100%; height: 100%; display: block; }
      .wm-spark-overlay {
        position: absolute;
        transform: translate(-50%, -150%);
        pointer-events: none;
        filter: drop-shadow(0 8px 14px rgba(0,0,0,0.45));
      }

      .wm-parts {
        display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
        margin-top: 14px;
        padding: 10px 14px;
        background: rgba(26,16,64,0.7);
        border-radius: 16px;
        border: 1px solid #4c1d95;
      }
      .wm-parts-label {
        font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
        color: #c4b5fd; font-weight: 800; margin-right: 4px;
      }
      .wm-part {
        width: 32px; height: 32px;
        display: grid; place-items: center;
        background: #0f0a1e;
        border: 1.5px solid #4c1d95;
        border-radius: 10px;
        font-size: 18px;
      }
      .wm-part.is-owned {
        border-color: #fbbf24;
        background: radial-gradient(circle at 35% 30%, #fef3c7, #fbbf24);
        box-shadow: 0 0 12px rgba(251,191,36,.4);
      }
      .wm-myrobot {
        margin-left: auto;
        min-height: 40px;
        padding: 0 14px;
        display: inline-flex; align-items: center;
        background: linear-gradient(135deg, #7c3aed, #c026d3);
        color: white; text-decoration: none;
        font-weight: 900; border-radius: 999px;
      }

      .wm-modal-backdrop {
        position: fixed; inset: 0; z-index: 70;
        background: rgba(15,10,30,0.85);
        display: grid; place-items: center;
        padding: 16px;
        animation: wm-fade 0.2s;
      }
      @keyframes wm-fade { from { opacity: 0 } to { opacity: 1 } }
      .wm-modal {
        position: relative;
        width: 100%; max-width: 460px;
        background: #1a1040;
        border: 4px solid var(--zone-color, #f59e0b);
        border-radius: 24px;
        padding: 24px 22px;
        max-height: 86vh; overflow-y: auto;
        color: #fde68a;
        animation: wm-zoom 0.25s ease-out;
      }
      @keyframes wm-zoom {
        from { transform: scale(.85); opacity: 0; }
        to   { transform: scale(1); opacity: 1; }
      }
      .wm-modal-close {
        position: absolute; top: 10px; right: 14px;
        background: transparent; border: none;
        color: #fde047; font-size: 30px; font-weight: 900;
        cursor: pointer; line-height: 1;
      }
      .wm-modal-banner { text-align: center; margin-bottom: 14px; }
      .wm-modal-banner h2 {
        font-size: 26px; font-weight: 900; color: #fde047; margin-top: 6px;
      }
      .wm-modal-banner p { font-size: 14px; color: #c4b5fd; margin-top: 2px; }
      .wm-modal-age { font-size: 12px; color: #fbbf24; }
      .wm-modal-levels-h { text-align: center; font-weight: 800; color: #fde047; margin-bottom: 8px; }
      .wm-modal-levels { display: grid; gap: 6px; margin-bottom: 14px; }
      .wm-modal-level {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 12px;
        background: #0f0a1e;
        border-radius: 12px;
        border: 1px solid #4c1d95;
      }
      .wm-modal-level-body { flex: 1; }
      .wm-modal-level-body p { font-weight: 800; font-size: 14px; color: #fde68a; margin: 0; }
      .wm-modal-level-body small { font-size: 11px; color: #c4b5fd; }
      .wm-modal-stars-earned { color: #fbbf24; font-weight: 900; }
      .wm-modal-boss {
        padding: 14px;
        background: linear-gradient(135deg, #ef4444 0%, #f59e0b 100%);
        border-radius: 14px;
        text-align: center; color: white;
        margin-bottom: 14px;
      }
      .wm-modal-boss-label { font-size: 11px; font-weight: 900; letter-spacing: 1.5px; margin: 0; }
      .wm-modal-boss-title { font-size: 16px; font-weight: 900; margin: 2px 0 0; }
      .wm-modal-boss small { font-size: 12px; opacity: .9; }
      .wm-modal-cta {
        display: grid; place-items: center;
        min-height: 56px;
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: #1a1040;
        font-size: 18px; font-weight: 900;
        text-decoration: none;
        border-radius: 16px;
      }
      .wm-modal-locked {
        text-align: center;
        color: #c4b5fd; font-weight: 800;
      }
      @media (max-width: 640px) {
        .wm-canvas-wrap { aspect-ratio: 4 / 5; }
      }
    `}</style>
  )
}
