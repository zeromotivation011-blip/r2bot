'use client'
import { useState } from 'react'

export default function ShareBar({ url, title, embedSlug }: { url: string; title: string; embedSlug?: string }) {
  const [copied, setCopied] = useState<string | null>(null)
  const enc = encodeURIComponent
  const btn = { padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#e2e8f0', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' } as const
  async function copy(kind: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(kind); setTimeout(() => setCopied(null), 1800) } catch { /* ignore */ }
  }
  const iframe = embedSlug ? `<iframe src="https://www.r2bot.in/embed/${embedSlug}" width="100%" height="520" style="border:0" title="${title.replace(/"/g, '&quot;')}" loading="lazy"></iframe>` : ''
  return (
    <div style={{ margin: '24px 0', padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 800, marginBottom: 8 }}>SHARE THIS GUIDE</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a style={btn} target="_blank" rel="noopener" href={`https://wa.me/?text=${enc(title + ' ' + url)}`}>WhatsApp</a>
        <a style={btn} target="_blank" rel="noopener" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}>LinkedIn</a>
        <a style={btn} target="_blank" rel="noopener" href={`https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`}>X</a>
        <a style={btn} target="_blank" rel="noopener" href={`https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}`}>Reddit</a>
        <button style={btn} onClick={() => copy('link', url)}>{copied === 'link' ? 'Copied' : 'Copy link'}</button>
        {embedSlug && <button style={btn} onClick={() => copy('embed', iframe)}>{copied === 'embed' ? 'Copied' : 'Copy embed code'}</button>}
      </div>
      <p style={{ color: 'var(--text-2)', fontSize: 12, margin: '8px 0 0' }}><a href="/invite" style={{ color: '#FC6818' }}>Get your personal invite link</a> to share R2BOT with friends.</p>
      {embedSlug && <p style={{ color: 'var(--text-2)', fontSize: 12, margin: '8px 0 0' }}>Teachers and bloggers: paste the embed code into your page to show this demo for free.</p>}
    </div>
  )
}
