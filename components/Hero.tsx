'use client';

import { useEffect, useRef } from 'react';
import { MorphingLogo } from './MorphingLogo';
import { useCopilot } from './CopilotProvider';

const PLACEHOLDERS = [
  'Ask R2 anything…',
  'What is SLAM?',
  'How does Optimus walk?',
  "I'm 14 — where do I start?",
  'Difference between AI and a robot',
  'Best Arduino kit for beginners',
];

export function Hero() {
  const { openWith } = useCopilot();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      const el = inputRef.current;
      if (!el || document.activeElement === el) return;
      i = (i + 1) % PLACEHOLDERS.length;
      el.placeholder = PLACEHOLDERS[i];
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = inputRef.current?.value?.trim();
    openWith(v || 'What is robotics?');
  };

  return (
    <section className="hero">
      <div className="hero-inner container">
        <div className="logo-stage">
          <MorphingLogo size={280} />
        </div>

        <div className="hero-eyebrow">India · USA · China · Japan · Europe</div>
        <h1 className="display hero-title">
          ROBOT, <span className="accent">decoded.</span>
        </h1>
        <p className="hero-sub">
          The world&apos;s most accessible robotics platform. Every robot, every breakthrough,
          every concept — explained in plain English.
        </p>

        <form className="askbar" onSubmit={submit} role="search">
          <span className="askbar-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a9 9 0 0 0-9 9c0 2 .5 3.5 1.5 5L3 22l6-1.5c1.5 1 3 1.5 5 1.5a9 9 0 1 0-2-19z" />
            </svg>
          </span>
          <input ref={inputRef} placeholder="Ask R2 anything…" aria-label="Ask R2 Co-pilot anything about robotics" />
          <button type="submit" className="askbar-cta">Ask R2 →</button>
        </form>

        <div className="quick-chips">
          {['What is SLAM?', 'How does Optimus walk?', "I'm 14 — where do I start?", 'Boston Dynamics vs Unitree'].map(q => (
            <button key={q} className="chip" onClick={() => openWith(q)}>{q}</button>
          ))}
        </div>
      </div>
      <div className="scroll-hint">SCROLL</div>
    </section>
  );
}
