'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getMission, ROBOT_PARTS } from '@/lib/kids-world-data'
import { completeLevel, getProgress, saveProgress } from '@/lib/kids-progress'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { GardenBotGame } from '@/components/kids/boss/GardenBotGame'
import { ConveyorBugGame } from '@/components/kids/boss/ConveyorBugGame'
import { WaypointGame } from '@/components/kids/boss/WaypointGame'

// Mission IDs that use the new mini-game components.
const MINIGAME_MISSIONS: Record<string, 'garden-bot' | 'conveyor-bug' | 'waypoint'> = {
  'garden-boss': 'garden-bot',
  'home-boss':   'conveyor-bug',
  'bay-boss':    'waypoint',
}

// Mission-specific content (sequences / logic) lives here so the data file stays clean.
type MissionContent =
  | { kind: 'sequence'; story: string[]; steps: string[] }
  | { kind: 'logic'; question: string; options: { label: string; correct: boolean; explain?: string }[] }
  | { kind: 'block'; goal: string; correctOrder: ('forward' | 'turn-right' | 'forward' | 'turn-left' | 'forward')[] }

const MISSION_CONTENT: Record<string, MissionContent> = {
  'garden-boss': {
    kind: 'sequence',
    story: [
      "Spark's garden is dry! 🌱",
      'The watering robot is BROKEN — its instructions are scrambled.',
      'Help put the steps in the right order!',
    ],
    steps: [
      'Walk to plant 1',
      'Turn ON the water',
      'Wait 3 seconds',
      'Turn OFF the water',
      'Walk to plant 2',
      'Turn ON the water',
    ],
  },
  'home-boss': {
    kind: 'sequence',
    story: [
      "Spark wakes up… and forgets the morning routine! ☀️",
      'Help Spark sequence the day in the right order.',
    ],
    steps: [
      'Wake up — alarm beeps',
      'Open eyes (turn on sensors)',
      'Stretch arms (warm motors)',
      'Walk to kitchen',
      'Boil water for chai',
      'Pour chai into cup',
    ],
  },
  'bay-boss': {
    kind: 'logic',
    question: 'A farmer needs a robot to WATER CROPS in the field. What should it have?',
    options: [
      { label: '🎯 Soil-moisture sensor + 💧 water pump motor + ⚡ solar panel',
        correct: true,
        explain: 'Sensor to KNOW when soil is dry, motor to WATER, solar to POWER it all in the field. Perfect combo!' },
      { label: '📷 Camera + 🦾 robotic arm + 🔋 wall plug',
        correct: false,
        explain: 'A wall plug in the FIELD?! Also, an arm picks things — it doesn\'t water.' },
      { label: '🎤 Microphone + 🚀 rocket booster + 🔋 wall plug',
        correct: false,
        explain: 'A flying watering robot is fun, but rockets are wasted energy!' },
      { label: '🌡️ Temperature sensor + 📺 screen + ⚡ solar panel',
        correct: false,
        explain: 'A screen is nice, but how does the robot water plants without a motor?' },
    ],
  },
  'think-boss': {
    kind: 'logic',
    question: 'Spark sees a wall 5 cm away. The right IF-THEN rule is:',
    options: [
      { label: 'IF distance < 10 cm → THEN STOP and turn',
        correct: true,
        explain: 'Safe! Stop and find a new path. This is what every Roomba does.' },
      { label: 'IF distance < 10 cm → THEN go faster',
        correct: false,
        explain: '💥 That would be a crash! Not safe.' },
      { label: 'IF distance < 10 cm → THEN sing a song',
        correct: false,
        explain: 'Songs don\'t help with walls. 🎵 But nice idea!' },
    ],
  },
  'cave-boss': {
    kind: 'sequence',
    story: [
      "Spark is trapped in a crystal cave! 💎",
      'Only your code can guide the way out.',
      'Put the blocks in the right order:',
    ],
    steps: [
      'move_forward(2)',
      'turn_right(90°)',
      'move_forward(3)',
      'turn_left(90°)',
      'move_forward(2)',
      'EXIT reached! 🎉',
    ],
  },
  'launch-boss': {
    kind: 'sequence',
    story: [
      "Spark is going to space! 🚀",
      'Program the rocket launch sequence in the right order!',
    ],
    steps: [
      'Check all sensors',
      'Verify fuel level',
      'Countdown: 10 → 1',
      'Ignite engines',
      'Liftoff!',
      'Reach orbit',
    ],
  },
}

export default function ChallengeClient() {
  const params = useParams<{ missionId: string }>()
  const router = useRouter()
  const missionId = params?.missionId || ''
  const data = getMission(missionId)
  const content = MISSION_CONTENT[missionId]
  const minigame = MINIGAME_MISSIONS[missionId]
  const [storyIdx, setStoryIdx] = useState(0)
  const [phase, setPhase] = useState<'intro' | 'challenge' | 'result'>('intro')
  const [stars, setStars] = useState<number | null>(null)
  const [partAwarded, setPartAwarded] = useState<string | null>(null)
  const [lives, setLives] = useState(3)

  // For minigames the data file content may not exist — that's fine.
  if (!data || (!content && !minigame)) {
    return (
      <div className="p-10 text-center">
        <p className="text-2xl font-black">Challenge not found.</p>
        <Link href="/kids/world" className="mt-4 inline-block text-amber-300">← World map</Link>
      </div>
    )
  }

  const { zone, mission } = data

  const advanceStory = () => {
    if (!content || content.kind !== 'sequence') {
      setPhase('challenge')
      return
    }
    const storyLines = content.story
    if (storyIdx < storyLines.length - 1) setStoryIdx(storyIdx + 1)
    else setPhase('challenge')
  }

  const minigameFail = () => {
    setLives(l => {
      const next = Math.max(0, l - 1)
      if (next === 0) {
        // Out of lives — still credit a 1-star pity finish so they aren't stuck.
        onChallengeDone(1)
      }
      return next
    })
  }

  const onChallengeDone = (earned: number) => {
    primeAudio()
    setStars(earned)
    setPhase('result')
    // Save: completing boss credits the LAST level of the zone too (forces zone completion)
    const lastLevel = zone.levels[zone.levels.length - 1]
    const res = completeLevel(zone.id, lastLevel.id, lastLevel.starReward)
    setPartAwarded(res.partAwarded)
    // Add the boss stars themselves
    saveProgress({ totalStars: getProgress().totalStars + earned })
    playSound('zonecomplete')
    if (typeof window !== 'undefined') window.sparkGuide?.celebrate()
  }

  return (
    <div className={`ch-root bg-gradient-to-br ${zone.bgGradient}`}>
      <div className="ch-shell">
        <Link href={`/kids/world/${zone.id}`} className="back">← {zone.name}</Link>

        <header className="ch-head">
          <p className="badge">⚡ BOSS CHALLENGE ⚡</p>
          <h1>{mission.title}</h1>
        </header>

        {phase === 'intro' && content && content.kind === 'sequence' && (
          <button className="intro-bubble" onClick={advanceStory}>
            <span className="emoji">🤖</span>
            <p>{content.story[storyIdx]}</p>
            <p className="tap">Tap to continue →</p>
          </button>
        )}
        {phase === 'intro' && (!content || content.kind === 'logic' || minigame) && (
          <button className="intro-bubble" onClick={() => setPhase('challenge')}>
            <span className="emoji">🤖</span>
            <p>{mission.story}</p>
            <p className="tap">Tap to begin →</p>
          </button>
        )}

        {phase === 'challenge' && minigame === 'garden-bot' && (
          <>
            <p className="lives-row">❤️ Lives: {lives}</p>
            <GardenBotGame
              onWin={(attempts) => {
                const stars = attempts <= 1 ? 3 : attempts === 2 ? 2 : 1
                onChallengeDone(stars)
              }}
              onFail={minigameFail}
            />
          </>
        )}
        {phase === 'challenge' && minigame === 'conveyor-bug' && (
          <>
            <p className="lives-row">❤️ Lives: {lives}</p>
            <ConveyorBugGame
              onWin={() => onChallengeDone(3)}
              onFail={minigameFail}
            />
          </>
        )}
        {phase === 'challenge' && minigame === 'waypoint' && (
          <>
            <p className="lives-row">❤️ Lives: {lives}</p>
            <WaypointGame
              onWin={(attempts) => {
                const stars = attempts <= 1 ? 3 : attempts === 2 ? 2 : 1
                onChallengeDone(stars)
              }}
              onFail={minigameFail}
            />
          </>
        )}
        {phase === 'challenge' && content && content.kind === 'sequence' && !minigame && (
          <SequenceBoss steps={content.steps} onComplete={onChallengeDone} />
        )}
        {phase === 'challenge' && content && content.kind === 'logic' && !minigame && (
          <LogicBoss question={content.question} options={content.options} onComplete={onChallengeDone} />
        )}

        {phase === 'result' && stars !== null && (
          <Result stars={stars} partAwarded={partAwarded} zone={zone} onBack={() => router.push('/kids/world')} />
        )}
      </div>

      <style jsx>{`
        .ch-root { min-height: 100vh; padding: 18px 16px 60px; }
        .ch-shell { max-width: 720px; margin: 0 auto; }
        .back {
          display: inline-block;
          min-height: 48px;
          padding: 0 14px; line-height: 48px;
          background: rgba(26,16,64,.7);
          color: #fde68a;
          border: 2px solid #4c1d95;
          border-radius: 12px;
          text-decoration: none; font-weight: 800;
          margin-bottom: 18px;
        }
        .ch-head { text-align: center; margin-bottom: 24px; }
        .ch-head .badge {
          display: inline-block;
          background: linear-gradient(135deg, #fde047, #f59e0b);
          color: #1a1040;
          font-weight: 900;
          font-size: 13px; letter-spacing: 2px;
          padding: 6px 14px;
          border-radius: 999px;
          animation: pulse-badge 1.4s ease-in-out infinite;
        }
        @keyframes pulse-badge {
          0%,100% { transform: scale(1) }
          50%     { transform: scale(1.05) }
        }
        .ch-head h1 {
          margin-top: 10px;
          font-size: clamp(26px, 6vw, 38px);
          font-weight: 900;
          color: #fde047;
          text-shadow: 0 0 30px rgba(253,224,71,.5);
        }
        .intro-bubble {
          display: block; width: 100%;
          padding: 20px 24px;
          background: #1a1040;
          border: 3px solid #f59e0b;
          border-radius: 22px;
          color: #fde68a;
          font-weight: 800;
          text-align: center;
          cursor: pointer;
          animation: rise 0.5s ease-out;
        }
        @keyframes rise { from { transform: translateY(10px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .intro-bubble .emoji { font-size: 56px; display: block; margin-bottom: 10px; }
        .intro-bubble p { font-size: 18px; line-height: 1.4; }
        .intro-bubble .tap { font-size: 13px; color: #fcd34d; margin-top: 14px; animation: blink 1.4s ease-in-out infinite; }
        @keyframes blink { 50% { opacity: .35 } }
        .lives-row {
          text-align: center; font-weight: 900; color: #fde047;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Sequence boss
// ────────────────────────────────────────────────────────────────────────────
function SequenceBoss({ steps, onComplete }: { steps: string[]; onComplete: (stars: number) => void }) {
  const shuffled = useMemo(() => steps.slice().sort(() => Math.random() - 0.5), [steps])
  const [placed, setPlaced] = useState<(string | null)[]>(() => steps.map(() => null))
  const [pool, setPool] = useState<string[]>(shuffled)
  const [tries, setTries] = useState(0)

  const place = (item: string) => {
    primeAudio(); playSound('click')
    const idx = placed.findIndex(p => p === null)
    if (idx === -1) return
    const next = [...placed]; next[idx] = item
    setPlaced(next)
    setPool(p => p.filter(x => x !== item))
  }

  const remove = (i: number) => {
    const item = placed[i]
    if (!item) return
    const next = [...placed]; next[i] = null
    setPlaced(next); setPool(p => [item, ...p])
  }

  const check = () => {
    const ok = placed.every((p, i) => p === steps[i])
    if (ok) {
      const stars = tries === 0 ? 3 : tries === 1 ? 2 : 1
      playSound('correct')
      onComplete(stars)
    } else {
      playSound('wrong')
      setTries(t => t + 1)
      // shake feedback
    }
  }

  const allFilled = placed.every(p => p !== null)

  return (
    <div className="sb">
      <ol className="slots">
        {placed.map((p, i) => (
          <li key={i} className={`slot ${p ? 'filled' : ''}`} onClick={() => remove(i)}>
            <span className="num">{i + 1}</span>
            <span className="content">{p ?? 'empty'}</span>
          </li>
        ))}
      </ol>

      <div className="pool">
        {pool.map(item => (
          <button key={item} onClick={() => place(item)} className="block">{item}</button>
        ))}
      </div>

      <button className="check" onClick={check} disabled={!allFilled}>✓ Check sequence</button>
      {tries > 0 && <p className="retry">Not quite — try a different order! ({3 - Math.min(tries, 2)} ⭐ still possible)</p>}

      <style jsx>{`
        .sb { display: flex; flex-direction: column; gap: 14px; }
        .slots { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
        .slot {
          display: flex; align-items: center; gap: 10px;
          padding: 12px;
          background: rgba(26,16,64,.7);
          border: 2px dashed #4c1d95;
          border-radius: 12px;
          color: #c4b5fd;
          cursor: pointer; font-weight: 700;
        }
        .slot.filled { border-style: solid; border-color: #fbbf24; color: #fde68a; background: rgba(251,191,36,.12); }
        .num {
          width: 28px; height: 28px;
          display: grid; place-items: center;
          background: #fbbf24; color: #1a1040;
          border-radius: 50%; font-weight: 900;
          flex-shrink: 0;
        }
        .pool { display: flex; flex-direction: column; gap: 6px; }
        .block {
          min-height: 52px;
          padding: 10px 14px;
          background: linear-gradient(135deg, #fde047, #fbbf24);
          color: #1a1040;
          border: none; border-radius: 12px;
          font-weight: 800; text-align: left; cursor: pointer;
        }
        .check {
          min-height: 56px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white; border: none; border-radius: 14px;
          font-size: 18px; font-weight: 900; cursor: pointer;
        }
        .check:disabled { opacity: .4; cursor: not-allowed; }
        .retry { text-align: center; color: #fda4af; font-weight: 700; }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Logic boss
// ────────────────────────────────────────────────────────────────────────────
function LogicBoss({ question, options, onComplete }: {
  question: string
  options: { label: string; correct: boolean; explain?: string }[]
  onComplete: (stars: number) => void
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const [tries, setTries] = useState(0)
  const isCorrect = picked !== null && options[picked].correct

  const choose = (i: number) => {
    primeAudio()
    setPicked(i)
    if (options[i].correct) {
      playSound('correct')
      const stars = tries === 0 ? 3 : tries === 1 ? 2 : 1
      setTimeout(() => onComplete(stars), 1200)
    } else {
      playSound('wrong')
      setTries(t => t + 1)
    }
  }

  return (
    <div className="lb">
      <p className="q">{question}</p>
      <div className="opts">
        {options.map((o, i) => {
          const showState = picked === i
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              className={`o ${showState ? (o.correct ? 'ok' : 'bad') : ''}`}
              disabled={isCorrect}
            >
              <span>{o.label}</span>
              {showState && o.explain && <p className="explain">{o.explain}</p>}
            </button>
          )
        })}
      </div>
      <style jsx>{`
        .lb { display: flex; flex-direction: column; gap: 14px; }
        .q {
          background: rgba(124,58,237,.18);
          border: 2px solid #7c3aed;
          color: #fde68a;
          padding: 14px 16px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 17px;
          line-height: 1.4;
          text-align: center;
        }
        .opts { display: flex; flex-direction: column; gap: 8px; }
        .o {
          min-height: 56px;
          padding: 12px 14px;
          background: #1a1040;
          border: 2px solid #4c1d95;
          color: #fde68a;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 800;
          text-align: left;
          cursor: pointer;
          transition: all .2s;
        }
        .o:hover:not(:disabled) { transform: scale(1.02); border-color: #fbbf24; }
        .o.ok  { background: rgba(16,185,129,.22); border-color: #10b981; color: #6ee7b7; }
        .o.bad { background: rgba(239,68,68,.22); border-color: #ef4444; color: #fda4af; animation: shake .4s; }
        @keyframes shake { 25% { transform: translateX(-6px) } 75% { transform: translateX(6px) } }
        .explain { margin-top: 6px; font-size: 12px; font-weight: 700; opacity: .9; }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Result
// ────────────────────────────────────────────────────────────────────────────
function Result({ stars, partAwarded, zone, onBack }: {
  stars: number
  partAwarded: string | null
  zone: { name: string; id: string }
  onBack: () => void
}) {
  const part = partAwarded ? ROBOT_PARTS.find(p => p.id === partAwarded) : null
  return (
    <div className="res">
      <p className="title">🏆 BOSS DEFEATED!</p>
      <p className="stars">{'⭐'.repeat(stars)}</p>
      <p className="zone">{zone.name} — Complete!</p>

      {part && (
        <div className="part">
          <span className="p-emoji">{part.emoji}</span>
          <p className="p-name">NEW PART UNLOCKED!</p>
          <p className="p-label">{part.name}</p>
          <p className="p-desc">{part.description}</p>
        </div>
      )}

      <div className="btns">
        <Link href="/kids/my-robot" className="btn link">🤖 See my robot</Link>
        <button onClick={onBack} className="btn back">🗺️ Back to world map</button>
      </div>

      <style jsx>{`
        .res { text-align: center; padding: 20px 12px; animation: pop 0.5s ease-out; }
        @keyframes pop { from { transform: scale(.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        .title {
          font-size: clamp(28px, 7vw, 42px);
          font-weight: 900;
          color: #fde047;
          letter-spacing: 1.5px;
          text-shadow: 0 0 30px rgba(253,224,71,.5);
        }
        .stars { font-size: 48px; margin-top: 10px; }
        .zone { font-size: 18px; color: #c4b5fd; font-weight: 800; margin-top: 6px; }
        .part {
          margin-top: 22px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(251,191,36,.2), rgba(245,158,11,.1));
          border: 3px solid #fbbf24;
          border-radius: 22px;
          animation: glow 1.8s ease-in-out infinite;
        }
        @keyframes glow {
          0%,100% { box-shadow: 0 0 20px rgba(251,191,36,.3) }
          50%     { box-shadow: 0 0 60px rgba(251,191,36,.7) }
        }
        .p-emoji { font-size: 64px; display: block; }
        .p-name { font-size: 12px; font-weight: 900; letter-spacing: 2px; color: #fde047; margin-top: 6px; }
        .p-label { font-size: 22px; font-weight: 900; color: #fbbf24; margin-top: 4px; }
        .p-desc { font-size: 13px; color: #fde68a; margin-top: 6px; }
        .btns { margin-top: 22px; display: flex; flex-direction: column; gap: 10px; }
        @media (min-width: 480px) { .btns { flex-direction: row; justify-content: center; } }
        .btn {
          min-height: 56px;
          padding: 0 20px;
          border-radius: 14px;
          font-weight: 900;
          text-decoration: none;
          display: inline-flex; align-items: center; justify-content: center;
          border: none; cursor: pointer; font-size: 16px;
        }
        .link { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #1a1040; }
        .back { background: #1a1040; color: #fde68a; border: 2px solid #4c1d95; }
      `}</style>
    </div>
  )
}
