// Shared 1200×630 social card used by every per-page opengraph-image.tsx
// (Atlas entries, Academy lessons, Quick Lesson mini-courses, robots, blog).
//
// Rendered by Satori via next/og, so: every <div> with children is
// display:flex, no external fonts (system sans only — a fetch for a webfont
// would add latency and a failure mode to every share), colours from the
// site's dark palette.

import type { ReactElement } from 'react';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

const NAVY = '#0A1120';
const ORANGE = '#FC6818';
const MUTED = '#8A94A6';

/** Keep a headline to roughly three lines at the chosen size. */
function clampTitle(title: string): { text: string; fontSize: number } {
  const t = title.replace(/\s+/g, ' ').trim();
  const fontSize = t.length > 90 ? 44 : t.length > 60 ? 52 : t.length > 36 ? 60 : 72;
  const max = fontSize >= 72 ? 60 : fontSize >= 60 ? 84 : fontSize >= 52 ? 110 : 140;
  return { text: t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t, fontSize };
}

function clampSummary(s: string): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > 120 ? t.slice(0, 117).trimEnd() + '…' : t;
}

export function OgCard({
  title,
  summary,
  kicker,
}: {
  title: string;
  /** One line under the title, in muted grey. */
  summary?: string;
  /** Small label beside the wordmark, e.g. "Atlas · Concept". */
  kicker?: string;
}): ReactElement {
  const t = clampTitle(title);
  const summaryText = summary ? clampSummary(summary) : '';
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: NAVY,
        padding: '56px 72px 48px',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 800, color: ORANGE, letterSpacing: 1 }}>
          R2BOT
        </div>
        {kicker ? (
          <div
            style={{
              display: 'flex',
              padding: '4px 12px',
              borderRadius: 999,
              border: `1px solid ${MUTED}55`,
              color: MUTED,
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            {kicker}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div
          style={{
            display: 'flex',
            fontSize: t.fontSize,
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.1,
            letterSpacing: -1,
            maxWidth: 1056,
          }}
        >
          {t.text}
        </div>
        {summaryText ? (
          <div style={{ display: 'flex', fontSize: 26, color: MUTED, lineHeight: 1.35, maxWidth: 1056 }}>
            {summaryText}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 22, color: MUTED, fontWeight: 600 }}>
        r2bot.in
      </div>
    </div>
  );
}
