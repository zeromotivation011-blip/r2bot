import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type Job, timeAgo, formatExperience } from '@/lib/jobs';
import { JobsClient } from './JobsClient';

export const metadata: Metadata = {
  title: 'Robotics Jobs in India 2025',
  description:
    'Real-time robotics job listings from Naukri. ROS2 engineers, automation specialists, and robotics researchers across India.',
  openGraph: {
    title: 'Robotics Jobs in India 2026',
    description:
      'Live robotics, ROS, and automation engineer roles across India. Filtered by level and city. Updated daily from Naukri.',
    type: 'website',
  },
};

// SSR with hourly revalidation — pulse vs. cron schedule of every 24h.
export const revalidate = 3600;

export default async function JobsPage() {
  const jobs = await loadJobs();
  const newestFetched = jobs[0]?.fetched_at ?? null;

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />

      <main id="main-content" style={{ paddingTop: 130, paddingBottom: 90, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 1180 }}>
          <div className="section-eyebrow">Careers · Live feed</div>
          <h1
            className="display"
            style={{
              fontSize: 'clamp(40px, 5.5vw, 64px)',
              lineHeight: 1.05,
              margin: '0 0 12px',
            }}
          >
            Robotics jobs in India
          </h1>
          <p
            style={{
              fontSize: 18,
              color: '#B0B8C5',
              maxWidth: 640,
              margin: '0 0 18px',
              lineHeight: 1.55,
            }}
          >
            Updated daily from Naukri.com — fresher internships through principal research roles.
            Filter by track, city, and experience.
          </p>

          <div
            style={{
              display: 'inline-flex',
              gap: 14,
              alignItems: 'center',
              padding: '8px 14px',
              borderRadius: 999,
              background: 'rgba(0,229,255,.06)',
              border: '1px solid rgba(0,229,255,.25)',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 12,
              color: 'var(--mist)',
              letterSpacing: '.05em',
            }}
          >
            <span style={{ color: 'var(--cyan)' }}>● {jobs.length}</span>
            <span>live jobs</span>
            <span style={{ color: 'var(--muted)' }}>·</span>
            <span style={{ color: 'var(--muted)' }}>
              Last refreshed {timeAgo(newestFetched)}
            </span>
          </div>

          <JobsClient jobs={jobs} />

          {jobs.length === 0 && (
            <div
              style={{
                marginTop: 28,
                padding: 18,
                borderRadius: 12,
                border: '1px dashed var(--border)',
                color: 'var(--muted)',
                fontSize: 14,
              }}
            >
              The Naukri scraper hasn&apos;t run yet, or APIFY_API_KEY is not set in Vercel.
              The first refresh will populate this page within minutes.
            </div>
          )}
        </div>
      </main>

      {/* JSON-LD JobPosting schema for the top 5 — improves Google for Jobs eligibility. */}
      {jobs.slice(0, 5).map((j) => (
        <JobPostingSchema key={j.id} job={j} />
      ))}

      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}

async function loadJobs(): Promise<Job[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('jobs')
      .select(
        'id, external_id, title, company, location, experience_min, experience_max, salary_min, salary_max, salary_currency, skills, description, apply_url, source, posted_at, fetched_at, is_active, track_relevance',
      )
      .eq('is_active', true)
      .order('posted_at', { ascending: false, nullsFirst: false })
      .limit(200);
    if (error || !data) return [];
    return data as unknown as Job[];
  } catch {
    return [];
  }
}

function JobPostingSchema({ job }: { job: Job }) {
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description:
      job.description ?? `${job.title} role at ${job.company}, ${job.location}. ${formatExperience(job)}.`,
    datePosted: job.posted_at ?? job.fetched_at ?? new Date().toISOString(),
    employmentType: 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location,
        addressCountry: 'IN',
      },
    },
    url: job.apply_url,
    directApply: false,
  };

  if (job.salary_min || job.salary_max) {
    base.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: job.salary_currency ?? 'INR',
      value: {
        '@type': 'QuantitativeValue',
        minValue: job.salary_min ?? job.salary_max,
        maxValue: job.salary_max ?? job.salary_min,
        unitText: 'YEAR',
      },
    };
  }

  // validThrough — assume 60 days from posting (Naukri's typical lifecycle).
  const posted = job.posted_at ? new Date(job.posted_at).getTime() : Date.now();
  base.validThrough = new Date(posted + 60 * 86400_000).toISOString();

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(base) }}
    />
  );
}
