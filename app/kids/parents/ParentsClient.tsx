'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getProgress, resetProgress, type KidsProgress } from '@/lib/kids-progress'
import { KIDS_ZONES } from '@/lib/kids-world-data'

const OFFLINE_ACTIVITIES = [
  {
    zone: "Spark's Garden",
    activity: 'Robot Safari',
    body: 'Walk through your house with your child. Together, list every machine that gets instructions and then works on its own. Count them.',
  },
  {
    zone: 'Robot Home',
    activity: 'Sensor I-Spy',
    body: "Spot one sensor in each room. Living room (TV remote receiver), kitchen (gas detector), bathroom (auto-flush), front door (doorbell camera). Talk about what each one 'feels'.",
  },
  {
    zone: 'Build-It Bay',
    activity: 'Take it apart',
    body: 'Find an old toy or torch. With supervision, open it carefully and identify: sensor, motor, battery, control. The 4 robot parts in real life.',
  },
  {
    zone: 'Think Tank',
    activity: 'Play IF–THEN',
    body: 'At dinner, take turns saying IF [situation] THEN [action]. Make them silly. IF I clap → THEN you bark. Builds logical structure.',
  },
  {
    zone: 'Code Cave',
    activity: 'Direction Robot',
    body: 'Blindfold one family member. The other gives only precise step-by-step instructions to navigate them across the room. No vague words allowed — that\'s coding.',
  },
  {
    zone: 'Launch Pad',
    activity: 'Pseudocode dinner',
    body: 'Have your child write out the steps to make Maggi as if instructing a robot. Watch them realise how precise instructions need to be.',
  },
]

const CBSE_ALIGNMENT = [
  { zone: "Spark's Garden", grade: 'Class 1–2', topic: 'Surroundings & technology — daily-use machines' },
  { zone: 'Robot Home',     grade: 'Class 3–4', topic: 'Around us / our needs — household machines & their work' },
  { zone: 'Build-It Bay',   grade: 'Class 5',   topic: 'Simple machines, components, systems' },
  { zone: 'Think Tank',     grade: 'Class 5–6', topic: 'Computer awareness — algorithms and flowcharts' },
  { zone: 'Code Cave',      grade: 'Class 6–7', topic: 'Scratch / block-coding fundamentals' },
  { zone: 'Launch Pad',     grade: 'Class 8+',  topic: 'Introduction to Python and AI fundamentals' },
]

export default function ParentsClient() {
  const [progress, setProgress] = useState<KidsProgress | null>(null)

  useEffect(() => {
    setProgress(getProgress())
  }, [])

  const reset = () => {
    if (typeof window === 'undefined') return
    const ok = window.confirm("Reset your child's progress? This clears all stars, parts and completed levels.")
    if (!ok) return
    setProgress(resetProgress())
  }

  return (
    <div className="parents">
      <header className="head">
        <Link href="/kids" className="back">← Robot World</Link>
        <h1>👪 For Parents</h1>
        <button onClick={() => window.print()} className="print">🖨 Print this page</button>
      </header>

      {/* Section 1 — what they learned today */}
      <section className="card">
        <h2>What your child learned today</h2>
        {!progress?.age ? (
          <p className="muted">No data yet. Have your child pick their age in Robot World to start the journey.</p>
        ) : (
          <>
            <div className="stat-grid">
              <Stat label="Age set" value={`${progress.age} yrs`} />
              <Stat label="Stars earned" value={`⭐ ${progress.totalStars} / 50`} />
              <Stat label="Levels completed" value={`${progress.completedLevels.length}`} />
              <Stat label="Zones completed" value={`${progress.completedZones.length} / 6`} />
              <Stat label="Robot parts earned" value={`${progress.earnedParts.length} / 6`} />
              <Stat label="Last played" value={new Date(progress.lastPlayed).toLocaleString()} />
            </div>
            <button onClick={reset} className="reset">Reset progress</button>
          </>
        )}
      </section>

      {/* Section 2 — science behind it */}
      <section className="card">
        <h2>The science behind Robot World</h2>
        <p>
          Robot World is built on Piaget's stages of cognitive development. Each zone meets a child at the level
          where they think most naturally: concrete operations for younger kids, abstract operations for older ones.
        </p>
        <ul className="bul">
          <li><strong>Story-first learning</strong> — every concept arrives wrapped in a tiny story. Stories activate memory networks faster than abstract definitions.</li>
          <li><strong>No "wrong" answers</strong> — mistakes get warm, funny "try-again" messages. Shame inhibits learning; gentle correction accelerates it.</li>
          <li><strong>Bite-sized lessons</strong> — 4–8 minutes each. Designed to fit healthy screen-time windows recommended by the AAP.</li>
          <li><strong>India-first analogies</strong> — pressure cookers, ATMs, washing machines, UPI. Concepts stick when they connect to lived experience.</li>
        </ul>
        <p className="muted">
          Your child is building: <strong>computational thinking</strong> (decomposing problems), <strong>logical sequencing</strong>
          (cause → effect), <strong>pattern recognition</strong>, and <strong>persistence through productive struggle</strong>.
        </p>
        <p className="muted">Reference: Bloom's taxonomy — each lesson moves from <em>remember</em> → <em>understand</em> → <em>apply</em>.</p>
      </section>

      {/* Section 3 — offline together */}
      <section className="card">
        <h2>Do it together — activities at home</h2>
        <p className="muted">Bridge the screen to the world. Each one takes 10 minutes.</p>
        <div className="offline-grid">
          {OFFLINE_ACTIVITIES.map(a => (
            <div key={a.zone} className="offline">
              <p className="o-zone">{a.zone}</p>
              <p className="o-title">{a.activity}</p>
              <p className="o-body">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4 — for teachers */}
      <section className="card">
        <h2>For teachers</h2>
        <p>Use Robot World as a homework or in-class assignment. Every zone maps to CBSE / ICSE topics:</p>
        <div className="align-table">
          <div className="th"><span>Zone</span><span>Grade</span><span>Topic</span></div>
          {CBSE_ALIGNMENT.map(r => (
            <div key={r.zone} className="tr">
              <span>{r.zone}</span><span>{r.grade}</span><span>{r.topic}</span>
            </div>
          ))}
        </div>
        <ul className="bul">
          <li>Assign Spark's Garden first — even 11-year-olds enjoy the analogies.</li>
          <li>Have students complete the boss challenge in pairs — discuss why the order matters.</li>
          <li>Use the "Robot Safari" offline activity as a homework follow-up.</li>
        </ul>
      </section>

      {/* Section 5 — safety & screen time */}
      <section className="card">
        <h2>Safety, privacy & screen time</h2>
        <ul className="bul">
          <li>Each lesson is 4–8 minutes — designed for healthy screen-time windows.</li>
          <li>Every zone encourages offline application through paired activities.</li>
          <li>No social features. No ads. No tracking pixels. No data collection beyond what stays on this device.</li>
          <li>Progress saves in your browser only — clearing browser data resets it.</li>
        </ul>
      </section>

      <style jsx>{`
        .parents { max-width: 820px; margin: 0 auto; padding: 16px; padding-bottom: 60px; }
        .head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 20px; }
        .head h1 { font-size: clamp(22px, 5vw, 30px); font-weight: 900; color: #fde047; }
        .back, .print {
          min-height: 48px; padding: 0 14px; line-height: 48px;
          border-radius: 12px; font-weight: 800;
          text-decoration: none; cursor: pointer; border: 2px solid #4c1d95;
          background: #1a1040; color: #fde68a;
        }
        .card {
          background: rgba(26,16,64,.7);
          border: 2px solid #4c1d95;
          border-radius: 22px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .card h2 { font-size: 20px; font-weight: 900; color: #fde047; margin-bottom: 8px; }
        .card p { color: #fde68a; font-weight: 700; font-size: 15px; line-height: 1.5; }
        .muted { color: #c4b5fd !important; font-weight: 600 !important; font-size: 14px !important; margin-top: 6px; }
        .bul { list-style: none; padding-left: 0; margin-top: 10px; }
        .bul li { background: rgba(15,10,30,.5); border-left: 3px solid #fbbf24; padding: 8px 12px; margin-bottom: 6px; border-radius: 8px; color: #fde68a; font-weight: 600; font-size: 14px; }
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
        @media (min-width: 640px) { .stat-grid { grid-template-columns: repeat(3, 1fr); } }
        .reset {
          margin-top: 12px;
          min-height: 44px; padding: 0 14px;
          background: transparent; color: #fda4af;
          border: 2px solid #ef4444;
          border-radius: 12px; font-weight: 800; cursor: pointer;
        }
        .offline-grid { display: grid; gap: 10px; margin-top: 10px; grid-template-columns: 1fr; }
        @media (min-width: 640px) { .offline-grid { grid-template-columns: 1fr 1fr; } }
        .offline { background: rgba(15,10,30,.4); border: 1px solid #4c1d95; border-radius: 14px; padding: 14px; }
        .o-zone { font-size: 11px; font-weight: 900; letter-spacing: 1.5px; color: #fbbf24; text-transform: uppercase; }
        .o-title { font-size: 16px; font-weight: 900; color: #fde047; margin-top: 4px; }
        .o-body { font-size: 13px; color: #fde68a; margin-top: 4px; font-weight: 600; }
        .align-table { margin-top: 10px; }
        .th, .tr {
          display: grid; grid-template-columns: 1fr 1fr 2fr;
          gap: 8px; padding: 8px 10px; font-size: 13px;
        }
        .th { color: #c4b5fd; font-weight: 900; border-bottom: 1px solid #4c1d95; }
        .tr { color: #fde68a; border-bottom: 1px solid rgba(76,29,149,.4); }
        @media print {
          .head .back, .head .print, .reset { display: none !important; }
          body { background: white !important; }
          .card { background: white !important; border-color: #ccc !important; color: black !important; }
          .card h2 { color: #b45309 !important; }
          .card p, .bul li, .offline, .o-body { color: #1a1040 !important; }
        }
      `}</style>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'rgba(15,10,30,.5)',
      border: '1px solid #4c1d95',
      borderRadius: 12,
      padding: '10px 12px',
    }}>
      <p style={{ fontSize: 11, color: '#c4b5fd', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</p>
      <p style={{ fontSize: 18, color: '#fde047', fontWeight: 900, marginTop: 2 }}>{value}</p>
    </div>
  )
}
