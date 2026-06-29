'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UpgradeModal } from '@/components/UpgradeModal'

type Cadence = 'monthly' | 'yearly'

const PRO_FEATURES = [
  'Everything in Free',
  'Full Academy — Wire, Forge, and Edge tracks',
  'Unlimited R2 Co-pilot — no daily cap',
  'Project code reviews + feedback',
  'Certificates on course completion',
  'Offline downloads of course materials',
]

const FREE_FEATURES = [
  'Full Atlas — every concept, every entry',
  'Spark track — the complete beginner course',
  '10 R2 Co-pilot messages per day',
  'All 9 interactive simulators',
  'Daily Challenge with streak',
]

export function PricingClient() {
  const [cadence, setCadence] = useState<Cadence>('monthly')
  const [modalOpen, setModalOpen] = useState(false)

  const proPrice = cadence === 'monthly' ? '₹799' : '₹5,999'
  const proCadence = cadence === 'monthly' ? '/month' : '/year'

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* FREE plan */}
        <article style={{
          background: '#111118', border: '1.5px solid #1f1f2a',
          borderRadius: 20, padding: '28px 26px', display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 900, margin: 0 }}>
              Free
            </p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              No card. No trial limit.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 44, fontWeight: 900, color: '#fff' }}>₹0</span>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FREE_FEATURES.map((f) => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#cbd5e1', lineHeight: 1.5 }}>
                <span style={{ color: '#10b981', fontWeight: 900, fontSize: 16, lineHeight: 1.3 }} aria-hidden>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/signup"
            style={{
              marginTop: 'auto',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 48, padding: '0 22px',
              background: 'rgba(255,255,255,0.06)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 12, fontWeight: 800, fontSize: 15,
              textDecoration: 'none',
            }}
          >
            Start free →
          </Link>
        </article>

        {/* PRO plan */}
        <article style={{
          position: 'relative',
          background: 'linear-gradient(160deg, rgba(245,158,11,0.10), rgba(249,115,22,0.04))',
          border: '1.5px solid rgba(245,158,11,0.5)',
          borderRadius: 20, padding: '28px 26px', display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          <span style={{
            position: 'absolute', top: -12, left: 24,
            fontSize: 10, fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase',
            padding: '4px 10px', borderRadius: 999,
            background: '#fbbf24', color: '#1a0f00',
          }}>
            Recommended
          </span>

          <div>
            <p style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 900, margin: 0 }}>
              Pro
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
              From learner to engineer.
            </p>
          </div>

          {/* Cadence toggle */}
          <div role="tablist" aria-label="Billing cadence" style={{
            display: 'inline-flex', alignSelf: 'flex-start',
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 999, padding: 3,
          }}>
            <button
              type="button" role="tab" aria-selected={cadence === 'monthly'}
              onClick={() => setCadence('monthly')}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 800,
                borderRadius: 999, border: 'none', cursor: 'pointer',
                background: cadence === 'monthly' ? '#fbbf24' : 'transparent',
                color: cadence === 'monthly' ? '#1a0f00' : '#cbd5e1',
              }}
            >
              Monthly
            </button>
            <button
              type="button" role="tab" aria-selected={cadence === 'yearly'}
              onClick={() => setCadence('yearly')}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 800,
                borderRadius: 999, border: 'none', cursor: 'pointer',
                background: cadence === 'yearly' ? '#fbbf24' : 'transparent',
                color: cadence === 'yearly' ? '#1a0f00' : '#cbd5e1',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              Yearly
              <span style={{
                fontSize: 9, fontWeight: 900, letterSpacing: '1px',
                padding: '2px 6px', borderRadius: 999,
                background: cadence === 'yearly' ? 'rgba(26,15,0,0.18)' : 'rgba(16,185,129,0.18)',
                color: cadence === 'yearly' ? '#1a0f00' : '#34d399',
              }}>
                SAVE 37%
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 44, fontWeight: 900, color: '#fff' }}>{proPrice}</span>
            <span style={{ fontSize: 14, color: '#94a3b8' }}>{proCadence}</span>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PRO_FEATURES.map((f) => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#e5e7eb', lineHeight: 1.5 }}>
                <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: 16, lineHeight: 1.3 }} aria-hidden>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              marginTop: 'auto',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 48, padding: '0 22px',
              background: '#fbbf24', color: '#1a0f00',
              border: 'none', borderRadius: 12,
              fontWeight: 900, fontSize: 15, cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(251,191,36,0.28)',
            }}
          >
            Upgrade to Pro →
          </button>
        </article>
      </div>

      <UpgradeModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
