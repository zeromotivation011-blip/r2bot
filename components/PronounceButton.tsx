'use client';

import { useEffect, useState } from 'react';

/**
 * Web Speech API pronunciation button. Hides itself entirely if the
 * browser doesn't expose `speechSynthesis` — better than showing a
 * broken control.
 */
export function PronounceButton({ word, phonetic }: { word: string; phonetic?: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined');
  }, []);

  if (!supported) return null;

  const handle = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(phonetic ?? word);
      utter.rate = 0.85;
      utter.lang = 'en-US';
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    } catch {
      setSpeaking(false);
    }
  };

  return (
    <button
      onClick={handle}
      aria-label={`Hear pronunciation of ${word}`}
      title="Hear pronunciation"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: '0 0 0 12px',
        color: speaking ? 'var(--cyan-bright)' : 'var(--muted)',
        cursor: 'pointer',
        fontSize: 16,
        fontFamily: 'inherit',
        transition: 'color .15s',
        verticalAlign: 'middle',
        animation: speaking ? 'r2Pulse 0.9s ease-in-out infinite' : undefined,
      }}
      onMouseEnter={(e) => {
        if (!speaking) e.currentTarget.style.color = 'var(--cyan)';
      }}
      onMouseLeave={(e) => {
        if (!speaking) e.currentTarget.style.color = 'var(--muted)';
      }}
    >
      <style>{`@keyframes r2Pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }`}</style>
      🔊
    </button>
  );
}
