'use client'

// components/daily-life/FunFactsTicker.tsx
// Horizontal scrolling marquee of surprising robotics facts.
// Uses .marquee-content from globals.css. Pauses on hover.

const FACTS: readonly string[] = [
  '🤖 Amazon has 750,000+ warehouse robots across 1,000+ sites',
  '🚀 NASA\'s Perseverance rover has driven 25 km+ on Mars',
  '🌾 Agricultural drones spray 15× faster than a human with a backpack sprayer',
  '🏥 Robot-assisted surgeries reduce blood loss by ~5×',
  '🇮🇳 India\'s robotics market is growing ~25% every year',
  '⚡ A modern Roomba has more compute than the Apollo Guidance Computer',
  '🦾 The Da Vinci surgical robot can operate through a 1mm incision',
  '🚗 Every Tesla on the road shares mileage data with the fleet',
  '📦 Flipkart\'s warehouses use 800+ AMRs (autonomous mobile robots)',
  '🌐 ChatGPT processes more queries per second than Google in 1999',
  '🏭 South Korea has 1,012 robots per 10,000 workers — the highest density on Earth',
  '🇮🇳 IIT-Bombay\'s e-Yantra trains 30,000+ students every year',
]

export function FunFactsTicker() {
  // Duplicate the array so the marquee loops seamlessly.
  const doubled = [...FACTS, ...FACTS]

  return (
    <div className="fft" aria-hidden>
      <div className="fft-shell">
        <div className="marquee-content fft-track">
          {doubled.map((f, i) => (
            <span key={i} className="fft-item">{f}</span>
          ))}
        </div>
      </div>
      <style jsx>{`
        .fft {
          position: relative;
          padding: 10px 0;
          background: linear-gradient(180deg, rgba(245,158,11,0.05), rgba(245,158,11,0.12));
          border-top: 1px solid rgba(245,158,11,0.2);
          border-bottom: 1px solid rgba(245,158,11,0.2);
          overflow: hidden;
        }
        .fft-shell {
          overflow: hidden;
          white-space: nowrap;
        }
        .fft-track {
          display: inline-flex;
          gap: 0;
          will-change: transform;
        }
        .fft-item {
          display: inline-flex;
          align-items: center;
          padding: 6px 24px;
          font-size: 13px;
          color: #fde68a;
          font-weight: 700;
          border-right: 1px solid rgba(245,158,11,0.2);
          letter-spacing: 0.3px;
        }
      `}</style>
    </div>
  )
}
