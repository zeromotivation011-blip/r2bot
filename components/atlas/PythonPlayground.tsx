'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    loadPyodide?: (opts?: { indexURL?: string }) => Promise<{
      runPythonAsync: (code: string) => Promise<unknown>;
      setStdout: (opts: { batched: (s: string) => void }) => void;
      setStderr: (opts: { batched: (s: string) => void }) => void;
    }>;
  }
}

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';

type PyState = 'unloaded' | 'loading' | 'ready' | 'running' | 'error';

const DEFAULT_CODE = `# Try Python right here in your browser!
# This is real Python, running via Pyodide.

print("Hello from R2BOT!")

# Tiny robotics example: list of sensors with their distances (cm)
distances = [12, 47, 8, 33, 60]
nearest = min(distances)
print(f"The closest object is {nearest} cm away")

if nearest < 20:
    print("ALERT: obstacle too close — turn!")
else:
    print("Path is clear — go forward.")
`;

export function PythonPlayground({ initialCode = DEFAULT_CODE }: { initialCode?: string }) {
  const [state, setState] = useState<PyState>('unloaded');
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string>('');
  const pyodideRef = useRef<Awaited<ReturnType<NonNullable<Window['loadPyodide']>>> | null>(null);
  const outputRef = useRef<HTMLPreElement | null>(null);

  function ensurePyodideScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('no window'));
        return;
      }
      if (window.loadPyodide) {
        resolve();
        return;
      }
      const existing = document.querySelector(`script[src="${PYODIDE_CDN}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('pyodide script failed to load')));
        return;
      }
      const s = document.createElement('script');
      s.src = PYODIDE_CDN;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('pyodide script failed to load'));
      document.head.appendChild(s);
    });
  }

  async function run() {
    setOutput('');
    setState('loading');
    try {
      if (!pyodideRef.current) {
        await ensurePyodideScript();
        pyodideRef.current = await window.loadPyodide!({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
        });
        pyodideRef.current.setStdout({
          batched: (s) => setOutput((o) => o + s + '\n'),
        });
        pyodideRef.current.setStderr({
          batched: (s) => setOutput((o) => o + '⚠ ' + s + '\n'),
        });
      }
      setState('running');
      await pyodideRef.current.runPythonAsync(code);
      setState('ready');
    } catch (e) {
      setOutput((o) => o + '\n[Error] ' + (e instanceof Error ? e.message : String(e)) + '\n');
      setState('error');
    }
  }

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const lineCount = code.split('\n').length;
  const status =
    state === 'loading' ? '⏳ Loading Python (first run only)…' :
    state === 'running' ? '▶ Running…' :
    state === 'error' ? '⚠ Error — see output' :
    state === 'ready' ? '✓ Ready' : '';

  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.04]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <p className="m-0 font-mono text-xs uppercase tracking-wider text-emerald-200">🐍 Python Playground · runs in your browser</p>
        <button
          type="button"
          onClick={run}
          disabled={state === 'loading' || state === 'running'}
          className="rounded-md bg-emerald-400 px-3 py-1 text-xs font-extrabold text-emerald-950 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === 'running' ? '▶ Running…' : '▶ Run'}
        </button>
      </div>
      <div className="grid gap-0 md:grid-cols-2">
        <div className="relative bg-[#0a0f1e] p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Editor · {lineCount} lines</p>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="mt-2 h-64 w-full resize-none rounded-md border border-white/10 bg-[#020617] p-3 font-mono text-xs leading-relaxed text-emerald-100 outline-none focus:border-emerald-400/40"
          />
        </div>
        <div className="bg-[#0a0f1e] p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Output {status ? `· ${status}` : ''}</p>
          <pre
            ref={outputRef}
            className="mt-2 h-64 overflow-auto rounded-md border border-white/10 bg-black p-3 font-mono text-xs text-emerald-200"
          >
            {output || (state === 'unloaded' ? "Press ▶ Run to execute. First run downloads Python (~6MB) — only happens once per page." : '')}
          </pre>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-2 text-[10px] text-zinc-500">
        Powered by <a href="https://pyodide.org" className="text-emerald-200 underline" target="_blank" rel="noopener noreferrer">Pyodide</a> · Python in WebAssembly · no server required.
      </p>
    </div>
  );
}
