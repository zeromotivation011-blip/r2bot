'use client';

import { useState } from 'react';

export function AtlasPronounce({ term }: { term: string }) {
  const [speaking, setSpeaking] = useState(false);

  function pronounce() {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) {
      alert('Your browser does not support speech synthesis.');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(term);
      u.rate = 0.9;
      u.pitch = 1;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {
      setSpeaking(false);
    }
  }

  return (
    <button
      type="button"
      onClick={pronounce}
      aria-label={`Pronounce ${term}`}
      title={`Pronounce "${term}"`}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
        speaking
          ? 'border-amber-400 bg-amber-500/30 text-amber-100'
          : 'border-white/15 bg-white/[0.04] text-zinc-200 hover:border-amber-400/40 hover:bg-amber-500/10'
      }`}
    >
      <span aria-hidden className="text-lg">🔊</span>
    </button>
  );
}
