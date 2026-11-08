'use client'

import { useState } from 'react'

const T = {
  en: { h: 'Get one robotics email a week', p: 'Plain English. Free. Unsubscribe in one click.', ph: 'you@email.com', b: 'Subscribe', ok: 'Thanks. Check your inbox.', err: 'Something went wrong. Please try again.' },
  hi: { h: 'हर हफ़्ते एक रोबोटिक्स ईमेल', p: 'आसान भाषा में। मुफ़्त। एक क्लिक में सदस्यता रद्द।', ph: 'you@email.com', b: 'सदस्य बनें', ok: 'धन्यवाद। अपना इनबॉक्स देखिए।', err: 'कुछ गड़बड़ हो गई। फिर कोशिश कीजिए।' },
  es: { h: 'Un correo de robótica a la semana', p: 'En lenguaje sencillo. Gratis. Date de baja con un clic.', ph: 'tu@correo.com', b: 'Suscribirme', ok: 'Gracias. Revisa tu bandeja de entrada.', err: 'Algo salió mal. Inténtalo de nuevo.' },
  zh: { h: '每周一封机器人邮件', p: '通俗易懂，免费，随时一键退订。', ph: 'you@email.com', b: '订阅', ok: '谢谢，请查收邮箱。', err: '出错了，请重试。' },
} as const

export default function InlineSignup({ lang = 'en' }: { lang?: 'en' | 'hi' | 'zh' | 'es' }) {
  const t = T[lang]
  const [email, setEmail] = useState('')
  const [s, setS] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setS('sending')
    try {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'newsletter', page: window.location.pathname }) })
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean }
      setS(r.ok && d.ok ? 'ok' : 'err')
    } catch { setS('err') }
  }
  return (
    <div style={{ margin: '28px 0', padding: 18, borderRadius: 14, background: 'rgba(252,104,24,0.08)', border: '1px solid rgba(252,104,24,0.35)' }}>
      <div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{t.h}</div>
      <p style={{ color: 'var(--text-2)', margin: '4px 0 12px', fontSize: 14 }}>{t.p}</p>
      {s === 'ok' ? <p style={{ color: '#4ade80', fontWeight: 700, margin: 0 }}>{t.ok}</p> : (
        <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.ph} aria-label="Email"
            style={{ flex: '1 1 220px', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.25)', color: '#fff', fontSize: 15 }} />
          <button type="submit" disabled={s === 'sending'} style={{ padding: '10px 18px', borderRadius: 10, border: 0, background: '#FC6818', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{t.b}</button>
        </form>
      )}
      {s === 'err' && <p style={{ color: '#f87171', margin: '8px 0 0', fontSize: 13 }}>{t.err}</p>}
    </div>
  )
}
