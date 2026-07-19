import type { CSSProperties } from 'react';

export type Crumb = { label: string; href?: string };

// Guarded: an unguarded value emits *.vercel.app into BreadcrumbList JSON-LD
// site-wide, telling Google the content lives on the preview domain.
const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export function Breadcrumbs({
  trail,
  style,
}: {
  trail: Crumb[];
  style?: CSSProperties;
}) {
  return (
    <>
      <nav
        aria-label="Breadcrumb"
        style={{
          fontSize: 12,
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono), monospace',
          letterSpacing: '.08em',
          marginBottom: 18,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          ...style,
        }}
      >
        {trail.map((c, i) => {
          const isLast = i === trail.length - 1;
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {c.href && !isLast ? (
                <a href={c.href} style={{ color: 'var(--cyan)', textTransform: 'uppercase' }}>
                  {c.label}
                </a>
              ) : (
                <span style={{ color: isLast ? '#C8D0DC' : 'var(--muted)', textTransform: isLast ? 'none' : 'uppercase' }}>
                  {c.label}
                </span>
              )}
              {!isLast && <span aria-hidden="true">›</span>}
            </span>
          );
        })}
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: trail.map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: c.label,
              ...(c.href ? { item: c.href.startsWith('http') ? c.href : `${BASE_URL}${c.href}` } : {}),
            })),
          }),
        }}
      />
    </>
  );
}
