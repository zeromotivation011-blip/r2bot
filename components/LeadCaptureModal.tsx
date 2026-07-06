'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'r2bot_lead_captured'
const PV_KEY = 'r2bot_pageviews'
const MIN_PAGES = 3          // invite once the visitor is engaged (viewed ~3 pages)
const FALLBACK_MS = 45000    // or after a long single-page read

export function LeadCaptureModal() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return
    } catch { /* ignore */ }

    // Count pages viewed this session; open on the Nth page.
    let views = 0
    try {
      views = Number(window.sessionStorage.getItem(PV_KEY) || '0') + 1
      window.sessionStorage.setItem(PV_KEY, String(views))
    } catch { /* ignore */ }

    if (views >= MIN_PAGES) {
      setOpen(true)
      return
    }
    const t = setTimeout(() => setOpen(true), FALLBACK_MS)
    return () => clearTimeout(t)
  }, [pathname])

  function dismiss() {
    try { window.localStorage.setItem(STORAGE_KEY, 'dismissed') } catch { /* ignore */ }
    setOpen(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'loading') return
    setStatus('loading'); setErr(null)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim(), page: window.location.pathname }),
      })
      const json = await res.json()
      if (json.ok) {
        setStatus('ok')
        try { window.localStorage.setItem(STORAGE_KEY, 'captured') } catch { /* ignore */ }
        // Fire a GA event if Analytics is loaded.
        try {
          ;(window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.(
            'event', 'lead_capture', { method: 'popup' },
          )
        } catch { /* ignore */ }
        setTimeout(() => setOpen(false), 1600)
      } else {
        setStatus('err'); setErr(json.error || 'Something went wrong.')
      }
    } catch {
      setStatus('err'); setErr('Network error. Please try again.')
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Get robotics updates"
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(3,4,10,0.72)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440, background: '#0b0b14',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20,
          padding: '30px 26px', position: 'relative',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        }}
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          style={{
            position: 'absolute', top: 14, right: 16, background: 'transparent',
            border: 'none', color: '#64748b', fontSize: 22, cursor: 'pointer', lineHeight: 1,
          }}
        >
          ×
        </button>

        {status === 'ok' ? (
          <div style={{ textAlign: 'center', padding: '18px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 900, margin: '0 0 6px' }}>You&apos;re in!</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
              We&apos;ll send you the best of robotics. Welcome to R2BOT.
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 900, margin: '0 0 10px' }}>
              R2BOT · Free updates
            </p>
            <h3 style={{ color: '#fff', fontSize: 'clamp(20px,4vw,26px)', fontWeight: 900, margin: '0 0 8px', lineHeight: 1.2 }}>
              Get robotics news, projects &amp; job alerts.
            </h3>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
              Join Indian students learning robotics with R2BOT. Weekly, curated, and free.
            </p>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com" autoComplete="email"
                style={inputStyle}
              />
              <input
                type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (WhatsApp preferred)" autoComplete="tel"
                style={inputStyle}
              />
              <button
                type="submit" disabled={status === 'loading'}
                style={{
                  marginTop: 4, minHeight: 48, background: '#fbbf24', color: '#0f0a1e',
                  fontWeight: 900, fontSize: 15, border: 'none', borderRadius: 12,
                  cursor: 'pointer', opacity: status === 'loading' ? 0.6 : 1,
                }}
              >
                {status === 'loading' ? 'Joining…' : 'Get free updates →'}
              </button>
              {status === 'err' && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{err}</p>}
              <button
                type="button" onClick={dismiss}
                style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', marginTop: 2 }}
              >
                Maybe later
              </button>
            </form>
            <p style={{ fontSize: 10, color: '#374151', marginTop: 12, textAlign: 'center' }}>
              No spam. Unsubscribe anytime. We never share your details.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)', color: '#f4f4f5',
  padding: '12px 14px', borderRadius: 12, fontSize: 14, outline: 'none',
}
