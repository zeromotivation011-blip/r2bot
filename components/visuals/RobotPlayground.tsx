'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 480,
        background: '#1e1e1e',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94A3B8',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 13,
      }}
    >
      Loading editor…
    </div>
  ),
});

const SIM_W = 380;
const SIM_H = 380;
const ROBOT_R = 10;
const ARROW_LEN = 20;
const WALL_INSET = 20;

type Obstacle = { x: number; y: number; r: number };

const OBSTACLES: Obstacle[] = [
  { x: 280, y: 120, r: 30 },
  { x: 100, y: 260, r: 25 },
  { x: 200, y: 200, r: 20 },
];

type Robot = { x: number; y: number; heading: number }; // heading in degrees

const STARTERS: Record<string, string> = {
  starter: `# R2BOT Robot Playground
# Control your robot with simple commands!

robot.forward(0.5)    # Move forward at half speed
robot.wait(2)         # Wait 2 seconds
robot.turn_right(90)  # Turn right 90 degrees
robot.forward(0.8)    # Move forward faster
robot.wait(1)
robot.turn_left(45)
robot.forward(0.5)
robot.wait(2)
robot.stop()

print("Mission complete!")`,
  square: `# Drive a square path

robot.forward(0.6)
robot.wait(2)
robot.turn_right(90)

robot.forward(0.6)
robot.wait(2)
robot.turn_right(90)

robot.forward(0.6)
robot.wait(2)
robot.turn_right(90)

robot.forward(0.6)
robot.wait(2)
robot.turn_right(90)

robot.stop()
print("Square complete!")`,
  line: `# Line follower (simulated)
# Drive forward, peek with the sensor.

robot.forward(0.4)
robot.wait(1)
d = sensor.distance()
print("Distance ahead:")
print(d)
robot.turn_right(15)
robot.forward(0.4)
robot.wait(1)
robot.turn_left(15)
robot.forward(0.4)
robot.wait(1)
robot.stop()`,
  avoid: `# Obstacle avoid using sensor.distance()

robot.forward(0.6)
robot.wait(2)

d = sensor.distance()
print("Sensor:")
print(d)

robot.turn_left(45)
robot.forward(0.5)
robot.wait(2)
robot.turn_right(30)
robot.forward(0.5)
robot.wait(2)
robot.stop()
print("Avoided!")`,
  spiral: `# Expanding spiral

robot.forward(0.3)
robot.wait(1)
robot.turn_right(40)

robot.forward(0.4)
robot.wait(1)
robot.turn_right(35)

robot.forward(0.5)
robot.wait(1)
robot.turn_right(30)

robot.forward(0.6)
robot.wait(1)
robot.turn_right(25)

robot.forward(0.7)
robot.wait(1)
robot.turn_right(20)

robot.stop()
print("Spiral done!")`,
};

type CmdToken =
  | { type: 'forward' | 'backward'; speed: number }
  | { type: 'turn_left' | 'turn_right'; degrees: number }
  | { type: 'stop' }
  | { type: 'wait'; seconds: number }
  | { type: 'set_speed'; left: number; right: number }
  | { type: 'print'; msg: string }
  | { type: 'assign'; name: string; value: 'sensor' | number };

function parse(code: string): { tokens: CmdToken[]; errors: string[] } {
  const tokens: CmdToken[] = [];
  const errors: string[] = [];
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const hashIdx = line.indexOf('#');
    if (hashIdx >= 0) line = line.slice(0, hashIdx).trim();
    if (!line) continue;

    let m: RegExpMatchArray | null;
    if ((m = line.match(/^robot\.(forward|backward)\(([0-9.]+)\)$/))) {
      tokens.push({ type: m[1] as 'forward' | 'backward', speed: parseFloat(m[2]) });
      continue;
    }
    if ((m = line.match(/^robot\.turn_(left|right)\(([0-9.]+)\)$/))) {
      tokens.push({ type: m[1] === 'left' ? 'turn_left' : 'turn_right', degrees: parseFloat(m[2]) });
      continue;
    }
    if (line.match(/^robot\.stop\(\s*\)$/)) {
      tokens.push({ type: 'stop' });
      continue;
    }
    if ((m = line.match(/^robot\.wait\(([0-9.]+)\)$/))) {
      tokens.push({ type: 'wait', seconds: parseFloat(m[1]) });
      continue;
    }
    if ((m = line.match(/^robot\.set_speed\(([0-9.-]+),\s*([0-9.-]+)\)$/))) {
      tokens.push({ type: 'set_speed', left: parseFloat(m[1]), right: parseFloat(m[2]) });
      continue;
    }
    if ((m = line.match(/^print\("(.*)"\)$/)) || (m = line.match(/^print\('(.*)'\)$/))) {
      tokens.push({ type: 'print', msg: m[1] });
      continue;
    }
    if ((m = line.match(/^print\(([A-Za-z_]\w*)\)$/))) {
      tokens.push({ type: 'print', msg: `__VAR__${m[1]}` });
      continue;
    }
    if ((m = line.match(/^([A-Za-z_]\w*)\s*=\s*sensor\.distance\(\s*\)$/))) {
      tokens.push({ type: 'assign', name: m[1], value: 'sensor' });
      continue;
    }
    if ((m = line.match(/^([A-Za-z_]\w*)\s*=\s*([0-9.-]+)$/))) {
      tokens.push({ type: 'assign', name: m[1], value: parseFloat(m[2]) });
      continue;
    }
    errors.push(`Line ${i + 1}: Unknown — "${line}"`);
  }
  return { tokens, errors };
}

function distToWall(rx: number, ry: number, heading: number): number {
  // ray cast in heading direction (degrees), return distance to nearest wall/obstacle, max 200
  const rad = (heading * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  for (let t = 1; t <= 200; t += 1) {
    const x = rx + dx * t;
    const y = ry + dy * t;
    if (x < WALL_INSET || x > SIM_W - WALL_INSET || y < WALL_INSET || y > SIM_H - WALL_INSET) return t;
    for (const o of OBSTACLES) {
      if (Math.hypot(x - o.x, y - o.y) < o.r) return t;
    }
  }
  return 200;
}

function collides(x: number, y: number): boolean {
  if (x < WALL_INSET + ROBOT_R || x > SIM_W - WALL_INSET - ROBOT_R) return true;
  if (y < WALL_INSET + ROBOT_R || y > SIM_H - WALL_INSET - ROBOT_R) return true;
  for (const o of OBSTACLES) {
    if (Math.hypot(x - o.x, y - o.y) < o.r + ROBOT_R) return true;
  }
  return false;
}

export function RobotPlayground() {
  const [code, setCode] = useState<string>(STARTERS.starter);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);
  const consoleRef = useRef<HTMLDivElement | null>(null);

  const [robot, setRobot] = useState<Robot>({ x: 60, y: 190, heading: 0 });
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [flash, setFlash] = useState(false);
  const robotRef = useRef<Robot>({ x: 60, y: 190, heading: 0 });
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const varsRef = useRef<Record<string, number>>({});

  // Load shared code from ?code=
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('code');
    if (shared) {
      try {
        setCode(atob(shared));
      } catch {
        // ignore
      }
    }
  }, []);

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [output]);

  const log = useCallback((msg: string, kind: 'system' | 'print' | 'error' = 'print') => {
    setOutput((o) => [...o, `${kind}:${msg}`]);
  }, []);

  const resetRobot = useCallback(() => {
    robotRef.current = { x: 60, y: 190, heading: 0 };
    trailRef.current = [];
    varsRef.current = {};
    setRobot({ ...robotRef.current });
    setTrail([]);
    setFlash(false);
  }, []);

  const frame = () => new Promise<void>((res) => requestAnimationFrame(() => res()));

  const moveForFrames = async (frames: number, perFrame: (r: Robot) => void): Promise<boolean> => {
    for (let i = 0; i < frames; i++) {
      if (stopRef.current) return false;
      const r = robotRef.current;
      const prev = { x: r.x, y: r.y };
      perFrame(r);
      if (collides(r.x, r.y)) {
        r.x = prev.x;
        r.y = prev.y;
        setFlash(true);
        log('💥 Collision detected!', 'error');
        await new Promise((res) => setTimeout(res, 400));
        setFlash(false);
        return false;
      }
      trailRef.current.push({ x: r.x, y: r.y });
      if (trailRef.current.length > 150) trailRef.current.shift();
      setRobot({ ...r });
      setTrail([...trailRef.current]);
      await frame();
    }
    return true;
  };

  const runToken = async (tok: CmdToken): Promise<void> => {
    if (tok.type === 'forward' || tok.type === 'backward') {
      const sign = tok.type === 'forward' ? 1 : -1;
      const step = tok.speed * 3 * sign;
      await moveForFrames(60, (r) => {
        const rad = (r.heading * Math.PI) / 180;
        r.x += Math.cos(rad) * step;
        r.y += Math.sin(rad) * step;
      });
    } else if (tok.type === 'turn_left' || tok.type === 'turn_right') {
      const sign = tok.type === 'turn_left' ? -1 : 1;
      const totalFrames = Math.max(1, Math.round((tok.degrees / 90) * 30));
      const per = (tok.degrees * sign) / totalFrames;
      for (let i = 0; i < totalFrames; i++) {
        if (stopRef.current) return;
        robotRef.current.heading += per;
        setRobot({ ...robotRef.current });
        await frame();
      }
    } else if (tok.type === 'stop') {
      for (let i = 0; i < 10; i++) {
        if (stopRef.current) return;
        await frame();
      }
    } else if (tok.type === 'wait') {
      const frames = Math.round(tok.seconds * 60);
      for (let i = 0; i < frames; i++) {
        if (stopRef.current) return;
        await frame();
      }
    } else if (tok.type === 'set_speed') {
      const avg = (tok.left + tok.right) / 2;
      const turn = (tok.right - tok.left) * 2;
      await moveForFrames(60, (r) => {
        r.heading += turn;
        const rad = (r.heading * Math.PI) / 180;
        r.x += Math.cos(rad) * avg * 3;
        r.y += Math.sin(rad) * avg * 3;
      });
    } else if (tok.type === 'print') {
      if (tok.msg.startsWith('__VAR__')) {
        const name = tok.msg.slice(7);
        const v = varsRef.current[name];
        log(v !== undefined ? String(v) : `(undefined: ${name})`);
      } else {
        log(tok.msg);
      }
    } else if (tok.type === 'assign') {
      if (tok.value === 'sensor') {
        const d = distToWall(robotRef.current.x, robotRef.current.y, robotRef.current.heading);
        varsRef.current[tok.name] = Math.round(d);
      } else {
        varsRef.current[tok.name] = tok.value;
      }
    }
  };

  const run = async () => {
    if (running) return;
    stopRef.current = false;
    setRunning(true);
    setOutput([]);
    resetRobot();
    log('Running program...', 'system');
    const { tokens, errors } = parse(code);
    for (const e of errors) log(e, 'error');
    for (const tok of tokens) {
      if (stopRef.current) break;
      await runToken(tok);
    }
    log('Done.', 'system');
    setRunning(false);
  };

  const stop = () => {
    stopRef.current = true;
    setRunning(false);
  };

  const share = async () => {
    const encoded = btoa(code);
    const url = `${window.location.origin}${window.location.pathname}?code=${encoded}#playground`;
    try {
      await navigator.clipboard.writeText(url);
      log('Share link copied!', 'system');
    } catch {
      log(`Share URL: ${url}`, 'system');
    }
  };

  // Render
  return (
    <div
      style={{
        background: '#0a0f1e',
        border: '1px solid var(--cyan)',
        borderRadius: 16,
        padding: 'clamp(20px, 3vw, 36px)',
        boxShadow: '0 0 40px rgba(0,184,212,.15)',
        minHeight: 480,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <label style={{ fontSize: 13, color: '#94A3B8' }}>Preset:</label>
        <select
          onChange={(e) => {
            if (STARTERS[e.target.value]) {
              setCode(STARTERS[e.target.value]);
              setOutput([]);
            }
          }}
          defaultValue="starter"
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            background: 'rgba(11,37,64,.6)',
            color: '#C8D0DC',
            border: '1px solid var(--border-2)',
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        >
          <option value="starter">Starter</option>
          <option value="line">Line follower</option>
          <option value="square">Square path</option>
          <option value="avoid">Obstacle avoid</option>
          <option value="spiral">Spiral</option>
        </select>
        <button
          onClick={share}
          style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--border-2)',
            background: 'rgba(11,37,64,.5)',
            color: '#C8D0DC',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          🔗 Share code
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {/* LEFT: Monaco editor */}
        <div style={{ minWidth: 0 }}>
          <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-2)' }}>
            <MonacoEditor
              height="480px"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v ?? '')}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button
              onClick={run}
              disabled={running}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: '1px solid var(--cyan)',
                background: running ? 'rgba(0,184,212,.1)' : 'rgba(0,184,212,.25)',
                color: 'var(--cyan-bright)',
                fontSize: 13,
                fontFamily: 'inherit',
                cursor: running ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              ▶ Run
            </button>
            <button
              onClick={stop}
              disabled={!running}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-2)',
                background: 'rgba(11,37,64,.5)',
                color: '#ef4444',
                fontSize: 13,
                fontFamily: 'inherit',
                cursor: running ? 'pointer' : 'not-allowed',
                opacity: running ? 1 : 0.5,
              }}
            >
              ⏹ Stop
            </button>
            <button
              onClick={() => {
                stop();
                resetRobot();
                setOutput([]);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-2)',
                background: 'transparent',
                color: '#C8D0DC',
                fontSize: 13,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* RIGHT: simulation + console */}
        <div style={{ minWidth: 0 }}>
          <svg
            viewBox={`0 0 ${SIM_W} ${SIM_H}`}
            width="100%"
            style={{
              maxWidth: SIM_W,
              display: 'block',
              background: 'rgba(11,37,64,.45)',
              borderRadius: 10,
              border: flash ? '2px solid #ef4444' : '1px solid var(--border-2)',
              boxShadow: flash ? '0 0 18px rgba(239,68,68,.5)' : 'none',
              transition: 'border-color .15s, box-shadow .15s',
            }}
            aria-label="Robot simulation"
          >
            {/* outer walls */}
            <rect
              x={WALL_INSET}
              y={WALL_INSET}
              width={SIM_W - WALL_INSET * 2}
              height={SIM_H - WALL_INSET * 2}
              fill="none"
              stroke="#334155"
              strokeWidth={2}
              rx={4}
            />

            {/* obstacles */}
            {OBSTACLES.map((o, i) => (
              <circle key={i} cx={o.x} cy={o.y} r={o.r} fill="#1e293b" stroke="#475569" strokeWidth={1.5} />
            ))}

            {/* trail */}
            {trail.length > 1 && (
              <polyline
                points={trail.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                stroke="#00B8D4"
                strokeWidth={1}
                opacity={0.3}
                fill="none"
              />
            )}

            {/* robot */}
            <g
              transform={`translate(${robot.x}, ${robot.y}) rotate(${robot.heading})`}
              style={{ transition: 'none' }}
            >
              <circle
                r={ROBOT_R}
                fill={flash ? '#ef4444' : '#00B8D4'}
                stroke={flash ? '#fca5a5' : '#00E5FF'}
                strokeWidth={1.5}
                style={{ filter: 'drop-shadow(0 0 6px rgba(0,184,212,.6))' }}
              />
              <line x1={0} y1={0} x2={ARROW_LEN} y2={0} stroke="#ffffff" strokeWidth={2} />
            </g>
          </svg>

          {/* Console */}
          <div
            ref={consoleRef}
            style={{
              marginTop: 12,
              background: '#050810',
              border: '1px solid var(--border-2)',
              borderRadius: 8,
              padding: '8px 12px',
              height: 80,
              overflowY: 'auto',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {output.length === 0 ? (
              <div style={{ color: '#475569' }}>&gt; Press Run to start your program…</div>
            ) : (
              output.map((line, i) => {
                const colonIdx = line.indexOf(':');
                const kind = line.slice(0, colonIdx);
                const msg = line.slice(colonIdx + 1);
                const color = kind === 'error' ? '#ef4444' : kind === 'system' ? '#ffffff' : '#22c55e';
                const prefix = kind === 'system' ? '> ' : kind === 'error' ? '! ' : '  ';
                return (
                  <div key={i} style={{ color }}>
                    {prefix}
                    {msg}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <p style={{ marginTop: 18, fontSize: 13.5, color: '#A8B0BC', lineHeight: 1.55 }}>
        Write Python-style robot commands. Supported:{' '}
        <code style={{ color: 'var(--cyan-bright)' }}>robot.forward()</code>,{' '}
        <code style={{ color: 'var(--cyan-bright)' }}>robot.turn_right()</code>,{' '}
        <code style={{ color: 'var(--cyan-bright)' }}>robot.wait()</code>,{' '}
        <code style={{ color: 'var(--cyan-bright)' }}>robot.set_speed(l, r)</code>,{' '}
        <code style={{ color: 'var(--cyan-bright)' }}>sensor.distance()</code>, and{' '}
        <code style={{ color: 'var(--cyan-bright)' }}>print()</code>.
      </p>
    </div>
  );
}
