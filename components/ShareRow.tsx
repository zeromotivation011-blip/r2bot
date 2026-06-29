'use client';

import { useState } from 'react';

export function ShareRow({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const enc = (s: string) => encodeURIComponent(s);
  const wa = `https://wa.me/?text=${enc(`${title} — ${url}`)}`;
  const tw = `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — silently fail */
    }
  };

  const btn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'rgba(11,37,64,.4)',
    color: '#C8D0DC',
    fontSize: 13,
    fontFamily: 'inherit',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all .2s',
  };

  return (
    <div
      role="group"
      aria-label="Share this page"
      style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}
    >
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        style={btn}
      >
        <span aria-hidden="true">✎</span> WhatsApp
      </a>
      <a
        href={tw}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Twitter / X"
        style={btn}
      >
        <span aria-hidden="true">𝕏</span> Share
      </a>
      <button onClick={onCopy} aria-label="Copy link" style={btn}>
        <span aria-hidden="true">⎘</span> {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  );
}
