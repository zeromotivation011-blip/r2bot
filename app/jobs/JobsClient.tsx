'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CITY_OPTIONS,
  EXPERIENCE_LABEL,
  TRACK_ACCENT,
  TRACK_LABEL,
  bucketForExperience,
  formatExperience,
  formatSalary,
  locationMatches,
  timeAgo,
  type CityFilter,
  type ExperienceBucket,
  type Job,
  type JobTrack,
} from '@/lib/jobs';

const TRACK_TABS: Array<{ key: JobTrack | 'any'; label: string }> = [
  { key: 'any', label: 'All' },
  { key: 'spark', label: 'Spark' },
  { key: 'wire', label: 'Wire' },
  { key: 'forge', label: 'Forge' },
  { key: 'edge', label: 'Edge' },
];

const PAGE_SIZE = 20;

export function JobsClient({ jobs }: { jobs: Job[] }) {
  const [track, setTrack] = useState<JobTrack | 'any'>('any');
  const [city, setCity] = useState<CityFilter>('All Cities');
  const [exp, setExp] = useState<ExperienceBucket>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Honor /jobs?track=spark deep-links.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const t = url.searchParams.get('track');
    if (t === 'spark' || t === 'wire' || t === 'forge' || t === 'edge') {
      setTrack(t);
    }
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (track !== 'any') {
        // Show track-tagged jobs + 'all'-tagged jobs in every tab except 'any'.
        if (j.track_relevance !== track && j.track_relevance !== 'all') return false;
      }
      if (!locationMatches(j.location, city)) return false;
      if (exp !== 'all') {
        const bucket = bucketForExperience(j.experience_min ?? j.experience_max);
        if (bucket !== exp) return false;
      }
      return true;
    });
  }, [jobs, track, city, exp]);

  // Reset the visible window whenever the filter changes.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [track, city, exp]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  return (
    <>
      <FilterBar
        track={track}
        setTrack={setTrack}
        city={city}
        setCity={setCity}
        exp={exp}
        setExp={setExp}
      />

      {shown.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
            gap: 16,
            marginTop: 26,
          }}
        >
          {shown.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {hasMore && (
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            style={{
              padding: '12px 26px',
              borderRadius: 999,
              background: 'transparent',
              border: '1px solid var(--border-2)',
              color: 'var(--mist)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 14,
              letterSpacing: '.02em',
            }}
          >
            Load more ({filtered.length - visible} left)
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <p
          style={{
            marginTop: 18,
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 12,
            color: 'var(--muted)',
            letterSpacing: '.1em',
            textAlign: 'center',
          }}
        >
          Showing {Math.min(visible, filtered.length)} of {filtered.length} matching jobs
        </p>
      )}
    </>
  );
}

function FilterBar({
  track,
  setTrack,
  city,
  setCity,
  exp,
  setExp,
}: {
  track: JobTrack | 'any';
  setTrack: (t: JobTrack | 'any') => void;
  city: CityFilter;
  setCity: (c: CityFilter) => void;
  exp: ExperienceBucket;
  setExp: (e: ExperienceBucket) => void;
}) {
  const selectStyle: React.CSSProperties = {
    background: 'rgba(11,37,64,.5)',
    border: '1px solid var(--border)',
    color: 'var(--mist)',
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: 14,
    fontFamily: 'inherit',
    cursor: 'pointer',
  };
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: 28,
        marginBottom: 4,
        paddingBottom: 18,
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Track tabs */}
      <div
        role="tablist"
        aria-label="Filter by track"
        style={{
          display: 'inline-flex',
          padding: 3,
          borderRadius: 999,
          background: 'rgba(11,37,64,.55)',
          border: '1px solid var(--border)',
        }}
      >
        {TRACK_TABS.map((t) => {
          const isActive = track === t.key;
          const accent =
            t.key === 'any' ? '#00E5FF' : TRACK_ACCENT[t.key as JobTrack];
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTrack(t.key)}
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                border: 'none',
                background: isActive ? accent : 'transparent',
                color: isActive ? '#001318' : '#C8D0DC',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all .15s',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            color: 'var(--muted)',
            letterSpacing: '.15em',
            textTransform: 'uppercase',
          }}
        >
          City
        </span>
        <select
          aria-label="Filter by city"
          value={city}
          onChange={(e) => setCity(e.target.value as CityFilter)}
          style={selectStyle}
        >
          {CITY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            color: 'var(--muted)',
            letterSpacing: '.15em',
            textTransform: 'uppercase',
          }}
        >
          Experience
        </span>
        <select
          aria-label="Filter by experience"
          value={exp}
          onChange={(e) => setExp(e.target.value as ExperienceBucket)}
          style={selectStyle}
        >
          {(Object.keys(EXPERIENCE_LABEL) as ExperienceBucket[]).map((k) => (
            <option key={k} value={k}>
              {EXPERIENCE_LABEL[k]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const track = (job.track_relevance ?? 'all') as JobTrack;
  const accent = TRACK_ACCENT[track];
  const extra = Math.max(0, job.skills.length - 4);

  return (
    <article
      style={{
        position: 'relative',
        padding: 22,
        borderRadius: 16,
        border: '1px solid var(--border)',
        background: 'rgba(11,37,64,.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 17,
              lineHeight: 1.35,
              color: 'var(--mist)',
              fontWeight: 600,
            }}
          >
            {job.title}
          </h3>
          <div style={{ marginTop: 4, fontSize: 14, color: '#C8D0DC' }}>{job.company}</div>
        </div>
        <span
          style={{
            flexShrink: 0,
            padding: '4px 10px',
            borderRadius: 999,
            background: `${accent}1c`,
            border: `1px solid ${accent}`,
            color: accent,
            fontSize: 11,
            fontFamily: 'var(--font-mono), monospace',
            letterSpacing: '.12em',
            textTransform: 'uppercase',
          }}
        >
          {TRACK_LABEL[track]}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 14,
          flexWrap: 'wrap',
          fontSize: 13,
          color: 'var(--muted)',
        }}
      >
        <span>📍 {job.location}</span>
        <span>💼 {formatExperience(job)}</span>
        <span style={{ color: 'var(--cyan)' }}>💰 {formatSalary(job)}</span>
      </div>

      {job.skills.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {job.skills.slice(0, 4).map((s) => (
            <span
              key={s}
              style={{
                padding: '3px 10px',
                borderRadius: 999,
                background: 'rgba(0,229,255,.06)',
                border: '1px solid rgba(0,229,255,.25)',
                color: '#C8D0DC',
                fontSize: 11.5,
              }}
            >
              {s}
            </span>
          ))}
          {extra > 0 && (
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 999,
                background: 'transparent',
                border: '1px dashed var(--border-2)',
                color: 'var(--muted)',
                fontSize: 11.5,
              }}
            >
              +{extra} more
            </span>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingTop: 4,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono), monospace',
            color: 'var(--muted)',
            letterSpacing: '.05em',
          }}
        >
          {timeAgo(job.posted_at ?? job.fetched_at)}
        </span>
        <a
          href={job.apply_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            background: 'var(--cyan)',
            color: '#001318',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Apply on Naukri →
        </a>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        marginTop: 40,
        padding: '40px 24px',
        borderRadius: 16,
        border: '1px dashed var(--border-2)',
        background: 'rgba(11,37,64,.2)',
        textAlign: 'center',
        color: 'var(--muted)',
      }}
    >
      <div style={{ fontSize: 17, color: 'var(--mist)', marginBottom: 8 }}>
        No jobs found for this filter
      </div>
      <div style={{ fontSize: 14 }}>Try broadening your search.</div>
    </div>
  );
}
