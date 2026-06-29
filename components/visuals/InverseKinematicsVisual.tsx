'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const W = 500;
const H = 400;
const BASE_X = 250;
const BASE_Y = 380;
const L1 = 120;
const L2 = 90;

type IK = { q1: number; q2: number; shoulder: { x: number; y: number }; endeff: { x: number; y: number }; reach: number };

function solveIK(targetX: number, targetY: number): IK {
  const dx = targetX - BASE_X;
  const dy = BASE_Y - targetY; // flip Y since SVG Y is inverted
  let dist = Math.sqrt(dx * dx + dy * dy);
  dist = Math.max(Math.abs(L1 - L2) + 1, Math.min(L1 + L2 - 1, dist));
  const cosQ2 = (dist * dist - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  const q2 = Math.acos(Math.max(-1, Math.min(1, cosQ2)));
  const k1 = L1 + L2 * Math.cos(q2);
  const k2 = L2 * Math.sin(q2);
  const q1 = Math.atan2(dy, dx) - Math.atan2(k2, k1);
  const shoulder = { x: BASE_X + L1 * Math.cos(q1), y: BASE_Y - L1 * Math.sin(q1) };
  const endeff = { x: shoulder.x + L2 * Math.cos(q1 + q2), y: shoulder.y - L2 * Math.sin(q1 + q2) };
  return { q1, q2, shoulder, endeff, reach: dist };
}

export function InverseKinematicsVisual() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [target, setTarget] = useState<{ x: number; y: number }>({ x: 350, y: 250 });
  const [dragging, setDragging] = useState(false);

  const ik = useMemo(() => solveIK(target.x, target.y), [target.x, target.y]);

  const toSvgCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * W,
      y: ((clientY - rect.top) / rect.height) * H,
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGCircleElement>) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(true);
    setTarget(toSvgCoords(e.clientX, e.clientY));
  };

  const onPointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
    if (!dragging) return;
    setTarget(toSvgCoords(e.clientX, e.clientY));
  };

  const onPointerUp = (e: React.PointerEvent<SVGCircleElement>) => {
    if ((e.target as Element).hasPointerCapture?.(e.pointerId)) {
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  };

  // also support pointer events on the SVG itself so the gripper follows even if cursor outpaces it
  const onSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    setTarget(toSvgCoords(e.clientX, e.clientY));
  };

  const deg1 = ((ik.q1 * 180) / Math.PI).toFixed(1);
  const deg2 = ((ik.q2 * 180) / Math.PI).toFixed(1);
  const innerR = Math.abs(L1 - L2);
  const outerR = L1 + L2;

  return (
    <div
      style={{
        background: '#0a0f1e',
        border: '1px solid var(--border-2)',
        borderRadius: 16,
        padding: 'clamp(20px, 3vw, 36px)',
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{
          maxWidth: W,
          display: 'block',
          margin: '0 auto',
          background: 'rgba(11,37,64,.35)',
          borderRadius: 12,
          touchAction: 'none',
          cursor: dragging ? 'grabbing' : 'default',
        }}
        onPointerMove={onSvgPointerMove}
        aria-label="2-DOF robot arm — drag the end-effector"
      >
        {/* Reachable workspace donut */}
        <defs>
          <mask id="ik-workspace-mask">
            <rect x={0} y={0} width={W} height={H} fill="black" />
            <circle cx={BASE_X} cy={BASE_Y} r={outerR} fill="white" />
            <circle cx={BASE_X} cy={BASE_Y} r={innerR} fill="black" />
          </mask>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill="#00B8D4" opacity={0.08} mask="url(#ik-workspace-mask)" />
        <circle cx={BASE_X} cy={BASE_Y} r={outerR} fill="none" stroke="#00B8D4" opacity={0.25} strokeWidth={1} strokeDasharray="3 4" />
        {innerR > 0 && (
          <circle cx={BASE_X} cy={BASE_Y} r={innerR} fill="none" stroke="#00B8D4" opacity={0.25} strokeWidth={1} strokeDasharray="3 4" />
        )}

        {/* Ground */}
        <line x1={20} y1={BASE_Y + 14} x2={W - 20} y2={BASE_Y + 14} stroke="#334155" strokeWidth={1.5} />

        {/* Link 1 */}
        <line
          x1={BASE_X}
          y1={BASE_Y}
          x2={ik.shoulder.x}
          y2={ik.shoulder.y}
          stroke="#00B8D4"
          strokeWidth={8}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px rgba(0,184,212,.45))' }}
        />
        {/* Link 2 */}
        <line
          x1={ik.shoulder.x}
          y1={ik.shoulder.y}
          x2={ik.endeff.x}
          y2={ik.endeff.y}
          stroke="#00B8D4"
          strokeWidth={6}
          strokeLinecap="round"
          opacity={0.8}
          style={{ filter: 'drop-shadow(0 0 4px rgba(0,184,212,.4))' }}
        />

        {/* Base */}
        <circle cx={BASE_X} cy={BASE_Y} r={12} fill="#1e293b" stroke="#00B8D4" strokeWidth={2} />
        {/* Shoulder joint */}
        <circle cx={BASE_X} cy={BASE_Y} r={5} fill="#ffffff" />
        {/* Elbow joint */}
        <circle cx={ik.shoulder.x} cy={ik.shoulder.y} r={8} fill="#ffffff" stroke="#00B8D4" strokeWidth={1.5} />
        {/* End-effector */}
        <g style={{ filter: 'drop-shadow(0 0 10px rgba(0,184,212,.7))' }}>
          <circle
            cx={ik.endeff.x}
            cy={ik.endeff.y}
            r={12}
            fill="#00B8D4"
            stroke="#00E5FF"
            strokeWidth={2}
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <line x1={ik.endeff.x - 8} y1={ik.endeff.y} x2={ik.endeff.x + 8} y2={ik.endeff.y} stroke="#0a0f1e" strokeWidth={1.5} pointerEvents="none" />
          <line x1={ik.endeff.x} y1={ik.endeff.y - 8} x2={ik.endeff.x} y2={ik.endeff.y + 8} stroke="#0a0f1e" strokeWidth={1.5} pointerEvents="none" />
        </g>

        {/* hint */}
        <text x={12} y={22} fill="#94A3B8" fontSize={11} fontFamily="JetBrains Mono, monospace" pointerEvents="none">
          drag the cyan gripper
        </text>
      </svg>

      {/* Stat boxes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginTop: 20,
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 13,
        }}
      >
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(0,184,212,.08)', border: '1px solid var(--border)' }}>
          <div style={{ color: '#94A3B8', fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase' }}>θ1 Shoulder</div>
          <div style={{ color: 'var(--cyan-bright)', fontSize: 20, marginTop: 4 }}>{deg1}°</div>
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(0,184,212,.08)', border: '1px solid var(--border)' }}>
          <div style={{ color: '#94A3B8', fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase' }}>θ2 Elbow</div>
          <div style={{ color: 'var(--cyan-bright)', fontSize: 20, marginTop: 4 }}>{deg2}°</div>
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(0,184,212,.08)', border: '1px solid var(--border)' }}>
          <div style={{ color: '#94A3B8', fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase' }}>Reach</div>
          <div style={{ color: 'var(--cyan-bright)', fontSize: 20, marginTop: 4 }}>
            {ik.reach.toFixed(0)} / {L1 + L2} px
          </div>
        </div>
      </div>

      <p style={{ marginTop: 18, fontSize: 14, color: '#A8B0BC', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--mist)' }}>Inverse Kinematics</strong> converts a target position (x, y) into joint angles. Every robot arm uses this to move its gripper to the right place.
      </p>
      <a
        href="/atlas/concept/inverse-kinematics"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-block', marginTop: 6, color: 'var(--cyan-bright)', fontSize: 13.5, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
      >
        Read: Inverse Kinematics →
      </a>
    </div>
  );
}
