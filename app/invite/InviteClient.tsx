'use client'
import { useEffect, useState } from 'react'

export default function InviteClient() {
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    try {
      let c = localStorage.getItem('r2bot_invite') || ''
      if (!/^[A-Za-z0-9]{8}$/.test(c)) {
        c = Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('')
        localStorage.setItem('r2bot_invite', c)
      }
      setCode(c)
    } catch { setCode('') }
  }, [])
  const url = `https://www.r2bot.in/courses${code ? `?ref=${code}` : ''}`
  const text = 'Free robotics courses in plain English, with quizzes and certificates:'
  const enc = encodeURIComponent
  const btn = { padding: '10px 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#e2e8f0', fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' } as const
  return (
    <div style={{ marginTop: 20, padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>YOUR LINK</div>
      <input readOnly value={url} aria-label="Your invite link" onFocus={(e) => e.currentTarget.select()}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.25)', color: '#fff', fontSize: 14 }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <button style={btn} onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ } }}>{copied ? 'Copied' : 'Copy link'}</button>
        <a style={btn} target="_blank" rel="noopener" href={`https://wa.me/?text=${enc(text + ' ' + url)}`}>WhatsApp</a>
        <a style={btn} target="_blank" rel="noopener" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}>LinkedIn</a>
        <a style={btn} target="_blank" rel="noopener" href={`https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`}>X</a>
      </div>
    </div>
  )
}
