'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COLS,
  START,
  GOAL,
  defaultGrid,
  medianMs,
  runAStar,
  runDijkstra,
  type CellState,
  type SearchResult,
  type Step,
} from './search';

type Timed = SearchResult & { ms: number };

const TIMING_RUNS = 15;
const ASTAR_COLOR = '#22d3ee';
const DIJKSTRA_COLOR = '#a78bfa';

function steps(path: Step[]): number {
  return Math.max(0, path.length - 1);
}

export function AlgoCompareClient() {
  const [grid, setGrid] = useState<CellState[][]>(() => defaultGrid());
  const [astar, setAstar] = useState<Timed | null>(null);
  const [dijkstra, setDijkstra] = useState<Timed | null>(null);
  const [animTick, setAnimTick] = useState(0);
  const [running, setRunning] = useState(false);
  const tickRef = useRef<number | null>(null);

  const toggleCell = useCallback((x: number, y: number) => {
    if ((x === START[0] && y === START[1]) || (x === GOAL[0] && y === GOAL[1])) return;
    setGrid((g) => g.map((row, ry) => (ry === y ? row.map((c, cx) => (cx === x ? (c === 'wall' ? 'empty' : 'wall') : c)) : row)));
    setAstar(null);
    setDijkstra(null);
    setRunning(false);
  }, []);

  const runBoth = useCallback(() => {
    const a = runAStar(grid);
    const d = runDijkstra(grid);
    // Timing is secondary and noisy at this size: median of several runs each,
    // Dijkstra timed first so A* does not always inherit a warm JIT.
    const dMs = medianMs(() => runDijkstra(grid), TIMING_RUNS);
    const aMs = medianMs(() => runAStar(grid), TIMING_RUNS);
    setAstar({ ...a, ms: aMs });
    setDijkstra({ ...d, ms: dMs });
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

  const done = astar !== null && dijkstra !== null && !running;

  return (
    <div className="mt-10">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={runBoth}
          className="min-h-[44px] rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2 text-sm font-extrabold text-[#1a0f00] hover:scale-[1.03]"
        >
          ▶ Run both
        </button>
        <button
          type="button"
          onClick={reset}
          className="min-h-[44px] rounded-xl border border-white/15 bg-white/[0.04] px-5 py-2 text-sm font-semibold text-zinc-200 hover:border-white/30"
        >
          Reset grid
        </button>
        <p className="m-0 text-xs text-zinc-500 sm:ml-auto">Click any cell to toggle a wall. Start = green, goal = orange.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <GridView
          label="A*"
          color={ASTAR_COLOR}
          grid={grid}
          visited={astar?.visited.slice(0, animTick) ?? []}
          total={astar?.visited.length}
          path={astar?.path ?? []}
          showPath={!running}
          onToggle={toggleCell}
        />
        <GridView
          label="Dijkstra"
          color={DIJKSTRA_COLOR}
          grid={grid}
          visited={dijkstra?.visited.slice(0, animTick) ?? []}
          total={dijkstra?.visited.length}
          path={dijkstra?.path ?? []}
          showPath={!running}
          onToggle={toggleCell}
        />
      </div>

      <div aria-live="polite">
        {done && astar && dijkstra ? <Verdict astar={astar} dijkstra={dijkstra} /> : null}
      </div>
    </div>
  );
}

function Verdict({ astar, dijkstra }: { astar: Timed; dijkstra: Timed }) {
  const reached = astar.path.length > 0;
  const a = astar.visited.length;
  const d = dijkstra.visited.length;
  const fewer = d > 0 ? Math.round(((d - a) / d) * 100) : 0;

  return (
    <div className="mt-6">
      <p className="m-0 text-base text-zinc-200">
        {reached ? (
          <>
            Both found a shortest path of <strong className="text-white">{steps(astar.path)} steps</strong>.{' '}
            {a < d ? (
              <>
                A* expanded <strong className="text-white">{a}</strong> cells to get there, Dijkstra{' '}
                <strong className="text-white">{d}</strong>: {fewer}% fewer.
              </>
            ) : (
              <>Here the heuristic gave A* no shortcut: both expanded {a === d ? 'the same number of' : 'almost as many'} cells.</>
            )}
          </>
        ) : (
          <>No path: the goal is walled off, so both searched every cell they could reach before giving up.</>
        )}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Stat label="A*" color={ASTAR_COLOR} expanded={a} pathSteps={reached ? steps(astar.path) : null} ms={astar.ms} />
        <Stat label="Dijkstra" color={DIJKSTRA_COLOR} expanded={d} pathSteps={reached ? steps(dijkstra.path) : null} ms={dijkstra.ms} />
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Time is the median of {TIMING_RUNS} runs in your browser. On a grid this small both finish in milliseconds and the
        number moves with your device and how each open list is stored, so cells expanded is the fair comparison: it is the
        work the heuristic saves, and it grows with the map.
      </p>
    </div>
  );
}

function Stat({
  label,
  color,
  expanded,
  pathSteps,
  ms,
}: {
  label: string;
  color: string;
  expanded: number;
  pathSteps: number | null;
  ms: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="m-0 text-xs font-bold uppercase tracking-wider" style={{ color }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold text-white">
        {expanded} <span className="text-base font-bold text-zinc-300">cells expanded</span>
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        {pathSteps !== null ? `Path: ${pathSteps} steps` : 'No path'} · {ms < 0.1 ? '<0.1' : ms.toFixed(1)} ms
      </p>
    </div>
  );
}

function GridView({
  label,
  color,
  grid,
  visited,
  total,
  path,
  showPath,
  onToggle,
}: {
  label: string;
  color: string;
  grid: CellState[][];
  visited: Step[];
  total?: number;
  path: Step[];
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
        {typeof total === 'number' ? (
          <p className="m-0 font-mono text-xs text-zinc-300">
            {Math.min(visited.length, total)} cells expanded
          </p>
        ) : null}
      </div>
      <div className="grid select-none gap-px" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
        {grid.map((row, y) =>
          row.map((c, x) => {
            const isStart = x === START[0] && y === START[1];
            const isGoal = x === GOAL[0] && y === GOAL[1];
            const k = `${x},${y}`;
            let bg = 'rgba(255,255,255,0.04)';
            if (c === 'wall') bg = 'rgba(255,255,255,0.55)';
            else if (isStart) bg = '#34d399';
            else if (isGoal) bg = '#FC6818';
            else if (pathSet.has(k)) bg = color;
            else if (visitedSet.has(k)) bg = `${color}55`;
            return (
              <button
                key={k}
                type="button"
                onClick={() => onToggle(x, y)}
                aria-label={`Cell ${x},${y}${c === 'wall' ? ', wall' : ''}`}
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
