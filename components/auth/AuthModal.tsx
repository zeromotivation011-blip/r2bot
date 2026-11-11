'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from './AuthProvider'
import dynamic from 'next/dynamic'

// The panel pulls the Supabase client in; load it only once the modal opens.
const AuthPanel = dynamic(() => import('./AuthPanel').then((m) => m.AuthPanel), { ssr: false })

/**
 * The header's sign-in dialog.
 *
 * It used to carry its own copy of the auth logic — email + password and
 * Google, but no magic link — while /login and /signup carried a different
 * copy offering only a magic link. Two sign-in surfaces that disagreed about
 * what a person could sign in with. Both render components/auth/AuthPanel now.
 */
export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!isAuthModalOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAuthModal() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isAuthModalOpen, closeAuthModal])

  if (!mounted || !isAuthModalOpen) return null

  const modal = (
    <div className="auth-back" onClick={closeAuthModal}>
      <div className="auth-card" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={closeAuthModal} aria-label="Close">×</button>

        <div className="auth-head">
          <p className="r2-eyebrow">R2BOT</p>
          <h2 className="r2-h3">Sign in or create an account</h2>
          <p className="r2-meta">
            An account only saves your progress and your certificates. Everything is free to read
            without one.
          </p>
        </div>

        <AuthPanel mode="signin" next="/dashboard" onDone={closeAuthModal} />
      </div>

      <style jsx>{`
        .auth-back {
          position: fixed; inset: 0; z-index: 80;
          background: rgba(10,10,15,.78);
          backdrop-filter: blur(6px);
          display: grid; place-items: center;
          padding: 16px;
          animation: fade 0.18s ease-out;
        }
        @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
        .auth-card {
          position: relative;
          width: 100%; max-width: 420px;
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 28px 24px 22px;
          color: #e5e7eb;
          max-height: 92vh; overflow-y: auto;
        }
        .auth-close {
          position: absolute; top: 12px; right: 12px;
          background: transparent; border: 0;
          color: #6b7280; font-size: 24px; cursor: pointer; line-height: 1;
        }
        .auth-close:hover { color: #fff; }
        .auth-head { margin-bottom: 18px; }
        .auth-eyebrow { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #f97316; font-weight: 900; }
        .auth-head h2 { font-size: 24px; font-weight: 900; color: #fff; margin-top: 4px; }
        .auth-sub { font-size: 13px; color: #9ca3af; margin-top: 2px; }
        .auth-tabs { display: flex; background: var(--void); border-radius: 10px; padding: 4px; margin-bottom: 16px; }
        .auth-tab {
          flex: 1; min-height: 36px; padding: 8px;
          background: transparent; border: 0;
          color: #9ca3af; font-weight: 700; font-size: 14px;
          border-radius: 8px; cursor: pointer;
        }
        .auth-tab.on { background: var(--border-2); color: #fff; }
        .auth-form { display: flex; flex-direction: column; gap: 10px; }
        .auth-form label {
          display: block;
          font-size: 11px; letter-spacing: 0.5px; color: #9ca3af;
          font-weight: 700; text-transform: uppercase;
        }
        .auth-form input, .auth-form select {
          width: 100%;
          margin-top: 4px;
          background: var(--void);
          border: 1px solid var(--border);
          color: #fff; font-size: 15px; font-weight: 500;
          padding: 10px 12px; border-radius: 10px;
          outline: none;
        }
        .auth-form input:focus, .auth-form select:focus { border-color: #3b82f6; }
        .auth-cta {
          margin-top: 6px; min-height: 44px;
          background: #3b82f6; color: white;
          font-weight: 800; border: 0; border-radius: 10px;
          cursor: pointer; display: grid; place-items: center;
        }
        .auth-cta:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-link {
          background: transparent; color: #f97316; border: 0;
          font-size: 12px; font-weight: 700; cursor: pointer;
          margin-top: 2px; text-align: left;
        }
        .auth-divider {
          margin: 16px 0 12px;
          display: flex; align-items: center; gap: 10px;
          font-size: 11px; color: #6b7280; letter-spacing: 1px; text-transform: uppercase;
        }
        .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: var(--border-2); }
        .auth-google {
          width: 100%; min-height: 44px;
          background: var(--void); color: #e5e7eb;
          border: 1px solid var(--border); border-radius: 10px;
          font-weight: 700; cursor: pointer;
        }
        .auth-google:hover { border-color: #3b82f6; }
        .auth-err  { margin-top: 10px; font-size: 12px; color: #fca5a5; background: rgba(220,38,38,.08); border: 1px solid rgba(220,38,38,.35); padding: 8px 10px; border-radius: 8px; }
        .auth-info { margin-top: 10px; font-size: 12px; color: #86efac; background: rgba(16,185,129,.1);  border: 1px solid rgba(16,185,129,.35);  padding: 8px 10px; border-radius: 8px; }
        .auth-foot { margin-top: 12px; font-size: 11px; color: #6b7280; text-align: center; }
      `}</style>
    </div>
  )

  return createPortal(modal, document.body)
}
