'use client'

// components/atlas/GalaxyMap.tsx
// Force-directed SVG graph: each Atlas concept is a star, sized by difficulty,
// coloured by bucket, edges drawn for prerequisite relationships. Mastered nodes
// pulse gold. Locked nodes (unmet prereqs) appear dim with a lock badge.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as d3Force from 'd3-force'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { getMasteredConceptSlugs } from '@/lib/atlas-xp'

interface GalaxyNodeInput {
  slug: string
  type: string
  title: string
  bucket: string
  difficultyLevel: number
  prerequisiteTerms?: string[]
  hookLine?: string
  oneLiner?: string
}

interface ForceNode extends d3Force.SimulationNodeDatum {
  slug: string
  type: string
  title: string
  bucket: string
  difficultyLevel: number
  prerequisiteTerms: string[]
  hookLine?: string
  oneLiner?: string
}

interface ForceLink extends d3Force.SimulationLinkDatum<ForceNode> {
  source: string | ForceNode
  target: string | ForceNode
}

export function GalaxyMap({
  nodes: input,
  bucketColors,
  width = 1000,
  height = 700,
}: {
  nodes: GalaxyNodeInput[]
  bucketColors: Record<string, string>
  width?: number
  height?: number
}) {
  const router = useRouter()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hovered, setHovered] = useState<ForceNode | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [mastered, setMastered] = useState<string[]>([])
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  useEffect(() => {
    setMastered(getMasteredConceptSlugs())
  }, [])

  useEffect(() => {
    if (!svgRef.current || input.length === 0) return
    const svg = select(svgRef.current)
    svg.selectAll('*').remove()

    // Build force nodes + links
    const nodes: ForceNode[] = input.map(n => ({
      ...n,
      prerequisiteTerms: n.prerequisiteTerms ?? [],
    }))
    const slugSet = new Set(nodes.map(n => n.slug))
    const links: ForceLink[] = []
    for (const n of nodes) {
      for (const prereq of n.prerequisiteTerms) {
        if (slugSet.has(prereq)) links.push({ source: prereq, target: n.slug })
      }
    }

    const masteredSet = new Set(mastered)
    const radius = (d: ForceNode) => 8 + (d.difficultyLevel ?? 1) * 3
    const colorFor = (bucket: string) => bucketColors[bucket] ?? '#94a3b8'

    const g = svg.append('g').attr('class', 'gm-canvas')

    // Edges
    const link = g
      .append('g')
      .attr('class', 'gm-links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(255,255,255,0.12)')
      .attr('stroke-width', 1)

    // Node groups
    const nodeGroup = g
      .append('g')
      .attr('class', 'gm-nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'gm-node')
      .style('cursor', 'pointer')
      .on('click', (_event, d) => router.push(`/atlas/${d.type}/${d.slug}`))
      .on('mouseenter', (event: MouseEvent, d) => {
        setHovered(d)
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          setHoverPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
        }
      })
      .on('mousemove', (event: MouseEvent) => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          setHoverPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
        }
      })
      .on('mouseleave', () => setHovered(null))

    // Glow halo for mastered
    nodeGroup
      .filter(d => masteredSet.has(d.slug))
      .append('circle')
      .attr('r', d => radius(d) + 8)
      .attr('fill', 'none')
      .attr('stroke', '#fbbf24')
      .attr('stroke-width', 2)
      .attr('opacity', 0.55)
      .append('animate')
      .attr('attributeName', 'r')
      .attr('values', d => {
        const r = radius(d as ForceNode)
        return `${r + 6};${r + 14};${r + 6}`
      })
      .attr('dur', '2.4s')
      .attr('repeatCount', 'indefinite')

    // Main circle
    nodeGroup
      .append('circle')
      .attr('r', d => radius(d))
      .attr('fill', d => masteredSet.has(d.slug) ? '#fbbf24' : colorFor(d.bucket))
      .attr('stroke', d => masteredSet.has(d.slug) ? '#fde047' : 'rgba(255,255,255,0.25)')
      .attr('stroke-width', 1.5)
      .attr('opacity', d => {
        const hasUnmet = d.prerequisiteTerms.some(p => slugSet.has(p) && !masteredSet.has(p))
        return masteredSet.has(d.slug) ? 1 : hasUnmet ? 0.35 : 0.9
      })

    // Lock icon for locked nodes
    nodeGroup
      .filter(d => {
        if (masteredSet.has(d.slug)) return false
        return d.prerequisiteTerms.some(p => slugSet.has(p) && !masteredSet.has(p))
      })
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', '10px')
      .attr('fill', 'rgba(255,255,255,0.7)')
      .text('🔒')

    // Force simulation
    const sim = d3Force.forceSimulation(nodes)
      .force('link', d3Force.forceLink<ForceNode, ForceLink>(links).id(d => d.slug).distance(60).strength(0.4))
      .force('charge', d3Force.forceManyBody().strength(-90))
      .force('center', d3Force.forceCenter(width / 2, height / 2))
      .force('collide', d3Force.forceCollide<ForceNode>(d => radius(d) + 6))
      .on('tick', () => {
        link
          .attr('x1', d => (d.source as ForceNode).x ?? 0)
          .attr('y1', d => (d.source as ForceNode).y ?? 0)
          .attr('x2', d => (d.target as ForceNode).x ?? 0)
          .attr('y2', d => (d.target as ForceNode).y ?? 0)
        nodeGroup.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
      })

    // Zoom + pan
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
      })
    zoomRef.current = z
    svg.call(z)

    return () => { sim.stop() }
  }, [input, bucketColors, mastered, width, height, router])

  const resetZoom = () => {
    if (!svgRef.current || !zoomRef.current) return
    select(svgRef.current).call(zoomRef.current.transform, zoomIdentity)
  }

  return (
    <div className="gm" ref={containerRef}>
      <div className="gm-toolbar">
        <span className="gm-title">🌌 Galaxy of Robotics</span>
        <button type="button" onClick={resetZoom} className="gm-btn">Reset view</button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Interactive concept galaxy"
      />
      {hovered && (
        <div
          className="gm-tooltip"
          style={{ left: hoverPos.x + 14, top: hoverPos.y + 14 }}
          role="tooltip"
        >
          <strong>{hovered.title}</strong>
          {(hovered.hookLine || hovered.oneLiner) && (
            <p>{hovered.hookLine ?? hovered.oneLiner}</p>
          )}
        </div>
      )}
      <p className="gm-legend">
        <span><span className="gm-dot" style={{ background: '#fbbf24' }} /> Mastered</span>
        <span><span className="gm-dot" style={{ background: '#94a3b8', opacity: 0.4 }} /> Locked (prereqs)</span>
        <span>Drag to pan · scroll to zoom · click any star</span>
      </p>
      <style jsx>{`
        .gm {
          position: relative;
          width: 100%;
          aspect-ratio: ${width} / ${height};
          background: radial-gradient(ellipse at 50% 30%, #1a1040 0%, #0a0a16 70%);
          border: 1px solid rgba(124,58,237,0.3);
          border-radius: 18px;
          overflow: hidden;
        }
        .gm svg { width: 100%; height: 100%; display: block; cursor: grab; }
        .gm-toolbar {
          position: absolute; top: 12px; left: 12px; right: 12px;
          display: flex; justify-content: space-between; align-items: center;
          z-index: 2; pointer-events: none;
        }
        .gm-title {
          font-size: 12px; font-weight: 900;
          letter-spacing: 2px; text-transform: uppercase;
          color: #fde047;
          background: rgba(11,18,32,0.6);
          padding: 4px 12px; border-radius: 999px;
          pointer-events: auto;
        }
        .gm-btn {
          background: rgba(11,18,32,0.85);
          border: 1px solid rgba(0,229,255,0.3);
          color: #00E5FF;
          padding: 6px 14px; border-radius: 999px;
          font-weight: 800; font-size: 12px;
          cursor: pointer;
          pointer-events: auto;
        }
        .gm-btn:hover { background: rgba(0,229,255,0.12); }
        .gm-tooltip {
          position: absolute; z-index: 3;
          max-width: 240px;
          padding: 10px 12px;
          background: rgba(11,18,32,0.96);
          border: 1px solid rgba(124,58,237,0.5);
          border-radius: 10px;
          color: #f4f4f5;
          pointer-events: none;
          font-size: 13px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.45);
        }
        .gm-tooltip strong { color: #fde047; }
        .gm-tooltip p { margin: 4px 0 0; color: #c4b5fd; line-height: 1.4; }
        .gm-legend {
          position: absolute; left: 12px; right: 12px; bottom: 10px;
          margin: 0;
          display: flex; gap: 14px; flex-wrap: wrap;
          font-size: 11px; color: #94a3b8;
          background: rgba(11,18,32,0.7);
          padding: 6px 10px; border-radius: 8px;
          pointer-events: none;
        }
        .gm-legend > span { display: inline-flex; align-items: center; gap: 6px; }
        .gm-dot {
          width: 10px; height: 10px; border-radius: 50%;
        }
      `}</style>
    </div>
  )
}
