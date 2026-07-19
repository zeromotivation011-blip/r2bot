'use client'

// Share row for an individual simulator page.
//
// Deliberately includes Reddit and Hacker News alongside the usual X/LinkedIn:
// those two are where robotics learners actually congregate, and they are the
// realistic source of the first backlinks this domain will ever earn.

import { useState } from 'react'

type Props = { id: string; title: string; url: string }

export function SimulatorShare({ id, title, url }: Props) {
  const [copied, setCopied] = useState<'link' | 'embed' | null>(null)

  const embed = `<iframe src="${url.replace(`/visualizer/${id}`, `/visualizer/embed/${id}`)}" width="800" height="500" style="border:0;border-radius:12px" allowfullscreen title="${title}"></iframe>`

  async function copy(text: string, kind: 'link' | 'embed') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(null), 1800)
      ;(window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', 'share', {
        method: kind === 'link' ? 'copy_link' : 'copy_embed',
        content_id: id,
      })
    } catch {
      /* clipboard can be blocked; nothing useful to do */
    }
  }

  function track(method: string) {
    try {
      ;(window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', 'share', {
        method,
        content_id: id,
      })
    } catch {
      /* ignore */
    }
  }

  const enc = encodeURIComponent
  const targets = [
    { label: 'Reddit', href: `https://reddit.com/submit?url=${enc(url)}&title=${enc(title)}` },
    { label: 'Hacker News', href: `https://news.ycombinator.com/submitlink?u=${enc(url)}&t=${enc(title)}` },
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
  ]

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <button type="button" onClick={() => copy(url, 'link')} style={primaryBtn}>
        {copied === 'link' ? '✓ Link copied' : '🔗 Copy link'}
      </button>

      {targets.map((t) => (
        <a
          key={t.label}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track(t.label.toLowerCase().replace(/\s+/g, '_'))}
          style={ghostBtn}
        >
          {t.label}
        </a>
      ))}

      <button type="button" onClick={() => copy(embed, 'embed')} style={ghostBtn}>
        {copied === 'embed' ? '✓ Embed copied' : '⧉ Embed'}
      </button>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  color: '#FFB020',
  background: 'rgba(255,176,32,0.12)',
  border: '1px solid rgba(255,176,32,0.4)',
  cursor: 'pointer',
}

const ghostBtn: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  color: '#C8D0DC',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.12)',
  textDecoration: 'none',
  cursor: 'pointer',
}
