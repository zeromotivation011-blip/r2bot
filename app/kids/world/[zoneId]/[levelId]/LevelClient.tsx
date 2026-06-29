'use client'

// app/kids/world/[zoneId]/[levelId]/LevelClient.tsx
// Storybook-style level: full-screen panels, no in-level scrolling.
// Panel sequence: STORY → CONCEPT → ACTIVITY 1 → FUN FACT → ACTIVITY 2 → CELEBRATION
// Voice is on by default; every panel auto-speaks its primary text when shown.

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  getZone,
  getLevel,
  type Activity,
  type KidsLevel as Level,
  type KidsZone as Zone,
} from '@/lib/kids-world-data'
import { completeLevel, bumpAttempt } from '@/lib/kids-progress'
import { playSound, primeAudio, randomPraise } from '@/lib/kids-audio'
import { useKidsVoice } from '@/lib/kids-voice'
import { useConfetti } from '@/components/kids/Confetti'
import { SparkCharacter, type SparkMood } from '@/components/kids/SparkCharacter'
import {
  ActivityHost,
} from '@/components/kids/activities/ActivityHost'

type PanelKind = 'story' | 'concept' | 'activity1' | 'funfact' | 'activity2' | 'celebration'

export default function LevelClient() {
  const params = useParams<{ zoneId: string; levelId: string }>()
  const router = useRouter()
  const zoneId = params?.zoneId || ''
  const levelId = params?.levelId || ''
  const zone = getZone(zoneId)
  const level = getLevel(zoneId, levelId)

  // Build the panel list dynamically based on number of activities the level has.
  const panels = useMemo<PanelKind[]>(() => {
    if (!level) return []
    const list: PanelKind[] = ['story', 'concept']
    if (level.activities.length >= 1) list.push('activity1')
    list.push('funfact')
    if (level.activities.length >= 2) list.push('activity2')
    list.push('celebration')
    return list
  }, [level])

  const [idx, setIdx] = useState(0)
  const [activityResults, setActivityResults] = useState<{ wins: number; fails: number }>({ wins: 0, fails: 0 })
  const [earnedStars, setEarnedStars] = useState<number | null>(null)
  const [partAwarded, setPartAwarded] = useState<string | null>(null)
  const [zoneJustDone, setZoneJustDone] = useState(false)
  const finalising = useRef(false)

  const advance = useCallback(() => {
    setIdx(i => Math.min(panels.length - 1, i + 1))
  }, [panels.length])

  // When we reach celebration, compute reward.
  const currentPanel = panels[idx]
  useEffect(() => {
    if (currentPanel !== 'celebration' || finalising.current || !level) return
    finalising.current = true
    const { wins, fails } = activityResults
    const attempts = Math.max(1, wins + fails)
    const ratio = wins / attempts
    const stars = Math.max(
      1,
      Math.min(level.starReward, Math.round(level.starReward * Math.max(0.4, ratio))),
    )
    const result = completeLevel(zoneId, levelId, stars)
    setEarnedStars(stars)
    setPartAwarded(result.partAwarded)
    setZoneJustDone(!!result.newlyCompletedZone)
    primeAudio()
    playSound('levelup')
    if (result.newlyCompletedZone) {
      setTimeout(() => playSound('zonecomplete'), 700)
    }
  }, [currentPanel, level, zoneId, levelId, activityResults])

  if (!zone || !level) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ fontSize: 22, fontWeight: 900 }}>Level not found.</p>
        <Link href="/kids/world" style={{ marginTop: 16, display: 'inline-block', color: '#fde68a' }}>
          ← World map
        </Link>
      </div>
    )
  }

  const activity1 = level.activities[0]
  const activity2 = level.activities[1]

  return (
    <div className="lvl-root">
      <header className="lvl-progress">
        <Link href={`/kids/world/${zone.id}`} className="lvl-quit" aria-label="Back to zone">← Zone</Link>
        <div className="lvl-dots" aria-label={`Panel ${idx + 1} of ${panels.length}`}>
          {panels.map((p, i) => (
            <span key={p + i} className={`lvl-dot ${i < idx ? 'done' : i === idx ? 'now' : ''}`} />
          ))}
        </div>
        <span className="lvl-name">{level.title}</span>
      </header>

      <main className="lvl-stage">
        {currentPanel === 'story' && (
          <StoryPanel level={level} zone={zone} onAdvance={advance} />
        )}
        {currentPanel === 'concept' && (
          <ConceptPanel level={level} zone={zone} onAdvance={advance} />
        )}
        {currentPanel === 'activity1' && activity1 && (
          <ActivityPanel
            activity={activity1}
            position="warmup"
            onWin={() => setActivityResults(r => ({ ...r, wins: r.wins + 1 }))}
            onFail={() => { setActivityResults(r => ({ ...r, fails: r.fails + 1 })); bumpAttempt(zoneId, levelId) }}
            onAdvance={advance}
          />
        )}
        {currentPanel === 'funfact' && (
          <FunFactPanel level={level} onAdvance={advance} />
        )}
        {currentPanel === 'activity2' && activity2 && (
          <ActivityPanel
            activity={activity2}
            position="harder"
            onWin={() => setActivityResults(r => ({ ...r, wins: r.wins + 1 }))}
            onFail={() => { setActivityResults(r => ({ ...r, fails: r.fails + 1 })); bumpAttempt(zoneId, levelId) }}
            onAdvance={advance}
          />
        )}
        {currentPanel === 'celebration' && (
          <CelebrationPanel
            level={level}
            zone={zone}
            stars={earnedStars ?? level.starReward}
            partAwarded={partAwarded}
            zoneJustDone={zoneJustDone}
            onReplay={() => {
              setIdx(0)
              setActivityResults({ wins: 0, fails: 0 })
              finalising.current = false
              setEarnedStars(null)
              setPartAwarded(null)
              setZoneJustDone(false)
            }}
            onNext={() => {
              const i = zone.levels.findIndex(l => l.id === level.id)
              const next = zone.levels[i + 1]
              router.push(next ? `/kids/world/${zone.id}/${next.id}` : `/kids/world/${zone.id}`)
            }}
          />
        )}
      </main>

      <LevelStyles />
    </div>
  )
}

// ─── Panel: STORY ───────────────────────────────────────────────────────────

function StoryPanel({ level, zone, onAdvance }: { level: Level; zone: Zone; onAdvance: () => void }) {
  const { speak, cancel } = useKidsVoice()
  useEffect(() => {
    speak(level.storyHook)
    return () => cancel()
  }, [level.storyHook, speak, cancel])

  return (
    <div className="panel panel-story" onClick={onAdvance} role="button" tabIndex={0}>
      <div className="panel-bg-emoji" aria-hidden>{zone.emoji}</div>
      <div className="panel-story-content">
        <SparkCharacter mood="surprised" size={150} />
        <p className="panel-story-text">{level.storyHook}</p>
        <p className="panel-tap">Tap anywhere to continue →</p>
      </div>
    </div>
  )
}

// ─── Panel: CONCEPT ─────────────────────────────────────────────────────────

function ConceptPanel({ level, zone, onAdvance }: { level: Level; zone: Zone; onAdvance: () => void }) {
  const { speak, cancel } = useKidsVoice()
  const [mood, setMood] = useState<SparkMood>('thinking')
  const [speaking, setSpeaking] = useState(false)
  useEffect(() => {
    setSpeaking(true)
    speak(`${level.conceptName}. ${level.laymanExplanation}`, () => {
      setSpeaking(false)
      setMood('proud')
    })
    return () => cancel()
  }, [level.conceptName, level.laymanExplanation, speak, cancel])

  return (
    <div className="panel panel-concept">
      <div className="panel-concept-spark">
        <SparkCharacter mood={mood} speaking={speaking} size={140} />
      </div>
      <div className="panel-concept-body">
        <div className="panel-concept-emoji" aria-hidden>{level.emoji}</div>
        <h1 className="panel-concept-title">{level.conceptName}</h1>
        <p className="panel-concept-explain">{level.laymanExplanation}</p>
        <div className="panel-concept-analogy">
          <p className="panel-concept-analogy-label">💡 Just like…</p>
          <p>{level.analogy}</p>
        </div>
        <p className="panel-concept-real">🌍 {level.realRobotExample}</p>
        <button
          type="button"
          className="panel-cta"
          style={{ background: `linear-gradient(135deg, ${zone.color}, #f59e0b)` }}
          onClick={() => { playSound('click'); onAdvance() }}
        >
          Got it! →
        </button>
      </div>
    </div>
  )
}

// ─── Panel: ACTIVITY ────────────────────────────────────────────────────────

function ActivityPanel({
  activity,
  position,
  onWin,
  onFail,
  onAdvance,
}: {
  activity: Activity
  position: 'warmup' | 'harder'
  onWin: () => void
  onFail: () => void
  onAdvance: () => void
}) {
  const { speak, cancel } = useKidsVoice()
  const { fire } = useConfetti()
  const [feedback, setFeedback] = useState<'idle' | 'win' | 'fail'>('idle')
  const [hintArmed, setHintArmed] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const lastFailLine = useRef<string>('')

  useEffect(() => {
    speak(activity.instruction)
    return () => cancel()
  }, [activity.instruction, speak, cancel])

  // Hint after 15s of inactivity.
  useEffect(() => {
    if (!hintArmed) return
    const t = setTimeout(() => setShowHint(true), 15000)
    return () => clearTimeout(t)
  }, [hintArmed])

  const handleWin = useCallback(() => {
    primeAudio()
    playSound('correct')
    fire()
    const praise = randomPraise()
    speak(praise + ' ' + (activity.successMessage ?? ''))
    setFeedback('win')
    onWin()
    setTimeout(() => onAdvance(), 1600)
  }, [activity.successMessage, fire, onAdvance, onWin, speak])

  const handleFail = useCallback(() => {
    primeAudio()
    playSound('wrong')
    const oops = activity.tryAgainMessage ?? 'Almost — try again!'
    if (oops !== lastFailLine.current) {
      speak('Hmm, not quite. ' + oops)
      lastFailLine.current = oops
    }
    setFeedback('fail')
    onFail()
    setHintArmed(true)
    setTimeout(() => setFeedback('idle'), 900)
  }, [activity.tryAgainMessage, onFail, speak])

  const voiceHelp = () => {
    cancel()
    speak(activity.instruction)
  }

  const sparkMood: SparkMood = feedback === 'win' ? 'celebrating' : feedback === 'fail' ? 'oops' : 'happy'

  return (
    <div className="panel panel-activity">
      <div className="panel-activity-spark">
        <SparkCharacter mood={sparkMood} size={120} />
      </div>
      <div className="panel-activity-body">
        <div className="panel-activity-instruction-row">
          <h2 className="panel-activity-instruction">{activity.instruction}</h2>
          <button
            type="button"
            onClick={voiceHelp}
            aria-label="Hear it again"
            className="panel-voicehelp"
          >
            🔊
          </button>
        </div>
        {position === 'harder' && (
          <p className="panel-activity-tagline">A little trickier this time — you&apos;ve got this!</p>
        )}

        <ActivityHost
          activity={activity}
          onWin={handleWin}
          onFail={handleFail}
          showHint={showHint}
        />

        {showHint && (
          <div className="panel-activity-hint" role="status">
            💡 Spark says: {activity.tryAgainMessage ?? 'Look closely — what fits best here?'}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Panel: FUN FACT ────────────────────────────────────────────────────────

function FunFactPanel({ level, onAdvance }: { level: Level; onAdvance: () => void }) {
  const { speak, cancel } = useKidsVoice()
  useEffect(() => {
    speak(`Did you know? ${level.funFact}`)
    return () => cancel()
  }, [level.funFact, speak, cancel])

  return (
    <div className="panel panel-funfact">
      <SparkCharacter mood="surprised" size={150} />
      <p className="panel-funfact-eyebrow">🤯 Did you know?</p>
      <p className="panel-funfact-body">{level.funFact}</p>
      <button
        type="button"
        onClick={() => { playSound('click'); onAdvance() }}
        className="panel-cta"
      >
        Cool! Keep going →
      </button>
    </div>
  )
}

// ─── Panel: CELEBRATION ────────────────────────────────────────────────────

function CelebrationPanel({
  level, zone, stars, partAwarded, zoneJustDone, onReplay, onNext,
}: {
  level: Level
  zone: Zone
  stars: number
  partAwarded: string | null
  zoneJustDone: boolean
  onReplay: () => void
  onNext: () => void
}) {
  const { speak, cancel } = useKidsVoice()
  const { fire } = useConfetti()
  const [displayStars, setDisplayStars] = useState(0)
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    fire({ count: 60 })
    // animate count up
    const step = () => {
      setDisplayStars(s => (s < stars ? s + 1 : s))
    }
    const interval = setInterval(step, 160)
    setTimeout(() => clearInterval(interval), stars * 200 + 200)
    const praise = randomPraise()
    const line =
      partAwarded
        ? `${praise} You earned a new robot part!`
        : zoneJustDone
          ? `${praise} You finished the whole zone!`
          : `${praise} You earned ${stars} ${stars === 1 ? 'star' : 'stars'}!`
    speak(line)
    return () => { clearInterval(interval); cancel() }
  }, [stars, partAwarded, zoneJustDone, fire, speak, cancel])

  return (
    <div className="panel panel-celebration">
      <SparkCharacter mood="celebrating" size={170} />
      <h1 className="panel-celebration-h1">AMAZING!</h1>
      <p className="panel-celebration-stars" aria-label={`${stars} stars earned`}>
        {Array.from({ length: stars }).map((_, i) => (
          <span key={i} className="panel-celebration-star" style={{ opacity: i < displayStars ? 1 : 0.3 }}>⭐</span>
        ))}
      </p>
      <p className="panel-celebration-sub">{stars} {stars === 1 ? 'star' : 'stars'} added to your collection</p>

      {partAwarded && (
        <div className="panel-celebration-part">
          🔧 You earned a new robot part — view it in <Link href="/kids/my-robot">My Robot</Link>!
        </div>
      )}
      {zoneJustDone && (
        <div className="panel-celebration-zone">
          🎉 You finished {zone.name}! New zones may have unlocked.
        </div>
      )}

      <div className="panel-celebration-actions">
        <button type="button" onClick={onReplay} className="panel-secondary">↻ Play again</button>
        <button type="button" onClick={onNext} className="panel-cta">Next Level →</button>
        <Link href={`/kids/world/${zone.id}`} className="panel-secondary">Back to Zone</Link>
      </div>
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

function LevelStyles() {
  return (
    <style jsx global>{`
      .lvl-root {
        position: relative;
        max-width: 1024px;
        margin: 0 auto;
        padding: 12px 16px 24px;
        min-height: calc(100vh - 80px);
      }
      .lvl-progress {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 12px;
        align-items: center;
        margin-bottom: 16px;
      }
      .lvl-quit {
        min-height: 40px; padding: 0 14px;
        background: #1a1040; color: #fde68a;
        border-radius: 12px; border: 2px solid #4c1d95;
        text-decoration: none; font-weight: 800;
        display: inline-flex; align-items: center;
      }
      .lvl-dots { display: flex; gap: 6px; justify-content: center; }
      .lvl-dot {
        height: 6px; width: 28px;
        background: rgba(124,58,237,0.45);
        border-radius: 999px;
        transition: background .3s, width .3s;
      }
      .lvl-dot.done { background: #10b981; }
      .lvl-dot.now  { background: #fbbf24; width: 40px; }
      .lvl-name {
        font-size: 13px; color: #c4b5fd; font-weight: 700; max-width: 220px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }

      .lvl-stage {
        position: relative;
        min-height: 60vh;
      }
      .panel {
        position: relative;
        min-height: 60vh;
        animation: panel-in .35s ease-out;
        background: rgba(15,10,30,0.6);
        border: 2px solid rgba(124,58,237,0.35);
        border-radius: 22px;
        padding: clamp(18px, 3vw, 36px);
        color: #f4f4f5;
      }
      @keyframes panel-in {
        from { opacity: 0; transform: translateY(14px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .panel-story { text-align: center; cursor: pointer; display: grid; place-items: center; overflow: hidden; }
      .panel-bg-emoji {
        position: absolute; font-size: 280px;
        opacity: 0.08;
        filter: blur(2px);
      }
      .panel-story-content { position: relative; max-width: 600px; }
      .panel-story-text {
        font-size: clamp(20px, 3.6vw, 28px);
        font-weight: 800;
        color: #fde68a;
        margin: 18px auto;
        line-height: 1.4;
      }
      .panel-tap { color: #fbbf24; font-weight: 800; animation: panel-blink 1.4s ease-in-out infinite; }
      @keyframes panel-blink { 50% { opacity: 0.35 } }

      .panel-concept {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 26px;
        align-items: start;
      }
      .panel-concept-spark { display: flex; justify-content: center; }
      .panel-concept-emoji { font-size: 64px; text-align: left; }
      .panel-concept-title {
        font-size: clamp(28px, 5vw, 44px);
        font-weight: 900;
        color: #fde047;
        margin: 4px 0 12px;
        text-shadow: 0 0 24px rgba(253,224,71,0.4);
      }
      .panel-concept-explain {
        font-size: 18px;
        color: #fde68a;
        line-height: 1.45;
        margin-bottom: 14px;
      }
      .panel-concept-analogy {
        background: rgba(251,191,36,0.14);
        border: 2px solid #fbbf24;
        border-radius: 16px;
        padding: 12px 14px;
        margin-bottom: 14px;
      }
      .panel-concept-analogy-label {
        font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
        color: #fde047; font-weight: 800; margin: 0 0 6px;
      }
      .panel-concept-analogy p { color: #fff7ed; line-height: 1.45; }
      .panel-concept-real {
        background: rgba(59,130,246,0.12);
        border: 2px solid #3b82f6;
        border-radius: 14px;
        padding: 12px 14px;
        margin-bottom: 18px;
        color: #dbeafe;
      }
      .panel-cta {
        display: inline-flex; align-items: center; justify-content: center;
        min-height: 56px; padding: 0 28px;
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: #1a1040; font-weight: 900; font-size: 17px;
        border: none; border-radius: 14px; cursor: pointer;
        text-decoration: none;
        box-shadow: 0 10px 30px rgba(251,191,36,0.4);
      }
      .panel-cta:hover { transform: translateY(-2px); }
      .panel-secondary {
        display: inline-flex; align-items: center; justify-content: center;
        min-height: 52px; padding: 0 22px;
        background: transparent; color: #fde68a;
        border: 2px solid #4c1d95; border-radius: 14px; cursor: pointer;
        font-weight: 800; text-decoration: none;
      }

      .panel-activity { display: grid; grid-template-columns: auto 1fr; gap: 26px; }
      .panel-activity-spark { display: flex; justify-content: center; }
      .panel-activity-body { display: flex; flex-direction: column; gap: 12px; }
      .panel-activity-instruction-row {
        display: flex; justify-content: space-between; gap: 12px; align-items: center;
      }
      .panel-activity-instruction {
        font-size: clamp(20px, 3.5vw, 26px);
        font-weight: 900;
        color: #fde047;
        margin: 0;
        flex: 1;
      }
      .panel-voicehelp {
        width: 48px; height: 48px;
        border-radius: 50%;
        border: 2px solid #fbbf24;
        background: #1a1040; color: #fbbf24;
        font-size: 20px; cursor: pointer;
        display: grid; place-items: center;
      }
      .panel-activity-tagline { color: #c4b5fd; font-size: 14px; margin: 0; }
      .panel-activity-hint {
        background: rgba(251,191,36,0.14);
        border: 2px solid #fbbf24;
        color: #fde68a;
        padding: 12px 14px;
        border-radius: 12px;
        font-weight: 700;
      }

      .panel-funfact { display: grid; gap: 14px; place-items: center; text-align: center; }
      .panel-funfact-eyebrow {
        margin-top: 12px;
        font-size: 13px; letter-spacing: 3px; text-transform: uppercase;
        color: #fde047; font-weight: 800;
      }
      .panel-funfact-body {
        font-size: clamp(18px, 3vw, 24px);
        font-weight: 800;
        color: #fde68a;
        max-width: 640px;
        line-height: 1.45;
      }

      .panel-celebration { display: grid; place-items: center; text-align: center; gap: 14px; }
      .panel-celebration-h1 {
        font-size: clamp(40px, 8vw, 64px);
        font-weight: 900;
        color: #fde047;
        text-shadow: 0 0 40px rgba(253,224,71,0.5);
        letter-spacing: 2px;
        margin: 0;
      }
      .panel-celebration-stars { font-size: 36px; margin: 0; }
      .panel-celebration-star {
        display: inline-block;
        transition: opacity .3s;
      }
      .panel-celebration-sub { color: #c4b5fd; font-weight: 700; }
      .panel-celebration-part, .panel-celebration-zone {
        background: rgba(251,191,36,0.15);
        border: 2px solid #fbbf24;
        color: #fde68a;
        padding: 12px 18px; border-radius: 14px;
      }
      .panel-celebration-part a, .panel-celebration-zone a { color: #fde047; font-weight: 900; }
      .panel-celebration-zone { background: rgba(16,185,129,0.15); border-color: #10b981; color: #d1fae5; }
      .panel-celebration-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }

      @media (max-width: 720px) {
        .panel-concept,
        .panel-activity { grid-template-columns: 1fr; }
        .panel-concept-spark,
        .panel-activity-spark { justify-content: flex-start; }
      }
    `}</style>
  )
}
