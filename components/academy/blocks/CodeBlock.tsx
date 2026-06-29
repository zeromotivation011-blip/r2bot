'use client'

// CodeBlock — Monaco editor + Pyodide (Python in browser). For non-Python
// languages we only check output against expected (no execution).

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BlockRenderProps } from './BlockRegistry'
import type { ContentBlock } from '@/lib/academy'

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

type Props = BlockRenderProps & { block: Extract<ContentBlock, { type: 'code-challenge' }> }

interface Pyodide {
  runPythonAsync(code: string, globals?: unknown): Promise<unknown>
  setStdout?: (h: { batched: (s: string) => void }) => void
  setStderr?: (h: { batched: (s: string) => void }) => void
}

interface PyodideWindow {
  loadPyodide?: (opts?: { indexURL?: string }) => Promise<Pyodide>
  __r2botPyodide?: Promise<Pyodide>
}

const PYODIDE_VERSION = '0.26.4'
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

async function ensurePyodide(): Promise<Pyodide> {
  if (typeof window === 'undefined') throw new Error('pyodide only runs in browser')
  const w = window as unknown as PyodideWindow
  if (w.__r2botPyodide) return w.__r2botPyodide
  w.__r2botPyodide = (async () => {
    if (!w.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script')
        s.src = `${PYODIDE_URL}pyodide.js`
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('Failed to load Pyodide script'))
        document.head.appendChild(s)
      })
    }
    if (!w.loadPyodide) throw new Error('Pyodide loader not available')
    return w.loadPyodide({ indexURL: PYODIDE_URL })
  })()
  return w.__r2botPyodide
}

export function CodeBlock({ block, isCompleted, onComplete }: Props) {
  const data = block.data
  const [code, setCode] = useState(data.starter_code)
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<{ idx: number; pass: boolean; expected: string; actual: string }[]>([])
  const [revealedHints, setRevealedHints] = useState(0)
  const [solutionShown, setSolutionShown] = useState(false)
  const [hindi, setHindi] = useState(false)
  const stdoutBuffer = useRef<string[]>([])

  const instructions = hindi && data.instructions_hi ? data.instructions_hi : data.instructions
  const isPython = data.language === 'python'

  const passed = useMemo(() => results.length > 0 && results.every(r => r.pass), [results])

  const run = useCallback(async () => {
    if (running) return
    setRunning(true)
    setOutput('')
    stdoutBuffer.current = []
    const localResults: typeof results = []

    if (!isPython) {
      // Non-Python: no execution — just compare verbatim "user output" if present
      setOutput('Non-Python languages are not executed in the browser. Submitting as-is.')
      setRunning(false)
      onComplete({ score: 100, responseData: { code, executed: false } })
      return
    }

    try {
      const py = await ensurePyodide()
      py.setStdout?.({ batched: (s: string) => { stdoutBuffer.current.push(s) } })
      py.setStderr?.({ batched: (s: string) => { stdoutBuffer.current.push(s) } })

      for (let i = 0; i < data.test_cases.length; i++) {
        const tc = data.test_cases[i]
        stdoutBuffer.current = []
        const wrapper = tc.input
          ? `import sys, io\nsys.stdin = io.StringIO(${JSON.stringify(tc.input)})\n${code}`
          : code
        try {
          await py.runPythonAsync(wrapper)
          const actual = stdoutBuffer.current.join('').trim()
          const expected = tc.expected_output.trim()
          const pass = actual === expected || actual.endsWith(expected)
          localResults.push({ idx: i, pass, expected, actual })
        } catch (err) {
          localResults.push({
            idx: i, pass: false,
            expected: tc.expected_output,
            actual: String(err),
          })
        }
      }
      setResults(localResults)
      setOutput(stdoutBuffer.current.join(''))
      const allPass = localResults.every(r => r.pass)
      const score = Math.round((localResults.filter(r => r.pass).length / localResults.length) * 100)
      onComplete({
        score,
        responseData: { code, passed: allPass, hintsUsed: revealedHints, solutionShown },
      })
    } catch (err) {
      setOutput(`Error loading Python runtime: ${String(err)}`)
    } finally {
      setRunning(false)
    }
  }, [code, data.test_cases, isPython, onComplete, revealedHints, running, solutionShown])

  return (
    <div className="cb">
      <div className="cb-header">
        <span className="cb-lang">{data.language}</span>
        {data.instructions_hi && (
          <button type="button" onClick={() => setHindi(h => !h)} className="cb-lang-toggle">
            {hindi ? 'EN' : 'हिन्दी'}
          </button>
        )}
      </div>
      <p className="cb-instructions">{instructions}</p>

      <div className="cb-editor-wrap">
        <Editor
          height="280px"
          language={data.language === 'cpp' || data.language === 'arduino' ? 'cpp' : data.language === 'javascript' ? 'javascript' : 'python'}
          value={code}
          onChange={(v) => setCode(v ?? '')}
          theme="vs-dark"
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 4,
            insertSpaces: true,
            automaticLayout: true,
          }}
        />
      </div>

      <div className="cb-actions">
        <button type="button" onClick={run} disabled={running} className="cb-run">
          {running ? 'Running…' : '▶ Run'}
        </button>
        {data.hints.length > 0 && revealedHints < data.hints.length && (
          <button
            type="button"
            onClick={() => setRevealedHints(n => n + 1)}
            className="cb-hint-btn"
          >
            💡 Hint ({revealedHints + 1} of {data.hints.length})
          </button>
        )}
        {data.solution && (passed || revealedHints >= data.hints.length) && !solutionShown && (
          <button
            type="button"
            onClick={() => setSolutionShown(true)}
            className="cb-solution-btn"
          >
            👀 Show solution
          </button>
        )}
      </div>

      {revealedHints > 0 && (
        <div className="cb-hints">
          {data.hints.slice(0, revealedHints).map((h, i) => (
            <p key={i} className="cb-hint">💡 {h}</p>
          ))}
        </div>
      )}

      {solutionShown && (
        <pre className="cb-solution"><code>{data.solution}</code></pre>
      )}

      {output && (
        <pre className="cb-output"><code>{output}</code></pre>
      )}

      {results.length > 0 && (
        <ul className="cb-tests">
          {results.map(r => (
            <li key={r.idx} className={r.pass ? 'is-pass' : 'is-fail'}>
              Test {r.idx + 1}: {r.pass ? '✓ pass' : `✗ expected "${r.expected}", got "${r.actual.slice(0, 60)}"`}
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .cb { display: flex; flex-direction: column; gap: 10px; }
        .cb-header { display: flex; gap: 8px; align-items: center; }
        .cb-lang {
          font-family: monospace; font-size: 11px;
          background: rgba(0,229,255,0.14);
          color: #00E5FF;
          padding: 4px 10px; border-radius: 999px;
          font-weight: 800;
        }
        .cb-lang-toggle {
          padding: 4px 10px; border-radius: 999px;
          background: rgba(251,191,36,0.14);
          color: #fbbf24;
          border: 1px solid rgba(251,191,36,0.3);
          font-weight: 800; font-size: 11px; cursor: pointer;
        }
        .cb-instructions { color: #c8d0dc; font-size: 14px; margin: 0; }
        .cb-editor-wrap {
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          overflow: hidden;
        }
        .cb-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .cb-run {
          min-height: 44px; padding: 0 22px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none; border-radius: 10px;
          font-weight: 900; cursor: pointer;
        }
        .cb-run:disabled { opacity: 0.5; cursor: not-allowed; }
        .cb-hint-btn, .cb-solution-btn {
          min-height: 44px; padding: 0 14px;
          background: rgba(251,191,36,0.14);
          color: #fbbf24;
          border: 1px solid rgba(251,191,36,0.3);
          border-radius: 10px;
          font-weight: 800; font-size: 13px; cursor: pointer;
        }
        .cb-hints { display: flex; flex-direction: column; gap: 6px; }
        .cb-hint {
          padding: 8px 12px;
          background: rgba(251,191,36,0.08);
          color: #fde68a;
          border-left: 3px solid #fbbf24;
          border-radius: 6px;
          font-size: 13px; margin: 0;
        }
        .cb-solution {
          background: #0b1220;
          border: 1px solid rgba(0,229,255,0.3);
          border-radius: 10px;
          padding: 14px; overflow-x: auto;
          font-size: 13px; color: #00E5FF;
        }
        .cb-output {
          background: #000;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 12px; overflow-x: auto;
          font-size: 12px; color: #6ee7b7;
          font-family: 'Menlo', 'Consolas', monospace;
          max-height: 200px; overflow-y: auto;
        }
        .cb-tests { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
        .cb-tests li {
          padding: 8px 12px; border-radius: 8px;
          font-family: monospace; font-size: 12px;
        }
        .cb-tests li.is-pass { background: rgba(16,185,129,0.12); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.3); }
        .cb-tests li.is-fail { background: rgba(249,115,22,0.12); color: #fb923c; border: 1px solid rgba(249,115,22,0.3); }
      `}</style>
    </div>
  )
}
