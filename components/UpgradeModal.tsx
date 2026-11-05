'use client'

// components/UpgradeModal.tsx — daily-limit dialog.
// Everything on R2BOT is free for now, so there is nothing to buy. When the
// free R2 Co-pilot limit is reached we say so plainly and point to free tools.

import { useEffect } from 'react'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  reason?: string
}

export function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily limit reached"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'grid', placeItems: 'center', padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 440, background: '#0b1220', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 28, color: '#e5e7eb' }}
      >
        <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800 }}>You have reached today&apos;s free limit</h2>
        <p style={{ margin: '0 0 8px', fontSize: 15, lineHeight: 1.6, color: '#b0b8c5' }}>
          {reason ?? 'The R2 Co-pilot has a fair daily limit so it can stay free for everyone.'} It resets tomorrow.
        </p>
        <p style={{ margin: '0 0 20px', fontSize: 15, lineHeight: 1.6, color: '#b0b8c5' }}>
          In the meantime, the Atlas, Academy lessons and simulators are free and unlimited.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/atlas" className="btn btn-primary">Explore the Atlas</a>
          <a href="/academy" className="btn btn-ghost">Open the Academy</a>
          <button type="button" onClick={onClose} className="btn btn-ghost">Close</button>
        </div>
      </div>
    </div>
  )
}
