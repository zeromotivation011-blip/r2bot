'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SCHOOL_TRACKS, type SchoolTrackId } from '@/lib/school-curriculum'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface Q {
  q: string
  options: string[]
  correct: number | number[]   // index, or accepted indices
  hint?: string
}

const QUESTIONS: Q[] = [
  { q: 'Which of these is a robot?',
    options: ['🤖 Robot arm', '🔨 Hammer', '📚 Book', '🍎 Apple'], correct: 0 },
  { q: 'What does a sensor do?',
    options: ['Feels things around it', 'Makes the robot move', 'Stores memory', 'Charges battery'], correct: 0 },
  { q: 'Which animal behaves most like a robot?',
    options: ['🐜 Ant following a path', '🦁 Lion hunting', '🐟 Fish swimming', '🦋 Butterfly'], correct: 0 },
  { q: 'What is programming?',
    options: ['Giving step-by-step instructions', 'Drawing pictures', 'Charging a battery', 'Building with bricks'], correct: 0 },
  { q: 'A robot vacuum knows where the wall is because of its ___',
    options: ['Sensor', 'Wheel', 'Battery', 'Camera'], correct: [0, 3], hint: 'Sensor or camera — both accepted' },
  { q: 'Which part MOVES the robot?',
    options: ['Sensor', 'Actuator', 'Code', 'Battery'], correct: 1 },
  { q: 'A self-driving car needs to know how far away the next car is. The best sensor is ___',
    options: ['Microphone', 'LIDAR / ultrasonic', 'Temperature sensor', 'GPS'], correct: 1 },
  { q: 'Which code makes the robot turn right?',
    options: ['motor.left.fast(), motor.right.fast()', 'motor.left.fast(), motor.right.slow()', 'motor.stop()', 'motor.reverse()'], correct: 1 },
  { q: 'What does this error mean? "Index out of range"',
    options: ['Battery dead', 'Code asked for the 11th item in a list of 10', 'Wifi off', 'Sensor unplugged'], correct: 1 },
  { q: 'A factory robot welding cars uses which motor?',
    options: ['Fan motor', 'Servo with precise angles', 'Spring', 'No motor — magic'], correct: 1 },
  { q: 'Which is NOT a robot?',
    options: ['ATM', 'Drone', 'Hammer', 'Roomba'], correct: 2 },
  { q: '"if temperature > 30: fan.on()" — this is an example of ___',
    options: ['Loop', 'Condition (if-else)', 'Function', 'Comment'], correct: 1 },
  { q: 'A line follower uses which sensor most?',
    options: ['Camera', 'IR (infrared)', 'GPS', 'Microphone'], correct: 1 },
  { q: 'In a robot, the brain is called the ___',
    options: ['Microcontroller / processor', 'Motor', 'Battery', 'Frame'], correct: 0 },
  { q: 'PWM means ___',
    options: ['Pulse Width Modulation — used to control motor speed', 'Power Watt Meter', 'Phone Wireless Mode', 'Printer Wifi Module'], correct: 0 },
  { q: 'Which is a programming language commonly used in robotics?',
    options: ['Hindi', 'Python', 'HTML', 'CSS'], correct: 1 },
  { q: 'Which sensor would best detect a red box on a conveyor belt?',
    options: ['Ultrasonic', 'Colour sensor (TCS3200)', 'GPS', 'Microphone'], correct: 1 },
  { q: 'In PID control, which letter handles "how fast the error is changing"?',
    options: ['P', 'I', 'D', 'None'], correct: 2 },
  { q: 'ROS in robotics stands for ___',
    options: ['Robot Operating System', 'Real Optical Sensor', 'Roomba OS', 'Rapid Object Scan'], correct: 0 },
  { q: 'Reinforcement learning is when a robot ___',
    options: ['Reads a textbook', 'Tries things and learns from reward/punishment', 'Charges battery', 'Sleeps to learn'], correct: 1 },
]

function isCorrect(q: Q, picked: number): boolean {
  if (Array.isArray(q.correct)) return q.correct.includes(picked)
  return q.correct === picked
}

export default function DiagnosticPage() {
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUESTIONS.map(() => null))
  const [done, setDone] = useState(false)

  const score = useMemo(
    () => answers.reduce<number>((acc, a, i) => acc + (a !== null && isCorrect(QUESTIONS[i], a) ? 1 : 0), 0),
    [answers]
  )

  const trackForScore = (s: number): typeof SCHOOL_TRACKS[number] => {
    return SCHOOL_TRACKS.find(t => s >= t.scoreMin && s <= t.scoreMax) ?? SCHOOL_TRACKS[0]
  }

  const saveTrack = async (trackId: SchoolTrackId) => {
    try { window.localStorage.setItem('r2bot_school_track', trackId) } catch {}
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ school_track: trackId }).eq('id', user.id)
      }
    } catch {
      // silently ignore — localStorage is the source of truth for non-authed users
    }
  }

  const finishWithTrack = async (track: typeof SCHOOL_TRACKS[number]) => {
    await saveTrack(track.id)
    router.push('/schools/student')
  }

  if (done) {
    const result = trackForScore(score)
    return (
      <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-7xl mb-3">{result.emoji}</div>
          <p className="text-amber-400 text-sm uppercase tracking-wide">Your track</p>
          <h1 className="text-4xl md:text-5xl font-black mt-2">{result.label}</h1>
          <p className="mt-3 text-gray-300 max-w-xl mx-auto">{result.blurb}</p>

          <div className="mt-8 inline-flex flex-col items-center rounded-2xl border border-amber-500/30 bg-amber-500/10 px-8 py-6">
            <span className="text-xs text-amber-300 uppercase tracking-wide">Score</span>
            <span className="text-5xl font-black text-amber-400 mt-1">{score} / 20</span>
          </div>

          <div className="mt-8 text-left max-w-md mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-sm font-semibold text-white">You&apos;ll learn:</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-300">
              <Bullet>What sensors, actuators and controllers do (with relatable analogies)</Bullet>
              <Bullet>How to drive, sense and avoid in a real browser simulator</Bullet>
              <Bullet>How to read & write block / Python code for robots</Bullet>
              <Bullet>How to build 10 real Indian-priced projects</Bullet>
            </ul>
          </div>

          <button
            onClick={() => finishWithTrack(result)}
            className="mt-8 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-black hover:bg-amber-400 transition-colors"
          >
            Start Your Journey →
          </button>
          <p className="mt-2 text-xs text-gray-500">You can retake the test any time from your dashboard.</p>
        </div>
      </div>
    )
  }

  const q = QUESTIONS[idx]
  const progress = ((idx + (answers[idx] !== null ? 1 : 0)) / QUESTIONS.length) * 100

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="sticky top-0 z-20 border-b border-gray-800 bg-gray-900/80 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-400">
            <Link href="/schools/student" className="text-amber-400 hover:underline">← Back</Link>
            <span>{idx + 1} / {QUESTIONS.length}</span>
            <button
              onClick={() => finishWithTrack(SCHOOL_TRACKS[0])}
              className="text-xs text-gray-500 hover:text-amber-300"
            >Skip → Beginner</button>
          </div>
          <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-xs uppercase tracking-wide text-amber-400">Question {idx + 1}</p>
        <h2 className="mt-2 text-2xl md:text-3xl font-bold text-white">{q.q}</h2>

        <div className="mt-6 space-y-3">
          {q.options.map((opt, i) => {
            const picked = answers[idx] === i
            return (
              <button
                key={i}
                onClick={() => {
                  setAnswers(a => {
                    const next = [...a]
                    next[idx] = i
                    return next
                  })
                }}
                className={`w-full text-left rounded-xl border px-4 py-4 text-base font-medium transition-colors ${
                  picked
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-gray-800 bg-gray-900 text-gray-200 hover:border-gray-700 hover:bg-gray-800'
                }`}
              >
                <span className="mr-3 inline-block w-7 h-7 rounded-full bg-gray-800 text-center leading-7 text-xs">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            )
          })}
        </div>

        {q.hint && <p className="mt-3 text-xs text-amber-300/70">💡 {q.hint}</p>}

        <div className="mt-8 flex items-center justify-between">
          <button
            disabled={idx === 0}
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 disabled:opacity-40"
          >← Previous</button>

          {idx === QUESTIONS.length - 1 ? (
            <button
              onClick={() => setDone(true)}
              disabled={answers[idx] === null}
              className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-black disabled:opacity-40 disabled:hover:bg-amber-500 hover:bg-amber-400"
            >Finish →</button>
          ) : (
            <button
              onClick={() => setIdx(i => Math.min(QUESTIONS.length - 1, i + 1))}
              disabled={answers[idx] === null}
              className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-black disabled:opacity-40 disabled:hover:bg-amber-500 hover:bg-amber-400"
            >Next →</button>
          )}
        </div>
      </div>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-amber-400">→</span>
      <span>{children}</span>
    </li>
  )
}
