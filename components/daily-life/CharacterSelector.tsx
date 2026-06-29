'use client'

// components/daily-life/CharacterSelector.tsx
// Visual Indian-character profile cards for "Whose day should we follow?"

import type { ProfileId } from '@/lib/daily-life-data'

interface CharacterCard {
  id: ProfileId | 'everyone'
  name: string        // Indian first name
  role: string
  emoji: string
  color: string
}

const CHARACTERS: CharacterCard[] = [
  { id: 'student',         name: 'Priya',    role: 'Student',        emoji: '👩‍🎓', color: '#6366f1' },
  { id: 'farmer',          name: 'Arjun',    role: 'Farmer',         emoji: '👨‍🌾', color: '#16a34a' },
  { id: 'doctor-nurse',    name: 'Dr. Meera', role: 'Doctor',         emoji: '👩‍⚕️', color: '#0891b2' },
  { id: 'factory-worker',  name: 'Rajesh',   role: 'Factory Worker', emoji: '🏭',  color: '#f97316' },
  { id: 'homemaker',       name: 'Anita',    role: 'Homemaker',      emoji: '🏠',  color: '#a855f7' },
  { id: 'driver',          name: 'Karan',    role: 'Driver',         emoji: '🚗',  color: '#ef4444' },
  { id: 'office-worker',   name: 'Deepa',    role: 'Office Worker',  emoji: '💼',  color: '#0ea5e9' },
  { id: 'engineer',        name: 'Vikram',   role: 'Engineer',       emoji: '🏗️', color: '#fbbf24' },
]

export function CharacterSelector({
  selected,
  onSelect,
  robotCounts,
}: {
  selected: ProfileId | 'everyone' | null
  onSelect: (id: ProfileId | 'everyone') => void
  robotCounts: Partial<Record<ProfileId | 'everyone', number>>
}) {
  const selectedChar = CHARACTERS.find(c => c.id === selected)

  return (
    <section className="cs">
      <h2 className="cs-h2">🤖 Whose day should we follow?</h2>
      <p className="cs-sub">
        Each person&apos;s day is secretly full of robots. <span aria-hidden>🤫</span>
      </p>
      <div className="cs-grid">
        {CHARACTERS.map(c => {
          const count = robotCounts[c.id]
          const isSel = c.id === selected
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={`cs-card ${isSel ? 'is-selected' : ''}`}
              style={{
                ['--char' as keyof React.CSSProperties as string]: c.color,
              }}
              aria-pressed={isSel}
            >
              <span className="cs-emoji" aria-hidden>{c.emoji}</span>
              <span className="cs-name">{c.name}</span>
              <span className="cs-role">{c.role}</span>
              {typeof count === 'number' && (
                <span className="cs-count">{count} robots</span>
              )}
            </button>
          )
        })}
      </div>
      {selectedChar && (
        <p className="cs-callout">
          Following <strong>{selectedChar.name}</strong>&apos;s day
          {typeof robotCounts[selectedChar.id] === 'number' && (
            <> — <strong>{robotCounts[selectedChar.id]}</strong> robots help her today</>
          )}.
        </p>
      )}
      <style jsx>{`
        .cs { padding: 30px 16px; text-align: center; }
        .cs-h2 {
          font-size: clamp(22px, 3.5vw, 32px);
          font-weight: 900; color: #fde047;
          margin: 0 0 8px;
        }
        .cs-sub { color: #c4b5fd; margin: 0 0 22px; font-size: 15px; }
        .cs-grid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          max-width: 720px; margin: 0 auto;
        }
        @media (min-width: 540px) {
          .cs-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        .cs-card {
          background: rgba(15, 18, 32, 0.7);
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 14px 8px 10px;
          color: #f4f4f5;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          cursor: pointer;
          transition: transform .15s, border-color .15s, background .15s;
        }
        .cs-card:hover {
          transform: translateY(-3px);
          border-color: var(--char);
          background: rgba(15, 18, 32, 0.9);
        }
        .cs-card.is-selected {
          border-color: var(--char);
          box-shadow: 0 0 22px var(--char), inset 0 0 0 1px var(--char);
          background: linear-gradient(135deg, color-mix(in srgb, var(--char) 22%, transparent), rgba(15,18,32,0.85));
        }
        .cs-emoji { font-size: 38px; line-height: 1; }
        .cs-name {
          font-weight: 900; color: #fff; font-size: 15px;
        }
        .cs-role { font-size: 12px; color: #c4b5fd; }
        .cs-count {
          margin-top: 4px;
          font-size: 11px; color: var(--char);
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .cs-callout {
          margin-top: 18px;
          font-size: 15px; color: #fde68a;
        }
        .cs-callout strong { color: #fde047; }
      `}</style>
    </section>
  )
}

export { CHARACTERS }
export type { CharacterCard }
