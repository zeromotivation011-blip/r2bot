'use client'

// components/ProPaywall.tsx — Lesson-level paywall overlay
// Wraps the locked content body in a blurred container with an upgrade card on top.
// Lesson title/description should be rendered OUTSIDE this component so they remain visible.

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { UpgradeModal } from './UpgradeModal'

interface ProPaywallProps {
  children: ReactNode
}

export function ProPaywall({ children }: ProPaywallProps) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      {/* The locked content body, blurred and non-interactive */}
      <div
        aria-hidden
        style={{
          filter: 'blur(8px) saturate(0.6)',
          pointerEvents: 'none',
          userSelect: 'none',
          maxHeight: 540,
          overflow: 'hidden',
          maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
        }}
      >
        {children}
      </div>

      {/* Overlay card */}
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'grid', placeItems: 'center',
          padding: 20,
        }}
      >
        <div
          style={{
            maxWidth: 520, width: '100%',
            background: 'rgba(15,15,23,0.92)',
            border: '1.5px solid rgba(245,158,11,0.45)',
            borderRadius: 18,
            padding: '28px 26px',
            textAlign: 'center',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          }}
        >
          <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 900, margin: '0 0 10px' }}>
            🔒 R2BOT Pro
          </p>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: '0 0 10px', lineHeight: 1.2 }}>
            This is a Pro lesson
          </h2>
          <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 22px' }}>
            You&apos;re on the free plan. Upgrade to access Wire, Forge, and Edge tracks,
            plus unlimited R2 Co-pilot.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center',
                minHeight: 48, padding: '0 22px',
                background: '#fbbf24', color: '#1a0f00',
                border: 'none', borderRadius: 12,
                fontWeight: 900, fontSize: 14, cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(251,191,36,0.30)',
              }}
            >
              Upgrade to Pro →
            </button>
            <Link
              href="/academy/spark"
              style={{
                display: 'inline-flex', alignItems: 'center',
                minHeight: 48, padding: '0 22px',
                background: 'rgba(255,255,255,0.06)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 12,
                fontWeight: 800, fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Back to Spark →
            </Link>
          </div>
        </div>
      </div>

      <UpgradeModal open={open} onClose={() => setOpen(false)} reason="This lesson is part of a Pro track." />
    </div>
  )
}
