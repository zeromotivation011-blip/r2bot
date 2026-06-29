'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from './AuthProvider'

type Tab = 'in' | 'up'

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [grade, setGrade] = useState('enthusiast')
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Close on Escape
  useEffect(() => {
    if (!isAuthModalOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAuthModal() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isAuthModalOpen, closeAuthModal])

  const reset = () => { setErr(null); setInfo(null) }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setErr(error.message); return }
      closeAuthModal()
      router.refresh()
    } finally { setLoading(false) }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setErr(error.message); return }
      // Upsert profile (display_name + grade)
      const userId = data.user?.id
      if (userId) {
        await supabase.from('profiles').upsert({
          id: userId,
          display_name: displayName || email.split('@')[0],
          grade,
        })
      }
      setInfo("Account created. Check your email if confirmation is required, then sign in.")
      setTab('in')
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    reset(); setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
      })
      if (error) setErr(error.message)
    } finally { setLoading(false) }
  }

  const handleForgot = async () => {
    reset()
    if (!email) { setErr('Enter your email above first.'); return }
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/profile/settings` : undefined,
      })
      if (error) { setErr(error.message); return }
      setInfo('📧 Check your email for the reset link.')
    } finally { setLoading(false) }
  }

  if (!mounted || !isAuthModalOpen) return null

  const modal = (
    <div className="auth-back" onClick={closeAuthModal}>
      <div className="auth-card" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={closeAuthModal} aria-label="Close">×</button>

        <div className="auth-head">
          <p className="auth-eyebrow">R2BOT</p>
          <h2>{tab === 'in' ? 'Sign in' : 'Create your account'}</h2>
          <p className="auth-sub">Save your progress, sync across devices.</p>
        </div>

        <div className="auth-tabs">
          {(['in', 'up'] as Tab[]).map(t => (
            <button key={t} type="button" onClick={() => { setTab(t); reset() }} className={`auth-tab ${tab === t ? 'on' : ''}`}>
              {t === 'in' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {tab === 'in' ? (
          <form onSubmit={handleSignIn} className="auth-form">
            <label>Email
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </label>
            <label>Password
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
            </label>
            <button type="submit" className="auth-cta" disabled={loading}>
              {loading ? <Spinner /> : 'Sign in →'}
            </button>
            <button type="button" onClick={handleForgot} className="auth-link">Forgot password?</button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="auth-form">
            <label>Display name
              <input type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={40} />
            </label>
            <label>Email
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </label>
            <label>Password (8+ chars)
              <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
            </label>
            <label>I am a…
              <select value={grade} onChange={e => setGrade(e.target.value)}>
                <option value="6">Class 6</option>
                <option value="7">Class 7</option>
                <option value="8">Class 8</option>
                <option value="9">Class 9</option>
                <option value="10">Class 10</option>
                <option value="11">Class 11</option>
                <option value="12">Class 12</option>
                <option value="teacher">Teacher</option>
                <option value="parent">Parent</option>
                <option value="enthusiast">Robotics enthusiast</option>
              </select>
            </label>
            <button type="submit" className="auth-cta" disabled={loading}>
              {loading ? <Spinner /> : 'Create account →'}
            </button>
          </form>
        )}

        <div className="auth-divider"><span>or</span></div>
        <button type="button" onClick={handleGoogle} className="auth-google" disabled={loading}>
          Continue with Google
        </button>

        {err  && <p className="auth-err">{err}</p>}
        {info && <p className="auth-info">{info}</p>}

        <p className="auth-foot">By signing up you agree to our terms. We don\'t sell your data.</p>
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
          background: #111118;
          border: 1px solid #1f1f2a;
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
        .auth-tabs { display: flex; background: #0a0a0f; border-radius: 10px; padding: 4px; margin-bottom: 16px; }
        .auth-tab {
          flex: 1; min-height: 36px; padding: 8px;
          background: transparent; border: 0;
          color: #9ca3af; font-weight: 700; font-size: 14px;
          border-radius: 8px; cursor: pointer;
        }
        .auth-tab.on { background: #1f1f2a; color: #fff; }
        .auth-form { display: flex; flex-direction: column; gap: 10px; }
        .auth-form label {
          display: block;
          font-size: 11px; letter-spacing: 0.5px; color: #9ca3af;
          font-weight: 700; text-transform: uppercase;
        }
        .auth-form input, .auth-form select {
          width: 100%;
          margin-top: 4px;
          background: #0a0a0f;
          border: 1px solid #1f1f2a;
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
        .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: #1f1f2a; }
        .auth-google {
          width: 100%; min-height: 44px;
          background: #0a0a0f; color: #e5e7eb;
          border: 1px solid #1f1f2a; border-radius: 10px;
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

function Spinner() {
  return (
    <span aria-hidden style={{
      width: 18, height: 18, borderRadius: '50%',
      border: '2px solid rgba(255,255,255,.4)',
      borderTopColor: '#fff',
      animation: 'spin 0.7s linear infinite',
      display: 'inline-block',
    }}>
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </span>
  )
}
