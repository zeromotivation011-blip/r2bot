'use client'

// Speak your answer. Falls back to text options if SpeechRecognition unsupported.
// Fuzzy matches against accepted answers.

import { useEffect, useRef, useState } from 'react'
import {
  playSound,
  primeAudio,
  sparkListen,
  sparkSays,
  speechRecognitionSupported,
} from '@/lib/kids-audio'

interface VoiceAnswerProps {
  question: string
  accepted: string[]      // canonical answers (lowercase)
  onWin: () => void
  onFail?: () => void
}

function normalise(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
}

function fuzzyMatch(transcript: string, accepted: string[]): string | null {
  const t = normalise(transcript)
  if (!t) return null
  for (const a of accepted) {
    const na = normalise(a)
    if (t === na) return a
    if (t.includes(na)) return a
    if (na.includes(t) && t.length >= 3) return a
  }
  return null
}

export function VoiceAnswer({ question, accepted, onWin, onFail }: VoiceAnswerProps) {
  const supported = useRef(false)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState<string | null>(null)
  const [resolution, setResolution] = useState<'idle' | 'match' | 'miss'>('idle')
  const stopRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    supported.current = speechRecognitionSupported()
  }, [])

  const start = () => {
    primeAudio()
    if (!supported.current) {
      // Fallback: speak the question and offer text option.
      sparkSays(question)
      return
    }
    setHeard(null)
    setResolution('idle')
    setListening(true)
    stopRef.current = sparkListen(
      (transcript) => {
        setListening(false)
        setHeard(transcript)
        const match = fuzzyMatch(transcript, accepted)
        if (match) {
          playSound('correct')
          setResolution('match')
          sparkSays('Yes! ' + match + ' is right!')
          setTimeout(onWin, 1100)
        } else {
          playSound('wrong')
          setResolution('miss')
          const canonical = accepted[0]
          sparkSays(`I heard "${transcript}". Close! The answer is "${canonical}". Now you say it!`)
          onFail?.()
        }
      },
      () => {
        setListening(false)
        sparkSays('I didn\'t catch that — try again.')
      },
    )
  }

  // Fallback: text answers (always show a small list).
  const pickText = (a: string) => {
    primeAudio()
    playSound('correct')
    setResolution('match')
    setHeard(a)
    sparkSays('Yes! ' + a + ' is right!')
    setTimeout(onWin, 800)
  }

  return (
    <div className="va">
      <p className="va-q">{question}</p>

      {supported.current ? (
        <button
          type="button"
          onClick={start}
          disabled={listening}
          className={`va-mic ${listening ? 'is-listening' : ''}`}
          aria-label={listening ? 'Listening' : 'Tap to speak'}
        >
          <span aria-hidden style={{ fontSize: 28 }}>🎤</span>
          <span>{listening ? 'Listening…' : 'Tap to speak'}</span>
        </button>
      ) : (
        <p className="va-fallback">Voice not available here. Tap a word instead:</p>
      )}

      {heard && (
        <p className={`va-heard ${resolution === 'match' ? 'is-ok' : 'is-miss'}`}>
          You said: <strong>{heard}</strong>
        </p>
      )}

      <div className="va-text-opts">
        {accepted.slice(0, 4).map(a => (
          <button key={a} type="button" onClick={() => pickText(a)} className="va-opt">
            {a}
          </button>
        ))}
      </div>

      <style jsx>{`
        .va { display: flex; flex-direction: column; gap: 12px; align-items: center; }
        .va-q {
          font-size: clamp(18px, 3vw, 24px);
          font-weight: 800;
          color: #fde047;
          text-align: center;
          line-height: 1.4;
        }
        .va-mic {
          min-height: 72px;
          padding: 0 26px;
          background: linear-gradient(135deg, #ef4444, #f97316);
          color: white;
          border: none; border-radius: 999px;
          font-weight: 900; font-size: 17px;
          cursor: pointer;
          display: inline-flex; align-items: center; gap: 12px;
          box-shadow: 0 10px 30px rgba(239,68,68,0.45);
        }
        .va-mic.is-listening {
          animation: va-pulse 1s ease-in-out infinite;
        }
        @keyframes va-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.55); }
          50%      { box-shadow: 0 0 0 18px rgba(239,68,68,0); }
        }
        .va-fallback { color: #c4b5fd; font-weight: 700; }
        .va-heard {
          font-size: 15px; font-weight: 700;
        }
        .va-heard.is-ok   { color: #6ee7b7; }
        .va-heard.is-miss { color: #fca5a5; }
        .va-text-opts {
          display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
        }
        .va-opt {
          min-height: 44px;
          padding: 0 14px;
          background: #1a1040;
          color: #fde68a;
          border: 2px solid #4c1d95;
          border-radius: 999px;
          font-weight: 800;
          cursor: pointer;
        }
        .va-opt:hover { border-color: #fbbf24; }
      `}</style>
    </div>
  )
}
