import React from 'react';

// Lightweight, dependency-free inline-SVG diagrams for Atlas articles.
// Authored in the MDX body as a fenced ```diagram block holding a small JSON spec,
// intercepted by the Atlas renderer (same mechanism as ```quiz). Crisp at any size,
// tiny page weight, and the labels are real <text> so they stay accessible + SEO-visible.
//
// Spec shapes:
//   { "type": "flow",  "title": "...", "nodes": ["A","B","C"], "caption": "..." }
//   { "type": "loop",  "title": "...", "nodes": ["Sense","Think","Act"], "caption": "..." }
//   { "type": "stack", "title": "...", "nodes": ["App","Middleware","Firmware"], "caption": "..." }

export type DiagramSpec = {
  type?: 'flow' | 'loop' | 'stack';
  title?: string;
  nodes?: string[];
  caption?: string;
};

const AMBER = '#f59e0b';
const INK = '#e2e8f0';
const MUTED = '#94a3b8';
const BOX = '#0f172a';
const BORDER = 'rgba(245,158,11,0.45)';

function boxWidth(label: string): number {
  return Math.max(96, Math.min(220, label.length * 8.6 + 28));
}

function Frame({ title, caption, children }: { title?: string; caption?: string; children: React.ReactNode }) {
  return (
    <figure
      style={{
        margin: '30px 0',
        padding: '22px 20px 16px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 16,
      }}
    >
      {title && (
        <figcaption
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: AMBER,
            marginBottom: 16,
          }}
        >
          {title}
        </figcaption>
      )}
      {children}
      {caption && (
        <p style={{ margin: '14px 2px 0', fontSize: 13.5, lineHeight: 1.5, color: MUTED }}>{caption}</p>
      )}
    </figure>
  );
}

function FlowSvg({ nodes, loop }: { nodes: string[]; loop: boolean }) {
  const gap = 44; // room for the arrow
  const h = loop ? 150 : 108;
  const boxH = 52;
  const y = 22;
  const widths = nodes.map(boxWidth);
  let x = 8;
  const positions = widths.map((w) => {
    const px = x;
    x += w + gap;
    return px;
  });
  const totalW = x - gap + 8;

  return (
    <svg viewBox={`0 0 ${totalW} ${h}`} width="100%" role="img" style={{ maxWidth: '100%', height: 'auto' }}>
      <defs>
        <marker id="r2arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={AMBER} />
        </marker>
      </defs>
      {nodes.map((label, i) => {
        const w = widths[i];
        const cx = positions[i] + w / 2;
        return (
          <g key={i}>
            {i < nodes.length - 1 && (
              <line
                x1={positions[i] + w}
                y1={y + boxH / 2}
                x2={positions[i + 1]}
                y2={y + boxH / 2}
                stroke={AMBER}
                strokeWidth="2"
                markerEnd="url(#r2arrow)"
              />
            )}
            <rect x={positions[i]} y={y} width={w} height={boxH} rx="11" fill={BOX} stroke={BORDER} strokeWidth="1.5" />
            <text x={cx} y={y + boxH / 2 + 5} textAnchor="middle" fontSize="14.5" fontWeight="600" fill={INK}>
              {label}
            </text>
          </g>
        );
      })}
      {loop && (
        <g>
          {(() => {
            const first = positions[0];
            const w0 = widths[0];
            const last = positions[nodes.length - 1];
            const wl = widths[nodes.length - 1];
            const startX = last + wl / 2;
            const endX = first + w0 / 2;
            const yBot = y + boxH;
            const yLoop = h - 16;
            return (
              <path
                d={`M ${startX} ${yBot} V ${yLoop} H ${endX} V ${yBot}`}
                fill="none"
                stroke={MUTED}
                strokeWidth="1.8"
                strokeDasharray="5 5"
                markerEnd="url(#r2arrow)"
              />
            );
          })()}
          <text x={(positions[0] + widths[0] / 2)} y={h - 2} textAnchor="start" fontSize="11.5" fill={MUTED}>
            feedback
          </text>
        </g>
      )}
    </svg>
  );
}

function StackSvg({ nodes }: { nodes: string[] }) {
  const w = 460;
  const barH = 46;
  const gap = 10;
  const pad = 6;
  const h = nodes.length * (barH + gap) - gap + pad * 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" style={{ maxWidth: 480, height: 'auto' }}>
      {nodes.map((label, i) => {
        const y = pad + i * (barH + gap);
        // Slight amber gradient by depth so the "top of the stack" reads as primary.
        const alpha = 0.16 - i * (0.11 / Math.max(1, nodes.length - 1));
        return (
          <g key={i}>
            <rect
              x={4}
              y={y}
              width={w - 8}
              height={barH}
              rx="10"
              fill={`rgba(245,158,11,${Math.max(0.04, alpha)})`}
              stroke={BORDER}
              strokeWidth="1.4"
            />
            <text x={w / 2} y={y + barH / 2 + 5} textAnchor="middle" fontSize="15" fontWeight="600" fill={INK}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function AtlasDiagram({ spec }: { spec: DiagramSpec }) {
  const nodes = (spec.nodes ?? []).map((n) => String(n)).filter(Boolean);
  if (nodes.length === 0) return null;
  const type = spec.type ?? 'flow';

  return (
    <Frame title={spec.title} caption={spec.caption}>
      {type === 'stack' ? (
        <StackSvg nodes={nodes} />
      ) : (
        <FlowSvg nodes={nodes} loop={type === 'loop'} />
      )}
    </Frame>
  );
}
