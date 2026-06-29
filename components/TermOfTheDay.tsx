import { getAllAtlasEntries } from '@/lib/atlas';

function dayOfYearUTC(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((now - start) / 86_400_000);
}

export function TermOfTheDay() {
  const entries = getAllAtlasEntries();
  if (entries.length === 0) return null;
  // Sort deterministically so the index is stable across deploys.
  const sorted = [...entries].sort((a, b) => a.slug.localeCompare(b.slug));
  const idx = dayOfYearUTC(new Date()) % sorted.length;
  const e = sorted[idx];

  return (
    <section
      style={{
        margin: '60px auto',
        maxWidth: 760,
        padding: '28px 32px',
        background:
          'linear-gradient(135deg, rgba(0,184,212,.08), rgba(165,107,255,.04))',
        border: '1px solid var(--border-2)',
        borderRadius: 18,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 11,
          letterSpacing: '.3em',
          color: 'var(--cyan)',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Term of the day
      </div>
      <h3
        className="display"
        style={{ fontSize: 28, margin: '0 0 10px', color: 'var(--mist)', lineHeight: 1.1 }}
      >
        <a href={`/atlas/${e.type}/${e.slug}`} style={{ color: 'inherit' }}>
          {e.title}
        </a>
      </h3>
      <p style={{ fontSize: 16, color: '#C8D0DC', lineHeight: 1.55, margin: '0 0 14px' }}>
        {e.summary}
      </p>
      <a
        href={`/atlas/${e.type}/${e.slug}`}
        style={{
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 13,
          color: 'var(--cyan)',
          letterSpacing: '.05em',
        }}
      >
        Read the entry →
      </a>
    </section>
  );
}
