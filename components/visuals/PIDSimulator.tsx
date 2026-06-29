'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const WIDTH = 600;
const HEIGHT = 220;
const HISTORY = 100;
const TARGET = 0;     // target position in plant-space (centred)
const START = -1;     // robot starts 1 unit below target
const DT = 0.05;      // 50ms step → simulation runs at 20 Hz in model time, rendered at ~30fps

type SliderConfig = { key: 'P' | 'I' | 'D'; label: string; min: number; max: number; step: number; def: number };

const SLIDERS: SliderConfig[] = [
  { key: 'P', label: 'P (Proportional)', min: 0, max: 10, step: 0.1, def: 2 },
  { key: 'I', label: 'I (Integral)', min: 0, max: 2, step: 0.02, def: 0.1 },
  { key: 'D', label: 'D (Derivative)', min: 0, max: 5, step: 0.1, def: 1 },
];

type Gains = { P: number; I: number; D: number };

function describeBehaviour(g: Gains): { tone: 'warn' | 'ok' | 'neutral'; text: string } {
  if (g.P > 7) return { tone: 'warn', text: '⚠️ Too aggressive — robot overshoots the target' };
  if (g.D < 0.5 && g.P > 1) return { tone: 'warn', text: '⚠️ No damping — robot oscillates' };
  if (g.P < 0.6 && g.D < 1) return { tone: 'neutral', text: 'Slow and lazy — try raising P' };
  if (g.P >= 1 && g.P <= 4 && g.D >= 0.5 && g.D <= 3) {
    return { tone: 'ok', text: '✅ Smooth convergence — this is what real engineers tune for' };
  }
  return { tone: 'neutral', text: 'Watch the curve — what is the controller doing here?' };
}

export function PIDSimulator() {
  const [gains, setGains] = useState<Gains>({ P: 2, I: 0.1, D: 1 });
  const [history, setHistory] = useState<number[]>([]);
  const requestRef = useRef<number | null>(null);
  const stateRef = useRef({
    pos: START,
    vel: 0,
    integral: 0,
    prevError: 0,
    history: [] as number[],
    tick: 0,
  });

  // Reset and start the simulation whenever the gains change.
  useEffect(() => {
    const s = stateRef.current;
    s.pos = START;
    s.vel = 0;
    s.integral = 0;
    s.prevError = 0;
    s.history = [];
    s.tick = 0;
    setHistory([]);

    let lastTime = performance.now();
    const stepEveryMs = 1000 / 30; // render at ~30fps

    const step = (now: number) => {
      const elapsed = now - lastTime;
      if (elapsed >= stepEveryMs) {
        lastTime = now;
        // PID step
        const error = TARGET - s.pos;
        const P_term = gains.P * error;
        s.integral += error * DT;
        const I_term = gains.I * s.integral;
        const D_term = gains.D * ((error - s.prevError) / DT);
        const output = P_term + I_term + D_term;
        s.prevError = error;
        // Plant: simple second-order with mild damping, clamped.
        s.vel = s.vel + output * DT - s.vel * 0.05;
        s.pos = s.pos + s.vel * DT;
        s.pos = Math.max(-3, Math.min(3, s.pos));
        s.history.push(s.pos);
        if (s.history.length > HISTORY) s.history.shift();
        s.tick++;
        // Trigger re-render every other tick to keep it cheap.
        if (s.tick % 2 === 0) setHistory([...s.history]);
      }
      requestRef.current = requestAnimationFrame(step);
    };
    requestRef.current = requestAnimationFrame(step);
    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    };
  }, [gains]);

  const path = useMemo(() => {
    if (history.length < 2) return '';
    // Map history value (-3 .. 3) to y-coords (HEIGHT-margin .. margin) where TARGET is centred.
    const margin = 24;
    const usable = HEIGHT - 2 * margin;
    const midY = HEIGHT / 2;
    const xStep = WIDTH / HISTORY;
    return history
      .map((v, i) => {
        const x = i * xStep;
        const y = midY - (v / 3) * (usable / 2);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [history]);

  const behaviour = describeBehaviour(gains);
  const targetY = HEIGHT / 2;

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
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        style={{ maxWidth: WIDTH, display: 'block', margin: '0 auto', background: 'rgba(11,37,64,.4)', borderRadius: 12 }}
        aria-label="PID controller convergence plot"
      >
        {/* Target line */}
        <line
          x1={0}
          x2={WIDTH}
          y1={targetY}
          y2={targetY}
          stroke="#00B8D4"
          strokeWidth={1.5}
          strokeDasharray="4 6"
        />
        <text x={WIDTH - 8} y={targetY - 8} textAnchor="end" fill="#00B8D4" fontSize={11} fontFamily="JetBrains Mono, monospace">
          target
        </text>
        {/* Path */}
        {path && (
          <path
            d={path}
            stroke="#00E5FF"
            strokeWidth={2}
            fill="none"
            style={{ filter: 'drop-shadow(0 0 4px rgba(0,229,255,.6))' }}
          />
        )}
      </svg>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginTop: 24,
        }}
      >
        {SLIDERS.map((s) => (
          <label key={s.key} style={{ display: 'block', fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#C8D0DC' }}>
              <span>{s.label}</span>
              <span style={{ color: 'var(--cyan-bright)', fontFamily: 'var(--font-mono), monospace' }}>
                {gains[s.key].toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={gains[s.key]}
              onChange={(e) => setGains((g) => ({ ...g, [s.key]: parseFloat(e.target.value) }))}
              style={{ width: '100%', accentColor: '#00B8D4' }}
            />
          </label>
        ))}
      </div>

      <div
        style={{
          marginTop: 20,
          padding: '12px 16px',
          borderRadius: 10,
          background:
            behaviour.tone === 'ok'
              ? 'rgba(34,197,94,.12)'
              : behaviour.tone === 'warn'
              ? 'rgba(255,176,32,.12)'
              : 'rgba(11,37,64,.5)',
          border:
            '1px solid ' +
            (behaviour.tone === 'ok'
              ? 'rgba(34,197,94,.4)'
              : behaviour.tone === 'warn'
              ? 'rgba(255,176,32,.5)'
              : 'var(--border)'),
          color:
            behaviour.tone === 'ok'
              ? 'var(--green)'
              : behaviour.tone === 'warn'
              ? 'var(--amber)'
              : '#C8D0DC',
          fontSize: 14,
        }}
      >
        {behaviour.text}
      </div>

      <p style={{ marginTop: 18, fontSize: 13.5, color: '#A8B0BC' }}>
        Drag the sliders to retune the controller. The cyan line is the robot trying to reach the dashed target.{' '}
        <a href="/atlas/concept/pid-controller" style={{ color: 'var(--cyan)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
          What is PID?
        </a>
      </p>
    </div>
  );
}
