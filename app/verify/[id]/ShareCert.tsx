'use client'
import { useState } from 'react'

export default function ShareCert({ id, title, issued }: { id: string; title: string; issued: string }) {
  const [copied, setCopied] = useState(false)
  const url = `https://www.r2bot.in/verify/${id}`
  const d = new Date(issued)
  const text = `I just finished "${title}" on R2BOT, a free robotics course.`
  const li = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(title)}&organizationName=R2BOT&issueYear=${d.getUTCFullYear()}&issueMonth=${d.getUTCMonth() + 1}&certUrl=${encodeURIComponent(url)}&certId=${encodeURIComponent(id)}`
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
  const b = { display: 'inline-block', padding: '10px 16px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', background: 'transparent' } as const
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ color: '#FC6818', fontSize: 12, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>SHARE YOUR WIN</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a href={li} target="_blank" rel="noopener noreferrer" style={{ ...b, background: '#FC6818', borderColor: '#FC6818' }}>Add to LinkedIn profile</a>
        <a href={wa} target="_blank" rel="noopener noreferrer" style={b}>WhatsApp</a>
        <a href={x} target="_blank" rel="noopener noreferrer" style={b}>Post on X</a>
        <button style={b} onClick={() => { navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }}>{copied ? 'Link copied' : 'Copy link'}</button>
      </div>
    </div>
  )
}
