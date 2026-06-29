'use client'

// components/atlas/AtlasCommandSearch.tsx
// Command-palette style search for the Atlas. Opens as a full-screen overlay.
// Keyboard shortcuts: Cmd+K / Ctrl+K to open, ESC to close, ↑↓ to move, Enter to open.
// Styled with inline style={{}} only — no styled-jsx, no Tailwind.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Fuse from 'fuse.js'

export interface CommandSearchNode {
  slug: string
  type: string
  title: string
  bucket?: string
  bucketLabel?: string
  bucketEmoji?: string
  tagline?: string
  hookLine?: string
  oneLiner?: string
  summary?: string
  laymanExplanation?: string
  indianExample?: string
  tags?: string[]
  difficultyLevel?: number
}

interface AtlasCommandSearchProps {
  nodes: CommandSearchNode[]
  buckets?: { id: string; label: string; emoji?: string }[]
  showTrigger?: boolean
}

const STORAGE_KEY = 'r2bot_atlas_command_recent'
const MAX_RECENT = 5

function readRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}
function pushRecent(slug: string) {
  if (typeof window === 'undefined') return
  const list = [slug, ...readRecent().filter(s => s !== slug)].slice(0, MAX_RECENT)
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch { /* noop */ }
}

const PALETTE_EVENT = 'r2bot:atlas-cmd-search:open'

export function openAtlasCommandSearch() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PALETTE_EVENT))
  }
}

export function AtlasCommandSearch({ nodes, buckets = [], showTrigger = true }: AtlasCommandSearchProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [bucketFilter, setBucketFilter] = useState<string | null>(null)
  const [difficultyMax, setDifficultyMax] = useState(5)
  const [activeIdx, setActiveIdx] = useState(0)
  const [recentSlugs, setRecentSlugs] = useState<string[]>([])
  const [triggerHover, setTriggerHover] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if ((isMod && e.key.toLowerCase() === 'k') || e.key === '/') {
        const t = e.target as HTMLElement | null
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener(PALETTE_EVENT, handler)
    return () => window.removeEventListener(PALETTE_EVENT, handler)
  }, [])

  useEffect(() => {
    if (open) {
      setRecentSlugs(readRecent())
      setTimeout(() => inputRef.current?.focus(), 30)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setActiveIdx(0)
      setQuery('')
    }
  }, [open])

  const fuse = useMemo(
    () =>
      new Fuse(nodes, {
        keys: [
          { name: 'title', weight: 4 },
          { name: 'tagline', weight: 3 },
          { name: 'hookLine', weight: 3 },
          { name: 'oneLiner', weight: 2 },
          { name: 'laymanExplanation', weight: 1 },
          { name: 'indianExample', weight: 1 },
          { name: 'tags', weight: 1 },
          { name: 'bucketLabel', weight: 1 },
        ],
        threshold: 0.38,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [nodes],
  )

  const results = useMemo(() => {
    const q = query.trim()
    const base: CommandSearchNode[] = q
      ? fuse.search(q, { limit: 40 }).map(r => r.item)
      : nodes.slice(0, 40)
    return base
      .filter(n => (bucketFilter ? n.bucket === bucketFilter : true))
      .filter(n => (n.difficultyLevel ?? 0) <= difficultyMax)
  }, [query, fuse, nodes, bucketFilter, difficultyMax])

  const recent = useMemo(
    () => recentSlugs.map(s => nodes.find(n => n.slug === s)).filter(Boolean) as CommandSearchNode[],
    [recentSlugs, nodes],
  )

  const visible = results
  const showRecent = !query.trim() && recent.length > 0

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(visible.length - 1, i + 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)) }
      else if (e.key === 'Enter') {
        const hit = visible[activeIdx]
        if (hit) {
          pushRecent(hit.slug)
          setOpen(false)
          router.push(`/atlas/${hit.type}/${hit.slug}`)
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, visible, activeIdx, router])

  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  const handlePick = useCallback((node: CommandSearchNode) => {
    pushRecent(node.slug)
    setOpen(false)
    router.push(`/atlas/${node.type}/${node.slug}`)
  }, [router])

  return (
    <>
      {/* Keyframe animation injected as a plain <style> tag (not styled-jsx) */}
      <style>{`@keyframes acs-pop{from{transform:translateY(-6px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      {/* ── TRIGGER BUTTON ──────────────────────────────────── */}
      {showTrigger && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          onMouseEnter={() => setTriggerHover(true)}
          onMouseLeave={() => setTriggerHover(false)}
          aria-label="Search the Atlas (Cmd-K)"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            minHeight: 44, padding: '0 14px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${triggerHover ? '#00E5FF' : 'rgba(255,255,255,0.1)'}`,
            color: triggerHover ? '#fff' : '#c4b5fd',
            borderRadius: 12, cursor: 'pointer',
            fontWeight: 600, fontSize: 14,
            minWidth: 240, justifyContent: 'space-between',
            transition: 'border-color 0.15s, color 0.15s',
          }}
        >
          <span aria-hidden>🔍</span>
          <span style={{ color: '#94a3b8', flex: 1, textAlign: 'left' }}>Search concepts…</span>
          <span style={{
            fontSize: 11, fontWeight: 800, color: '#fde047',
            background: 'rgba(251,191,36,0.14)',
            padding: '2px 8px', borderRadius: 6,
            border: '1px solid rgba(251,191,36,0.3)',
          }}>⌘K</span>
        </button>
      )}

      {/* ── OVERLAY ─────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Atlas search"
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'grid', placeItems: 'start center',
            padding: '80px 16px',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(5,8,16,0.7)',
              backdropFilter: 'blur(8px)',
            }}
          />

          {/* Panel */}
          <div style={{
            position: 'relative',
            width: '100%', maxWidth: 720,
            background: '#0b1220',
            border: '1px solid rgba(124,58,237,0.45)',
            borderRadius: 18,
            boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            animation: 'acs-pop 0.18s cubic-bezier(.22,.61,.36,1)',
          }}>

            {/* Input row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '28px 1fr auto',
              gap: 12, alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span aria-hidden style={{ fontSize: 18, color: '#94a3b8' }}>🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIdx(0) }}
                placeholder={'Search 1,000+ concepts — try "PID", "SLAM", "self-driving"'}
                aria-label="Search concepts"
                autoComplete="off"
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: '#f4f4f5', fontSize: 17,
                  width: '100%', padding: '4px 0',
                  // placeholder colour handled via global style injected above
                }}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close search"
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.06)',
                  color: '#94a3b8', fontSize: 11, fontWeight: 800, letterSpacing: 1,
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                }}
              >ESC</button>
            </div>

            {/* Filters */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              {buckets.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {/* All chip */}
                  <ChipButton
                    active={bucketFilter === null}
                    onClick={() => setBucketFilter(null)}
                  >All</ChipButton>
                  {buckets.slice(0, 12).map(b => (
                    <ChipButton
                      key={b.id}
                      active={bucketFilter === b.id}
                      onClick={() => setBucketFilter(prev => prev === b.id ? null : b.id)}
                    >
                      {b.emoji && <span aria-hidden style={{ marginRight: 4 }}>{b.emoji}</span>}
                      {b.label}
                    </ChipButton>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>Up to difficulty:</span>
                {[1, 2, 3, 4, 5].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficultyMax(d)}
                    aria-label={`Max difficulty ${d}`}
                    style={{
                      background: 'transparent', border: 'none',
                      color: d <= difficultyMax ? '#fbbf24' : 'rgba(255,255,255,0.18)',
                      fontSize: 14, cursor: 'pointer', padding: '0 2px',
                    }}
                  >★</button>
                ))}
              </div>
            </div>

            {/* Recent */}
            {showRecent && (
              <div style={{ padding: '10px 8px 6px' }}>
                <p style={{
                  padding: '0 12px', fontSize: 10, letterSpacing: 2,
                  textTransform: 'uppercase', color: '#64748b', fontWeight: 800,
                  margin: '0 0 4px',
                }}>Recent</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 320, overflowY: 'auto' }}>
                  {recent.map(r => (
                    <li key={r.slug}>
                      <ResultRow
                        node={r}
                        isActive={false}
                        onPick={handlePick}
                        onHover={() => {}}
                        idx={-1}
                        activeIdx={activeIdx}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Results */}
            <div style={{ padding: '10px 8px 6px' }}>
              <p style={{
                padding: '0 12px', fontSize: 10, letterSpacing: 2,
                textTransform: 'uppercase', color: '#64748b', fontWeight: 800,
                margin: '0 0 4px',
              }}>
                {query.trim() ? `${visible.length} matches` : 'Browse'}
              </p>
              {visible.length === 0 ? (
                <p style={{ padding: 22, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                  No matches. Try a different word, or pick a bucket.
                </p>
              ) : (
                <ul ref={listRef} style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 320, overflowY: 'auto' }}>
                  {visible.slice(0, 25).map((n, i) => (
                    <li key={n.slug}>
                      <ResultRow
                        node={n}
                        isActive={i === activeIdx}
                        onPick={handlePick}
                        onHover={() => setActiveIdx(i)}
                        idx={i}
                        activeIdx={activeIdx}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', gap: 16,
              padding: '10px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(0,0,0,0.2)',
              fontSize: 11, color: '#64748b',
            }}>
              {[['↑↓', 'move'], ['Enter', 'open'], ['ESC', 'close']].map(([k, label]) => (
                <span key={k}>
                  <span style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    padding: '1px 6px', borderRadius: 4,
                    marginRight: 4, color: '#c4b5fd',
                  }}>{k}</span>
                  {label}
                </span>
              ))}
              <span style={{ marginLeft: 'auto', color: '#475569' }}>{nodes.length} concepts indexed</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── CHIP BUTTON ───────────────────────────────────────────────
function ChipButton({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '4px 10px', borderRadius: 999,
        background: active
          ? 'linear-gradient(135deg, #00E5FF, #A56BFF)'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'transparent' : hover ? '#fbbf24' : 'rgba(255,255,255,0.1)'}`,
        color: active ? '#0a0a16' : hover ? '#fde047' : '#c4b5fd',
        fontSize: 12, fontWeight: 700, cursor: 'pointer',
        transition: 'border-color 0.12s, color 0.12s',
      }}
    >{children}</button>
  )
}

// ── RESULT ROW ────────────────────────────────────────────────
function ResultRow({ node, isActive, onPick, onHover, idx }: {
  node: CommandSearchNode
  isActive: boolean
  onPick: (n: CommandSearchNode) => void
  onHover: () => void
  idx: number
  activeIdx: number
}) {
  return (
    <button
      type="button"
      data-idx={idx}
      onClick={() => onPick(node)}
      onMouseEnter={onHover}
      style={{
        width: '100%',
        display: 'grid', gridTemplateColumns: '24px 1fr auto auto',
        gap: 12, alignItems: 'center',
        padding: '10px 14px',
        background: isActive ? 'rgba(0,184,212,0.12)' : 'transparent',
        border: 'none', color: '#f4f4f5',
        cursor: 'pointer', textAlign: 'left',
        borderRadius: 8,
      }}
    >
      <span style={{ color: '#00E5FF', fontWeight: 900 }}>{isActive ? '→' : ' '}</span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{
          fontWeight: 700, fontSize: 14,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{node.title}</span>
        {(node.tagline || node.hookLine || node.oneLiner) && (
          <span style={{
            fontSize: 12, color: '#94a3b8',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{node.tagline ?? node.hookLine ?? node.oneLiner}</span>
        )}
      </span>
      {typeof node.difficultyLevel === 'number' && (
        <span style={{ color: '#fbbf24', fontSize: 10, letterSpacing: 1 }}>
          {'★'.repeat(node.difficultyLevel)}
        </span>
      )}
      {node.bucketLabel && (
        <span style={{
          fontSize: 11, color: '#c4b5fd',
          background: 'rgba(124,58,237,0.18)',
          padding: '2px 8px', borderRadius: 999,
          fontWeight: 700, whiteSpace: 'nowrap',
        }}>{node.bucketEmoji} {node.bucketLabel}</span>
      )}
    </button>
  )
}
