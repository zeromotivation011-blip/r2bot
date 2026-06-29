'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getZone, KIDS_ZONES, ZONE_UNLOCK_STARS } from '@/lib/kids-world-data'
import { getProgress, isZoneUnlocked } from '@/lib/kids-progress'
import { playSound } from '@/lib/kids-audio'

export default function ZoneClient() {
  const params = useParams<{ zoneId: string }>()
  const zoneId = params?.zoneId || ''
  const router = useRouter()
  const zone = getZone(zoneId)

  const [progress, setProgress] = useState(() => getProgress())
  useEffect(() => {
    const t = setInterval(() => setProgress(getProgress()), 1500)
    return () => clearInterval(t)
  }, [])

  if (!zone) {
    return (
      <div className="p-10 text-center">
        <p className="text-2xl font-black">Zone not found.</p>
        <Link href="/kids/world" className="mt-4 inline-block text-amber-300 hover:underline">← Back to world map</Link>
      </div>
    )
  }

  const unlocked = isZoneUnlocked(zoneId)
  if (!unlocked) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-3xl font-black text-amber-300">🔒 Locked</h1>
        <p className="mt-3 text-purple-200">You need ⭐ {ZONE_UNLOCK_STARS[zoneId]} to unlock {zone.name}.</p>
        <Link href="/kids/world" className="mt-6 inline-block px-5 py-3 rounded-2xl bg-amber-500 text-black font-black">← Back to world</Link>
      </div>
    )
  }

  const zoneIdx = KIDS_ZONES.findIndex(z => z.id === zone.id)
  const collectedStars = zone.levels.reduce((s, l) => s + (progress.starsByLevel[`${zone.id}/${l.id}`] || 0), 0)
  const maxStars = zone.levels.reduce((s, l) => s + l.starReward, 0)
  const bossUnlocked = progress.totalStars >= zone.bossChallenge.starsToUnlock

  return (
    <div className={`zone-root bg-gradient-to-br ${zone.bgGradient}`}>
      <div className="zone-shell">
        <Link href="/kids/world" className="back-btn" onClick={() => playSound('click')}>
          ← World Map
        </Link>

        <header className="zone-header">
          <span className="zone-banner-emoji">{zone.emoji}</span>
          <h1>{zone.name}</h1>
          <p className="tagline">{zone.tagline}</p>
          <p className="zone-meta">Zone {zoneIdx + 1} of {KIDS_ZONES.length} · Ages {zone.ageRange}</p>
          <div className="zone-progress">
            <span>⭐ {collectedStars} / {maxStars}</span>
          </div>
        </header>

        <ol className="levels">
          {zone.levels.map((l, i) => {
            const key = `${zone.id}/${l.id}`
            const done = progress.completedLevels.includes(key)
            const stars = progress.starsByLevel[key] || 0
            const isCurrent = !done && (i === 0 || progress.completedLevels.includes(`${zone.id}/${zone.levels[i - 1].id}`))
            return (
              <li key={l.id} className={`level-card ${done ? 'done' : isCurrent ? 'current' : 'next'}`}>
                <div className="level-emoji">{l.emoji}</div>
                <div className="level-info">
                  <h3>{l.title}</h3>
                  <p>{l.storyHook}</p>
                  <div className="meta">
                    <span className="chip">⏱ {l.duration}</span>
                    <span className="chip">⭐ {l.starReward}</span>
                    {done && <span className="chip chip-done">✓ Done {stars > 0 ? `· ⭐ ${stars}` : ''}</span>}
                  </div>
                </div>
                <Link
                  href={`/kids/world/${zone.id}/${l.id}`}
                  className="play-btn"
                  onClick={() => playSound('click')}
                >
                  {done ? 'Replay' : isCurrent ? 'Play →' : 'Open'}
                </Link>
              </li>
            )
          })}
        </ol>

        {/* Boss challenge */}
        <div className={`boss-card ${bossUnlocked ? 'unlocked' : 'locked'}`}>
          <div className="boss-badge">⚡ BOSS CHALLENGE</div>
          <h2>{zone.bossChallenge.title}</h2>
          <p className="story">{zone.bossChallenge.story}</p>
          <p className="challenge">{zone.bossChallenge.challenge}</p>
          <div className="boss-bar">
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${Math.min(100, (progress.totalStars / zone.bossChallenge.starsToUnlock) * 100)}%` }} />
            </div>
            <span>⭐ {progress.totalStars} / {zone.bossChallenge.starsToUnlock}</span>
          </div>
          {bossUnlocked ? (
            <button
              className="boss-cta"
              onClick={() => { playSound('unlock'); router.push(`/kids/challenge/${zone.bossChallenge.id}`) }}
            >
              Start Boss Challenge →
            </button>
          ) : (
            <p className="boss-lock">Earn ⭐ {zone.bossChallenge.starsToUnlock - progress.totalStars} more to unlock</p>
          )}
        </div>
      </div>

      <style jsx>{`
        .zone-root { min-height: 100vh; padding: 20px 16px 60px; }
        .zone-shell { max-width: 720px; margin: 0 auto; }
        .back-btn {
          display: inline-block;
          min-height: 48px;
          padding: 0 16px;
          line-height: 48px;
          color: #fde68a;
          background: rgba(26,16,64,.7);
          border: 2px solid #4c1d95;
          border-radius: 12px;
          font-weight: 800;
          text-decoration: none;
          margin-bottom: 16px;
        }
        .zone-header {
          text-align: center; padding: 28px 16px;
          background: rgba(15,10,30,.4);
          border-radius: 24px;
          border: 2px solid rgba(255,255,255,.08);
          margin-bottom: 24px;
        }
        .zone-banner-emoji { font-size: 64px; display: block; margin-bottom: 6px; filter: drop-shadow(0 4px 12px rgba(0,0,0,.5)); }
        .zone-header h1 {
          font-size: clamp(28px, 6vw, 44px);
          font-weight: 900;
          color: #fde047;
          letter-spacing: 1px;
          text-shadow: 0 0 30px rgba(253,224,71,.4);
        }
        .tagline { font-size: 18px; color: #c4b5fd; margin-top: 4px; font-weight: 700; }
        .zone-meta { font-size: 12px; color: #a5b4fc; margin-top: 6px; letter-spacing: 1px; text-transform: uppercase; }
        .zone-progress {
          display: inline-block;
          margin-top: 14px;
          background: rgba(251,191,36,.2);
          border: 2px solid #fbbf24;
          color: #fde047;
          padding: 6px 16px;
          border-radius: 999px;
          font-weight: 900;
        }
        .levels { display: flex; flex-direction: column; gap: 12px; margin: 0; padding: 0; list-style: none; }
        .level-card {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px;
          background: rgba(26,16,64,.7);
          border-radius: 18px;
          border: 2px solid #4c1d95;
        }
        .level-card.done   { border-color: #10b981; }
        .level-card.current { border-color: #fbbf24; box-shadow: 0 0 30px rgba(251,191,36,.3); }
        .level-emoji { font-size: 40px; flex-shrink: 0; }
        .level-info { flex: 1; min-width: 0; }
        .level-info h3 { font-size: 18px; font-weight: 900; color: #fde047; }
        .level-info p { font-size: 13px; color: #c4b5fd; margin-top: 2px; }
        .meta { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
        .chip {
          font-size: 11px; font-weight: 800;
          background: rgba(15,10,30,.65);
          color: #fcd34d;
          padding: 3px 9px;
          border-radius: 999px;
          border: 1px solid #4c1d95;
        }
        .chip-done { background: #10b981; color: #022c22; border-color: #065f46; }
        .play-btn {
          min-height: 56px;
          padding: 0 18px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #1a1040;
          border-radius: 14px;
          text-decoration: none;
          font-weight: 900;
          display: grid; place-items: center;
          flex-shrink: 0;
        }
        .boss-card {
          margin-top: 28px;
          padding: 22px 20px;
          background: linear-gradient(135deg, rgba(239,68,68,.2), rgba(245,158,11,.2));
          border: 3px solid #ef4444;
          border-radius: 22px;
          color: #fde68a;
        }
        .boss-card.locked { border-color: #4c1d95; filter: grayscale(.3); }
        .boss-badge {
          display: inline-block;
          background: #fde047; color: #1a1040;
          font-size: 11px; font-weight: 900;
          letter-spacing: 1.5px; padding: 4px 10px;
          border-radius: 999px;
          margin-bottom: 8px;
        }
        .boss-card h2 { font-size: 22px; font-weight: 900; color: #fde047; }
        .story { font-size: 14px; margin-top: 6px; color: #fde68a; }
        .challenge { font-size: 13px; color: #c4b5fd; margin-top: 2px; }
        .boss-bar { display: flex; align-items: center; gap: 10px; margin-top: 12px; font-weight: 800; font-size: 13px; color: #fbbf24; }
        .bar-track { flex: 1; height: 10px; background: #0f0a1e; border-radius: 999px; overflow: hidden; }
        .bar-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #fbbf24); transition: width .4s; }
        .boss-cta {
          margin-top: 14px;
          min-height: 56px; width: 100%;
          background: linear-gradient(135deg, #ef4444, #f59e0b);
          color: white; font-size: 18px; font-weight: 900;
          border: none; border-radius: 14px; cursor: pointer;
        }
        .boss-lock { margin-top: 12px; text-align: center; color: #c4b5fd; font-weight: 700; }
        @media (max-width: 640px) {
          .level-card { gap: 10px; padding: 12px; }
          .level-emoji { font-size: 32px; }
          .level-info h3 { font-size: 16px; }
        }
      `}</style>
    </div>
  )
}
