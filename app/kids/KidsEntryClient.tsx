'use client'

// app/kids/KidsEntryClient.tsx
// First visit: Spark flies in, voices a greeting, age-card picker, portal.
// Returning visit: skip intro, "welcome back" with continue.

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SparkCharacter } from '@/components/kids/SparkCharacter'
import { getRecommendedZone, KIDS_ZONES } from '@/lib/kids-world-data'
import { saveProgress, getProgress } from '@/lib/kids-progress'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { useKidsVoice } from '@/lib/kids-voice'

type AgeBucket = {
  id: string
  label: string
  ageRange: string
  midAge: number
  caption: string
  illo: 'spotter' | 'builder' | 'coder' | 'maker'
  accent: string
}

const AGE_BUCKETS: AgeBucket[] = [
  {
    id: 'b1',
    label: "I'm 5 or 6",
    ageRange: '5–6',
    midAge: 6,
    caption: 'Spot robots in your house',
    illo: 'spotter',
    accent: '#10B981',
  },
  {
    id: 'b2',
    label: "I'm 7 or 8",
    ageRange: '7–8',
    midAge: 8,
    caption: 'Build with blocks & circuits',
    illo: 'builder',
    accent: '#3B82F6',
  },
  {
    id: 'b3',
    label: "I'm 9 or 10",
    ageRange: '9–10',
    midAge: 10,
    caption: 'Code your first robot',
    illo: 'coder',
    accent: '#A855F7',
  },
  {
    id: 'b4',
    label: "I'm 11 or 12",
    ageRange: '11–12',
    midAge: 12,
    caption: 'Build with Arduino & sensors',
    illo: 'maker',
    accent: '#F97316',
  },
  {
    id: 'b5',
    label: "I'm 13 or 14",
    ageRange: '13–14',
    midAge: 14,
    caption: 'Real robotics projects',
    illo: 'maker',
    accent: '#EF4444',
  },
]

type Phase = 'first-intro' | 'first-age' | 'first-portal' | 'returning'

export default function KidsEntryClient() {
  const router = useRouter()
  const { speak, voiceOn } = useKidsVoice()
  const [phase, setPhase] = useState<Phase | null>(null)
  const [pickedBucket, setPickedBucket] = useState<AgeBucket | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [progress, setProgress] = useState<ReturnType<typeof getProgress> | null>(null)

  // Decide first vs returning ONCE on mount.
  useEffect(() => {
    const p = getProgress()
    setProgress(p)
    setHydrated(true)
    if (p.age && p.totalStars > 0) {
      setPhase('returning')
    } else {
      setPhase('first-intro')
    }
  }, [])

  // First-time greeting (Spark flies in, then talks).
  useEffect(() => {
    if (phase !== 'first-intro') return
    const t = setTimeout(() => {
      primeAudio()
      speak("Hi! I'm Spark. I'm going to teach you all about robots! But first — how old are you?")
    }, 850)
    const moveOn = setTimeout(() => setPhase('first-age'), 1500)
    return () => { clearTimeout(t); clearTimeout(moveOn) }
  }, [phase, speak])

  // Portal → world map.
  useEffect(() => {
    if (phase !== 'first-portal' || !pickedBucket) return
    playSound('unlock')
    saveProgress({
      age: pickedBucket.midAge,
      currentZone: getRecommendedZone(pickedBucket.midAge),
    })
    speak(
      `${pickedBucket.ageRange.replace('–', ' to ')} years old? Perfect! You're going to LOVE what I have to show you!`,
    )
    const t = setTimeout(() => router.push('/kids/world'), voiceOn ? 2500 : 1400)
    return () => clearTimeout(t)
  }, [phase, pickedBucket, router, speak, voiceOn])

  const continueZone = useMemo(() => {
    if (!progress?.currentZone) return null
    return KIDS_ZONES.find(z => z.id === progress.currentZone) ?? null
  }, [progress])

  const nextLevel = useMemo(() => {
    if (!continueZone || !progress) return null
    const done = new Set(progress.completedLevels)
    return (
      continueZone.levels.find(l => !done.has(`${continueZone.id}/${l.id}`)) ??
      continueZone.levels[0]
    )
  }, [continueZone, progress])

  if (!hydrated || !phase) {
    // SSR fallback (very brief)
    return <div style={{ minHeight: '60vh' }} />
  }

  if (phase === 'returning' && progress) {
    return (
      <ReturningScreen
        progress={progress}
        continueZoneName={continueZone?.name ?? 'Spark\'s Garden'}
        nextLevelTitle={nextLevel?.title ?? continueZone?.levels[0]?.title ?? 'Your next adventure'}
        onContinue={() => {
          primeAudio()
          playSound('click')
          router.push('/kids/world')
        }}
        onStartOver={() => {
          if (typeof window !== 'undefined') {
            try { window.localStorage.removeItem('r2bot_kids_v2') } catch { /* noop */ }
          }
          setProgress(null)
          setPhase('first-intro')
        }}
      />
    )
  }

  return (
    <div className="ke-root">
      {phase === 'first-intro' && <FlyInGreeting />}
      {phase === 'first-age' && (
        <AgeCardPicker
          onPick={(b) => {
            primeAudio()
            playSound('correct')
            setPickedBucket(b)
            setPhase('first-portal')
          }}
        />
      )}
      {phase === 'first-portal' && pickedBucket && (
        <PortalScreen bucket={pickedBucket} />
      )}
      <EntryStyles />
    </div>
  )
}

// ─── First-visit phases ─────────────────────────────────────────────────────

function FlyInGreeting() {
  return (
    <div className="ke-greeting">
      <div className="ke-spark-fly">
        <SparkCharacter mood="happy" size={170} />
      </div>
      <h1 className="ke-greeting-h1">Hi! I&apos;m Spark!</h1>
      <p className="ke-greeting-p">Tap below to begin our adventure →</p>
    </div>
  )
}

function AgeCardPicker({ onPick }: { onPick: (b: AgeBucket) => void }) {
  const { speak } = useKidsVoice()
  useEffect(() => {
    speak('How old are you? Tap the picture that\'s closest to you.')
  }, [speak])

  return (
    <div className="ke-age">
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <SparkCharacter mood="thinking" size={130} />
      </div>
      <h2 className="ke-age-h2">How old are you?</h2>
      <p className="ke-age-sub">Tap the one that&apos;s closest to you.</p>
      <div className="ke-age-grid">
        {AGE_BUCKETS.map(b => (
          <button
            key={b.id}
            type="button"
            onClick={() => onPick(b)}
            className="ke-age-card"
            style={{ borderColor: b.accent }}
          >
            <AgeIllustration kind={b.illo} accent={b.accent} />
            <div className="ke-age-card-label">{b.label}</div>
            <div className="ke-age-card-caption">{b.caption}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function PortalScreen({ bucket }: { bucket: AgeBucket }) {
  return (
    <div className="ke-portal">
      <div className="ke-portal-ring" style={{ '--accent': bucket.accent } as React.CSSProperties} />
      <SparkCharacter mood="celebrating" size={180} />
      <h2 className="ke-portal-h2">PERFECT! Off we go!</h2>
      <p className="ke-portal-p">Loading your world…</p>
    </div>
  )
}

// ─── Returning user ────────────────────────────────────────────────────────

function ReturningScreen({
  progress,
  continueZoneName,
  nextLevelTitle,
  onContinue,
  onStartOver,
}: {
  progress: ReturnType<typeof getProgress>
  continueZoneName: string
  nextLevelTitle: string
  onContinue: () => void
  onStartOver: () => void
}) {
  const { speak } = useKidsVoice()
  useEffect(() => {
    speak(`Welcome back, ${progress.robotName}! Ready to keep going?`)
  }, [speak, progress.robotName])

  return (
    <div className="ke-root">
      <div className="ke-welcome">
        <div className="ke-welcome-spark">
          <SparkCharacter mood="happy" size={150} />
        </div>
        <div className="ke-welcome-body">
          <p className="ke-welcome-eyebrow">Welcome back, champ!</p>
          <h1 className="ke-welcome-h1">Ready to keep going?</h1>
          <div className="ke-welcome-stats">
            <Stat label="Stars" value={`${progress.totalStars} ⭐`} />
            <Stat label="Zone" value={continueZoneName} />
            <Stat label="Next" value={nextLevelTitle} />
          </div>
          <button type="button" onClick={onContinue} className="ke-cta">
            Continue Adventure →
          </button>
          <button type="button" onClick={onStartOver} className="ke-startover">
            Start Over
          </button>
        </div>
      </div>
      <EntryStyles />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ke-stat">
      <div className="ke-stat-label">{label}</div>
      <div className="ke-stat-value">{value}</div>
    </div>
  )
}

// ─── Illustrated age bucket illustration ───────────────────────────────────

function AgeIllustration({ kind, accent }: { kind: AgeBucket['illo']; accent: string }) {
  // Pure-SVG cartoons. Each one shows a child + a robot relevant to that age.
  const skin = '#fcd9b6'
  const hair = '#3f2d1a'
  return (
    <svg viewBox="0 0 140 110" width="140" height="110" aria-hidden="true">
      <ellipse cx="70" cy="100" rx="55" ry="5" fill="#0f172a" opacity=".25" />
      {kind === 'spotter' && (
        <>
          {/* Floor */}
          <rect x="10" y="92" width="120" height="6" fill={accent} opacity=".4" rx="3" />
          {/* Child */}
          <circle cx="48" cy="48" r="13" fill={skin} />
          <path d="M35 48 q0 -16 13 -16 q13 0 13 16" fill={hair} />
          <rect x="38" y="60" width="20" height="26" rx="6" fill={accent} />
          <rect x="40" y="84" width="6" height="10" fill={hair} />
          <rect x="50" y="84" width="6" height="10" fill={hair} />
          <rect x="56" y="68" width="4" height="14" rx="2" fill={skin} />
          {/* Roomba */}
          <circle cx="100" cy="88" r="14" fill="#1f2937" stroke="#0f172a" strokeWidth="2" />
          <circle cx="100" cy="88" r="5" fill={accent} />
          {/* Exclamation */}
          <text x="78" y="44" fill="#fde047" fontSize="22" fontWeight="900">!</text>
        </>
      )}
      {kind === 'builder' && (
        <>
          <rect x="20" y="80" width="100" height="14" fill="#1f2937" rx="3" />
          <circle cx="40" cy="40" r="13" fill={skin} />
          <path d="M27 40 q0 -16 13 -16 q13 0 13 16" fill={hair} />
          <rect x="30" y="52" width="20" height="26" rx="6" fill={accent} />
          {/* Lego blocks */}
          <rect x="60" y="70" width="16" height="12" fill="#ef4444" rx="2" />
          <rect x="78" y="64" width="16" height="18" fill="#3b82f6" rx="2" />
          <rect x="96" y="56" width="16" height="26" fill="#facc15" rx="2" />
          <circle cx="66" cy="72" r="2" fill="#fff" opacity=".4" />
          <circle cx="84" cy="68" r="2" fill="#fff" opacity=".4" />
        </>
      )}
      {kind === 'coder' && (
        <>
          {/* Tablet */}
          <rect x="36" y="58" width="80" height="40" rx="4" fill="#1f2937" stroke="#0f172a" strokeWidth="2" />
          <rect x="40" y="62" width="72" height="32" fill="#0f172a" />
          <text x="44" y="74" fontFamily="monospace" fontSize="9" fill="#10b981">{`if(go)`}</text>
          <text x="44" y="86" fontFamily="monospace" fontSize="9" fill={accent}>{`  move()`}</text>
          {/* Hands */}
          <circle cx="46" cy="100" r="4" fill={skin} />
          <circle cx="106" cy="100" r="4" fill={skin} />
          {/* Head */}
          <circle cx="76" cy="32" r="14" fill={skin} />
          <path d="M62 30 q0 -14 14 -14 q14 0 14 14" fill={hair} />
        </>
      )}
      {kind === 'maker' && (
        <>
          {/* Workbench */}
          <rect x="14" y="92" width="112" height="6" fill="#475569" rx="2" />
          {/* Arduino board */}
          <rect x="30" y="60" width="48" height="30" fill="#10b981" rx="2" />
          <circle cx="38" cy="68" r="2" fill="#fde047" />
          <circle cx="46" cy="68" r="2" fill="#3b82f6" />
          <circle cx="54" cy="68" r="2" fill="#ef4444" />
          <rect x="36" y="78" width="36" height="6" fill="#0f172a" rx="1" />
          {/* Robot arm */}
          <rect x="90" y="50" width="6" height="40" fill={accent} />
          <rect x="86" y="44" width="14" height="10" fill={accent} />
          <circle cx="86" cy="60" r="3" fill="#fde047" />
          {/* Child head */}
          <circle cx="50" cy="34" r="12" fill={skin} />
          <path d="M38 32 q0 -12 12 -12 q12 0 12 12" fill={hair} />
        </>
      )}
    </svg>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

function EntryStyles() {
  return (
    <style jsx global>{`
      .ke-root {
        position: relative;
        min-height: calc(100vh - 80px);
        display: flex; align-items: center; justify-content: center;
        padding: 24px;
      }
      .ke-greeting { text-align: center; max-width: 640px; }
      .ke-spark-fly {
        animation: ke-fly-in .9s cubic-bezier(.22,.61,.36,1);
        display: inline-block;
      }
      @keyframes ke-fly-in {
        0%   { transform: translateX(-140%) scale(0.7) rotate(-20deg); opacity: 0; }
        70%  { transform: translateX(20px) scale(1.05) rotate(4deg);   opacity: 1; }
        100% { transform: translateX(0) scale(1) rotate(0);            opacity: 1; }
      }
      .ke-greeting-h1 {
        margin-top: 18px;
        font-size: clamp(36px, 6vw, 64px);
        font-weight: 900;
        color: #fde047;
        text-shadow: 0 0 40px rgba(253,224,71,.45);
      }
      .ke-greeting-p { color: #c4b5fd; font-size: 17px; }

      .ke-age { width: 100%; max-width: 880px; text-align: center; }
      .ke-age-h2 {
        font-size: clamp(28px, 5vw, 44px);
        font-weight: 900;
        color: #fde047;
        margin: 0 0 8px;
        text-shadow: 0 0 30px rgba(253,224,71,.4);
      }
      .ke-age-sub { color: #c4b5fd; margin: 0 0 22px; font-size: 16px; }
      .ke-age-grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      @media (min-width: 720px) {
        .ke-age-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      }
      @media (min-width: 1024px) {
        .ke-age-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
      }
      .ke-age-card {
        background: rgba(15,10,30,0.55);
        border: 3px solid #6d28d9;
        border-radius: 18px;
        padding: 16px 12px 18px;
        text-align: center;
        cursor: pointer;
        color: #fff;
        transition: transform .15s, box-shadow .15s, background .15s;
        min-height: 220px;
      }
      .ke-age-card:hover {
        transform: translateY(-4px) scale(1.02);
        background: rgba(45,30,110,0.7);
        box-shadow: 0 14px 36px rgba(124,58,237,0.4);
      }
      .ke-age-card-label { font-weight: 900; font-size: 18px; margin-top: 8px; }
      .ke-age-card-caption { color: #fde68a; font-size: 13px; margin-top: 6px; }

      .ke-portal {
        position: relative;
        text-align: center;
        animation: ke-pop .5s ease-out;
      }
      @keyframes ke-pop {
        from { transform: scale(0.6); opacity: 0; }
        to   { transform: scale(1);   opacity: 1; }
      }
      .ke-portal-ring {
        position: absolute; inset: -60px; margin: auto;
        width: 320px; height: 320px; border-radius: 50%;
        background: conic-gradient(from 0deg, var(--accent, #fbbf24), #ef4444, #7c3aed, #06b6d4, #10b981, var(--accent, #fbbf24));
        filter: blur(20px);
        opacity: 0.7;
        animation: ke-portal-spin 2.4s linear infinite;
      }
      @keyframes ke-portal-spin { to { transform: rotate(360deg); } }
      .ke-portal-h2 {
        margin-top: 24px;
        font-size: clamp(28px, 5vw, 40px);
        font-weight: 900;
        color: #fde047;
        position: relative;
      }
      .ke-portal-p { color: #c4b5fd; position: relative; }

      .ke-welcome {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 26px;
        align-items: center;
        max-width: 760px;
        background: rgba(15,10,30,0.6);
        border: 2px solid rgba(124,58,237,0.35);
        border-radius: 22px;
        padding: clamp(20px, 4vw, 40px);
      }
      .ke-welcome-spark { display: flex; justify-content: center; }
      .ke-welcome-eyebrow {
        font-size: 12px; letter-spacing: 3px; text-transform: uppercase;
        color: #fde047; font-weight: 800; margin: 0 0 8px;
      }
      .ke-welcome-h1 {
        font-size: clamp(28px, 5vw, 44px);
        margin: 0 0 18px;
        color: #fff;
        font-weight: 900;
      }
      .ke-welcome-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 22px;
      }
      .ke-stat {
        background: rgba(45,30,110,0.5);
        border: 1px solid rgba(124,58,237,0.35);
        border-radius: 14px;
        padding: 10px 12px;
      }
      .ke-stat-label {
        font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
        color: #c4b5fd; font-weight: 700;
      }
      .ke-stat-value { color: #fff; font-weight: 800; font-size: 16px; margin-top: 4px; }
      .ke-cta {
        display: inline-flex; align-items: center; justify-content: center;
        min-height: 54px; padding: 0 24px;
        background: linear-gradient(135deg, #f59e0b, #ef4444);
        color: #fff; font-weight: 900; font-size: 17px;
        border: none; border-radius: 14px; cursor: pointer;
        box-shadow: 0 10px 30px rgba(245,158,11,0.4);
        text-decoration: none;
      }
      .ke-cta:hover { transform: translateY(-2px); }
      .ke-startover {
        display: inline-block;
        margin-top: 12px; margin-left: 12px;
        background: transparent; border: none;
        color: #94a3b8; font-size: 12px;
        cursor: pointer; text-decoration: underline;
      }
      .ke-startover:hover { color: #fde047; }
      @media (max-width: 720px) {
        .ke-welcome { grid-template-columns: 1fr; text-align: center; }
        .ke-welcome-stats { grid-template-columns: 1fr; }
      }
    `}</style>
  )
}
