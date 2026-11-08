'use client'

// components/search/SiteSearch.tsx
//
// Site-wide search. Opens as a command palette over any page.
//
// Why this exists: the Atlas had a good Fuse-powered palette mounted on /atlas
// and nothing else did, so 923 indexable URLs were reachable only through the
// menus or Google. Someone landing on a Quick Lesson from YouTube could not
// look up the next term they did not know.
//
// Shortcuts: "/" opens it (⌘K is the Co-pilot and stays that way — they are
// different jobs: this finds a page that exists, Ask R2 answers a question).
// ↑ ↓ to move, Enter to open, Esc to close.
//
// The index is fetched once, on first open, from /api/search-index.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Fuse from 'fuse.js'
import type { SearchNode } from '@/lib/site-search'

const RECENT_KEY = 'r2bot_site_search_recent'
const MAX_RECENT = 5
const MAX_RESULTS = 24

function readRecent(): SearchNode[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as SearchNode[]).slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

function pushRecent(node: SearchNode) {
  try {
    const next = [node, ...readRecent().filter((n) => n.href !== node.href)].slice(0, MAX_RECENT)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* private mode, quota, or storage disabled — recents are a convenience */
  }
}

export function SiteSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [nodes, setNodes] = useState<SearchNode[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [active, setActive] = useState(0)
  const [recent, setRecent] = useState<SearchNode[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Fetch the index once, on first open.
  useEffect(() => {
    if (!open || nodes !== null) return
    let cancelled = false
    fetch('/api/search-index')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { nodes: SearchNode[] }) => {
        if (!cancelled) setNodes(d.nodes)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [open, nodes])

  const show = useCallback(() => {
    setRecent(readRecent())
    setOpen(true)
  }, [])

  const hide = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActive(0)
  }, [])

  // "/" to open, from anywhere that is not a text field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        hide()
        return
      }
      if (e.key !== '/' || open) return
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return
      e.preventDefault()
      show()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, hide, show])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Lock the page behind the overlay, so a long result list does not scroll
  // the page underneath on mobile.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const fuse = useMemo(() => {
    if (!nodes) return null
    return new Fuse(nodes, {
      includeScore: true,
      threshold: 0.38, // forgiving of a typo, strict enough to avoid noise
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: [
        { name: 'title', weight: 0.6 },
        { name: 'tags', weight: 0.25 },
        { name: 'sub', weight: 0.15 },
      ],
    })
  }, [nodes])

  const results = useMemo(() => {
    const q = query.trim()
    if (!q) return recent
    if (!fuse) return []
    return fuse.search(q, { limit: MAX_RESULTS }).map((r) => r.item)
  }, [query, fuse, recent])

  useEffect(() => {
    setActive(0)
  }, [query])

  const go = useCallback(
    (node: SearchNode) => {
      pushRecent(node)
      hide()
      router.push(node.href)
    },
    [hide, router],
  )

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const node = results[active]
      if (node) go(node)
    }
  }

  // Keep the highlighted row in view when moving with the keyboard.
  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label="Search R2BOT"
        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-white/20 px-1.5 text-[11px] text-white/50 md:inline">/</kbd>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search R2BOT"
          className="fixed inset-0 z-[120] flex items-start justify-center bg-black/70 px-4 pt-[8vh] backdrop-blur-sm"
          onClick={hide}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/40">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search concepts, lessons, robots…"
                aria-label="Search query"
                className="w-full bg-transparent py-4 text-base text-white placeholder:text-white/35 focus:outline-none"
              />
              <button
                type="button"
                onClick={hide}
                aria-label="Close search"
                className="rounded px-2 py-1 text-xs text-white/40 hover:text-white"
              >
                Esc
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {loadFailed ? (
                <p className="px-4 py-8 text-center text-sm text-white/50">
                  Search could not load. Try the{' '}
                  <a href="/atlas" className="r2-link">
                    Atlas
                  </a>
                  .
                </p>
              ) : !nodes && query ? (
                <p className="px-4 py-8 text-center text-sm text-white/50">Loading…</p>
              ) : results.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-white/50">
                  {query ? (
                    <>
                      Nothing for “{query}”. Try a simpler word, or{' '}
                      <a href="/atlas" className="r2-link">
                        browse the Atlas
                      </a>
                      .
                    </>
                  ) : (
                    'Type to search 900+ pages — concepts, lessons, robots and simulators.'
                  )}
                </p>
              ) : (
                <>
                  {!query && recent.length > 0 && (
                    <p className="px-4 pt-3 text-[11px] uppercase tracking-wide text-white/35">Recent</p>
                  )}
                  <ul ref={listRef} role="listbox" aria-label="Search results" className="py-2">
                    {results.map((n, i) => (
                      <li key={n.href} role="option" aria-selected={i === active}>
                        <button
                          type="button"
                          onMouseEnter={() => setActive(i)}
                          onClick={() => go(n)}
                          className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition ${
                            i === active ? 'bg-white/10' : 'hover:bg-white/5'
                          }`}
                        >
                          <span className="mt-0.5 shrink-0 rounded border border-white/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/50">
                            {n.kind}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-white">{n.title}</span>
                            {n.sub && <span className="block truncate text-xs text-white/50">{n.sub}</span>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2 text-[11px] text-white/35">
              <span>↑ ↓ to move · Enter to open</span>
              <span>Looking for an answer rather than a page? Ask R2 with ⌘K</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
