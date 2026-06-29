'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const COLS = 22;
const ROWS = 14;
const START: [number, number] = [1, 7];
const GOAL: [number, number] = [20, 7];

type CellState = 'empty' | 'wall';

function key(x: number, y: number) {
  return `${x},${y}`;
}

function defaultGrid(): CellState[][] {
  const g: CellState[][] = [];
  for (let y = 0; y < ROWS; y++) {
    const row: CellState[] = [];
    for (let x = 0; x < COLS; x++) row.push('empty');
    g.push(row);
  }
  // A few starter walls to make it interesting
  for (let y = 3; y < 10; y++) g[y][10] = 'wall';
  for (let x = 6; x < 13; x++) g[3][x] = 'wall';
  return g;
}

type Step = { x: number; y: number };

type Result = { visited: Step[]; path: Step[]; ms: number };

function neighbours(x: number, y: number, grid: CellState[][]): [number, number][] {
  const out: [number, number][] = [];
  const cand = [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ];
  for (const [nx, ny] of cand) {
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
    if (grid[ny][nx] === 'wall') continue;
    out.push([nx, ny]);
  }
  return out;
}

function heuristic(x: number, y: number) {
  return Math.abs(GOAL[0] - x) + Math.abs(GOAL[1] - y);
}

function runAStar(grid: CellState[][]): Result {
  const t0 = performance.now();
  const open = new Map<string, { x: number; y: number; g: number; f: number; parent: string | null }>();
  const closed = new Set<string>();
  const visited: Step[] = [];

  open.set(key(...START), { x: START[0], y: START[1], g: 0, f: heuristic(...START), parent: null });

  while (open.size > 0) {
    let bestKey: string | null = null;
    let bestF = Infinity;
    for (const [k, v] of open) {
      if (v.f < bestF) {
        bestF = v.f;
        bestKey = k;
      }
    }
    if (!bestKey) break;
    const current = open.get(bestKey)!;
    open.delete(bestKey);
    closed.add(bestKey);
    visited.push({ x: current.x, y: current.y });

    if (current.x === GOAL[0] && current.y === GOAL[1]) {
      // Reconstruct path
      const path: Step[] = [];
      const all = new Map(open);
      all.set(bestKey, current);
      let k: string | null = bestKey;
      while (k !== null) {
        const node: { x: number; y: number; g: number; f: number; parent: string | null } | undefined = all.get(k);
        if (!node) break;
        path.unshift({ x: node.x, y: node.y });
        k = node.parent;
      }
      return { visited, path, ms: performance.now() - t0 };
    }

    for (const [nx, ny] of neighbours(current.x, current.y, grid)) {
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const tentativeG = current.g + 1;
      const existing = open.get(nk);
      if (!existing || tentativeG < existing.g) {
        open.set(nk, { x: nx, y: ny, g: tentativeG, f: tentativeG + heuristic(nx, ny), parent: bestKey });
      }
    }
  }
  return { visited, path: [], ms: performance.now() - t0 };
}

function runDijkstra(grid: CellState[][]): Result {
  const t0 = performance.now();
  const dist = new Map<string, number>();
  const parents = new Map<string, string | null>();
  const visited: Step[] = [];
  const queue: { x: number; y: number; d: number }[] = [];
  dist.set(key(...START), 0);
  parents.set(key(...START), null);
  queue.push({ x: START[0], y: START[1], d: 0 });

  while (queue.length > 0) {
    queue.sort((a, b) => a.d - b.d);
    const current = queue.shift()!;
    const k = key(current.x, current.y);
    if (dist.get(k)! < current.d) continue;
    visited.push({ x: current.x, y: current.y });
    if (current.x === GOAL[0] && current.y === GOAL[1]) {
      const path: Step[] = [];
      let cur: string | null = k;
      while (cur) {
        const [cx, cy] = cur.split(',').map((s) => parseInt(s, 10));
        path.unshift({ x: cx, y: cy });
        cur = parents.get(cur) ?? null;
      }
      return { visited, path, ms: performance.now() - t0 };
    }
    for (const [nx, ny] of neighbours(current.x, current.y, grid)) {
      const nk = key(nx, ny);
      const nd = current.d + 1;
      if (!dist.has(nk) || nd < dist.get(nk)!) {
        dist.set(nk, nd);
        parents.set(nk, k);
        queue.push({ x: nx, y: ny, d: nd });
      }
    }
  }
  return { visited, path: [], ms: performance.now() - t0 };
}

export function AlgoCompareClient() {
  const [grid, setGrid] = useState<CellState[][]>(() => defaultGrid());
  const [astar, setAstar] = useState<Result | null>(null);
  const [dijkstra, setDijkstra] = useState<Result | null>(null);
  const [animTick, setAnimTick] = useState(0);
  const [running, setRunning] = useState(false);
  const tickRef = useRef<number | null>(null);

  const toggleCell = useCallback((x: number, y: number) => {
    if ((x === START[0] && y === START[1]) || (x === GOAL[0] && y === GOAL[1])) return;
    setGrid((g) => g.map((row, ry) => (ry === y ? row.map((c, cx) => (cx === x ? (c === 'wall' ? 'empty' : 'wall') : c)) : row)));
  }, []);

  const runBoth = useCallback(() => {
    setAstar(runAStar(grid));
    setDijkstra(runDijkstra(grid));
    setAnimTick(0);
    setRunning(true);
  }, [grid]);

  useEffect(() => {
    if (!running) return;
    const maxLen = Math.max(astar?.visited.length ?? 0, dijkstra?.visited.length ?? 0);
    if (animTick >= maxLen) {
      setRunning(false);
      return;
    }
    tickRef.current = window.setTimeout(() => setAnimTick((t) => t + 1), 25);
    return () => {
      if (tickRef.current !== null) window.clearTimeout(tickRef.current);
    };
  }, [animTick, running, astar, dijkstra]);

  const reset = () => {
    setGrid(defaultGrid());
    setAstar(null);
    setDijkstra(null);
    setAnimTick(0);
    setRunning(false);
  };

  return (
    <div className="mt-10">
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runBoth}
          className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2 text-sm font-extrabold text-[#1a0f00] hover:scale-[1.03]"
        >
          ▶ Run both
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-xl border border-white/15 bg-white/[0.04] px-5 py-2 text-sm font-semibold text-zinc-200 hover:border-white/30"
        >
          Reset grid
        </button>
        <p className="ml-auto text-xs text-zinc-500">Click any cell to toggle a wall. Start = green, Goal = amber.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <GridView
          label="A*"
          color="#22d3ee"
          grid={grid}
          visited={astar?.visited.slice(0, animTick) ?? []}
          path={astar?.path ?? []}
          ms={astar?.ms}
          showPath={!running}
          onToggle={toggleCell}
        />
        <GridView
          label="Dijkstra"
          color="#a78bfa"
          grid={grid}
          visited={dijkstra?.visited.slice(0, animTick) ?? []}
          path={dijkstra?.path ?? []}
          ms={dijkstra?.ms}
          showPath={!running}
          onToggle={toggleCell}
        />
      </div>

      {astar && dijkstra && !running ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Stat label="A*" subtitle={`${astar.visited.length} cells visited`} time={astar.ms} color="#22d3ee" />
          <Stat label="Dijkstra" subtitle={`${dijkstra.visited.length} cells visited`} time={dijkstra.ms} color="#a78bfa" />
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, subtitle, time, color }: { label: string; subtitle: string; time: number; color: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="m-0 text-xs font-bold uppercase tracking-wider" style={{ color }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold text-white">{time.toFixed(1)}ms</p>
      <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>
    </div>
  );
}

function GridView({
  label,
  color,
  grid,
  visited,
  path,
  ms,
  showPath,
  onToggle,
}: {
  label: string;
  color: string;
  grid: CellState[][];
  visited: { x: number; y: number }[];
  path: { x: number; y: number }[];
  ms?: number;
  showPath: boolean;
  onToggle: (x: number, y: number) => void;
}) {
  const visitedSet = useMemo(() => {
    const s = new Set<string>();
    for (const v of visited) s.add(`${v.x},${v.y}`);
    return s;
  }, [visited]);
  const pathSet = useMemo(() => {
    const s = new Set<string>();
    if (showPath) for (const p of path) s.add(`${p.x},${p.y}`);
    return s;
  }, [path, showPath]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="m-0 text-sm font-bold" style={{ color }}>
          {label}
        </p>
        {typeof ms === 'number' ? <p className="m-0 font-mono text-xs text-zinc-400">{ms.toFixed(1)} ms</p> : null}
      </div>
      <div
        className="grid select-none"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          gap: 1,
        }}
      >
        {grid.map((row, y) =>
          row.map((c, x) => {
            const isStart = x === START[0] && y === START[1];
            const isGoal = x === GOAL[0] && y === GOAL[1];
            const k = `${x},${y}`;
            let bg = 'rgba(255,255,255,0.04)';
            if (c === 'wall') bg = 'rgba(255,255,255,0.55)';
            else if (isStart) bg = '#34d399';
            else if (isGoal) bg = '#f59e0b';
            else if (pathSet.has(k)) bg = color;
            else if (visitedSet.has(k)) bg = `${color}55`;
            return (
              <button
                key={k}
                type="button"
                onClick={() => onToggle(x, y)}
                aria-label={`Cell ${x},${y}`}
                className="aspect-square rounded-[3px] transition-colors"
                style={{ background: bg }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
