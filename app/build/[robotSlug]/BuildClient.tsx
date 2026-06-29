'use client'
// app/build/[robotSlug]/BuildClient.tsx — adaptive build engine

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ProjectMeta, ProjectTree, TreeNode } from '@/lib/build/types'
import { SubmitBuildModal } from '@/components/SubmitBuildModal'

type EngineState =
  | 'reading'
  | 'questioning'
  | 'hint1'
  | 'hint2'
  | 'revealed'
  | 'correct'
  | 'complete'

interface HistoryEntry {
  nodeId: string
  xpAwarded: number
}

interface BuildClientProps {
  meta: ProjectMeta
  tree: ProjectTree
}

const STORAGE_PREFIX = 'r2bot:build:'

function storageKey(slug: string) {
  return `${STORAGE_PREFIX}${slug}`
}

function nextNodeId(node: TreeNode, on: 'correct' | 'wrong' | 'next'): string | null {
  const branch =
    node.branches.find((b) => b.on === on) ??
    node.branches.find((b) => b.on === 'next') ??
    node.branches.find((b) => b.on === 'correct')
  return branch ? branch.to : null
}

function renderMarkdownLite(text: string): React.ReactNode {
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  let codeLines: string[] | null = null
  let listItems: string[] | null = null

  const flushCode = (key: string) => {
    if (codeLines) {
      out.push(
        <pre
          key={`code-${key}`}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: 14,
            margin: '12px 0',
            overflowX: 'auto',
            fontSize: 13.5,
            lineHeight: 1.6,
            color: '#a7f3d0',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
        >
          {codeLines.join('\n')}
        </pre>,
      )
      codeLines = null
    }
  }

  const flushList = (key: string) => {
    if (listItems) {
      out.push(
        <ul
          key={`list-${key}`}
          style={{ margin: '8px 0 8px 22px', padding: 0, color: '#d1d5db' }}
        >
          {listItems.map((li, i) => (
            <li key={i} style={{ marginBottom: 4, lineHeight: 1.6 }}>
              {renderInline(li)}
            </li>
          ))}
        </ul>,
      )
      listItems = null
    }
  }

  lines.forEach((raw, idx) => {
    const line = raw
    if (line.trim().startsWith('```')) {
      if (codeLines) {
        flushCode(String(idx))
      } else {
        flushList(String(idx))
        codeLines = []
      }
      return
    }
    if (codeLines) {
      codeLines.push(line)
      return
    }
    const listMatch = line.match(/^\s*-\s+(.*)$/)
    if (listMatch) {
      if (!listItems) listItems = []
      listItems.push(listMatch[1])
      return
    }
    flushList(String(idx))
    if (line.trim() === '') {
      out.push(<div key={`sp-${idx}`} style={{ height: 8 }} />)
    } else {
      out.push(
        <p
          key={`p-${idx}`}
          style={{
            margin: '6px 0',
            color: '#d1d5db',
            lineHeight: 1.65,
            fontSize: 15,
          }}
        >
          {renderInline(line)}
        </p>,
      )
    }
  })
  flushCode('end')
  flushList('end')
  return out
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let key = 0
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**')) {
      parts.push(
        <strong key={`b-${key++}`} style={{ color: '#ffffff', fontWeight: 700 }}>
          {token.slice(2, -2)}
        </strong>,
      )
    } else {
      parts.push(
        <code
          key={`c-${key++}`}
          style={{
            background: 'rgba(255,255,255,0.06)',
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: '0.92em',
            color: '#a7f3d0',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
        >
          {token.slice(1, -1)}
        </code>,
      )
    }
    lastIndex = match.index + token.length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts.length > 0 ? parts : text
}

function levelTone(level: ProjectMeta['level']): string {
  if (level === 'beginner') return '#22d3ee'
  if (level === 'intermediate') return '#a78bfa'
  return '#f472b6'
}

export function BuildClient({ meta, tree }: BuildClientProps) {
  const totalNodes = Object.keys(tree.nodes).length
  const [currentId, setCurrentId] = useState<string>(tree.root)
  const [showSubmit, setShowSubmit] = useState<boolean>(false)
  const [state, setState] = useState<EngineState>('reading')
  const [attempts, setAttempts] = useState<number>(0)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [xp, setXp] = useState<number>(0)
  const [displayedXp, setDisplayedXp] = useState<number>(0)
  const [textAnswer, setTextAnswer] = useState<string>('')
  const [shake, setShake] = useState<boolean>(false)
  const correctTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const node: TreeNode | undefined = tree.nodes[currentId]
  const progressIndex = useMemo(() => {
    return history.findIndex((h) => h.nodeId === currentId)
  }, [history, currentId])
  const progressValue =
    progressIndex >= 0 ? progressIndex + 1 : Math.min(history.length + 1, totalNodes)
  const progressPct = Math.min(100, (progressValue / totalNodes) * 100)

  // Load saved progress.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(storageKey(meta.slug))
      if (!raw) return
      const saved = JSON.parse(raw) as {
        currentId?: string
        xp?: number
        history?: HistoryEntry[]
      }
      if (saved.currentId && tree.nodes[saved.currentId]) {
        setCurrentId(saved.currentId)
      }
      if (typeof saved.xp === 'number') {
        setXp(saved.xp)
        setDisplayedXp(saved.xp)
      }
      if (Array.isArray(saved.history)) {
        setHistory(saved.history)
        setHistoryIndex(saved.history.length - 1)
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist progress.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        storageKey(meta.slug),
        JSON.stringify({ currentId, xp, history }),
      )
    } catch {
      // ignore
    }
  }, [meta.slug, currentId, xp, history])

  // Reset transient state when node changes.
  useEffect(() => {
    if (!node) return
    setAttempts(0)
    setTextAnswer('')
    setShake(false)
    if (node.type === 'complete') setState('complete')
    else if (node.type === 'question') setState('questioning')
    else setState('reading')
    return () => {
      if (correctTimer.current) {
        clearTimeout(correctTimer.current)
        correctTimer.current = null
      }
    }
  }, [node])

  // XP count-up animation.
  useEffect(() => {
    if (displayedXp === xp) return
    const diff = xp - displayedXp
    const step = Math.max(1, Math.ceil(Math.abs(diff) / 20))
    const id = setTimeout(() => {
      setDisplayedXp((prev) =>
        diff > 0 ? Math.min(xp, prev + step) : Math.max(xp, prev - step),
      )
    }, 22)
    return () => clearTimeout(id)
  }, [xp, displayedXp])

  const recordAndAdvance = useCallback(
    (
      nextId: string,
      awardedXp: number,
      currentNode: TreeNode,
      isReplay: boolean,
    ) => {
      if (!isReplay) {
        setHistory((prev) => {
          const trimmed = prev.slice(0, historyIndex + 1)
          const exists = trimmed.find((h) => h.nodeId === currentNode.id)
          const next = exists
            ? trimmed
            : [...trimmed, { nodeId: currentNode.id, xpAwarded: awardedXp }]
          setHistoryIndex(next.length - 1)
          return next
        })
        if (awardedXp > 0) setXp((prev) => prev + awardedXp)
      }
      setCurrentId(nextId)
    },
    [historyIndex],
  )

  const advance = useCallback(
    (on: 'correct' | 'wrong' | 'next', awardedXp: number) => {
      if (!node) return
      const target = nextNodeId(node, on)
      if (!target) {
        setState('complete')
        return
      }
      recordAndAdvance(target, awardedXp, node, false)
    },
    [node, recordAndAdvance],
  )

  const handleContinueExplanation = useCallback(() => {
    if (!node) return
    advance('next', node.xp)
  }, [node, advance])

  const handleAnswer = useCallback(
    (rawAnswer: string | number) => {
      if (!node || !node.question) return
      const q = node.question
      let isCorrect = false
      if (q.style === 'mcq') {
        isCorrect = Number(rawAnswer) === Number(q.correct)
      } else if (q.style === 'boolean') {
        isCorrect =
          String(rawAnswer).toLowerCase() === String(q.correct).toLowerCase()
      } else if (q.style === 'number-input') {
        isCorrect = Number(rawAnswer) === Number(q.correct)
      } else if (q.style === 'code-fill') {
        const normA = String(rawAnswer).replace(/\s+/g, '').toLowerCase()
        const normB = String(q.correct).replace(/\s+/g, '').toLowerCase()
        isCorrect = normA === normB
      }

      if (isCorrect) {
        setState('correct')
        if (correctTimer.current) clearTimeout(correctTimer.current)
        correctTimer.current = setTimeout(() => {
          advance('correct', node.xp)
        }, 1700)
        return
      }

      // Wrong path.
      setShake(true)
      setTimeout(() => setShake(false), 420)
      const nextAttempts = attempts + 1
      setAttempts(nextAttempts)
      if (nextAttempts === 1) setState('hint1')
      else if (nextAttempts === 2) setState('hint2')
      else setState('revealed')
    },
    [node, attempts, advance],
  )

  const handleRevealedContinue = useCallback(() => {
    if (!node) return
    // Award half XP when revealed (still rewards effort).
    const partial = Math.floor(node.xp / 2)
    advance('correct', partial)
  }, [node, advance])

  const handleBack = useCallback(() => {
    if (historyIndex <= 0) return
    const prevEntry = history[historyIndex - 1]
    setHistoryIndex(historyIndex - 1)
    setCurrentId(prevEntry.nodeId)
  }, [history, historyIndex])

  const handleForward = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const nextEntry = history[historyIndex + 1]
    setHistoryIndex(historyIndex + 1)
    setCurrentId(nextEntry.nodeId)
  }, [history, historyIndex])

  const handleReset = useCallback(() => {
    if (typeof window === 'undefined') return
    if (!window.confirm('Reset your progress on this robot? XP will be cleared.')) return
    window.localStorage.removeItem(storageKey(meta.slug))
    setCurrentId(tree.root)
    setHistory([])
    setHistoryIndex(-1)
    setXp(0)
    setDisplayedXp(0)
  }, [meta.slug, tree.root])

  if (!node) {
    return (
      <main
        style={{
          background: '#07070f',
          minHeight: '100vh',
          color: '#e5e7eb',
          padding: 24,
          paddingTop: 96,
          textAlign: 'center',
        }}
      >
        <p>Node not found.</p>
      </main>
    )
  }

  const isReviewing = historyIndex < history.length - 1
  const accent = meta.color
  const inReadOnly = isReviewing

  return (
    <main
      style={{
        background: '#07070f',
        minHeight: '100vh',
        color: '#e5e7eb',
        paddingTop: 72,
      }}
    >
      <style>{`
        @keyframes shake { 10%, 90% { transform: translateX(-2px); } 20%, 80% { transform: translateX(4px); } 30%, 50%, 70% { transform: translateX(-8px); } 40%, 60% { transform: translateX(8px); } }
        @keyframes pulseGreen { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.45); } 70% { box-shadow: 0 0 0 18px rgba(16,185,129,0); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .build-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        .build-pulse { animation: pulseGreen 1.4s ease-out 1; }
        .build-fade { animation: fadeIn 0.35s ease-out both; }
      `}</style>

      {/* Top bar: progress + XP + meta */}
      <div
        style={{
          position: 'sticky',
          top: 64,
          zIndex: 30,
          backdropFilter: 'blur(8px)',
          background: 'rgba(7,7,15,0.85)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/build"
            style={{
              color: '#9ca3af',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            ← All builds
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span style={{ fontSize: 22 }}>{meta.icon}</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {meta.title}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${accent}, ${levelTone(meta.level)})`,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#9ca3af',
                marginTop: 4,
                textAlign: 'right',
              }}
            >
              {progressValue} / {totalNodes}
            </div>
          </div>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.3)',
              color: '#fbbf24',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ⚡ {displayedXp.toLocaleString()} XP
          </div>
        </div>
      </div>

      {/* Read-only review banner */}
      {inReadOnly && (
        <div
          style={{
            maxWidth: 900,
            margin: '16px auto 0',
            padding: '10px 16px',
            borderRadius: 10,
            background: 'rgba(96,165,250,0.1)',
            border: '1px solid rgba(96,165,250,0.3)',
            color: '#93c5fd',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span>
            👀 Reviewing a previous step (read-only). You already answered this one.
          </span>
          <button
            onClick={() => setHistoryIndex(history.length - 1)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(96,165,250,0.5)',
              color: '#93c5fd',
              padding: '4px 10px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Return to current step →
          </button>
        </div>
      )}

      {/* Main node card */}
      <section
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '28px 20px 80px',
        }}
      >
        <NodeCard
          key={node.id}
          node={node}
          state={state}
          attempts={attempts}
          shake={shake}
          accent={accent}
          readOnly={inReadOnly}
          textAnswer={textAnswer}
          setTextAnswer={setTextAnswer}
          onAnswer={handleAnswer}
          onContinueExplanation={handleContinueExplanation}
          onRevealedContinue={handleRevealedContinue}
        />

        {/* Footer controls */}
        <div
          style={{
            marginTop: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleBack}
              disabled={historyIndex <= 0}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                color: historyIndex <= 0 ? '#4b5563' : '#d1d5db',
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Back
            </button>
            <button
              onClick={handleForward}
              disabled={historyIndex >= history.length - 1}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                color:
                  historyIndex >= history.length - 1 ? '#4b5563' : '#d1d5db',
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor:
                  historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Forward →
            </button>
          </div>
          <button
            onClick={handleReset}
            style={{
              background: 'transparent',
              border: '1px solid rgba(248,113,113,0.3)',
              color: '#f87171',
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset progress
          </button>
        </div>

        {/* Components inventory */}
        <details
          style={{
            marginTop: 28,
            padding: '14px 18px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <summary
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#d1d5db',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            📦 Parts you'll need ({meta.components.length})
          </summary>
          <ul style={{ margin: '12px 0 0', padding: '0 0 0 18px', color: '#9ca3af', fontSize: 13 }}>
            {meta.components.map((c) => (
              <li key={c.name} style={{ marginBottom: 4, lineHeight: 1.6 }}>
                {c.name}
                {c.optional && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.06)',
                      color: '#9ca3af',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Optional
                  </span>
                )}
              </li>
            ))}
          </ul>
          {meta.simulation_only && (
            <p
              style={{
                margin: '12px 0 0',
                fontSize: 12,
                color: '#fbbf24',
                lineHeight: 1.55,
              }}
            >
              💡 This project is simulation-only — no physical hardware required.
            </p>
          )}
        </details>
      </section>

      {/* Sticky "Share your build" CTA + modal */}
      <button
        type="button"
        onClick={() => setShowSubmit(true)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 90,
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', background: '#fbbf24', color: '#1a0f00',
          border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 900,
          cursor: 'pointer', boxShadow: '0 12px 28px rgba(251,191,36,0.4)',
        }}
      >
        📸 Share your build →
      </button>
      <SubmitBuildModal
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        projectSlug={meta.slug}
        projectTitle={meta.title}
      />
    </main>
  )
}

/* ─── Node card ──────────────────────────────────────────────────── */

interface NodeCardProps {
  node: TreeNode
  state: EngineState
  attempts: number
  shake: boolean
  accent: string
  readOnly: boolean
  textAnswer: string
  setTextAnswer: (v: string) => void
  onAnswer: (v: string | number) => void
  onContinueExplanation: () => void
  onRevealedContinue: () => void
}

function NodeCard({
  node,
  state,
  attempts,
  shake,
  accent,
  readOnly,
  textAnswer,
  setTextAnswer,
  onAnswer,
  onContinueExplanation,
  onRevealedContinue,
}: NodeCardProps) {
  const borderColor =
    state === 'correct'
      ? 'rgba(16,185,129,0.55)'
      : state === 'hint1' || state === 'hint2' || state === 'revealed'
        ? 'rgba(248,113,113,0.55)'
        : `${accent}55`
  const background =
    state === 'correct' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)'

  const className = [
    'build-fade',
    shake ? 'build-shake' : '',
    state === 'correct' ? 'build-pulse' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      className={className}
      style={{
        borderRadius: 18,
        border: `1px solid ${borderColor}`,
        background,
        padding: 28,
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.25s ease, background 0.25s ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background:
            state === 'correct'
              ? 'linear-gradient(90deg, #10b981, transparent)'
              : `linear-gradient(90deg, ${accent}, transparent)`,
        }}
      />

      <NodeTypeBadge type={node.type} accent={accent} />

      <h1
        style={{
          margin: '12px 0 6px',
          fontSize: 26,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: -0.4,
          lineHeight: 1.2,
        }}
      >
        {node.title}
      </h1>

      <div style={{ marginTop: 14 }}>{renderMarkdownLite(node.body)}</div>

      {/* Simulation embed */}
      {node.type === 'simulation' && node.simulation_url && (
        <div
          style={{
            marginTop: 20,
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            background: '#000',
          }}
        >
          <iframe
            src={node.simulation_url}
            title={`Simulation: ${node.title}`}
            style={{
              width: '100%',
              height: 420,
              border: 'none',
              display: 'block',
            }}
            allow="autoplay; gyroscope; accelerometer"
          />
        </div>
      )}

      {/* Question UI */}
      {node.type === 'question' && node.question && !readOnly && (
        <QuestionBlock
          question={node.question}
          state={state}
          hint={attempts >= 1 ? node.hint : undefined}
          hint2={attempts >= 2 ? node.hint2 : undefined}
          textAnswer={textAnswer}
          setTextAnswer={setTextAnswer}
          onAnswer={onAnswer}
          accent={accent}
        />
      )}

      {/* Review-mode question (read-only) */}
      {node.type === 'question' && node.question && readOnly && (
        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 12,
            background: 'rgba(96,165,250,0.08)',
            border: '1px solid rgba(96,165,250,0.25)',
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: '#93c5fd', fontWeight: 600 }}>
            Question (reviewed)
          </p>
          <p style={{ margin: '8px 0 0', color: '#d1d5db', fontSize: 14 }}>
            {node.question.prompt}
          </p>
          <p
            style={{
              margin: '10px 0 0',
              color: '#a7f3d0',
              fontSize: 13.5,
              lineHeight: 1.6,
            }}
          >
            {node.question.explanation_correct}
          </p>
        </div>
      )}

      {/* Feedback panels */}
      {state === 'correct' && node.question && (
        <FeedbackPanel
          tone="success"
          title="✓ Correct"
          body={node.question.explanation_correct}
          xpEarned={node.xp}
        />
      )}
      {state === 'revealed' && node.question && (
        <>
          <FeedbackPanel
            tone="reveal"
            title="Here's the answer"
            body={node.question.explanation_wrong}
            xpEarned={Math.floor(node.xp / 2)}
          />
          <button
            onClick={onRevealedContinue}
            style={primaryButtonStyle(accent)}
          >
            Got it — continue →
          </button>
        </>
      )}

      {/* Continue for non-question nodes */}
      {(node.type === 'explanation' ||
        node.type === 'simulation' ||
        node.type === 'checkpoint') && (
        <button
          onClick={onContinueExplanation}
          style={{ ...primaryButtonStyle(accent), marginTop: 22 }}
        >
          {node.type === 'simulation'
            ? 'I ran it, continue →'
            : node.type === 'checkpoint'
              ? `Claim ${node.xp} XP & continue →`
              : 'Got it, continue →'}
        </button>
      )}

      {/* Complete node */}
      {node.type === 'complete' && (
        <CompleteCelebration node={node} accent={accent} />
      )}
    </article>
  )
}

function NodeTypeBadge({ type, accent }: { type: TreeNode['type']; accent: string }) {
  const label =
    type === 'question'
      ? 'Question'
      : type === 'simulation'
        ? 'Simulation'
        : type === 'checkpoint'
          ? 'Checkpoint'
          : type === 'complete'
            ? 'Complete'
            : 'Concept'
  const icon =
    type === 'question'
      ? '❓'
      : type === 'simulation'
        ? '🎮'
        : type === 'checkpoint'
          ? '🏁'
          : type === 'complete'
            ? '🏆'
            : '💡'
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        background: `${accent}1a`,
        border: `1px solid ${accent}50`,
        color: accent,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.7,
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  )
}

interface QuestionBlockProps {
  question: NonNullable<TreeNode['question']>
  state: EngineState
  hint?: string
  hint2?: string
  textAnswer: string
  setTextAnswer: (v: string) => void
  onAnswer: (v: string | number) => void
  accent: string
}

function QuestionBlock({
  question,
  state,
  hint,
  hint2,
  textAnswer,
  setTextAnswer,
  onAnswer,
  accent,
}: QuestionBlockProps) {
  const disabled = state === 'correct' || state === 'revealed'

  return (
    <div style={{ marginTop: 22 }}>
      <p
        style={{
          margin: '0 0 14px',
          fontSize: 16,
          fontWeight: 600,
          color: '#ffffff',
          lineHeight: 1.5,
        }}
      >
        {question.prompt}
      </p>

      {question.style === 'mcq' && question.options && (
        <div style={{ display: 'grid', gap: 10 }}>
          {question.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => onAnswer(idx)}
              disabled={disabled}
              style={optionCardStyle(accent, disabled)}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: `${accent}22`,
                  color: accent,
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span style={{ textAlign: 'left' }}>{opt}</span>
            </button>
          ))}
        </div>
      )}

      {question.style === 'boolean' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            onClick={() => onAnswer('yes')}
            disabled={disabled}
            style={booleanCardStyle('#10b981', disabled)}
          >
            <span style={{ fontSize: 28 }}>👍</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>YES / TRUE</span>
          </button>
          <button
            onClick={() => onAnswer('no')}
            disabled={disabled}
            style={booleanCardStyle('#f87171', disabled)}
          >
            <span style={{ fontSize: 28 }}>👎</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>NO / FALSE</span>
          </button>
        </div>
      )}

      {question.style === 'boolean' && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: '#6b7280',
            textAlign: 'center',
          }}
        >
          (Boolean correct values accepted: yes/true, no/false)
        </div>
      )}

      {question.style === 'number-input' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (textAnswer.trim() === '') return
            onAnswer(Number(textAnswer))
          }}
          style={{ display: 'flex', gap: 10 }}
        >
          <input
            type="number"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            disabled={disabled}
            placeholder="Enter a number"
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${accent}40`,
              color: '#ffffff',
              fontSize: 15,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              outline: 'none',
            }}
          />
          <button type="submit" disabled={disabled} style={primaryButtonStyle(accent)}>
            Submit
          </button>
        </form>
      )}

      {question.style === 'code-fill' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (textAnswer.trim() === '') return
            onAnswer(textAnswer)
          }}
          style={{ display: 'grid', gap: 10 }}
        >
          <textarea
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            disabled={disabled}
            rows={3}
            placeholder="Type your answer"
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${accent}40`,
              color: '#a7f3d0',
              fontSize: 14,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <button type="submit" disabled={disabled} style={primaryButtonStyle(accent)}>
            Submit answer
          </button>
        </form>
      )}

      {/* Hints */}
      {(hint || hint2) && (
        <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
          {hint && (
            <HintCard label="Hint 1" body={hint} tone="amber" />
          )}
          {hint2 && (
            <HintCard label="Hint 2" body={hint2} tone="orange" />
          )}
        </div>
      )}
    </div>
  )
}

function HintCard({
  label,
  body,
  tone,
}: {
  label: string
  body: string
  tone: 'amber' | 'orange'
}) {
  const c = tone === 'amber' ? '#fbbf24' : '#fb923c'
  return (
    <div
      className="build-fade"
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        background: `${c}14`,
        border: `1px solid ${c}40`,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 700,
          color: c,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}
      >
        💡 {label}
      </p>
      <p style={{ margin: '6px 0 0', color: '#e5e7eb', fontSize: 14, lineHeight: 1.55 }}>
        {body}
      </p>
    </div>
  )
}

function FeedbackPanel({
  tone,
  title,
  body,
  xpEarned,
}: {
  tone: 'success' | 'reveal'
  title: string
  body: string
  xpEarned: number
}) {
  const c = tone === 'success' ? '#10b981' : '#fb923c'
  return (
    <div
      className="build-fade"
      style={{
        marginTop: 18,
        padding: 16,
        borderRadius: 12,
        background: `${c}14`,
        border: `1px solid ${c}50`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 800,
            color: c,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          {title}
        </p>
        {xpEarned > 0 && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#fbbf24',
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.3)',
            }}
          >
            +{xpEarned} XP
          </span>
        )}
      </div>
      <p style={{ margin: 0, color: '#e5e7eb', fontSize: 14.5, lineHeight: 1.6 }}>
        {body}
      </p>
    </div>
  )
}

function CompleteCelebration({ node, accent }: { node: TreeNode; accent: string }) {
  return (
    <div style={{ marginTop: 24, textAlign: 'center' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: `${accent}22`,
          border: `2px solid ${accent}`,
          fontSize: 48,
          marginBottom: 18,
        }}
      >
        🏆
      </div>
      <p style={{ margin: '0 0 22px', color: '#9ca3af', fontSize: 14 }}>
        Project complete. +{node.xp} XP awarded.
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: 'center',
        }}
      >
        <Link
          href="/build"
          style={{
            ...primaryButtonStyle(accent),
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Pick your next robot →
        </Link>
        <Link
          href="/profile"
          style={{
            padding: '12px 22px',
            borderRadius: 10,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.18)',
            color: '#d1d5db',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          View certificate
        </Link>
      </div>
    </div>
  )
}

/* ─── Button styles ──────────────────────────────────────────────── */

function primaryButtonStyle(accent: string): React.CSSProperties {
  return {
    marginTop: 18,
    padding: '12px 22px',
    borderRadius: 10,
    background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
    color: '#0b0b14',
    border: 'none',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    letterSpacing: 0.2,
  }
}

function optionCardStyle(accent: string, disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${accent}33`,
    color: '#e5e7eb',
    fontSize: 14.5,
    cursor: disabled ? 'not-allowed' : 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.1s ease',
    opacity: disabled ? 0.6 : 1,
  }
}

function booleanCardStyle(color: string, disabled: boolean): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '22px 14px',
    borderRadius: 14,
    background: `${color}14`,
    border: `1px solid ${color}55`,
    color,
    cursor: disabled ? 'not-allowed' : 'pointer',
    minHeight: 110,
    opacity: disabled ? 0.6 : 1,
  }
}
