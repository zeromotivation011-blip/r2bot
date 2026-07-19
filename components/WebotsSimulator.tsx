'use client';

import { useEffect, useState } from 'react';

type SimKey = 'wire' | 'forge' | 'edge';

type Sim = {
  key: SimKey;
  label: string;
  trackTitle: string;
  description: string;
  url: string;
  color: string;
};

const SIMS: Sim[] = [
  {
    key: 'wire',
    label: 'TurtleBot3',
    trackTitle: 'Wire',
    description: 'Control a TurtleBot3 navigating a maze',
    url: 'https://webots.cloud/run?url=webots://github.com/cyberbotics/webots/blob/released/projects/robots/robotis/turtlebot3/worlds/turtlebot3_burger.wbt',
    color: '#A56BFF',
  },
  {
    key: 'forge',
    label: 'Robot Arm',
    trackTitle: 'Forge',
    description: 'Program a UR5e arm to pick and place objects',
    url: 'https://webots.cloud/run?url=webots://github.com/cyberbotics/webots/blob/released/projects/robots/universal_robots/worlds/ur5e_articulated.wbt',
    color: '#00E5FF',
  },
  {
    key: 'edge',
    label: 'DJI Drone',
    trackTitle: 'Edge',
    description: 'Fly a DJI Mavic drone through waypoints',
    url: 'https://webots.cloud/run?url=webots://github.com/cyberbotics/webots/blob/released/projects/robots/dji/worlds/mavic_2_pro.wbt',
    color: '#FFB800',
  },
];

export function WebotsSimulator() {
  const [active, setActive] = useState<SimKey>('wire');
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const sim = SIMS.find((s) => s.key === active)!;

  // Treat as failed if onLoad doesn't fire within 8s
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    const t = setTimeout(() => {
      setLoaded((l) => {
        if (!l) setFailed(true);
        return l;
      });
    }, 8000);
    return () => clearTimeout(t);
  }, [active, reloadKey]);

  return (
    <div
      style={{
        background: '#0a0f1e',
        border: '1px solid var(--border-2)',
        borderRadius: 16,
        padding: 'clamp(16px, 2.5vw, 28px)',
      }}
    >
      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {SIMS.map((s) => {
          const isActive = s.key === active;
          return (
            <button
              key={s.key}
              onClick={() => {
                setActive(s.key);
                setReloadKey((k) => k + 1);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: `1px solid ${isActive ? s.color : 'var(--border-2)'}`,
                background: isActive ? `${s.color}22` : 'rgba(11,37,64,.5)',
                color: isActive ? s.color : '#C8D0DC',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <strong style={{ marginRight: 6, opacity: 0.85 }}>{s.trackTitle}:</strong>
              {s.label}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 13.5, color: '#94A3B8', margin: '0 0 14px' }}>
        <strong style={{ color: 'var(--mist)' }}>{sim.trackTitle} · {sim.label}</strong> — {sim.description}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 14, alignItems: 'start' }}>
        <div>
          {failed ? (
            <Fallback sim={sim} />
          ) : (
            <iframe
              key={reloadKey + active}
              src={sim.url}
              title={`${sim.label} simulation`}
              width="100%"
              height={550}
              style={{ border: 'none', borderRadius: 8, background: '#000', display: 'block' }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          )}
        </div>

        {/* Controls guide */}
        <aside
          style={{
            padding: 14,
            borderRadius: 10,
            background: '#0A0E17',
            border: '1px solid var(--border-2)',
            fontSize: 12.5,
            color: '#C8D0DC',
            fontFamily: 'var(--font-mono), monospace',
          }}
        >
          <div style={{ color: '#94A3B8', fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>
            Controls
          </div>
          <Row k="W A S D" v="Move robot" />
          <Row k="Mouse" v="Rotate camera" />
          <Row k="Space" v="Emergency stop" />
          <Row k="R" v="Reset simulation" />

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #1e293b', fontSize: 11, color: '#64748b', lineHeight: 1.55 }}>
            Loads from webots.cloud. First boot can take 30–60 seconds while the WebGL scene initialises.
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
      <span style={{ color: 'var(--cyan-bright)' }}>{k}</span>
      <span style={{ color: '#94A3B8', fontSize: 11.5 }}>{v}</span>
    </div>
  );
}

function Fallback({ sim }: { sim: Sim }) {
  return (
    <div
      style={{
        height: 550,
        borderRadius: 8,
        background: 'linear-gradient(135deg, #0A0E17, #0a1a2e)',
        border: '1px solid var(--border-2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 30,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Robot silhouette */}
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ opacity: 0.35, marginBottom: 16 }}>
        <rect x={30} y={40} width={60} height={50} rx={8} fill="none" stroke={sim.color} strokeWidth={2} />
        <circle cx={45} cy={55} r={4} fill={sim.color} />
        <circle cx={75} cy={55} r={4} fill={sim.color} />
        <line x1={50} y1={75} x2={70} y2={75} stroke={sim.color} strokeWidth={2} />
        <circle cx={40} cy={95} r={8} fill="none" stroke={sim.color} strokeWidth={2} />
        <circle cx={80} cy={95} r={8} fill="none" stroke={sim.color} strokeWidth={2} />
        <line x1={20} y1={40} x2={30} y2={50} stroke={sim.color} strokeWidth={2} />
        <line x1={100} y1={40} x2={90} y2={50} stroke={sim.color} strokeWidth={2} />
      </svg>

      <h3 style={{ fontSize: 19, color: 'var(--mist)', margin: '0 0 8px' }}>Webots simulation requires direct access</h3>
      <p style={{ fontSize: 14, color: '#94A3B8', maxWidth: 480, marginBottom: 18, lineHeight: 1.55 }}>
        webots.cloud doesn't allow embedding in some browsers due to cross-origin frame restrictions.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <a
          href={sim.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: `1px solid ${sim.color}`,
            background: `${sim.color}33`,
            color: sim.color,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Open in Webots Cloud →
        </a>
        <a
          href="/visualizer"
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: '1px solid var(--border-2)',
            background: 'rgba(11,37,64,.6)',
            color: '#C8D0DC',
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          Try our browser simulations →
        </a>
      </div>
      <p style={{ marginTop: 18, fontSize: 11.5, color: '#64748b' }}>
        Don't have Webots? Our browser sims work without any installation.
      </p>
    </div>
  );
}
