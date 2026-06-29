'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { LEARNING_PATHS } from '@/lib/atlas-paths'
import {
  getMastered, markMastered, unmarkMastered, isMastered,
  touchStreak, getTermOfDay, pushRecentSearch, getRecentSearches,
  getPathState, markPathStep,
} from '@/lib/atlas-progress'
import { XPBar } from '@/components/atlas/XPBar'
import { CuriousButton } from '@/components/atlas/CuriousButton'
import { BucketHeatmap } from '@/components/atlas/BucketHeatmap'
import { BucketGrid } from '@/components/atlas/BucketGrid'
import { ReadingPathsStrip } from '@/components/atlas/ReadingPathsStrip'
import { AtlasCommandSearch } from '@/components/atlas/AtlasCommandSearch'
import dynamic from 'next/dynamic'
const GalaxyMap = dynamic(() => import('@/components/atlas/GalaxyMap').then(m => m.GalaxyMap), { ssr: false })
const WorldMapView = dynamic(() => import('@/app/world-map/WorldMapDynamic'), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: 480, display: 'grid', placeItems: 'center', color: '#94a3b8' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '2px solid #f59e0b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13 }}>Loading world robotics data…</p>
      </div>
    </div>
  ),
})

export interface AtlasNode {
  slug: string
  type: string
  title: string
  bucket: string
  bucketLabel: string
  bucketEmoji: string
  summary: string
  oneLiner: string
  difficultyLevel: number
  difficultyLabel: string
  laymanExplanation: string
  analogy: string
  indianExample: string
  realRobotsThatUseThis: string[]
  relatedTerms: string[]
  prerequisiteTerms: string[]
  unlocksTerms: string[]
  mindBlowingFact: string
  youtubeId: string
  industryApplications: string[]
  whyItMatters: string
  technicalDefinition: string
  quizQuestion?: { q: string; options: string[]; answer: number; explanation: string }
}

interface BucketSummary {
  slug: string
  label: string
  emoji: string
  description: string
  count: number
}

type Mode = 'explore' | 'galaxy' | 'learn' | 'search' | 'world-map'

// Stable bucket → color map
const BUCKET_COLORS = [
  '#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#06b6d4',
  '#ef4444', '#eab308', '#14b8a6', '#6366f1', '#84cc16', '#f97316',
  '#0ea5e9', '#d946ef', '#22c55e', '#fb7185', '#facc15', '#0284c7',
  '#a78bfa', '#34d399',
]
function colorFor(bucket: string, buckets: BucketSummary[]): string {
  const idx = buckets.findIndex(b => b.slug === bucket)
  return BUCKET_COLORS[idx % BUCKET_COLORS.length] || '#888'
}

export default function AtlasHomeClient({ nodes, buckets }: { nodes: AtlasNode[]; buckets: BucketSummary[] }) {
  const [mode, setMode] = useState<Mode>('explore')
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [bucketFilter, setBucketFilter] = useState<string | null>(null)
  const [difficultyMax, setDifficultyMax] = useState<number>(5)
  const [streak, setStreak] = useState(0)
  const [mastered, setMastered] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)

  // Streak + mobile detection
  useEffect(() => {
    const s = touchStreak()
    setStreak(s.count)
    setMastered(getMastered())
    const onR = () => setIsMobile(window.innerWidth < 768)
    onR()
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [])

  const allSlugs = useMemo(() => nodes.map(n => n.slug), [nodes])

  const todSlug = useMemo(() => getTermOfDay(allSlugs).slug, [allSlugs])
  const termOfDay = useMemo(() => nodes.find(n => n.slug === todSlug) ?? nodes[0], [nodes, todSlug])

  const filteredNodes = useMemo(() => {
    return nodes.filter(n =>
      (!bucketFilter || n.bucket === bucketFilter) &&
      n.difficultyLevel <= difficultyMax,
    )
  }, [nodes, bucketFilter, difficultyMax])

  const selected = selectedSlug ? nodes.find(n => n.slug === selectedSlug) ?? null : null

  return (
    <main style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh', background: '#0a0a16' }}>
      <div className="container" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px' }}>
        {/* Header */}
        <div className="atlas-header">
          <div>
            <p className="eyebrow">Atlas · Knowledge Universe</p>
            <h1>Every concept. <span style={{ color: '#f59e0b' }}>One map.</span></h1>
            <p className="sub">
              <strong style={{ color: '#fff' }}>{nodes.length}</strong> robotics concepts across {buckets.length} buckets.
              No jargon. Sources at the bottom of every page.
            </p>
          </div>
          <div className="atlas-meta">
            <XPBar refreshKey={mastered.length} />
            <Stat label="✅ Mastered" value={`${mastered.length}`} />
            <Stat label="🔥 Streak" value={`${streak} day${streak === 1 ? '' : 's'}`} />
          </div>
        </div>

        {/* Search + curious */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, margin: '12px 0 18px', alignItems: 'stretch' }}>
          <AtlasCommandSearch
            nodes={nodes.map(n => ({
              slug: n.slug,
              type: n.type,
              title: n.title,
              bucket: n.bucket,
              bucketLabel: n.bucketLabel,
              bucketEmoji: n.bucketEmoji,
              hookLine: (n as unknown as { hookLine?: string }).hookLine,
              oneLiner: n.oneLiner,
              summary: n.summary,
              laymanExplanation: n.laymanExplanation,
              indianExample: n.indianExample,
              difficultyLevel: n.difficultyLevel,
            }))}
            buckets={buckets.map(b => ({ id: b.slug, label: b.label, emoji: b.emoji }))}
          />
          <CuriousButton nodes={nodes} />
        </div>

        {/* Reading paths */}
        <ReadingPathsStrip />

        {/* Bucket grid (20 cards with mastery bars) */}
        <BucketGrid
          buckets={buckets.map(b => ({
            id: b.slug,
            name: b.label,
            emoji: b.emoji,
            color: colorFor(b.slug, buckets),
            count: nodes.filter(n => n.bucket === b.slug).length,
            slugs: nodes.filter(n => n.bucket === b.slug).map(n => n.slug),
          }))}
          onSelect={(slug) => setBucketFilter(prev => prev === slug ? null : slug)}
        />

        {/* Bucket heatmap (compact mastery overview) */}
        <BucketHeatmap
          buckets={buckets}
          nodes={nodes}
          onBucketSelect={(slug) => setBucketFilter(prev => prev === slug ? null : slug)}
          refreshKey={mastered.length}
        />

        {/* Mode tabs */}
        <div className="mode-bar">
          {(['explore', 'galaxy', 'learn', 'search', 'world-map'] as Mode[]).map(m => (
            <button key={m}
              onClick={() => setMode(m)}
              className={`mode-tab ${mode === m ? 'on' : ''}`}
            >
              {m === 'explore' ? '📚 Grid'
                : m === 'galaxy' ? '🌌 Galaxy'
                : m === 'learn' ? '🎓 Learn'
                : m === 'search' ? '🔍 Search'
                : '🌍 World Map'}
            </button>
          ))}
        </div>

        {mode === 'galaxy' && (
          <GalaxyMap
            nodes={nodes.map(n => ({
              slug: n.slug,
              type: n.type,
              title: n.title,
              bucket: n.bucket,
              difficultyLevel: n.difficultyLevel,
              prerequisiteTerms: n.prerequisiteTerms,
              hookLine: (n as unknown as { hookLine?: string }).hookLine,
              oneLiner: n.oneLiner,
            }))}
            bucketColors={Object.fromEntries(buckets.map(b => [b.slug, colorFor(b.slug, buckets)]))}
          />
        )}

        {mode === 'world-map' && <WorldMapView />}

        {mode === 'explore' && (
          <ExploreMode
            nodes={filteredNodes}
            allNodes={nodes}
            buckets={buckets}
            bucketFilter={bucketFilter}
            setBucketFilter={setBucketFilter}
            difficultyMax={difficultyMax}
            setDifficultyMax={setDifficultyMax}
            onSelect={setSelectedSlug}
            isMobile={isMobile}
            termOfDay={termOfDay}
          />
        )}
        {mode === 'learn'  && <LearnMode nodes={nodes} />}
        {mode === 'search' && <SearchMode nodes={nodes} onSelect={setSelectedSlug} />}

        {/* Term drawer */}
        {selected && (
          <TermDrawer
            term={selected}
            allNodes={nodes}
            buckets={buckets}
            onClose={() => setSelectedSlug(null)}
            onSelectAnother={s => setSelectedSlug(s)}
            onMaster={() => {
              if (isMastered(selected.slug)) setMastered(unmarkMastered(selected.slug))
              else setMastered(markMastered(selected.slug))
            }}
            isMastered={mastered.includes(selected.slug)}
          />
        )}
      </div>

      <style jsx>{`
        :global(body) { background: #0a0a16; }
        .container { color: #e5e7eb; }
        .eyebrow { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #fbbf24; font-weight: 800; }
        h1 { font-size: clamp(34px, 5.5vw, 56px); font-weight: 900; color: #fff; margin: 6px 0 8px; line-height: 1.05; }
        .sub { font-size: 17px; color: #b0b8c5; max-width: 720px; line-height: 1.5; }
        .atlas-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
        .atlas-meta { display: flex; gap: 10px; }
        .mode-bar { display: flex; gap: 6px; margin-bottom: 18px; }
        .mode-tab {
          padding: 10px 18px; min-height: 44px;
          background: #181830; color: #9ca3af;
          border: 2px solid #2a2a45; border-radius: 12px;
          font-weight: 800; font-size: 14px; cursor: pointer;
        }
        .mode-tab:hover { color: #fde68a; }
        .mode-tab.on { background: #f59e0b; color: #0a0a16; border-color: #f59e0b; }
      `}</style>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)',
      padding: '8px 14px', borderRadius: 12, color: '#fde047', fontWeight: 800, fontSize: 13,
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ opacity: 0.8 }}>{label}</span>
      <span style={{ color: '#fff' }}>{value}</span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// EXPLORE MODE — bucket pills + canvas force graph (desktop) / grid (mobile)
// ────────────────────────────────────────────────────────────────────────────
function ExploreMode({
  nodes, allNodes, buckets, bucketFilter, setBucketFilter, difficultyMax, setDifficultyMax,
  onSelect, isMobile, termOfDay,
}: {
  nodes: AtlasNode[]
  allNodes: AtlasNode[]
  buckets: BucketSummary[]
  bucketFilter: string | null
  setBucketFilter: (b: string | null) => void
  difficultyMax: number
  setDifficultyMax: (n: number) => void
  onSelect: (slug: string) => void
  isMobile: boolean
  termOfDay: AtlasNode | undefined
}) {
  return (
    <div className="explore-grid">
      {/* Left sidebar — buckets + search + ToD */}
      <aside className="explore-side">
        {/* Term of the Day */}
        {termOfDay && (
          <div className="tod-card" onClick={() => onSelect(termOfDay.slug)}>
            <p className="tod-eyebrow">⭐ Term of the day</p>
            <p className="tod-title">{termOfDay.title}</p>
            <p className="tod-sub">{termOfDay.oneLiner || termOfDay.summary.slice(0, 100)}…</p>
          </div>
        )}

        {/* Random button */}
        <button
          onClick={() => {
            const pick = allNodes[Math.floor(Math.random() * allNodes.length)]
            onSelect(pick.slug)
          }}
          className="random-btn"
        >🎲 Random Term</button>

        {/* Difficulty slider */}
        <div className="diff-control">
          <label>Max difficulty: <strong>{difficultyMax}</strong></label>
          <input type="range" min="1" max="5" value={difficultyMax}
            onChange={e => setDifficultyMax(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#f59e0b' }} />
          <div className="diff-labels">
            <span>Layman</span><span>PhD</span>
          </div>
        </div>

        {/* Bucket pills */}
        <p className="side-h">Buckets</p>
        <div className="bucket-list">
          <button
            onClick={() => setBucketFilter(null)}
            className={`bucket-pill ${!bucketFilter ? 'on' : ''}`}
          >🌐 All <span className="ct">{allNodes.length}</span></button>
          {buckets.filter(b => b.count > 0).map(b => (
            <button
              key={b.slug}
              onClick={() => setBucketFilter(b.slug === bucketFilter ? null : b.slug)}
              className={`bucket-pill ${bucketFilter === b.slug ? 'on' : ''}`}
              style={{
                borderColor: bucketFilter === b.slug ? colorFor(b.slug, buckets) : undefined,
                background: bucketFilter === b.slug ? colorFor(b.slug, buckets) + '20' : undefined,
              }}
            >
              <span>{b.emoji}</span> {b.label} <span className="ct">{b.count}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main viz */}
      <div className="explore-main">
        {isMobile ? (
          <MobileBucketGrid nodes={nodes} buckets={buckets} onSelect={onSelect} />
        ) : (
          <ConceptCanvas nodes={nodes} buckets={buckets} onSelect={onSelect} bucketFilter={bucketFilter} />
        )}
      </div>

      <style jsx>{`
        .explore-grid { display: grid; grid-template-columns: 280px 1fr; gap: 16px; }
        @media (max-width: 920px) { .explore-grid { grid-template-columns: 1fr; } }
        .explore-side { display: flex; flex-direction: column; gap: 14px; }
        .tod-card {
          background: linear-gradient(135deg, rgba(245,158,11,.15), rgba(124,58,237,.1));
          border: 2px solid rgba(245,158,11,.3); border-radius: 16px;
          padding: 14px; cursor: pointer; transition: transform .15s;
        }
        .tod-card:hover { transform: translateY(-2px); border-color: #fbbf24; }
        .tod-eyebrow { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #fbbf24; font-weight: 900; }
        .tod-title { font-size: 18px; font-weight: 900; color: #fde047; margin-top: 4px; }
        .tod-sub { font-size: 13px; color: #d1d5db; margin-top: 4px; line-height: 1.4; }
        .random-btn {
          min-height: 48px; background: #181830; color: #fde68a;
          border: 2px solid #2a2a45; border-radius: 12px;
          font-weight: 800; cursor: pointer; padding: 0 16px;
        }
        .random-btn:hover { border-color: #f59e0b; color: #fff; }
        .diff-control { background: #11112a; border: 1px solid #2a2a45; border-radius: 12px; padding: 12px; }
        .diff-control label { font-size: 13px; color: #c4b5fd; }
        .diff-labels { display: flex; justify-content: space-between; font-size: 10px; color: #6b7280; margin-top: 2px; }
        .side-h { font-size: 11px; font-weight: 900; letter-spacing: 1.5px; color: #9ca3af; text-transform: uppercase; margin: 6px 0 8px; }
        .bucket-list { display: flex; flex-direction: column; gap: 4px; max-height: 420px; overflow-y: auto; padding-right: 4px; }
        .bucket-pill {
          min-height: 38px; display: flex; align-items: center; gap: 6px;
          padding: 8px 10px; background: #11112a;
          border: 1.5px solid #2a2a45; border-radius: 10px;
          color: #d1d5db; font-size: 13px; font-weight: 700;
          cursor: pointer; text-align: left;
        }
        .bucket-pill:hover { border-color: #fbbf24; }
        .bucket-pill.on { color: #fff; font-weight: 800; }
        .ct { margin-left: auto; background: #2a2a45; padding: 2px 6px; border-radius: 999px; font-size: 11px; }
        .explore-main { min-height: 620px; background: #060611; border: 1px solid #1f1f3a; border-radius: 18px; overflow: hidden; }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Canvas force-directed concept map (hand-rolled — no d3)
// ────────────────────────────────────────────────────────────────────────────
function ConceptCanvas({ nodes, buckets, onSelect, bucketFilter }: {
  nodes: AtlasNode[]
  buckets: BucketSummary[]
  onSelect: (slug: string) => void
  bucketFilter: string | null
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const [hover, setHover] = useState<AtlasNode | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Layout: place nodes in bucket clusters using polar coordinates.
  // Then run a few cheap relaxation passes so they spread out.
  const layoutRef = useRef<{ x: number; y: number; vx: number; vy: number }[]>([])
  const draggingRef = useRef<number | null>(null)
  const panRef = useRef({ ox: 0, oy: 0, dragging: false, sx: 0, sy: 0 })
  const zoomRef = useRef(1)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const W = canvas.clientWidth
    const H = canvas.clientHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    // Init layout in bucket clusters
    const bucketIndex = new Map<string, number>()
    buckets.forEach((b, i) => bucketIndex.set(b.slug, i))
    const cx = W / 2, cy = H / 2
    const R = Math.min(W, H) * 0.35
    layoutRef.current = nodes.map((n) => {
      const bi = bucketIndex.get(n.bucket) ?? 0
      const a = (bi / Math.max(1, buckets.length)) * Math.PI * 2
      const bx = cx + Math.cos(a) * R
      const by = cy + Math.sin(a) * R
      // jitter within cluster
      const jr = 70 + Math.random() * 50
      const ja = Math.random() * Math.PI * 2
      return {
        x: bx + Math.cos(ja) * jr,
        y: by + Math.sin(ja) * jr,
        vx: 0, vy: 0,
      }
    })

    let alpha = 0.4
    const step = () => {
      // Apply forces
      const positions = layoutRef.current
      // Center attraction
      for (let i = 0; i < positions.length; i++) {
        positions[i].vx += (cx - positions[i].x) * 0.0006 * alpha
        positions[i].vy += (cy - positions[i].y) * 0.0006 * alpha
      }
      // Bucket cohesion + minor repulsion (cheap O(n) sampling)
      for (let i = 0; i < positions.length; i++) {
        const ni = nodes[i]
        const bi = bucketIndex.get(ni.bucket) ?? 0
        const a = (bi / Math.max(1, buckets.length)) * Math.PI * 2
        const bx = cx + Math.cos(a) * R
        const by = cy + Math.sin(a) * R
        positions[i].vx += (bx - positions[i].x) * 0.001 * alpha
        positions[i].vy += (by - positions[i].y) * 0.001 * alpha
      }
      // Repulsion: sample 16 random pairs per frame — cheap & good enough
      const N = positions.length
      for (let k = 0; k < Math.min(64, N); k++) {
        const i = Math.floor(Math.random() * N)
        const j = Math.floor(Math.random() * N)
        if (i === j) continue
        const dx = positions[i].x - positions[j].x
        const dy = positions[i].y - positions[j].y
        const d2 = dx * dx + dy * dy
        if (d2 < 1) continue
        const f = 60 / d2 * alpha
        positions[i].vx += dx * f
        positions[i].vy += dy * f
        positions[j].vx -= dx * f
        positions[j].vy -= dy * f
      }
      // Integrate
      for (let i = 0; i < positions.length; i++) {
        positions[i].x += positions[i].vx
        positions[i].y += positions[i].vy
        positions[i].vx *= 0.85
        positions[i].vy *= 0.85
      }
      alpha *= 0.992
      if (alpha < 0.001) alpha = 0.001

      // Render
      ctx.clearRect(0, 0, W, H)
      ctx.save()
      ctx.translate(panRef.current.ox, panRef.current.oy)
      ctx.scale(zoomRef.current, zoomRef.current)
      for (let i = 0; i < positions.length; i++) {
        const n = nodes[i]
        const p = positions[i]
        const isDim = bucketFilter && n.bucket !== bucketFilter
        const r = 4 + (n.difficultyLevel ?? 3) * 0.8
        ctx.fillStyle = isDim ? '#2a2a45' : colorFor(n.bucket, buckets)
        ctx.globalAlpha = isDim ? 0.35 : 0.9
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.restore()

      rafRef.current = requestAnimationFrame(step)
    }
    step()
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, buckets.length, bucketFilter])

  // Pointer handlers
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const toLocal = (e: PointerEvent | MouseEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect()
      const x = ((e.clientX - rect.left) - panRef.current.ox) / zoomRef.current
      const y = ((e.clientY - rect.top)  - panRef.current.oy) / zoomRef.current
      return { x, y }
    }
    const findNearest = (lx: number, ly: number): number | null => {
      let best = -1, bestD = Infinity
      for (let i = 0; i < layoutRef.current.length; i++) {
        const p = layoutRef.current[i]
        const d = (p.x - lx) ** 2 + (p.y - ly) ** 2
        if (d < bestD) { bestD = d; best = i }
      }
      return bestD < 600 ? best : null
    }
    const onMove = (e: MouseEvent) => {
      const { x, y } = toLocal(e)
      const idx = findNearest(x, y)
      setHover(idx !== null ? nodes[idx] : null)
      const rect = canvas.getBoundingClientRect()
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      if (panRef.current.dragging) {
        panRef.current.ox += e.movementX
        panRef.current.oy += e.movementY
      }
    }
    const onDown = (e: MouseEvent) => {
      const { x, y } = toLocal(e)
      const idx = findNearest(x, y)
      if (idx !== null) onSelect(nodes[idx].slug)
      else {
        panRef.current.dragging = true
        panRef.current.sx = e.clientX
        panRef.current.sy = e.clientY
      }
    }
    const onUp = () => { panRef.current.dragging = false }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.92 : 1.08
      zoomRef.current = Math.max(0.4, Math.min(3, zoomRef.current * delta))
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [nodes, onSelect])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 620 }}>
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }} />
      {hover && (
        <div style={{
          position: 'absolute', left: pos.x + 14, top: pos.y - 30,
          background: '#11112a', border: '1px solid #2a2a45', borderRadius: 8,
          padding: '6px 10px', fontSize: 12, color: '#fde68a',
          pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5,
        }}>
          <strong>{hover.bucketEmoji} {hover.title}</strong>
          <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>{hover.oneLiner || hover.bucketLabel}</div>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 11, color: '#6b7280' }}>
        Scroll = zoom · Drag = pan · Click a dot
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// MOBILE: bucket grid instead of canvas
// ────────────────────────────────────────────────────────────────────────────
function MobileBucketGrid({ nodes, buckets, onSelect }: {
  nodes: AtlasNode[]; buckets: BucketSummary[]; onSelect: (s: string) => void
}) {
  const [openBucket, setOpenBucket] = useState<string | null>(null)
  const visible = openBucket
    ? nodes.filter(n => n.bucket === openBucket).sort((a, b) => a.title.localeCompare(b.title))
    : []

  return (
    <div style={{ padding: 14 }}>
      {openBucket ? (
        <>
          <button
            onClick={() => setOpenBucket(null)}
            style={{
              padding: '8px 12px', minHeight: 44, background: '#181830',
              color: '#fde68a', border: '1px solid #2a2a45',
              borderRadius: 10, fontWeight: 700, marginBottom: 12,
            }}
          >← All buckets</button>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visible.map(n => (
              <li key={n.slug}>
                <button
                  onClick={() => onSelect(n.slug)}
                  style={{
                    width: '100%', minHeight: 56, padding: '10px 14px', textAlign: 'left',
                    background: '#11112a', border: '1px solid #2a2a45', borderRadius: 12,
                    color: '#fde68a',
                  }}
                >
                  <strong style={{ color: '#fff', fontSize: 15 }}>{n.title}</strong>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{n.oneLiner || n.summary.slice(0, 80)}…</div>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {buckets.filter(b => b.count > 0).map(b => (
            <button
              key={b.slug}
              onClick={() => setOpenBucket(b.slug)}
              style={{
                padding: 14, minHeight: 110, textAlign: 'left',
                background: colorFor(b.slug, buckets) + '20',
                border: '2px solid ' + colorFor(b.slug, buckets),
                borderRadius: 16, color: '#fff', cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 28 }}>{b.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 900, marginTop: 4 }}>{b.label}</div>
              <div style={{ fontSize: 11, color: '#d1d5db' }}>{b.count} concepts</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// LEARN MODE — Curated paths
// ────────────────────────────────────────────────────────────────────────────
function LearnMode({ nodes }: { nodes: AtlasNode[] }) {
  return (
    <div className="learn-grid">
      {LEARNING_PATHS.map(path => {
        const state = (typeof window !== 'undefined') ? getPathState(path.id) : { completed: [], startedAt: '' }
        const done = state.completed.length
        const total = path.termSlugs.length
        return (
          <div key={path.id} className={`path-card bg-gradient-to-br ${path.gradient}`}>
            <div style={{ fontSize: 36 }}>{path.emoji}</div>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 8 }}>{path.title}</h3>
            <p style={{ fontSize: 14, color: '#fde68a', marginTop: 4 }}>{path.description}</p>
            <div style={{ marginTop: 10, fontSize: 12, color: '#fde047' }}>
              {path.duration} · {path.targetAudience} · ⭐ {done}/{total} mastered
            </div>
            <div style={{ marginTop: 10, height: 6, background: 'rgba(0,0,0,.3)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(done / total) * 100}%`, background: '#fde047', transition: 'width .4s' }} />
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {path.termSlugs.slice(0, 4).map(s => (
                <span key={s} style={{
                  fontSize: 10, background: 'rgba(0,0,0,.4)', color: '#fde68a',
                  padding: '3px 7px', borderRadius: 999,
                }}>{nodes.find(n => n.slug === s)?.title ?? s}</span>
              ))}
              {path.termSlugs.length > 4 && (
                <span style={{ fontSize: 10, color: '#fde68a' }}>+{path.termSlugs.length - 4}</span>
              )}
            </div>
            <Link
              href={`/atlas/path/${path.id}`}
              onClick={(e) => {
                e.preventDefault()
                // Linear walk through path: open the first incomplete term
                const next = path.termSlugs.find(s => !state.completed.includes(s)) ?? path.termSlugs[0]
                const target = nodes.find(n => n.slug === next)
                if (target) {
                  markPathStep(path.id, target.slug)
                  window.location.href = `/atlas/${target.type}/${target.slug}`
                }
              }}
              style={{
                marginTop: 14, display: 'inline-block',
                background: '#fde047', color: '#0a0a16',
                padding: '8px 14px', borderRadius: 12,
                textDecoration: 'none', fontWeight: 900, fontSize: 14,
              }}
            >Start path →</Link>
          </div>
        )
      })}
      <style jsx>{`
        .learn-grid { display: grid; grid-template-columns: 1fr; gap: 14px; margin-top: 10px; }
        @media (min-width: 720px) { .learn-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1100px) { .learn-grid { grid-template-columns: repeat(3, 1fr); } }
        .path-card {
          padding: 22px; border-radius: 22px;
          border: 2px solid rgba(255,255,255,.1);
          box-shadow: 0 10px 30px rgba(0,0,0,.4);
        }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// SEARCH MODE — fuzzy substring search with keyboard nav
// ────────────────────────────────────────────────────────────────────────────
function SearchMode({ nodes, onSelect }: { nodes: AtlasNode[]; onSelect: (s: string) => void }) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [recent, setRecent] = useState<string[]>([])
  useEffect(() => { inputRef.current?.focus(); setRecent(getRecentSearches()) }, [])

  const results = useMemo(() => {
    if (!q.trim()) return nodes.slice(0, 30)
    const Q = q.toLowerCase()
    return nodes
      .filter(n => n.title.toLowerCase().includes(Q) ||
                   n.summary.toLowerCase().includes(Q) ||
                   n.bucket.includes(Q))
      .slice(0, 50)
  }, [q, nodes])

  useEffect(() => { setIdx(0) }, [q])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(results.length - 1, i + 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(0, i - 1)) }
    if (e.key === 'Enter')     { e.preventDefault(); if (results[idx]) { pushRecentSearch(q); onSelect(results[idx].slug) } }
  }

  return (
    <div className="search-shell">
      <input
        ref={inputRef}
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Search 249+ concepts… (try 'lidar', 'pid', 'cobot')"
        className="search-input"
      />
      {!q && recent.length > 0 && (
        <div className="recent">
          <span className="recent-h">Recent:</span>
          {recent.map(r => (
            <button key={r} onClick={() => setQ(r)} className="recent-pill">{r}</button>
          ))}
        </div>
      )}

      <ul className="results">
        {results.map((n, i) => (
          <li key={n.slug}
              className={i === idx ? 'on' : ''}
              onMouseEnter={() => setIdx(i)}
              onClick={() => { pushRecentSearch(q); onSelect(n.slug) }}
          >
            <span style={{ fontSize: 18 }}>{n.bucketEmoji}</span>
            <div style={{ flex: 1 }}>
              <strong>{n.title}</strong>
              <p>{n.oneLiner || n.summary.slice(0, 100)}</p>
            </div>
            <span style={{ fontSize: 10, color: '#6b7280' }}>{n.bucketLabel}</span>
            <span style={{
              fontSize: 10, color: '#fde047',
              background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.3)',
              padding: '2px 6px', borderRadius: 6,
            }}>D{n.difficultyLevel}</span>
          </li>
        ))}
        {results.length === 0 && (
          <li style={{ color: '#6b7280', justifyContent: 'center' }}>No matches. Try a different word.</li>
        )}
      </ul>

      <style jsx>{`
        .search-shell { background: #11112a; border: 1px solid #2a2a45; border-radius: 18px; padding: 16px; }
        .search-input {
          width: 100%; min-height: 56px;
          background: #060611; color: #fff;
          border: 2px solid #2a2a45; border-radius: 12px;
          padding: 0 18px; font-size: 17px; font-weight: 700;
          outline: none;
        }
        .search-input:focus { border-color: #f59e0b; }
        .recent { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .recent-h { font-size: 11px; color: #6b7280; }
        .recent-pill {
          background: #181830; color: #fde68a; border: 1px solid #2a2a45;
          border-radius: 999px; padding: 4px 10px; font-size: 11px; cursor: pointer;
        }
        .recent-pill:hover { border-color: #f59e0b; }
        .results { list-style: none; padding: 0; margin: 14px 0 0; display: flex; flex-direction: column; gap: 4px; max-height: 480px; overflow-y: auto; }
        .results li {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; min-height: 56px;
          background: #060611; border: 1px solid transparent;
          border-radius: 10px; cursor: pointer;
        }
        .results li.on { border-color: #f59e0b; background: rgba(245,158,11,.06); }
        .results li strong { color: #fde68a; font-size: 15px; }
        .results li p { color: #9ca3af; font-size: 12px; margin-top: 2px; line-height: 1.3; }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// TERM DRAWER
// ────────────────────────────────────────────────────────────────────────────
function TermDrawer({
  term, allNodes, buckets, onClose, onSelectAnother, onMaster, isMastered,
}: {
  term: AtlasNode
  allNodes: AtlasNode[]
  buckets: BucketSummary[]
  onClose: () => void
  onSelectAnother: (slug: string) => void
  onMaster: () => void
  isMastered: boolean
}) {
  const [tab, setTab] = useState<'simple' | 'detailed' | 'quiz'>('simple')
  const [picked, setPicked] = useState<number | null>(null)

  const findNode = (slug: string) => allNodes.find(n => n.slug === slug)
  const relatedNodes = term.relatedTerms.map(findNode).filter(Boolean) as AtlasNode[]
  const prereqNodes  = term.prerequisiteTerms.map(findNode).filter(Boolean) as AtlasNode[]
  const unlockNodes  = term.unlocksTerms.map(findNode).filter(Boolean) as AtlasNode[]
  const c = colorFor(term.bucket, buckets)

  return (
    <div className="drawer-back" onClick={onClose}>
      <aside className="drawer" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">×</button>

        <div className="dr-head" style={{ background: c + '20', borderLeft: `4px solid ${c}` }}>
          <p style={{ fontSize: 11, color: c, fontWeight: 900, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {term.bucketEmoji} {term.bucketLabel}
          </p>
          <h2>{term.title}</h2>
          {term.oneLiner && <p className="one-liner">{term.oneLiner}</p>}
          <div className="head-meta">
            <span className="badge">D{term.difficultyLevel} · {term.difficultyLabel}</span>
            <button onClick={onMaster} className={`master ${isMastered ? 'on' : ''}`}>
              {isMastered ? '✅ Mastered' : '○ Mark mastered'}
            </button>
          </div>
        </div>

        <div className="tabs">
          {(['simple', 'detailed', 'quiz'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`tab ${tab === t ? 'on' : ''}`}>
              {t === 'simple' ? 'Simple' : t === 'detailed' ? 'Detailed' : 'Quiz'}
            </button>
          ))}
        </div>

        <div className="tab-body">
          {tab === 'simple' && (
            <>
              <p className="prose">{term.laymanExplanation || term.summary || 'No simple explanation yet — open the full page for the full text.'}</p>
              {term.analogy && (
                <div className="amber-box">
                  <p className="amber-h">💡 Think of it like…</p>
                  <p>{term.analogy}</p>
                </div>
              )}
              {term.indianExample && (
                <div className="india-box">
                  <p className="amber-h">🇮🇳 In India</p>
                  <p>{term.indianExample}</p>
                </div>
              )}
              {term.realRobotsThatUseThis.length > 0 && (
                <div className="row">
                  <span className="row-h">Real robots:</span>
                  {term.realRobotsThatUseThis.map(r => (
                    <Link key={r} href={`/robots/${r}`} className="chip">{r}</Link>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'detailed' && (
            <>
              {term.technicalDefinition && <p className="prose">{term.technicalDefinition}</p>}
              {term.whyItMatters && (
                <div className="amber-box"><p className="amber-h">Why it matters</p><p>{term.whyItMatters}</p></div>
              )}
              {term.industryApplications.length > 0 && (
                <div className="row">
                  <span className="row-h">Used in:</span>
                  {term.industryApplications.map(i => <span key={i} className="chip">{i}</span>)}
                </div>
              )}
              {term.youtubeId && (
                <div className="aspect">
                  <iframe
                    src={`https://www.youtube.com/embed/${term.youtubeId}`}
                    title={term.title} loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </>
          )}

          {tab === 'quiz' && term.quizQuestion && term.quizQuestion.q ? (
            <>
              <p className="quiz-q">{term.quizQuestion.q}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {term.quizQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setPicked(i)}
                    className={`quiz-opt ${picked === i ? (i === term.quizQuestion!.answer ? 'ok' : 'bad') : ''}`}
                    disabled={picked !== null && picked === term.quizQuestion!.answer}
                  >{opt}</button>
                ))}
              </div>
              {picked !== null && (
                <p style={{ marginTop: 12, color: picked === term.quizQuestion.answer ? '#6ee7b7' : '#fda4af', fontWeight: 700 }}>
                  {picked === term.quizQuestion.answer ? '✅ ' : '❌ '}{term.quizQuestion.explanation}
                </p>
              )}
            </>
          ) : tab === 'quiz' ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>No quiz yet for this term.</p>
          ) : null}
        </div>

        {/* Connections + facts */}
        <div className="connections">
          {prereqNodes.length > 0 && (
            <ConnRow label="Learn this first" nodes={prereqNodes} onSelect={onSelectAnother} />
          )}
          {relatedNodes.length > 0 && (
            <ConnRow label="Related concepts" nodes={relatedNodes} onSelect={onSelectAnother} />
          )}
          {unlockNodes.length > 0 && (
            <ConnRow label="This unlocks" nodes={unlockNodes} onSelect={onSelectAnother} />
          )}
        </div>

        {term.mindBlowingFact && (
          <div className="fact-box">
            <p>🤯 {term.mindBlowingFact}</p>
          </div>
        )}

        <Link href={`/atlas/${term.type}/${term.slug}`} className="open-full">Open full page →</Link>

        <style jsx>{`
          .drawer-back {
            position: fixed; inset: 0; z-index: 60;
            background: rgba(10,10,22,.85);
            display: flex; justify-content: flex-end;
            animation: fade .2s;
          }
          @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
          .drawer {
            width: 100%; max-width: 460px; height: 100%; overflow-y: auto;
            background: #11112a;
            border-left: 1px solid #2a2a45;
            animation: slide .2s ease-out;
            color: #e5e7eb;
          }
          @keyframes slide { from { transform: translateX(60px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
          .close {
            position: absolute; top: 12px; right: 12px;
            background: rgba(0,0,0,.5); color: #fff;
            border: none; width: 36px; height: 36px;
            border-radius: 50%; font-size: 22px; cursor: pointer; z-index: 2;
          }
          .dr-head { padding: 24px; padding-right: 60px; }
          .dr-head h2 { font-size: 28px; font-weight: 900; color: #fff; margin: 6px 0 4px; }
          .one-liner { color: #fde047; font-size: 16px; font-weight: 700; }
          .head-meta { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
          .badge {
            font-size: 11px; color: #fde047; background: rgba(0,0,0,.4);
            padding: 4px 10px; border-radius: 999px; font-weight: 800;
          }
          .master {
            font-size: 11px; padding: 4px 10px; border-radius: 999px;
            background: rgba(0,0,0,.4); border: 1px solid rgba(255,255,255,.2);
            color: #d1d5db; cursor: pointer; font-weight: 700;
          }
          .master.on { background: #10b981; color: white; border-color: #10b981; }
          .tabs { display: flex; border-bottom: 1px solid #2a2a45; }
          .tab {
            flex: 1; min-height: 48px; background: transparent;
            border: none; color: #9ca3af; font-weight: 800; cursor: pointer;
            border-bottom: 2px solid transparent;
          }
          .tab.on { color: #fde047; border-bottom-color: #f59e0b; }
          .tab-body { padding: 18px 22px; }
          .prose { font-size: 16px; color: #fde68a; line-height: 1.55; }
          .amber-box {
            background: rgba(245,158,11,.1); border: 1px solid rgba(245,158,11,.3);
            border-radius: 12px; padding: 12px 14px; margin-top: 14px;
          }
          .amber-h { font-size: 11px; color: #fbbf24; font-weight: 900; letter-spacing: 1; text-transform: uppercase; margin-bottom: 4px; }
          .amber-box p:not(.amber-h) { font-size: 14px; color: #fde68a; line-height: 1.5; }
          .india-box {
            background: linear-gradient(135deg, rgba(245,158,11,.1), rgba(16,185,129,.06));
            border: 1px solid rgba(245,158,11,.3);
            border-radius: 12px; padding: 12px 14px; margin-top: 12px;
          }
          .india-box p:not(.amber-h) { font-size: 14px; color: #fde68a; line-height: 1.5; }
          .row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 14px; }
          .row-h { font-size: 12px; color: #9ca3af; font-weight: 700; }
          .chip {
            font-size: 11px; padding: 4px 10px;
            background: #181830; color: #fde68a;
            border: 1px solid #2a2a45; border-radius: 999px;
            text-decoration: none;
          }
          .chip:hover { border-color: #f59e0b; color: #fff; }
          .aspect { aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; margin-top: 14px; border: 1px solid #2a2a45; }
          .aspect :global(iframe) { width: 100%; height: 100%; border: 0; }
          .quiz-q { font-size: 17px; font-weight: 800; color: #fff; margin-bottom: 12px; }
          .quiz-opt {
            min-height: 48px; padding: 10px 14px; text-align: left;
            background: #181830; color: #fde68a; border: 2px solid #2a2a45;
            border-radius: 12px; cursor: pointer; font-weight: 700;
          }
          .quiz-opt:hover:not(:disabled) { border-color: #fbbf24; }
          .quiz-opt.ok  { background: rgba(16,185,129,.2); border-color: #10b981; color: #6ee7b7; }
          .quiz-opt.bad { background: rgba(239,68,68,.2);  border-color: #ef4444; color: #fda4af; }
          .connections { padding: 0 22px; display: flex; flex-direction: column; gap: 10px; }
          .fact-box {
            margin: 16px 22px;
            background: linear-gradient(135deg, rgba(245,158,11,.12), rgba(124,58,237,.08));
            border: 1px solid rgba(245,158,11,.3);
            border-radius: 14px; padding: 14px;
          }
          .fact-box p { font-style: italic; color: #fde047; font-weight: 700; line-height: 1.45; }
          .open-full {
            display: block; text-align: center; margin: 16px 22px 24px;
            min-height: 52px; line-height: 52px;
            background: #f59e0b; color: #0a0a16;
            font-weight: 900; border-radius: 12px;
            text-decoration: none;
          }
          @media (max-width: 640px) {
            .drawer { max-width: 100%; }
          }
        `}</style>
      </aside>
    </div>
  )
}

function ConnRow({ label, nodes, onSelect }: {
  label: string; nodes: AtlasNode[]; onSelect: (slug: string) => void
}) {
  return (
    <div>
      <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {nodes.slice(0, 8).map(n => (
          <button
            key={n.slug}
            onClick={() => onSelect(n.slug)}
            style={{
              fontSize: 12, background: '#181830', color: '#fde68a',
              border: '1px solid #2a2a45', borderRadius: 999, padding: '4px 10px',
              cursor: 'pointer', fontWeight: 700,
            }}
          >{n.bucketEmoji} {n.title}</button>
        ))}
      </div>
    </div>
  )
}
