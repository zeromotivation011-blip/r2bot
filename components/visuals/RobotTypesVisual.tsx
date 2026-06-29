'use client';

import { useState } from 'react';

type Card = {
  emoji: string;
  name: string;
  use: string;
  examples: string;
  tech: string;
  href: string;
};

const CARDS: Card[] = [
  {
    emoji: '🦾',
    name: 'Industrial Arm',
    use: 'Welding, assembly, painting',
    examples: 'FANUC, KUKA',
    tech: 'Inverse kinematics, repeatability ±0.01 mm',
    href: '/atlas/concept/industrial-robot',
  },
  {
    emoji: '🚗',
    name: 'Mobile Robot',
    use: 'Warehouses, delivery, exploration',
    examples: 'Amazon Kiva, Boston Dynamics Spot',
    tech: 'SLAM, path planning, obstacle avoidance',
    href: '/atlas/concept/mobile-robot',
  },
  {
    emoji: '✈️',
    name: 'Drone / UAV',
    use: 'Aerial survey, delivery, inspection',
    examples: 'DJI, Zipline',
    tech: 'IMU, GPS fusion, PID altitude control',
    href: '/atlas/concept/drone-uav',
  },
  {
    emoji: '🤝',
    name: 'Collaborative Robot (Cobot)',
    use: 'Human-robot collaboration, SMEs',
    examples: 'Universal Robots UR5, Franka',
    tech: 'Force sensing, safe stop, easy programming',
    href: '/atlas/concept/collaborative-robot',
  },
  {
    emoji: '🏥',
    name: 'Surgical Robot',
    use: 'Minimally invasive surgery',
    examples: 'Da Vinci, CMR Versius',
    tech: 'Tremor cancellation, haptic feedback, stereo vision',
    href: '/atlas/concept/surgical-robot',
  },
  {
    emoji: '🚙',
    name: 'Autonomous Vehicle',
    use: 'Self-driving cars, mine trucks',
    examples: 'Waymo, Caterpillar autonomous haul',
    tech: 'Sensor fusion, HD maps, behavior prediction',
    href: '/atlas/concept/autonomous-vehicle',
  },
];

export function RobotTypesVisual() {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16,
      }}
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .r2-flip-inner { transition: none !important; }
        }
      `}</style>
      {CARDS.map((c, i) => {
        const isFlipped = flipped.has(i);
        return (
          <div
            key={c.name}
            onClick={() => toggle(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle(i);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Robot type: ${c.name}. Click to ${isFlipped ? 'hide' : 'see'} details.`}
            style={{
              perspective: 1200,
              cursor: 'pointer',
              minHeight: 220,
            }}
          >
            <div
              className="r2-flip-inner"
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: 220,
                transformStyle: 'preserve-3d',
                transition: 'transform 0.4s cubic-bezier(.22,.61,.36,1)',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                  borderRadius: 14,
                  border: '1px solid var(--border)',
                  background:
                    'linear-gradient(135deg, rgba(0,184,212,.10), rgba(11,37,64,.5))',
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 44 }} aria-hidden="true">
                  {c.emoji}
                </div>
                <div
                  className="display"
                  style={{
                    fontFamily: 'var(--font-display), sans-serif',
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--mist)',
                  }}
                >
                  {c.name}
                </div>
                <div style={{ fontSize: 14, color: '#B0B8C5', lineHeight: 1.5 }}>{c.use}</div>
                <div
                  style={{
                    marginTop: 'auto',
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: 11,
                    letterSpacing: '.15em',
                    textTransform: 'uppercase',
                    color: 'var(--cyan)',
                  }}
                >
                  Tap to flip →
                </div>
              </div>

              {/* Back */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  borderRadius: 14,
                  border: '1px solid var(--border-2)',
                  background:
                    'linear-gradient(135deg, rgba(0,229,255,.08), rgba(11,37,64,.6))',
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: 11,
                    letterSpacing: '.2em',
                    color: 'var(--cyan)',
                    textTransform: 'uppercase',
                  }}
                >
                  Key tech
                </div>
                <div style={{ fontSize: 14, color: 'var(--mist)', lineHeight: 1.5 }}>{c.tech}</div>
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: 11,
                    letterSpacing: '.2em',
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Examples
                </div>
                <div style={{ fontSize: 13.5, color: '#C8D0DC' }}>{c.examples}</div>
                <a
                  href={c.href}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    marginTop: 'auto',
                    color: 'var(--cyan-bright)',
                    fontSize: 13,
                    textDecoration: 'underline',
                    textDecorationStyle: 'dotted',
                    textUnderlineOffset: 3,
                  }}
                >
                  Read in the Atlas →
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
