'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const W = 600;
const H = 280;
const MAX_POINTS = 300;
const DURATION_MS = 8000; // one full pass
const GPS_INTERVAL_FRAMES = 60;

type Pt = { x: number; y: number };

function trueY(t: number) {
  // t in [0, 2π] over 8 seconds
  return 140 + 70 * Math.sin(t * 1.2);
}

export function SensorFusionVisual() {
  const [gpsNoise, setGpsNoise] = useState(30);
  const [imuDrift, setImuDrift] = useState(0.4);
  const [playing, setPlaying] = useState(true);
  const [, force] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(performance.now());

  const stateRef = useRef({
    frame: 0,
    truePts: [] as Pt[],
    gpsPts: [] as Pt[],
    imuPts: [] as Pt[],
    fusedPts: [] as Pt[],
    imuDriftX: 0,
    imuDriftY: 0,
    lastGpsX: 0,
    lastGpsY: 0,
    framesSinceGps: GPS_INTERVAL_FRAMES,
    fusedX: 0,
    fusedY: 140,
  });

  const reset = useCallback(() => {
    stateRef.current = {
      frame: 0,
      truePts: [],
      gpsPts: [],
      imuPts: [],
      fusedPts: [],
      imuDriftX: 0,
      imuDriftY: 0,
      lastGpsX: 0,
      lastGpsY: 140,
      framesSinceGps: GPS_INTERVAL_FRAMES,
      fusedX: 0,
      fusedY: 140,
    };
    startRef.current = performance.now();
    force((x) => x + 1);
  }, []);

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      if (playing) {
        const dt = now - last;
        last = now;
        // advance by ~ one frame at 60fps; if dt is bigger, advance multiple frames
        const framesToStep = Math.max(1, Math.round(dt / (1000 / 60)));
        const s = stateRef.current;
        for (let i = 0; i < framesToStep; i++) {
          // time in 0..2π over 8s, x in 0..W
          const elapsed = (s.frame * (1000 / 60)) % DURATION_MS;
          const t = (elapsed / DURATION_MS) * Math.PI * 2;
          const x = (elapsed / DURATION_MS) * W;
          const y = trueY(t);
          s.truePts.push({ x, y });
          if (s.truePts.length > MAX_POINTS) s.truePts.shift();

          // wrap reset on loop
          if (s.frame > 0 && elapsed < 17 /* one frame */) {
            s.truePts = [{ x, y }];
            s.gpsPts = [];
            s.imuPts = [];
            s.fusedPts = [];
            s.imuDriftX = 0;
            s.imuDriftY = 0;
            s.framesSinceGps = GPS_INTERVAL_FRAMES;
            s.lastGpsX = x;
            s.lastGpsY = y;
            s.fusedX = x;
            s.fusedY = y;
          }

          // IMU: cumulative drift each frame
          s.imuDriftX += (Math.random() - 0.5) * 2 * imuDrift;
          s.imuDriftY += (Math.random() - 0.5) * 2 * imuDrift;
          const imuX = x + s.imuDriftX;
          const imuY = y + s.imuDriftY;
          s.imuPts.push({ x: imuX, y: imuY });
          if (s.imuPts.length > MAX_POINTS) s.imuPts.shift();

          // GPS: update every 60 frames
          s.framesSinceGps++;
          let gpsUpdated = false;
          if (s.framesSinceGps >= GPS_INTERVAL_FRAMES) {
            s.lastGpsX = x + (Math.random() - 0.5) * 2 * gpsNoise;
            s.lastGpsY = y + (Math.random() - 0.5) * 2 * gpsNoise;
            s.framesSinceGps = 0;
            gpsUpdated = true;
          }
          s.gpsPts.push({ x: s.lastGpsX, y: s.lastGpsY });
          if (s.gpsPts.length > MAX_POINTS) s.gpsPts.shift();

          // Fused (complementary filter)
          if (gpsUpdated) {
            s.fusedX = 0.7 * s.fusedX + 0.3 * s.lastGpsX;
            s.fusedY = 0.7 * s.fusedY + 0.3 * s.lastGpsY;
          } else {
            // follow IMU movement but dampened — track the delta of imu
            if (s.imuPts.length >= 2) {
              const prev = s.imuPts[s.imuPts.length - 2];
              const dx = imuX - prev.x;
              const dy = imuY - prev.y;
              s.fusedX += dx * 0.85;
              s.fusedY += dy * 0.85;
            }
          }
          s.fusedPts.push({ x: s.fusedX, y: s.fusedY });
          if (s.fusedPts.length > MAX_POINTS) s.fusedPts.shift();

          s.frame++;
        }
        force((v) => v + 1);
      } else {
        last = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, gpsNoise, imuDrift]);

  const poly = (pts: Pt[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const s = stateRef.current;
  const last = s.truePts[s.truePts.length - 1];

  return (
    <div
      style={{
        background: '#0a0f1e',
        border: '1px solid var(--border-2)',
        borderRadius: 16,
        padding: 'clamp(20px, 3vw, 36px)',
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: W, display: 'block', margin: '0 auto', background: 'rgba(11,37,64,.4)', borderRadius: 12 }}
        aria-label="Sensor fusion — GPS, IMU, true, fused"
      >
        {/* horizontal grid */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="rgba(148,163,184,.07)" strokeWidth={1} />
        ))}

        {/* True */}
        {s.truePts.length > 1 && <polyline points={poly(s.truePts)} stroke="#ffffff" strokeWidth={1.5} fill="none" opacity={0.4} />}
        {/* GPS */}
        {s.gpsPts.length > 1 && <polyline points={poly(s.gpsPts)} stroke="#ef4444" strokeWidth={1.5} fill="none" />}
        {/* IMU */}
        {s.imuPts.length > 1 && <polyline points={poly(s.imuPts)} stroke="#f59e0b" strokeWidth={1.5} fill="none" />}
        {/* Fused */}
        {s.fusedPts.length > 1 && (
          <polyline
            points={poly(s.fusedPts)}
            stroke="#00B8D4"
            strokeWidth={2.5}
            fill="none"
            style={{ filter: 'drop-shadow(0 0 4px rgba(0,184,212,.55))' }}
          />
        )}

        {/* moving robot */}
        {last && <circle cx={last.x} cy={last.y} r={6} fill="#ffffff" stroke="#00B8D4" strokeWidth={1.5} />}
      </svg>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          marginTop: 12,
          justifyContent: 'center',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 12,
        }}
      >
        {[
          { label: 'True path', color: '#ffffff' },
          { label: 'GPS only', color: '#ef4444' },
          { label: 'IMU only', color: '#f59e0b' },
          { label: 'Fused (Kalman)', color: '#00B8D4' },
        ].map((l) => (
          <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#C8D0DC' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
            {l.label}
          </span>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 18,
          marginTop: 20,
        }}
      >
        <label style={{ fontSize: 13, color: '#C8D0DC' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span>GPS Noise</span>
            <span style={{ color: 'var(--cyan-bright)', fontFamily: 'var(--font-mono), monospace' }}>±{gpsNoise}px</span>
          </div>
          <input
            type="range"
            min={10}
            max={60}
            step={1}
            value={gpsNoise}
            onChange={(e) => setGpsNoise(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#ef4444' }}
          />
        </label>
        <label style={{ fontSize: 13, color: '#C8D0DC' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span>IMU Drift</span>
            <span style={{ color: 'var(--cyan-bright)', fontFamily: 'var(--font-mono), monospace' }}>{imuDrift.toFixed(2)}px/frame</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1.5}
            step={0.05}
            value={imuDrift}
            onChange={(e) => setImuDrift(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#f59e0b' }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14 }}>
        <button
          onClick={() => setPlaying((p) => !p)}
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
          {playing ? '⏸ Pause' : '▶ Play'}
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
      </div>

      <p style={{ marginTop: 18, fontSize: 14, color: '#A8B0BC', lineHeight: 1.55 }}>
        GPS is accurate but noisy. IMU is smooth but drifts.{' '}
        <strong style={{ color: 'var(--mist)' }}>Sensor fusion (Kalman Filter)</strong> combines both — getting smooth, accurate positioning. Every autonomous vehicle and drone does this 100+ times per second.
      </p>
      <a
        href="/atlas/concept/sensor-fusion"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-block', marginTop: 6, color: 'var(--cyan-bright)', fontSize: 13.5, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
      >
        Read: Sensor Fusion →
      </a>
    </div>
  );
}
