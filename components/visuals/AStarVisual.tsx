'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const COLS = 22;
const ROWS = 16;
const CELL = 26;
const W = COLS * CELL;
const H = ROWS * CELL;

type Mode = 'wall' | 'start' | 'goal';
type Speed = 'slow' | 'medium' | 'fast' | 'instant';
type CellState = 'empty' | 'wall' | 'explored' | 'frontier' | 'path';

const COLORS: Record<CellState, string> = {
  empty: '#0a1628',
  wall: '#334155',
  explored: '#0c3347',
  frontier: '#78350f',
  path: '#00B8D4',
};

const SPEED_MS: Record<Speed, number> = { slow: 150, medium: 50, fast: 10, instant: 0 };

type Point = { c: number; r: number };

function keyOf(p: Point) {
  return `${p.c},${p.r}`;
}

function manhattan(a: Point, b: Point) {
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r);
}

function makeGrid(): CellState[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill('empty' as CellState));
}

const PRESETS: Record<string, Array<[number, number]>> = {
  sCurve: (() => {
    const w: Array<[number, number]> = [];
    for (let r = 2; r < 11; r++) w.push([7, r]);
    for (let r = 5; r < 14; r++) w.push([14, r]);
    return w;
  })(),
  zigzag: (() => {
    const w: Array<[number, number]> = [];
    for (let c = 1; c < 18; c++) w.push([c, 3]);
    for (let c = 4; c < 21; c++) w.push([c, 7]);
    for (let c = 1; c < 18; c++) w.push([c, 11]);
    return w;
  })(),
  spiral: (() => {
    const w: Array<[number, number]> = [];
    for (let c = 4; c < 18; c++) w.push([c, 2]);
    for (let r = 2; r < 14; r++) w.push([17, r]);
    for (let c = 4; c < 18; c++) w.push([c, 13]);
    for (let r = 5; r < 14; r++) w.push([4, r]);
    for (let c = 7; c < 15; c++) w.push([c, 5]);
    for (let r = 5; r < 11; r++) w.push([14, r]);
    for (let c = 7; c < 15; c++) w.push([c, 10]);
    return w;
  })(),
};

export function AStarVisual() {
  const [grid, setGrid] = useState<CellState[][]>(() => makeGrid());
  const [start, setStart] = useState<Point>({ c: 1, r: 8 });
  const [goal, setGoal] = useState<Point>({ c: 20, r: 8 });
  const [mode, setMode] = useState<Mode>('wall');
  const [speed, setSpeed] = useState<Speed>('medium');
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<{ explored: number; path: number; ms: number } | null>(null);
  const stopRef = useRef(false);
  const dragActionRef = useRef<'add' | 'remove' | null>(null);

  const clearOverlay = useCallback((g: CellState[][]) => {
    return g.map((row) => row.map((c) => (c === 'explored' || c === 'frontier' || c === 'path' ? 'empty' : c))) as CellState[][];
  }, []);

  const reset = () => {
    stopRef.current = true;
    setGrid(makeGrid());
    setStart({ c: 1, r: 8 });
    setGoal({ c: 20, r: 8 });
    setStats(null);
    setRunning(false);
  };

  const loadPreset = (name: keyof typeof PRESETS) => {
    stopRef.current = true;
    const g = makeGrid();
    for (const [c, r] of PRESETS[name]) g[r][c] = 'wall';
    setGrid(g);
    setStats(null);
  };

  const setCellByMode = (c: number, r: number, isDragStart: boolean) => {
    if (running) return;
    if (mode === 'start') {
      if (grid[r][c] === 'wall') return;
      if (c === goal.c && r === goal.r) return;
      setStart({ c, r });
      return;
    }
    if (mode === 'goal') {
      if (grid[r][c] === 'wall') return;
      if (c === start.c && r === start.r) return;
      setGoal({ c, r });
      return;
    }
    // wall mode
    if ((c === start.c && r === start.r) || (c === goal.c && r === goal.r)) return;
    setGrid((prev) => {
      const next = prev.map((row) => row.slice()) as CellState[][];
      const current = next[r][c];
      if (isDragStart) {
        dragActionRef.current = current === 'wall' ? 'remove' : 'add';
      }
      const action = dragActionRef.current ?? (current === 'wall' ? 'remove' : 'add');
      if (action === 'add' && current !== 'wall') next[r][c] = 'wall';
      else if (action === 'remove' && current === 'wall') next[r][c] = 'empty';
      return next;
    });
  };

  const runAStar = async () => {
    if (running) return;
    stopRef.current = false;
    setRunning(true);
    setStats(null);
    let g = clearOverlay(grid);
    setGrid(g);

    const startNode = start;
    const goalNode = goal;
    const open = new Map<string, { p: Point; g: number; h: number; f: number; parent: string | null }>();
    const closed = new Set<string>();
    const parents = new Map<string, string | null>();
    const stepMs = SPEED_MS[speed];

    open.set(keyOf(startNode), {
      p: startNode,
      g: 0,
      h: manhattan(startNode, goalNode),
      f: manhattan(startNode, goalNode),
      parent: null,
    });

    const t0 = performance.now();
    let explored = 0;
    let foundGoal = false;

    while (open.size > 0) {
      if (stopRef.current) {
        setRunning(false);
        return;
      }
      // pick min-f
      let bestKey = '';
      let best: { p: Point; g: number; h: number; f: number; parent: string | null } | null = null;
      for (const [k, v] of open) {
        if (!best || v.f < best.f || (v.f === best.f && v.h < best.h)) {
          best = v;
          bestKey = k;
        }
      }
      if (!best) break;
      open.delete(bestKey);
      closed.add(bestKey);
      parents.set(bestKey, best.parent);
      explored++;

      if (best.p.c === goalNode.c && best.p.r === goalNode.r) {
        foundGoal = true;
        break;
      }

      // mark explored
      if (!(best.p.c === startNode.c && best.p.r === startNode.r)) {
        g = g.map((row) => row.slice()) as CellState[][];
        g[best.p.r][best.p.c] = 'explored';
      }

      // expand 4 neighbors
      const neighbors: Array<[number, number]> = [
        [best.p.c, best.p.r - 1],
        [best.p.c, best.p.r + 1],
        [best.p.c - 1, best.p.r],
        [best.p.c + 1, best.p.r],
      ];
      for (const [nc, nr] of neighbors) {
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
        if (g[nr][nc] === 'wall') continue;
        const nKey = `${nc},${nr}`;
        if (closed.has(nKey)) continue;
        const tentativeG = best.g + 1;
        const existing = open.get(nKey);
        if (!existing || tentativeG < existing.g) {
          const h = manhattan({ c: nc, r: nr }, goalNode);
          open.set(nKey, { p: { c: nc, r: nr }, g: tentativeG, h, f: tentativeG + h, parent: bestKey });
          if (!(nc === goalNode.c && nr === goalNode.r) && g[nr][nc] !== 'explored') {
            g = g.map((row) => row.slice()) as CellState[][];
            g[nr][nc] = 'frontier';
          }
        }
      }

      if (stepMs > 0) {
        setGrid(g);
        await new Promise((res) => setTimeout(res, stepMs));
      }
    }

    const t1 = performance.now();

    if (foundGoal) {
      // reconstruct
      const pathCells: Point[] = [];
      let cur: string | null = keyOf(goalNode);
      let safety = COLS * ROWS + 10;
      while (cur && safety-- > 0) {
        const [c, r] = cur.split(',').map(Number);
        pathCells.push({ c, r });
        cur = parents.get(cur) ?? null;
      }
      pathCells.reverse();

      const animatePath = stepMs > 0;
      for (const cell of pathCells) {
        if (stopRef.current) break;
        if ((cell.c === startNode.c && cell.r === startNode.r) || (cell.c === goalNode.c && cell.r === goalNode.r)) continue;
        g = g.map((row) => row.slice()) as CellState[][];
        g[cell.r][cell.c] = 'path';
        if (animatePath) {
          setGrid(g);
          await new Promise((res) => setTimeout(res, 30));
        }
      }
      setGrid(g);
      setStats({ explored, path: Math.max(0, pathCells.length - 1), ms: Math.round(t1 - t0) });
    } else {
      setGrid(g);
      setStats({ explored, path: -1, ms: Math.round(t1 - t0) });
    }
    setRunning(false);
  };

  useEffect(() => {
    return () => {
      stopRef.current = true;
    };
  }, []);

  const btn = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid ' + (active ? 'var(--cyan)' : 'var(--border-2)'),
    background: active ? 'rgba(0,184,212,.2)' : 'rgba(11,37,64,.5)',
    color: active ? 'var(--cyan-bright)' : '#C8D0DC',
    fontSize: 12.5,
    cursor: running ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    opacity: running ? 0.55 : 1,
  });

  return (
    <div
      style={{
        background: '#0a0f1e',
        border: '1px solid var(--border-2)',
        borderRadius: 16,
        padding: 'clamp(20px, 3vw, 36px)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setMode('wall')} style={btn(mode === 'wall')} disabled={running}>
          ✏ Draw Walls
        </button>
        <button onClick={() => setMode('start')} style={btn(mode === 'start')} disabled={running}>
          🚩 Set Start
        </button>
        <button onClick={() => setMode('goal')} style={btn(mode === 'goal')} disabled={running}>
          🎯 Set Goal
        </button>
        <button
          onClick={runAStar}
          disabled={running}
          style={{ ...btn(false), borderColor: 'var(--cyan)', background: 'rgba(0,184,212,.25)', color: 'var(--cyan-bright)' }}
        >
          ▶ Find Path
        </button>
        <button onClick={reset} style={btn(false)} disabled={running}>
          🔄 Reset
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94A3B8' }}>
          Speed:
          {(['slow', 'medium', 'fast', 'instant'] as Speed[]).map((s) => (
            <button key={s} onClick={() => setSpeed(s)} style={btn(speed === s)} disabled={running}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{
            maxWidth: W,
            display: 'block',
            margin: '0 auto',
            background: '#020617',
            borderRadius: 10,
            userSelect: 'none',
            touchAction: 'none',
          }}
          onMouseLeave={() => (dragActionRef.current = null)}
          onMouseUp={() => (dragActionRef.current = null)}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <rect
                key={`${r}-${c}`}
                x={c * CELL}
                y={r * CELL}
                width={CELL - 1}
                height={CELL - 1}
                fill={COLORS[cell]}
                stroke="rgba(148,163,184,.07)"
                strokeWidth={0.5}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setCellByMode(c, r, true);
                }}
                onMouseEnter={(e) => {
                  if (e.buttons === 1 && mode === 'wall' && !running) setCellByMode(c, r, false);
                }}
                style={{ cursor: running ? 'default' : 'pointer' }}
              />
            )),
          )}
          {/* Path animated glow */}
          <style>{`@keyframes a-pulse {0%,100%{opacity:1}50%{opacity:.7}}`}</style>
          {/* Start marker */}
          <circle
            cx={start.c * CELL + CELL / 2}
            cy={start.r * CELL + CELL / 2}
            r={CELL / 2 - 4}
            fill="#22c55e"
            style={{ filter: 'drop-shadow(0 0 6px rgba(34,197,94,.7))', pointerEvents: 'none' }}
          />
          {/* Goal marker */}
          <circle
            cx={goal.c * CELL + CELL / 2}
            cy={goal.r * CELL + CELL / 2}
            r={CELL / 2 - 4}
            fill="#00B8D4"
            style={{ filter: 'drop-shadow(0 0 7px rgba(0,184,212,.8))', pointerEvents: 'none' }}
          />
        </svg>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>Presets:</span>
        <button onClick={() => loadPreset('sCurve')} style={btn(false)} disabled={running}>
          Simple S-curve
        </button>
        <button onClick={() => loadPreset('zigzag')} style={btn(false)} disabled={running}>
          Zigzag
        </button>
        <button onClick={() => loadPreset('spiral')} style={btn(false)} disabled={running}>
          Spiral trap
        </button>
      </div>

      <div style={{ marginTop: 14, fontFamily: 'var(--font-mono), monospace', fontSize: 13, color: '#C8D0DC' }}>
        {stats ? (
          stats.path >= 0 ? (
            <>
              Explored <span style={{ color: 'var(--cyan-bright)' }}>{stats.explored}</span> cells &nbsp;·&nbsp; Path:{' '}
              <span style={{ color: 'var(--cyan-bright)' }}>{stats.path}</span> steps &nbsp;·&nbsp;{' '}
              <span style={{ color: 'var(--cyan-bright)' }}>{stats.ms}ms</span>
            </>
          ) : (
            <span style={{ color: '#f59e0b' }}>No path found — try clearing some walls</span>
          )
        ) : (
          <span style={{ color: '#94A3B8' }}>Draw walls (or pick a preset), then press Find Path.</span>
        )}
      </div>

      <p style={{ marginTop: 16, fontSize: 14, color: '#A8B0BC', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--mist)' }}>A*</strong> is the most common pathfinding algorithm in robotics. ROS2's Nav2 uses a variant of A* for global path planning.
      </p>
      <a
        href="/atlas/concept/path-planning"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-block', marginTop: 6, color: 'var(--cyan-bright)', fontSize: 13.5, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
      >
        Read: Path Planning →
      </a>
    </div>
  );
}
