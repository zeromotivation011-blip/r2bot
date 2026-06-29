'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PANEL_W = 300;
const PANEL_H = 320;
const GAP = 12;
const TOTAL_W = PANEL_W * 2 + GAP;
const ROBOT_R = 8;
const ROBOT_SPEED = 1.5;
const NUM_RAYS = 16;
const RAY_MAX = 120;
const POINT_FADE_MS = 3000;

type Wall = { x1: number; y1: number; x2: number; y2: number };

// Each panel is 300x320; coordinates are in panel-local space.
const WALLS: Wall[] = [
  // outer border (inset 4 so stroke is visible)
  { x1: 4, y1: 4, x2: PANEL_W - 4, y2: 4 },
  { x1: PANEL_W - 4, y1: 4, x2: PANEL_W - 4, y2: PANEL_H - 4 },
  { x1: PANEL_W - 4, y1: PANEL_H - 4, x2: 4, y2: PANEL_H - 4 },
  { x1: 4, y1: PANEL_H - 4, x2: 4, y2: 4 },
  // Inner wall 1: horizontal (80,120) → (180,120)
  { x1: 80, y1: 120, x2: 180, y2: 120 },
  // Inner wall 2: vertical (220,80) → (220,200)
  { x1: 220, y1: 80, x2: 220, y2: 200 },
  // Inner wall 3: L-shape (60,240)→(140,240)→(140,280)
  { x1: 60, y1: 240, x2: 140, y2: 240 },
  { x1: 140, y1: 240, x2: 140, y2: 280 },
  // Inner wall 4: box (200,200) to (260,260)
  { x1: 200, y1: 200, x2: 260, y2: 200 },
  { x1: 260, y1: 200, x2: 260, y2: 260 },
  { x1: 260, y1: 260, x2: 200, y2: 260 },
  { x1: 200, y1: 260, x2: 200, y2: 200 },
];

function raySegment(ox: number, oy: number, dx: number, dy: number, w: Wall): number | null {
  const x3 = w.x1,
    y3 = w.y1,
    x4 = w.x2,
    y4 = w.y2;
  const denom = (x4 - x3) * dy - (y4 - y3) * dx;
  if (Math.abs(denom) < 0.0001) return null;
  const t = ((x3 - ox) * dy - (y3 - oy) * dx) / denom;
  const u = -((ox - x3) * (y4 - y3) - (oy - y3) * (x4 - x3)) / denom;
  if (t >= 0 && t <= 1 && u >= 0) return u;
  return null;
}

function cast(ox: number, oy: number, angle: number, maxRange: number): { hit: boolean; dist: number; x: number; y: number } {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let minDist = maxRange;
  for (const w of WALLS) {
    const d = raySegment(ox, oy, dx, dy, w);
    if (d !== null && d > 0 && d < minDist) minDist = d;
  }
  const hit = minDist < maxRange;
  return { hit, dist: minDist, x: ox + dx * minDist, y: oy + dy * minDist };
}

type Robot = { x: number; y: number; heading: number };

// crude per-frame point key — quantize to 4px so points stabilize
const QUANT = 4;
function pkey(x: number, y: number) {
  return `${Math.round(x / QUANT) * QUANT},${Math.round(y / QUANT) * QUANT}`;
}

export function SLAMVisual() {
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [, force] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(performance.now());

  const stateRef = useRef({
    robot: { x: 50, y: 160, heading: 0 } as Robot,
    rays: [] as { x: number; y: number; hit: boolean }[],
    points: new Map<string, { x: number; y: number; bornAt: number }>(),
    path: [] as { x: number; y: number }[],
    flashes: [] as { x: number; y: number; at: number }[],
    expectedPoints: 0,
  });

  // estimate expected points (total wall length / QUANT) for coverage
  useEffect(() => {
    const total = WALLS.reduce((acc, w) => acc + Math.hypot(w.x2 - w.x1, w.y2 - w.y1), 0);
    stateRef.current.expectedPoints = total / QUANT;
  }, []);

  const reset = useCallback(() => {
    stateRef.current.robot = { x: 50, y: 160, heading: 0 };
    stateRef.current.rays = [];
    stateRef.current.points = new Map();
    stateRef.current.path = [];
    stateRef.current.flashes = [];
    force((v) => v + 1);
  }, []);

  useEffect(() => {
    const tick = (now: number) => {
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      if (running) {
        const steps = Math.max(1, Math.round((dt / (1000 / 60)) * speed));
        const s = stateRef.current;
        for (let i = 0; i < steps; i++) {
          // wall-follow: forward ray
          const fwd = cast(s.robot.x, s.robot.y, s.robot.heading, 80);
          if (fwd.dist > 30) {
            s.robot.x += Math.cos(s.robot.heading) * ROBOT_SPEED;
            s.robot.y += Math.sin(s.robot.heading) * ROBOT_SPEED;
            // wall-following: peek right
            const right = cast(s.robot.x, s.robot.y, s.robot.heading + Math.PI / 2, 90);
            if (right.dist > 60) {
              s.robot.heading += 0.04;
            }
          } else {
            s.robot.heading += (15 * Math.PI) / 180;
          }
          if (s.robot.heading > Math.PI * 2) s.robot.heading -= Math.PI * 2;
          if (s.robot.heading < 0) s.robot.heading += Math.PI * 2;
          s.path.push({ x: s.robot.x, y: s.robot.y });
          if (s.path.length > 500) s.path.shift();
        }

        // cast 16 rays
        const rays: { x: number; y: number; hit: boolean }[] = [];
        for (let i = 0; i < NUM_RAYS; i++) {
          const a = (i / NUM_RAYS) * Math.PI * 2;
          const r = cast(s.robot.x, s.robot.y, a, RAY_MAX);
          rays.push({ x: r.x, y: r.y, hit: r.hit });
          if (r.hit) {
            const k = pkey(r.x, r.y);
            if (!s.points.has(k)) {
              s.points.set(k, { x: r.x, y: r.y, bornAt: now });
            }
            s.flashes.push({ x: r.x, y: r.y, at: now });
          }
        }
        s.rays = rays;
        s.flashes = s.flashes.filter((f) => now - f.at < 200);
        force((v) => v + 1);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [running, speed]);

  const s = stateRef.current;
  const coverage = Math.min(100, Math.round((s.points.size / Math.max(1, s.expectedPoints)) * 100));
  const now = performance.now();

  return (
    <div
      style={{
        background: '#0a0f1e',
        border: '1px solid var(--border-2)',
        borderRadius: 16,
        padding: 'clamp(20px, 3vw, 36px)',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${TOTAL_W} ${PANEL_H}`}
          width="100%"
          style={{
            maxWidth: TOTAL_W,
            display: 'block',
            margin: '0 auto',
            background: '#020617',
            borderRadius: 12,
          }}
          aria-label="SLAM — true world vs robot's map"
        >
          {/* LEFT panel: true world (dim) */}
          <g>
            <rect x={0} y={0} width={PANEL_W} height={PANEL_H} fill="#050f1e" />
            <text x={10} y={20} fill="#475569" fontSize={10} fontFamily="JetBrains Mono, monospace" letterSpacing={1.5}>
              TRUE WORLD
            </text>
            {WALLS.map((w, i) => (
              <line key={i} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke="#334155" strokeWidth={2} />
            ))}

            {/* LiDAR rays */}
            {s.rays.map((ray, i) => (
              <line key={`tray-${i}`} x1={s.robot.x} y1={s.robot.y} x2={ray.x} y2={ray.y} stroke="#00B8D4" strokeWidth={0.5} opacity={0.2} />
            ))}

            {/* Flashing hit points */}
            {s.flashes.map((f, i) => (
              <circle key={`f-${i}`} cx={f.x} cy={f.y} r={2} fill="none" stroke="#00B8D4" strokeWidth={2} />
            ))}

            {/* Robot */}
            <circle cx={s.robot.x} cy={s.robot.y} r={ROBOT_R} fill="#00B8D4" style={{ filter: 'drop-shadow(0 0 6px rgba(0,184,212,.7))' }} />
            <line
              x1={s.robot.x}
              y1={s.robot.y}
              x2={s.robot.x + Math.cos(s.robot.heading) * 14}
              y2={s.robot.y + Math.sin(s.robot.heading) * 14}
              stroke="#ffffff"
              strokeWidth={2}
            />
          </g>

          {/* Divider */}
          <line x1={PANEL_W + GAP / 2} y1={0} x2={PANEL_W + GAP / 2} y2={PANEL_H} stroke="#1e293b" strokeWidth={2} />

          {/* RIGHT panel: robot's map */}
          <g transform={`translate(${PANEL_W + GAP}, 0)`}>
            <rect x={0} y={0} width={PANEL_W} height={PANEL_H} fill="#000000" />
            <text x={10} y={20} fill="#00B8D4" fontSize={10} fontFamily="JetBrains Mono, monospace" letterSpacing={1.5}>
              ROBOT'S MAP
            </text>
            <text x={PANEL_W - 10} y={20} textAnchor="end" fill="#94A3B8" fontSize={10} fontFamily="JetBrains Mono, monospace">
              Map: {coverage}% discovered
            </text>

            {/* Robot path (last 200) */}
            {s.path.length > 1 && (
              <polyline
                points={s.path.slice(-200).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                stroke="#ffffff"
                strokeWidth={0.8}
                opacity={0.3}
                fill="none"
              />
            )}

            {/* Discovered wall points */}
            {Array.from(s.points.values()).map((p, i) => {
              const age = now - p.bornAt;
              const fresh = age < POINT_FADE_MS;
              const op = fresh ? 1 : 0.6;
              const color = fresh ? '#00E5FF' : '#0e7a91';
              return <circle key={i} cx={p.x} cy={p.y} r={1.5} fill={color} opacity={op} />;
            })}

            {/* Robot on map */}
            <circle cx={s.robot.x} cy={s.robot.y} r={6} fill="#ffffff" />
            <line
              x1={s.robot.x}
              y1={s.robot.y}
              x2={s.robot.x + Math.cos(s.robot.heading) * 12}
              y2={s.robot.y + Math.sin(s.robot.heading) * 12}
              stroke="#00B8D4"
              strokeWidth={2}
            />

            {/* Coverage banners */}
            {coverage >= 90 ? (
              <g>
                <rect x={20} y={PANEL_H / 2 - 18} width={PANEL_W - 40} height={36} fill="rgba(34,197,94,.18)" stroke="#22c55e" strokeWidth={1.5} rx={8} />
                <text x={PANEL_W / 2} y={PANEL_H / 2 + 5} textAnchor="middle" fill="#22c55e" fontSize={13} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
                  Map complete! ✓
                </text>
              </g>
            ) : coverage >= 75 ? (
              <g>
                <rect x={20} y={PANEL_H / 2 - 18} width={PANEL_W - 40} height={36} fill="rgba(34,197,94,.15)" stroke="#22c55e" strokeWidth={1.5} rx={8} />
                <text x={PANEL_W / 2} y={PANEL_H / 2 + 5} textAnchor="middle" fill="#22c55e" fontSize={12} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
                  Great coverage! This is SLAM.
                </text>
              </g>
            ) : null}
          </g>
        </svg>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16, alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={() => setRunning((p) => !p)}
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            border: '1px solid var(--border-2)',
            background: 'rgba(0,184,212,.08)',
            color: 'var(--cyan)',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {running ? '⏸ Pause' : '▶ Start'}
        </button>
        <button
          onClick={reset}
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            border: '1px solid var(--border-2)',
            background: 'transparent',
            color: '#C8D0DC',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ↺ Reset
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94A3B8' }}>
          Speed:
          {([1, 2, 4] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid ' + (speed === s ? 'var(--cyan)' : 'var(--border-2)'),
                background: speed === s ? 'rgba(0,184,212,.2)' : 'rgba(11,37,64,.5)',
                color: speed === s ? 'var(--cyan-bright)' : '#C8D0DC',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4, fontFamily: 'var(--font-mono), monospace' }}>
          Coverage: <span style={{ color: 'var(--cyan-bright)' }}>{coverage}%</span>
        </div>
        <div style={{ height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
          <div
            style={{
              width: `${coverage}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #00B8D4, #00E5FF)',
              transition: 'width 0.2s',
            }}
          />
        </div>
      </div>

      <p style={{ marginTop: 18, fontSize: 14, color: '#A8B0BC', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--mist)' }}>SLAM</strong> — Simultaneous Localization and Mapping. The robot explores an unknown environment, building a map while tracking its own position within that map. Used in warehouse robots, drones, and self-driving cars.
      </p>
      <a
        href="/atlas/concept/slam"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-block', marginTop: 6, color: 'var(--cyan-bright)', fontSize: 13.5, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
      >
        Read: SLAM →
      </a>
    </div>
  );
}
