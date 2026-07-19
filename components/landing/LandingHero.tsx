'use client';

// CSS-only cycling subline — no JS timer. Three stacked spans on the same line,
// each fading in/out via animation-delay across a 10.5s loop (3 × 3.5s).

export function LandingHero() {
  return (
    <section
      style={{
        position: 'relative',
        background: 'radial-gradient(circle at 30% 20%, rgba(0,184,212,.08) 0%, transparent 60%), #0A0E17',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: '110px 20px 36px',
        minHeight: 'min(100vh, 760px)',
      }}
    >
      <CircuitBackdrop />

      <div
        className="container"
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 920,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
        }}
      >
        {/* Badge pill */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 999,
            border: '1px solid rgba(245,158,11,.45)',
            background: 'rgba(245,158,11,.08)',
            color: '#FBBF24',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '.04em',
            animation: 'r2-fade-in 500ms ease-out both',
          }}
        >
          <span aria-hidden>🇮🇳</span> India&apos;s Robotics Learning Platform
        </span>

        {/* Headline */}
        <h1
          className="display"
          style={{
            margin: 0,
            color: '#FFFFFF',
            fontWeight: 900,
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
            fontSize: 'clamp(40px, 7vw, 84px)',
            animation: 'r2-fade-in 600ms 80ms ease-out both',
          }}
        >
          <span style={{ display: 'block' }}>Learn Robotics.</span>
          <span
            aria-hidden
            style={{
              display: 'block',
              position: 'relative',
              minHeight: '1.1em',
              background: 'linear-gradient(120deg, #f59e0b, #fbbf24)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            <span style={{ visibility: 'hidden' }}>Get Hired in India.</span>
            <span className="r2-cycle r2-cycle-1">Build Real Robots.</span>
            <span className="r2-cycle r2-cycle-2">Get Hired in India.</span>
            <span className="r2-cycle r2-cycle-3">Change the World.</span>
          </span>
          {/* Screen-reader-friendly static line */}
          <span className="sr-only">Build real robots. Get hired in India. Change the world.</span>
        </h1>

        {/* Subparagraph */}
        <p
          style={{
            margin: 0,
            maxWidth: 640,
            color: '#A1A1AA',
            fontSize: 'clamp(15px, 1.8vw, 18px)',
            lineHeight: 1.5,
            animation: 'r2-fade-in 600ms 160ms ease-out both',
          }}
        >
          The only robotics platform built for India. Go from zero to ROS2 engineer — with real projects, real code, real jobs.
        </p>

        {/* CTAs */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
            marginTop: 6,
            animation: 'r2-fade-in 600ms 240ms ease-out both',
          }}
        >
          <a
            href="/diagnostic"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 28px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#1a0f00',
              fontSize: 16,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 10px 30px rgba(245,158,11,.35)',
              transition: 'transform .15s',
            }}
          >
            Find My Starting Level →
          </a>
          <a
            href="/visualizer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 22px',
              borderRadius: 12,
              border: '1px solid var(--border-2)',
              background: 'transparent',
              color: '#C8D0DC',
              fontSize: 15,
              fontFamily: 'inherit',
              textDecoration: 'none',
            }}
          >
            Try a Live Simulator →
          </a>
        </div>

        {/* Honest microcopy — no fabricated endorsements */}
        <p
          style={{
            margin: '14px 0 0',
            fontSize: 12.5,
            color: '#71717A',
            letterSpacing: '.02em',
            maxWidth: 560,
            animation: 'r2-fade-in 600ms 320ms ease-out both',
          }}
        >
          New platform — be among the first learners. Your feedback shapes what we build next.
        </p>
      </div>

      <style>{`
        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
        }
        @keyframes r2-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .r2-cycle {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          opacity: 0;
          animation: r2-cycle 10.5s linear infinite;
        }
        .r2-cycle-1 { animation-delay: 0s; }
        .r2-cycle-2 { animation-delay: 3.5s; }
        .r2-cycle-3 { animation-delay: 7s; }
        @keyframes r2-cycle {
          0%   { opacity: 0; transform: translateY(8px); }
          5%   { opacity: 1; transform: translateY(0); }
          28%  { opacity: 1; transform: translateY(0); }
          33%  { opacity: 0; transform: translateY(-6px); }
          100% { opacity: 0; transform: translateY(8px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .r2-cycle { animation: none; opacity: 0; }
          .r2-cycle-1 { opacity: 1; }
        }
      `}</style>
    </section>
  );
}

function CircuitBackdrop() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'linear-gradient(rgba(0,184,212,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,184,212,.06) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.15) 70%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.15) 70%, transparent 100%)',
        pointerEvents: 'none',
      }}
    />
  );
}
