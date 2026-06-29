'use client';

import { Fragment, useState } from 'react';

const NODES = [
  { id: 'sense', label: 'SENSE', examples: ['Camera', 'LiDAR', 'IMU'] },
  { id: 'think', label: 'THINK', examples: ['Microcontroller', 'ROS', 'AI'] },
  { id: 'act', label: 'ACT', examples: ['Motors', 'Servos', 'Grippers'] },
] as const;

export function SenseThinkActVisual() {
  const [playing, setPlaying] = useState(true);

  const cycle = playing ? 'r2STA 3s linear infinite' : 'none';

  return (
    <div
      style={{
        background: '#0a0f1e',
        border: '1px solid var(--border-2)',
        borderRadius: 16,
        padding: 'clamp(20px, 3vw, 36px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes r2STA_sense { 0%,100%{opacity:.35;box-shadow:none} 0%,28%{opacity:1;box-shadow:0 0 24px #00B8D4} 33%,100%{opacity:.35;box-shadow:none} }
        @keyframes r2STA_think { 0%,32%{opacity:.35;box-shadow:none} 33%,61%{opacity:1;box-shadow:0 0 24px #00B8D4} 66%,100%{opacity:.35;box-shadow:none} }
        @keyframes r2STA_act { 0%,65%{opacity:.35;box-shadow:none} 66%,94%{opacity:1;box-shadow:0 0 24px #00B8D4} 99%,100%{opacity:.35;box-shadow:none} }
        @keyframes r2STA_dot1 { 0%,28%{left:0;opacity:0} 30%{opacity:1} 33%,100%{left:calc(100% - 8px);opacity:0} }
        @keyframes r2STA_dot2 { 0%,61%{left:0;opacity:0} 63%{opacity:1} 66%,100%{left:calc(100% - 8px);opacity:0} }
        @media (prefers-reduced-motion: reduce) {
          .r2sta-anim { animation-play-state: paused !important; }
        }
      `}</style>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 60px 1fr 60px 1fr',
          gap: 16,
          alignItems: 'center',
        }}
      >
        {NODES.map((n, i) => (
          <Fragment key={n.id}>
            <div
              className="r2sta-anim"
              style={{
                padding: '24px 16px',
                borderRadius: 12,
                border: '2px solid #00B8D4',
                background: 'rgba(0,184,212,.08)',
                textAlign: 'center',
                animation: playing
                  ? `r2STA_${n.id} 3s linear infinite`
                  : 'none',
                opacity: playing ? 0.35 : 1,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display), sans-serif',
                  fontSize: 'clamp(20px, 2.4vw, 28px)',
                  fontWeight: 700,
                  color: '#E8ECF1',
                  letterSpacing: '.05em',
                }}
              >
                {n.label}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 11,
                  color: '#94A3B8',
                  lineHeight: 1.6,
                }}
              >
                {n.examples.join(' · ')}
              </div>
            </div>
            {i < 2 && (
              <div
                style={{
                  position: 'relative',
                  height: 2,
                  background: 'linear-gradient(90deg, transparent, #00B8D4, transparent)',
                }}
              >
                <div
                  className="r2sta-anim"
                  style={{
                    position: 'absolute',
                    top: -3,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#00E5FF',
                    boxShadow: '0 0 10px #00E5FF',
                    animation: playing
                      ? `r2STA_dot${i + 1} 3s linear infinite`
                      : 'none',
                    opacity: 0,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: -4,
                    top: -7,
                    width: 0,
                    height: 0,
                    borderLeft: '8px solid #00B8D4',
                    borderTop: '8px solid transparent',
                    borderBottom: '8px solid transparent',
                  }}
                />
              </div>
            )}
          </Fragment>
        ))}
      </div>

      <div
        style={{
          marginTop: 24,
          textAlign: 'center',
          fontSize: 14,
          color: '#B0B8C5',
        }}
      >
        The fundamental loop all robots run — thousands of times per second.
      </div>

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={playing}
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            border: '1px solid var(--border-2)',
            background: 'rgba(0,184,212,.08)',
            color: 'var(--cyan)',
            fontSize: 13,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>
    </div>
  );
}
