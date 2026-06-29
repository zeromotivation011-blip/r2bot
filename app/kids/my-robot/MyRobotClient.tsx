'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ROBOT_PARTS, KIDS_ZONES } from '@/lib/kids-world-data'
import { getProgress, saveProgress } from '@/lib/kids-progress'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { useKidsVoice } from '@/lib/kids-voice'

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#7C3AED', '#EC4899', '#94A3B8', '#FACC15']
const EYES = [
  { id: 'happy',      label: '😊 Happy' },
  { id: 'cool',       label: '😎 Cool' },
  { id: 'determined', label: '😤 Determined' },
  { id: 'silly',      label: '😜 Silly' },
] as const

export default function MyRobotClient() {
  const [progress, setProgress] = useState(() => getProgress())
  const [name, setName] = useState(progress.robotName)
  const [primary, setPrimary] = useState(progress.robotColor)
  const [accent, setAccent] = useState(progress.robotAccent)
  const [eyes, setEyes] = useState<string>(progress.robotEyes)
  const { speak } = useKidsVoice()

  useEffect(() => {
    saveProgress({ robotName: name, robotColor: primary, robotAccent: accent, robotEyes: eyes })
    setProgress(p => ({ ...p, robotName: name, robotColor: primary, robotAccent: accent, robotEyes: eyes }))
  }, [name, primary, accent, eyes])

  const earned = new Set(progress.earnedParts)
  const completedZones = new Set(progress.completedZones)

  const skills = useMemo(() => {
    const list: string[] = []
    if (completedZones.has('spark-garden')) list.push('✅ Knows what robots are')
    if (completedZones.has('robot-home'))   list.push('✅ Spots robots at home')
    if (completedZones.has('build-it-bay')) list.push('✅ Knows the 4 robot parts')
    if (completedZones.has('think-tank'))   list.push('✅ Understands IF–THEN')
    if (completedZones.has('code-cave'))    list.push('✅ Can do block coding')
    if (completedZones.has('launch-pad'))   list.push('✅ Wrote first Python')
    return list
  }, [completedZones])

  // ── Generate shareable PNG via canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const downloadCard = () => {
    primeAudio()
    playSound('click')
    const canvas = canvasRef.current ?? document.createElement('canvas')
    canvasRef.current = canvas
    canvas.width = 1200; canvas.height = 630
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // background gradient
    const grad = ctx.createLinearGradient(0, 0, 1200, 630)
    grad.addColorStop(0, '#1A1040')
    grad.addColorStop(1, '#0F0A1E')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 1200, 630)

    // stars (just dots)
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 1200
      const y = Math.random() * 630
      const r = Math.random() * 1.6
      ctx.globalAlpha = 0.7
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1

    // title
    ctx.fillStyle = '#FDE047'
    ctx.font = 'bold 38px system-ui, sans-serif'
    ctx.fillText('R2BOT · Robot World', 60, 80)

    // robot name
    ctx.fillStyle = '#FBBF24'
    ctx.font = 'bold 70px system-ui, sans-serif'
    ctx.fillText(name || 'My Robot', 60, 170)

    // simple robot face on the right
    drawRobotFace(ctx, 900, 280, primary, accent, eyes)

    // stars
    ctx.fillStyle = '#FDE68A'
    ctx.font = 'bold 36px system-ui, sans-serif'
    ctx.fillText(`⭐ ${progress.totalStars} stars earned`, 60, 240)
    ctx.font = '24px system-ui, sans-serif'
    ctx.fillText(`🔧 ${progress.earnedParts.length} / ${ROBOT_PARTS.length} robot parts collected`, 60, 280)

    // skills
    ctx.font = '22px system-ui, sans-serif'
    ctx.fillStyle = '#C4B5FD'
    skills.slice(0, 5).forEach((s, i) => {
      ctx.fillText(s, 60, 340 + i * 36)
    })

    // footer
    ctx.fillStyle = '#FBBF24'
    ctx.font = 'bold 22px system-ui, sans-serif'
    ctx.fillText('Built with R2BOT · r2bot.in/kids', 60, 580)

    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `${(name || 'my-robot').replace(/\s+/g, '-')}-robot.png`
    a.click()
  }

  return (
    <div className="mr">
      <header className="mr-head">
        <Link href="/kids/world" className="back">← World map</Link>
        <h1>🤖 My Robot</h1>
        <div className="stars">⭐ {progress.totalStars}</div>
      </header>

      <div className="mr-grid">
        {/* Robot preview */}
        <div className="robot-stage">
          <RobotSilhouette
            primary={primary}
            accent={accent}
            eyes={eyes}
            earned={earned}
          />
          <p className="robot-name">{name || 'My Robot'}</p>
          <p className="parts-count">🔧 {progress.earnedParts.length} / {ROBOT_PARTS.length} parts</p>
        </div>

        {/* Customise panel */}
        <div className="panel">
          <label>
            <span>Robot name</span>
            <input
              type="text"
              value={name}
              maxLength={15}
              onChange={e => setName(e.target.value)}
            />
          </label>

          <div className="swatch-row">
            <span>Body colour</span>
            <div className="swatches">
              {COLORS.map(c => (
                <button key={c} className={`sw ${primary === c ? 'on' : ''}`} style={{ background: c }} onClick={() => { primary !== c && playSound('click'); setPrimary(c) }} aria-label={`Primary ${c}`} />
              ))}
            </div>
          </div>

          <div className="swatch-row">
            <span>Accent colour</span>
            <div className="swatches">
              {COLORS.map(c => (
                <button key={c} className={`sw ${accent === c ? 'on' : ''}`} style={{ background: c }} onClick={() => { accent !== c && playSound('click'); setAccent(c) }} aria-label={`Accent ${c}`} />
              ))}
            </div>
          </div>

          <div className="eyes-row">
            <span>Eyes</span>
            <div className="eyes-list">
              {EYES.map(e => (
                <button key={e.id} className={`eyes-btn ${eyes === e.id ? 'on' : ''}`} onClick={() => { eyes !== e.id && playSound('click'); setEyes(e.id) }}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <section className="stats">
        <Stat label="Stars" value={`${progress.totalStars}`} icon="⭐" />
        <Stat label="Zones done" value={`${progress.completedZones.length} / ${KIDS_ZONES.length}`} icon="🗺️" />
        <Stat label="Levels done" value={`${progress.completedLevels.length}`} icon="📘" />
        <Stat label="Played" value={`${progress.totalMinutesPlayed} min`} icon="⏱️" />
      </section>

      {/* Parts collection */}
      <section className="parts">
        <h2>Part collection</h2>
        <div className="parts-grid">
          {ROBOT_PARTS.map(p => {
            const owned = earned.has(p.id)
            const zone = KIDS_ZONES.find(z => z.id === p.zone)
            return (
              <button
                key={p.id}
                type="button"
                className={`part ${owned ? 'owned' : 'locked'}`}
                disabled={!owned}
                onClick={() => {
                  if (!owned) return
                  primeAudio()
                  playSound('click')
                  speak(`${p.name}. ${p.description}`)
                }}
                aria-label={owned ? `${p.name} — tap to hear about it` : `${p.name} — locked`}
              >
                <span className="p-emoji">{owned ? p.emoji : '🔒'}</span>
                <p className="p-name">{p.name}</p>
                {!owned && zone && <p className="p-zone">Earn in {zone.name}</p>}
                {owned && <p className="p-desc">{p.description}</p>}
              </button>
            )
          })}
        </div>
      </section>

      {/* Skills */}
      <section className="skills">
        <h2>My Robot's Skills</h2>
        {skills.length === 0 ? (
          <p className="empty">Complete a zone to earn your first skill badge!</p>
        ) : (
          <ul>{skills.map((s, i) => <li key={i}>{s}</li>)}</ul>
        )}
      </section>

      <div className="cta-row">
        <button onClick={downloadCard} className="cta">📤 Share My Robot (PNG)</button>
        <Link href="/kids/world" className="cta secondary">🗺️ Keep exploring →</Link>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <style jsx>{`
        .mr { max-width: 900px; margin: 0 auto; padding: 16px; padding-bottom: 60px; }
        .mr-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; margin-bottom: 18px;
        }
        .mr-head h1 { font-size: clamp(22px, 5vw, 32px); font-weight: 900; color: #fde047; }
        .back {
          min-height: 48px; padding: 0 14px; line-height: 48px;
          background: #1a1040; color: #fde68a;
          border: 2px solid #4c1d95; border-radius: 12px;
          text-decoration: none; font-weight: 800;
        }
        .stars { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #1a1040;
                 padding: 8px 14px; border-radius: 999px; font-weight: 900; }
        .mr-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 780px) { .mr-grid { grid-template-columns: 1fr 1fr; } }
        .robot-stage {
          background: radial-gradient(circle at 50% 30%, #2a1860, #1a1040 70%, #0f0a1e);
          border: 2px solid #4c1d95;
          border-radius: 22px;
          padding: 20px;
          text-align: center;
        }
        .robot-name { font-size: 22px; font-weight: 900; color: #fde047; margin-top: 12px; }
        .parts-count { font-size: 13px; color: #c4b5fd; margin-top: 2px; }
        .panel {
          background: rgba(26,16,64,.7);
          border: 2px solid #4c1d95;
          border-radius: 22px;
          padding: 18px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .panel label > span, .swatch-row > span, .eyes-row > span {
          display: block; font-size: 11px; font-weight: 900; letter-spacing: 1.5px;
          color: #c4b5fd; text-transform: uppercase; margin-bottom: 6px;
        }
        .panel input {
          width: 100%;
          background: #0f0a1e;
          border: 2px solid #4c1d95;
          color: #fde68a;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 18px; font-weight: 800;
        }
        .swatches { display: flex; flex-wrap: wrap; gap: 8px; }
        .sw {
          width: 36px; height: 36px;
          border-radius: 50%;
          border: 3px solid #0f0a1e;
          cursor: pointer;
          transition: transform .15s;
        }
        .sw:hover { transform: scale(1.1); }
        .sw.on { border-color: #fde047; box-shadow: 0 0 16px #fbbf24; }
        .eyes-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .eyes-btn {
          min-height: 48px;
          background: #0f0a1e;
          border: 2px solid #4c1d95;
          color: #fde68a;
          border-radius: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .eyes-btn.on { border-color: #fbbf24; background: rgba(251,191,36,.12); color: #fde047; }
        .stats {
          margin-top: 22px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        @media (min-width: 640px) {
          .stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        .parts { margin-top: 30px; }
        .part {
          width: 100%;
          font-family: inherit;
          text-align: center;
          cursor: pointer;
        }
        .part:disabled { cursor: not-allowed; }
        .part:hover:not(:disabled) { transform: translateY(-2px); }
        .parts h2, .skills h2 { font-size: 20px; font-weight: 900; color: #fde047; margin-bottom: 12px; }
        .parts-grid {
          display: grid; gap: 10px;
          grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 640px) { .parts-grid { grid-template-columns: repeat(3, 1fr); } }
        .part {
          background: rgba(26,16,64,.7);
          border: 2px solid #4c1d95;
          border-radius: 16px;
          padding: 12px;
          text-align: center;
          color: #c4b5fd;
        }
        .part.owned {
          border-color: #fbbf24;
          background: linear-gradient(135deg, rgba(251,191,36,.15), rgba(245,158,11,.05));
          color: #fde68a;
          box-shadow: 0 0 16px rgba(251,191,36,.2);
        }
        .part.locked { filter: grayscale(.5); opacity: .65; }
        .p-emoji { font-size: 36px; display: block; }
        .p-name { font-size: 14px; font-weight: 900; margin-top: 4px; color: #fde047; }
        .part.locked .p-name { color: #c4b5fd; }
        .p-zone, .p-desc { font-size: 11px; margin-top: 4px; }
        .p-desc { color: #fcd34d; }
        .skills { margin-top: 28px; }
        .skills ul { list-style: none; padding: 0; }
        .skills li {
          background: rgba(16,185,129,.15);
          border: 1px solid #10b981;
          color: #6ee7b7;
          padding: 10px 14px;
          border-radius: 10px;
          margin-bottom: 6px;
          font-weight: 700;
        }
        .skills .empty { color: #c4b5fd; }
        .cta-row {
          margin-top: 26px;
          display: grid; grid-template-columns: 1fr; gap: 10px;
        }
        @media (min-width: 480px) { .cta-row { grid-template-columns: 1fr 1fr; } }
        .cta {
          min-height: 56px;
          padding: 0 18px;
          border: none; border-radius: 14px;
          font-weight: 900; font-size: 16px;
          cursor: pointer; text-decoration: none;
          display: inline-flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #1a1040;
        }
        .cta.secondary { background: #1a1040; color: #fde68a; border: 2px solid #4c1d95; }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Stat tile
// ────────────────────────────────────────────────────────────────────────────
function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div
      style={{
        background: 'rgba(45,30,110,0.5)',
        border: '1px solid #4c1d95',
        borderRadius: 14,
        padding: '12px 14px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: '#fde047', marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#c4b5fd', fontWeight: 800 }}>
        {label}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Robot silhouette built from earned parts
// ────────────────────────────────────────────────────────────────────────────
function RobotSilhouette({ primary, accent, eyes, earned }: {
  primary: string; accent: string; eyes: string;
  earned: Set<string>
}) {
  const has = (id: string) => earned.has(id)
  const eyeShape = eyes === 'happy'      ? <><circle cx="58" cy="80" r="6" fill="#fde047" /><circle cx="92" cy="80" r="6" fill="#fde047" /></>
                  : eyes === 'cool'       ? <><rect x="50" y="74" width="20" height="10" rx="2" fill="#0f0a1e" /><rect x="80" y="74" width="20" height="10" rx="2" fill="#0f0a1e" /></>
                  : eyes === 'determined' ? <><path d="M50 86 L70 78" stroke="#fde047" strokeWidth="4" strokeLinecap="round" /><path d="M100 86 L80 78" stroke="#fde047" strokeWidth="4" strokeLinecap="round" /></>
                  : <><circle cx="58" cy="80" r="5" fill="#fde047" /><circle cx="92" cy="80" r="7" fill="#fde047" /></>
  const ghost = '#312e81'

  return (
    <svg viewBox="0 0 150 240" width="180" height="280" style={{ filter: 'drop-shadow(0 6px 16px rgba(0,0,0,.5))' }}>
      {/* Antenna + head */}
      {has('robot-head') ? (
        <>
          <line x1="75" y1="14" x2="75" y2="28" stroke={accent} strokeWidth="3" />
          <circle cx="75" cy="12" r="5" fill="#fde047" />
          <rect x="30" y="28" width="90" height="62" rx="14" fill={primary} stroke={accent} strokeWidth="3" />
          <rect x="40" y="40" width="70" height="40" rx="8" fill="#0f0a1e" />
          {eyeShape}
          <path d="M55 96 Q75 105 95 96" stroke="#fde047" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <rect x="30" y="28" width="90" height="62" rx="14" fill="none" stroke={ghost} strokeWidth="3" strokeDasharray="4 4" />
      )}

      {/* Body */}
      {has('robot-body') ? (
        <>
          <rect x="40" y="92" width="70" height="70" rx="10" fill={accent} />
          <rect x="60" y="110" width="30" height="20" rx="3" fill="#0f0a1e" />
          <circle cx="68" cy="120" r="2" fill="#fde047" />
          <circle cx="82" cy="120" r="2" fill="#fde047" />
          <circle cx="68" cy="140" r="1.5" fill="#10b981" />
          <circle cx="76" cy="140" r="1.5" fill="#ef4444" />
        </>
      ) : (
        <rect x="40" y="92" width="70" height="70" rx="10" fill="none" stroke={ghost} strokeWidth="3" strokeDasharray="4 4" />
      )}

      {/* Arms */}
      {has('robot-arm') ? (
        <>
          <rect x="14" y="96" width="22" height="14" rx="4" fill={primary} />
          <rect x="14" y="120" width="22" height="14" rx="4" fill={primary} />
          <rect x="114" y="96" width="22" height="14" rx="4" fill={primary} />
          <rect x="114" y="120" width="22" height="14" rx="4" fill={primary} />
        </>
      ) : (
        <>
          <rect x="14" y="96" width="22" height="14" rx="4" fill="none" stroke={ghost} strokeWidth="2" strokeDasharray="3 3" />
          <rect x="114" y="96" width="22" height="14" rx="4" fill="none" stroke={ghost} strokeWidth="2" strokeDasharray="3 3" />
        </>
      )}

      {/* Sensor backpack */}
      {has('robot-sensor-pack') ? (
        <>
          <rect x="48" y="64" width="54" height="20" rx="6" fill={accent} />
          <circle cx="60" cy="74" r="3" fill="#fde047" />
          <circle cx="75" cy="74" r="3" fill="#10b981" />
          <circle cx="90" cy="74" r="3" fill="#3b82f6" />
        </>
      ) : null}

      {/* Wheels / legs */}
      {has('robot-legs') ? (
        <>
          <circle cx="55" cy="180" r="18" fill={accent} />
          <circle cx="95" cy="180" r="18" fill={accent} />
          <circle cx="55" cy="180" r="6" fill="#0f0a1e" />
          <circle cx="95" cy="180" r="6" fill="#0f0a1e" />
        </>
      ) : (
        <>
          <circle cx="55" cy="180" r="18" fill="none" stroke={ghost} strokeWidth="3" strokeDasharray="4 4" />
          <circle cx="95" cy="180" r="18" fill="none" stroke={ghost} strokeWidth="3" strokeDasharray="4 4" />
        </>
      )}

      {/* Rocket booster */}
      {has('robot-rocket-pack') ? (
        <>
          <path d="M30 158 L30 200 L42 210 L40 158 Z" fill="#ef4444" />
          <path d="M120 158 L120 200 L108 210 L110 158 Z" fill="#ef4444" />
          <path d="M30 210 L36 225 L42 210 Z" fill="#fbbf24" />
          <path d="M108 210 L114 225 L120 210 Z" fill="#fbbf24" />
        </>
      ) : null}
    </svg>
  )
}

// Helper for canvas drawing
function drawRobotFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, primary: string, accent: string, eyes: string) {
  // Body
  ctx.fillStyle = primary
  roundRect(ctx, cx - 90, cy - 80, 180, 180, 22)
  ctx.fill()
  // Screen
  ctx.fillStyle = '#0F0A1E'
  roundRect(ctx, cx - 60, cy - 50, 120, 80, 12)
  ctx.fill()
  // Eyes
  ctx.fillStyle = '#FDE047'
  if (eyes === 'cool') {
    ctx.fillStyle = '#000'
    ctx.fillRect(cx - 36, cy - 18, 30, 12)
    ctx.fillRect(cx + 6,  cy - 18, 30, 12)
  } else {
    ctx.beginPath(); ctx.arc(cx - 22, cy - 12, 9, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(cx + 22, cy - 12, 9, 0, Math.PI * 2); ctx.fill()
  }
  // Mouth
  ctx.strokeStyle = '#FDE047'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(cx - 30, cy + 18)
  ctx.quadraticCurveTo(cx, cy + 32, cx + 30, cy + 18)
  ctx.stroke()
  // Antenna
  ctx.strokeStyle = accent
  ctx.lineWidth = 4
  ctx.beginPath(); ctx.moveTo(cx, cy - 80); ctx.lineTo(cx, cy - 100); ctx.stroke()
  ctx.fillStyle = '#FDE047'
  ctx.beginPath(); ctx.arc(cx, cy - 106, 7, 0, Math.PI * 2); ctx.fill()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y,     x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x,     y + h, r)
  ctx.arcTo(x,     y + h, x,     y,     r)
  ctx.arcTo(x,     y,     x + w, y,     r)
  ctx.closePath()
}
