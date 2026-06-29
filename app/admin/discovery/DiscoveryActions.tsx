'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';

const SOURCES = [
  { key: 'all', label: 'All' },
  { key: 'arxiv', label: 'arXiv' },
  { key: 'reddit', label: 'Reddit' },
  { key: 'hn', label: 'HN' },
  { key: 'github', label: 'GitHub' },
] as const;

const SOURCE_COLOUR: Record<string, string> = {
  arxiv: '#A56BFF',
  reddit: '#FF4500',
  hn: '#FFB020',
  github: '#64748B',
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export type DiscoveryItem = {
  id: string;
  source: 'arxiv' | 'reddit' | 'hn' | 'github';
  source_url: string;
  raw_title: string;
  extracted_topics: string[];
  atlas_gaps: string[];
  status: 'pending' | 'added_to_atlas' | 'dismissed';
  discovered_at: string;
};

export function DiscoveryActions({ items, sourceCounts }: { items: DiscoveryItem[]; sourceCounts: Record<string, number> }) {
  const [filter, setFilter] = useState<(typeof SOURCES)[number]['key']>('all');
  const [running, setRunning] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toast = useToast();

  const visible = items
    .filter((i) => (filter === 'all' ? true : i.source === filter))
    .filter((i) => !hidden.has(i.id));

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/admin/discovery/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      toast.show(`Processed ${data.processed}, added ${data.new_items}, gaps ${data.atlas_gaps_found}.`);
      // Soft refresh — server data is stale.
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast.show(`Run failed: ${(e as Error).message}`);
      setRunning(false);
    }
  };

  const act = async (id: string, status: 'added_to_atlas' | 'dismissed', title: string, gaps: string[]) => {
    try {
      const res = await fetch('/api/admin/discovery/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error('failed');
      if (status === 'added_to_atlas') {
        const template = mdxTemplate(title, gaps);
        try {
          await navigator.clipboard.writeText(template);
          toast.show('MDX template copied to clipboard');
        } catch {
          toast.show('Marked as added (clipboard blocked — copy the MDX from the admin feed)');
        }
      } else {
        toast.show('Dismissed');
      }
      setHidden((prev) => new Set([...prev, id]));
    } catch {
      toast.show('Action failed');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <button
          onClick={runNow}
          disabled={running}
          style={{
            padding: '10px 18px',
            borderRadius: 12,
            background: 'var(--cyan)',
            color: '#001318',
            border: 'none',
            fontWeight: 600,
            fontSize: 14,
            cursor: running ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            opacity: running ? 0.6 : 1,
          }}
        >
          {running ? 'Running…' : 'Run now'}
        </button>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SOURCES.map((s) => {
            const count = s.key === 'all' ? items.length : sourceCounts[s.key] ?? 0;
            const active = filter === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setFilter(s.key)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 999,
                  border: '1px solid ' + (active ? 'var(--cyan)' : 'var(--border)'),
                  background: active ? 'rgba(0,184,212,.16)' : 'rgba(11,37,64,.4)',
                  color: active ? 'var(--cyan-bright)' : '#C8D0DC',
                  fontSize: 12,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  letterSpacing: '.05em',
                }}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', fontFamily: 'var(--font-mono), monospace', fontSize: 11, color: 'var(--muted)', letterSpacing: '.15em', textTransform: 'uppercase' }}>
            <th style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)' }}>Source</th>
            <th style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)' }}>Title</th>
            <th style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)' }}>Topics</th>
            <th style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)' }}>Atlas gaps</th>
            <th style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)' }}>When</th>
            <th style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                Nothing in queue. Hit “Run now” to discover.
              </td>
            </tr>
          ) : (
            visible.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: SOURCE_COLOUR[item.source] + '22',
                      color: SOURCE_COLOUR[item.source],
                      fontFamily: 'var(--font-mono), monospace',
                      fontSize: 11,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      border: `1px solid ${SOURCE_COLOUR[item.source]}55`,
                    }}
                  >
                    {item.source}
                  </span>
                </td>
                <td style={{ padding: '12px 8px', verticalAlign: 'top', maxWidth: 360 }}>
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--mist)', borderBottom: '1px dashed var(--border-2)' }}
                  >
                    {item.raw_title}
                  </a>
                </td>
                <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {item.extracted_topics.map((t) => (
                      <span
                        key={t}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          border: '1px solid var(--cyan)',
                          color: 'var(--cyan)',
                          fontSize: 11,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {item.atlas_gaps.map((g) => (
                      <span
                        key={g}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: 'rgba(255,176,32,.18)',
                          border: '1px solid rgba(255,176,32,.6)',
                          color: 'var(--amber)',
                          fontSize: 11,
                        }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '12px 8px', verticalAlign: 'top', fontFamily: 'var(--font-mono), monospace', fontSize: 11, color: 'var(--muted)' }}>
                  {relativeTime(item.discovered_at)}
                </td>
                <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => act(item.id, 'added_to_atlas', item.raw_title, item.atlas_gaps)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--cyan)',
                        background: 'rgba(0,184,212,.1)',
                        color: 'var(--cyan-bright)',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Add to Atlas
                    </button>
                    <button
                      onClick={() => act(item.id, 'dismissed', item.raw_title, item.atlas_gaps)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--muted)',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}

// The user-spec MDX template was truncated in the brief. This template
// follows the existing content/atlas/concept/*.mdx frontmatter shape so a
// human editor can drop it straight into the repo.
function mdxTemplate(title: string, gaps: string[]): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  const today = new Date().toISOString().slice(0, 10);
  const gapsBullets = gaps.length > 0 ? gaps.map((g) => `- ${g}`).join('\n') : '- (no specific gaps surfaced)';
  return `---
title: "${title.replace(/"/g, '\\"')}"
category: fundamentals
summary: "One plain-English sentence — what this is and why it matters."
seeAlso: []
sources:
  - title: "Primary source"
    url: ""
lastReviewed: ${today}
tags: []
---

[Hook paragraph — analogy or concrete image. Name the concept after.]

## What it is

[Plain-English explanation. Define jargon the moment it appears.]

## Why it matters

[A robot/company/system that depends on this; what fails without it.]

---

*[Italicised curiosity hook — a question the reader hadn't thought to ask.]*

<!-- Suggested file path: content/atlas/concept/${slug}.mdx -->
<!-- Topic gaps surfaced by discovery:
${gapsBullets}
-->
`;
}
