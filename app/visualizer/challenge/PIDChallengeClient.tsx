'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Sample = { t: number; value: number };

const SETPOINT = 80;
const TARGET_OVERSHOOT_PCT = 10;
const TARGET_SETTLE_SEC = 5;
const SETTLE_TOLERANCE = 1.5; // |value − setpoint| ≤ 1.5 to count as settled
const SIM_SECONDS = 12;
const DT = 0.02; // 50 Hz simulation

type Result = {
  overshootPct: number;
  settleSec: number | null;
  passes: boolean;
  score: number; // 0-100
};

function simulate(kp: number, ki: number, kd: number): { samples: Sample[]; result: Result } {
  // Simple 1st-order plant: dx/dt = (u - x) / tau, tau = 1.2 sec, initial x=0
  const tau = 1.2;
  let x = 0;
  let integral = 0;
  let prevError = SETPOINT;
  const samples: Sample[] = [];

  for (let t = 0; t <= SIM_SECONDS; t += DT) {
    const error = SETPOINT - x;
    integral += error * DT;
    const derivative = (error - prevError) / DT;
    let u = kp * error + ki * integral + kd * derivative;
    if (u > 200) u = 200;
    if (u < -200) u = -200;
    const dxdt = (u - x) / tau;
    x += dxdt * DT;
    samples.push({ t, value: x });
    prevError = error;
  }

  // Metrics
  let peak = 0;
  for (const s of samples) if (s.value > peak) peak = s.value;
  const overshootPct = Math.max(0, ((peak - SETPOINT) / SETPOINT) * 100);

  let settleSec: number | null = null;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (Math.abs(s.value - SETPOINT) <= SETTLE_TOLERANCE) {
      // Confirm it stays settled for the rest of the window
      const stillSettled = samples
        .slice(i)
        .every((q) => Math.abs(q.value - SETPOINT) <= SETTLE_TOLERANCE * 1.5);
      if (stillSettled) {
        settleSec = s.t;
        break;
      }
    }
  }

  const passes = overshootPct <= TARGET_OVERSHOOT_PCT && settleSec !== null && settleSec <= TARGET_SETTLE_SEC;
  const overshootScore = 50 * Math.max(0, 1 - overshootPct / 30); // full marks at 0%, 0 at 30%
  const settleScore =
    settleSec === null
      ? 0
      : 50 * Math.max(0, 1 - (settleSec - 1) / (TARGET_SETTLE_SEC * 2));
  const score = Math.round(Math.max(0, Math.min(100, overshootScore + settleScore)));

  return { samples, result: { overshootPct, settleSec, passes, score } };
}

const STORAGE_KEY = 'r2bot_pid_challenge_best';

export function PIDChallengeClient() {
  const [kp, setKp] = useState(1);
  const [ki, setKi] = useState(0);
  const [kd, setKd] = useState(0);
  const [tried, setTried] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setBestScore(parseInt(raw, 10));
    } catch {
      // best-effort
    }
  }, []);

  const { samples, result } = useMemo(() => simulate(kp, ki, kd), [kp, ki, kd]);

  function onTry() {
    setTried(true);
    if (bestScore === null || result.score > bestScore) {
      setBestScore(result.score);
      try {
        localStorage.setItem(STORAGE_KEY, String(result.score));
      } catch {
        // best-effort
      }
    }
  }

  return (
    <div className="mt-10">
      <div className="grid gap-4 sm:grid-cols-3">
        <NumInput label="Kp (proportional)" value={kp} onChange={setKp} min={0} max={10} step={0.1} />
        <NumInput label="Ki (integral)" value={ki} onChange={setKi} min={0} max={5} step={0.05} />
        <NumInput label="Kd (derivative)" value={kd} onChange={setKd} min={0} max={5} step={0.05} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <PlotSVG samples={samples} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onTry}
          className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-sm font-extrabold text-[#1a0f00] hover:scale-[1.03]"
        >
          🎯 Try
        </button>
        {bestScore !== null ? (
          <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-200">
            Best score: {bestScore}/100
          </span>
        ) : null}
      </div>

      {tried ? (
        <div
          className={`mt-5 rounded-2xl border p-5 ${
            result.passes
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
              : 'border-amber-400/40 bg-amber-500/10 text-amber-100'
          }`}
        >
          <p className="font-bold text-base">
            {result.passes ? '✅ You passed!' : 'Not yet — tune again.'} Score: {result.score}/100
          </p>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            <li>
              Overshoot: <strong>{result.overshootPct.toFixed(1)}%</strong>{' '}
              {result.overshootPct <= TARGET_OVERSHOOT_PCT ? '✅' : '❌'} (target ≤ {TARGET_OVERSHOOT_PCT}%)
            </li>
            <li>
              Time to settle:{' '}
              <strong>{result.settleSec !== null ? `${result.settleSec.toFixed(1)}s` : 'did not settle'}</strong>{' '}
              {result.settleSec !== null && result.settleSec <= TARGET_SETTLE_SEC ? '✅' : '❌'} (target ≤ {TARGET_SETTLE_SEC}s)
            </li>
          </ul>
        </div>
      ) : null}

      <p className="mt-6 text-xs text-zinc-500">
        Hint: bigger Kp = faster response but more overshoot. Add a little Kd to dampen. Use Ki to remove steady-state error.
      </p>
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <label className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-200">
      <span className="block text-[11px] uppercase tracking-wider text-zinc-400">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-2 w-full accent-amber-400"
      />
      <span className="mt-1 block font-mono text-sm font-bold text-amber-200">{value.toFixed(2)}</span>
    </label>
  );
}

function PlotSVG({ samples }: { samples: Sample[] }) {
  const w = 600;
  const h = 220;
  const padX = 20;
  const padY = 16;
  const maxT = samples[samples.length - 1]?.t ?? 1;
  const maxV = Math.max(SETPOINT * 1.3, ...samples.map((s) => s.value));
  const minV = Math.min(0, ...samples.map((s) => s.value));
  const points = samples
    .map(
      (s) =>
        `${padX + ((s.t / maxT) * (w - 2 * padX)).toFixed(1)},${(h - padY - ((s.value - minV) / (maxV - minV)) * (h - 2 * padY)).toFixed(1)}`,
    )
    .join(' ');
  const setpointY = h - padY - ((SETPOINT - minV) / (maxV - minV)) * (h - 2 * padY);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full">
      <line x1={padX} y1={setpointY} x2={w - padX} y2={setpointY} stroke="#34d399" strokeDasharray="4 4" strokeWidth={1} />
      <text x={padX + 4} y={setpointY - 4} fill="#34d399" fontSize="10">Setpoint {SETPOINT}</text>
      <polyline fill="none" stroke="#f59e0b" strokeWidth={2} points={points} />
      <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="#374151" strokeWidth={1} />
      <line x1={padX} y1={padY} x2={padX} y2={h - padY} stroke="#374151" strokeWidth={1} />
    </svg>
  );
}
