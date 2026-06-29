'use client'

// components/UpgradeModal.tsx — Pro tier upgrade dialog
// Loads Razorpay Checkout on demand, creates an order via /api/payment/create-order,
// opens Checkout, then verifies via /api/payment/verify on success.

import { useCallback, useEffect, useState } from 'react'

type Plan = 'monthly' | 'yearly'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  reason?: string // e.g. "You've hit your 10 free R2 messages today."
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void }
  }
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void
  prefill?: { email?: string }
  theme?: { color?: string }
  modal?: { ondismiss?: () => void }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true })
      existing.addEventListener('error', () => resolve(false), { once: true })
      return
    }
    const s = document.createElement('script')
    s.src = CHECKOUT_SRC
    s.async = true
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

export function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Reset when closed.
  useEffect(() => {
    if (!open) {
      setLoadingPlan(null)
      setError(null)
      setSuccess(false)
    }
  }, [open])

  const handleUpgrade = useCallback(async (plan: Plan) => {
    setError(null)
    setLoadingPlan(plan)
    try {
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const orderJson = await orderRes.json()
      if (!orderRes.ok) {
        setError(orderJson.error || 'Could not start checkout.')
        setLoadingPlan(null)
        return
      }

      const ok = await loadRazorpayScript()
      if (!ok || !window.Razorpay) {
        setError('Could not load checkout. Check your network and try again.')
        setLoadingPlan(null)
        return
      }

      const rzp = new window.Razorpay({
        key: orderJson.key,
        amount: orderJson.amount,
        currency: orderJson.currency,
        name: 'R2BOT Pro',
        description: plan === 'yearly' ? 'R2BOT Pro · Yearly' : 'R2BOT Pro · Monthly',
        order_id: orderJson.orderId,
        theme: { color: '#f59e0b' },
        modal: {
          ondismiss: () => setLoadingPlan(null),
        },
        handler: async (response) => {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan,
              }),
            })
            const verifyJson = await verifyRes.json()
            if (!verifyRes.ok || !verifyJson.success) {
              setError(verifyJson.error || 'Payment received but verification failed. Contact support.')
              setLoadingPlan(null)
              return
            }
            setSuccess(true)
            setLoadingPlan(null)
            setTimeout(() => window.location.reload(), 1800)
          } catch {
            setError('Payment verification request failed. Contact support.')
            setLoadingPlan(null)
          }
        },
      })
      rzp.open()
    } catch {
      setError('Something went wrong starting checkout.')
      setLoadingPlan(null)
    }
  }, [])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)',
        display: 'grid', placeItems: 'center', padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 720,
          background: '#0f0f17', border: '1px solid #1f1f2a',
          borderRadius: 20, padding: 28,
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 900, margin: 0 }}>
            R2BOT Pro
          </p>
          <button
            type="button" onClick={onClose} aria-label="Close upgrade dialog"
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
          >×</button>
        </div>

        <h2 id="upgrade-modal-title" style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, color: '#fff' }}>
          Go Pro. Build robots faster.
        </h2>
        {reason && (
          <p style={{ margin: '0 0 18px', fontSize: 14, color: '#fbbf24' }}>{reason}</p>
        )}
        <p style={{ margin: '0 0 22px', fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>
          Full Academy, unlimited R2 Co-pilot, project code review, certificates, and offline downloads.
        </p>

        {success ? (
          <div style={{
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)',
            color: '#a7f3d0', borderRadius: 14, padding: '16px 18px', fontWeight: 700,
          }}>
            ✓ Welcome to Pro. Reloading…
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            <PlanCard
              plan="monthly"
              label="Monthly"
              price="₹799"
              cadence="/month"
              accent="#3b82f6"
              loading={loadingPlan === 'monthly'}
              disabled={loadingPlan !== null}
              onClick={() => handleUpgrade('monthly')}
            />
            <PlanCard
              plan="yearly"
              label="Yearly"
              price="₹5,999"
              cadence="/year"
              badge="Save 37%"
              accent="#f59e0b"
              loading={loadingPlan === 'yearly'}
              disabled={loadingPlan !== null}
              onClick={() => handleUpgrade('yearly')}
            />
          </div>
        )}

        {error && (
          <p style={{ marginTop: 14, color: '#fca5a5', fontSize: 13 }}>{error}</p>
        )}

        <p style={{ marginTop: 18, fontSize: 11, color: '#64748b' }}>
          Secure payments by Razorpay. Cancel anytime.
        </p>
      </div>
    </div>
  )
}

function PlanCard({
  label, price, cadence, badge, accent, loading, disabled, onClick,
}: {
  plan: Plan
  label: string
  price: string
  cadence: string
  badge?: string
  accent: string
  loading: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        textAlign: 'left',
        padding: '20px 18px',
        background: '#111118',
        border: `1.5px solid ${accent}55`,
        borderRadius: 16,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !loading ? 0.55 : 1,
        transition: 'transform .15s, border-color .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 900, color: accent, textTransform: 'uppercase', letterSpacing: '2px' }}>
          {label}
        </span>
        {badge && (
          <span style={{
            fontSize: 10, fontWeight: 900, letterSpacing: '1px',
            padding: '3px 8px', borderRadius: 999,
            background: `${accent}22`, color: accent, border: `1px solid ${accent}55`,
          }}>{badge}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{price}</span>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>{cadence}</span>
      </div>
      <p style={{ marginTop: 12, fontSize: 13, fontWeight: 800, color: accent }}>
        {loading ? 'Opening checkout…' : 'Choose →'}
      </p>
    </button>
  )
}
