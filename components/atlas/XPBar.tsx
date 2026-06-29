'use client'

// components/atlas/XPBar.tsx
// Shows the learner's Atlas XP + level + progress to next level.

import { useEffect, useState } from 'react'
import { getAtlasLevel, type AtlasLevelInfo } from '@/lib/atlas-xp'

export function XPBar({ refreshKey = 0 }: { refreshKey?: number }) {
  const [info, setInfo] = useState<AtlasLevelInfo | null>(null)

  useEffect(() => {
    setInfo(getAtlasLevel())
  }, [refreshKey])

  if (!info) return null
  const isMaestro = info.nextAt === Number.POSITIVE_INFINITY
  const remaining = isMaestro ? 0 : info.nextAt - info.current

  return (
    <div className="xpbar" role="status" aria-label={`${info.level} level, ${info.current} XP`}>
      <div className="xpbar-row">
        <span className="xpbar-emoji" aria-hidden>{info.emoji}</span>
        <div className="xpbar-text">
          <p className="xpbar-level">{info.level}</p>
          <p className="xpbar-xp">
            {info.current} XP
            {!isMaestro && <span className="xpbar-next"> · {remaining} to {LEVEL_NEXT[info.level]}</span>}
          </p>
        </div>
      </div>
      <div className="xpbar-track" aria-hidden>
        <div className="xpbar-fill" style={{ width: `${info.progress * 100}%` }} />
      </div>

      <style jsx>{`
        .xpbar {
          padding: 10px 14px;
          background: linear-gradient(135deg, rgba(245,158,11,0.10), rgba(0,229,255,0.08));
          border: 1px solid rgba(245,158,11,0.32);
          border-radius: 14px;
          min-width: 200px;
          color: #fde68a;
        }
        .xpbar-row { display: flex; align-items: center; gap: 10px; }
        .xpbar-emoji { font-size: 26px; }
        .xpbar-text { display: flex; flex-direction: column; gap: 0; }
        .xpbar-level { margin: 0; font-weight: 900; color: #fde047; font-size: 14px; }
        .xpbar-xp { margin: 0; font-size: 12px; color: #c4b5fd; }
        .xpbar-next { color: #94a3b8; }
        .xpbar-track {
          height: 6px;
          background: rgba(255,255,255,0.08);
          border-radius: 999px;
          overflow: hidden;
          margin-top: 8px;
        }
        .xpbar-fill {
          height: 100%;
          background: linear-gradient(90deg, #fbbf24, #f97316);
          transition: width 0.4s cubic-bezier(.22,.61,.36,1);
        }
      `}</style>
    </div>
  )
}

const LEVEL_NEXT: Record<string, string> = {
  Apprentice: 'Builder',
  Builder: 'Engineer',
  Engineer: 'Maestro',
  Maestro: 'Maestro',
}
