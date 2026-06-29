// Daily India robotics jobs refresh. Invoked by Vercel Cron.
//
// Auth: Authorization: Bearer <CRON_SECRET>
//
// Required env vars
//   - CRON_SECRET                 — shared with Vercel Cron
//   - APIFY_API_KEY               — Apify → Settings → API tokens
//   - SUPABASE_SERVICE_ROLE_KEY   — service role for upserts (bypasses RLS)
//   - NEXT_PUBLIC_SUPABASE_URL    — Supabase project URL
//
// What it does
//   1. Fans out three parallel Apify runs (different queries) against the
//      Naukri scraper actor, with run-sync-get-dataset-items so we get
//      results back in one shot.
//   2. Normalises every job record into our jobs-table shape, dedupes by
//      external_id (job URL).
//   3. Classifies each into a track (spark/wire/forge/edge/all) using the
//      title + skills.
//   4. Upserts in one batch (on conflict: refresh activity + economics).
//   5. Marks anything we haven't seen in 3+ days as inactive.
//
// The Apify request is wrapped in try/catch so a single broken query won't
// take the whole refresh down. Empty/malformed payloads degrade silently to
// "fetched 0".

import type { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Apify actor — slug form for the REST URL uses '~' instead of '/'.
const ACTOR_SLUG = 'easyapi~naukri-jobs-scraper';

type ApifyInput = {
  keyword: string;
  location: string;
  freshness: string;
  count: number;
};

const QUERIES: ApifyInput[] = [
  { keyword: 'robotics', location: 'India', freshness: '7', count: 50 },
  { keyword: 'ROS robot', location: 'India', freshness: '7', count: 50 },
  { keyword: 'automation engineer robotics', location: 'India', freshness: '7', count: 50 },
];

type Track = 'spark' | 'wire' | 'forge' | 'edge' | 'all';

type NormalisedJob = {
  external_id: string;
  title: string;
  company: string;
  location: string;
  experience_min: number | null;
  experience_max: number | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  skills: string[];
  description: string | null;
  apply_url: string;
  source: string;
  posted_at: string | null;
  is_active: boolean;
  track_relevance: Track;
};

// ---------- auth ----------
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

// ---------- normalisation helpers ----------

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
}

function pickArray(obj: Record<string, unknown>, keys: string[]): string[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) {
      return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim());
    }
    if (typeof v === 'string' && v.includes(',')) {
      return v.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

/** Parse "2-5 years", "5+ years", "Fresher", "0-2 yrs" → {min, max}. */
function parseExperience(text: string | null): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null };
  const t = text.toLowerCase();
  if (/fresher|entry|trainee|intern/.test(t)) return { min: 0, max: 1 };
  const range = t.match(/(\d+)\s*[-–to]+\s*(\d+)/);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const plus = t.match(/(\d+)\s*\+/);
  if (plus) return { min: Number(plus[1]), max: null };
  const single = t.match(/(\d+)/);
  if (single) {
    const n = Number(single[1]);
    return { min: n, max: n };
  }
  return { min: null, max: null };
}

/** Parse "5-10 LPA", "₹8,00,000 - ₹12,00,000", "Not Disclosed" → {min, max}. */
function parseSalary(text: string | null): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null };
  const t = text.toLowerCase().replace(/,/g, '');
  if (/not disclosed|not specified|negotiable/.test(t)) return { min: null, max: null };

  // LPA range — store as INR integers (e.g. 5 LPA → 500000).
  const lpaRange = t.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)\s*(?:lpa|lac|lakhs?)/);
  if (lpaRange) {
    return { min: Math.round(Number(lpaRange[1]) * 100000), max: Math.round(Number(lpaRange[2]) * 100000) };
  }
  // Single LPA value.
  const lpaSingle = t.match(/(\d+(?:\.\d+)?)\s*(?:lpa|lac|lakhs?)/);
  if (lpaSingle) {
    const n = Math.round(Number(lpaSingle[1]) * 100000);
    return { min: n, max: n };
  }
  // Raw INR range.
  const rupeeRange = t.match(/(?:₹|rs\.?|inr)?\s*(\d{4,})\s*[-–to]+\s*(?:₹|rs\.?|inr)?\s*(\d{4,})/);
  if (rupeeRange) return { min: Number(rupeeRange[1]), max: Number(rupeeRange[2]) };

  return { min: null, max: null };
}

/** Coerce many possible posted-at shapes into an ISO string. */
function parsePostedAt(obj: Record<string, unknown>): string | null {
  const direct = pickString(obj, ['postedAt', 'postedDate', 'posted_date', 'datePosted', 'date']);
  if (direct) {
    const d = new Date(direct);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  // Naukri often shows "3 Days Ago", "Just now", "30+ days ago".
  const rel = pickString(obj, ['posted', 'postedOn', 'jobPostedOn']);
  if (rel) {
    const lower = rel.toLowerCase();
    if (/just now|today|few hours/.test(lower)) return new Date().toISOString();
    const m = lower.match(/(\d+)\s*(day|week|month|hour)/);
    if (m) {
      const n = Number(m[1]);
      const unit = m[2];
      const ms = unit.startsWith('hour')
        ? n * 3600_000
        : unit.startsWith('day')
        ? n * 86400_000
        : unit.startsWith('week')
        ? n * 7 * 86400_000
        : n * 30 * 86400_000;
      return new Date(Date.now() - ms).toISOString();
    }
  }
  return null;
}

const TRACK_RULES: Array<{ track: Track; needles: RegExp }> = [
  { track: 'edge',  needles: /\b(principal|research|phd|chief|fellow|deep\s*learning|ai\s+robotic|reinforcement\s+learning)\b/i },
  { track: 'forge', needles: /\b(senior|sr\.?|lead|architect|computer\s+vision|slam|autonomous|perception|manipulation|motion\s+planning)\b/i },
  { track: 'wire',  needles: /\b(ros|ros2|embedded|firmware|junior|jr\.?|associate|python\s+robot|cpp\s+robot|c\+\+\s+robot|microcontroller|arduino|raspberry)\b/i },
  { track: 'spark', needles: /\b(intern|internship|trainee|fresher|graduate|entry[-\s]?level|apprentice|technician)\b/i },
];

function classifyTrack(title: string, skills: string[], description: string | null): Track {
  const haystack = `${title} ${skills.join(' ')} ${description ?? ''}`;
  for (const { track, needles } of TRACK_RULES) {
    if (needles.test(haystack)) return track;
  }
  return 'all';
}

function normaliseJob(raw: unknown): NormalisedJob | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const apply_url = pickString(obj, ['url', 'jobUrl', 'applyUrl', 'apply_url', 'link']);
  const title = pickString(obj, ['title', 'jobTitle', 'job_title', 'designation']);
  const company = pickString(obj, ['company', 'companyName', 'company_name', 'employer']);
  if (!apply_url || !title || !company) return null;

  const location = pickString(obj, ['location', 'jobLocation', 'job_location', 'city', 'place']) ?? 'India';
  const experienceText = pickString(obj, ['experience', 'experienceText', 'experience_text', 'workExperience']);
  const salaryText = pickString(obj, ['salary', 'salaryText', 'salary_text', 'compensation', 'pay']);
  const description = pickString(obj, ['description', 'jobDescription', 'job_description', 'summary']);
  const skills = pickArray(obj, ['skills', 'keySkills', 'key_skills', 'tags', 'requirements']).slice(0, 25);
  const externalId =
    pickString(obj, ['id', 'jobId', 'externalId', 'external_id']) ?? apply_url;

  const exp = parseExperience(experienceText);
  const sal = parseSalary(salaryText);
  const track = classifyTrack(title, skills, description);

  return {
    external_id: externalId,
    title,
    company,
    location,
    experience_min: exp.min,
    experience_max: exp.max,
    salary_min: sal.min,
    salary_max: sal.max,
    salary_currency: 'INR',
    skills,
    description: description ? description.slice(0, 5000) : null,
    apply_url,
    source: 'naukri',
    posted_at: parsePostedAt(obj),
    is_active: true,
    track_relevance: track,
  };
}

// ---------- Apify call ----------
async function runApifyQuery(apiKey: string, input: ApifyInput): Promise<unknown[]> {
  const url = `https://api.apify.com/v2/acts/${ACTOR_SLUG}/run-sync-get-dataset-items?token=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Apify ${res.status}: ${body.slice(0, 200)}`);
  }
  const json: unknown = await res.json();
  return Array.isArray(json) ? json : [];
}

// ---------- main handler ----------
async function refresh(): Promise<{
  fetched: number;
  inserted: number;
  updated: number;
  deactivated: number;
  errors: string[];
}> {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) {
    return { fetched: 0, inserted: 0, updated: 0, deactivated: 0, errors: ['APIFY_API_KEY missing'] };
  }
  const admin = createSupabaseAdminClient();

  // Fan out three queries in parallel.
  const results = await Promise.allSettled(QUERIES.map((q) => runApifyQuery(apiKey, q)));
  const errors: string[] = [];
  const raws: unknown[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      raws.push(...r.value);
    } else {
      errors.push(`q${i + 1}(${QUERIES[i].keyword}): ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
    }
  });

  // Normalise + dedupe.
  const byKey = new Map<string, NormalisedJob>();
  for (const raw of raws) {
    const job = normaliseJob(raw);
    if (!job) continue;
    if (!byKey.has(job.external_id)) byKey.set(job.external_id, job);
  }
  const jobs = [...byKey.values()];

  if (jobs.length === 0) {
    // Nothing to upsert; still run the staleness sweep so the table self-heals.
    const cutoff = new Date(Date.now() - 3 * 86400_000).toISOString();
    const { data: stale } = await admin
      .from('jobs')
      .update({ is_active: false })
      .lt('fetched_at', cutoff)
      .eq('is_active', true)
      .select('id');
    return { fetched: 0, inserted: 0, updated: 0, deactivated: stale?.length ?? 0, errors };
  }

  // Find which external_ids already exist so we can report inserted vs updated.
  const externalIds = jobs.map((j) => j.external_id);
  const { data: existingRows } = await admin
    .from('jobs')
    .select('external_id')
    .in('external_id', externalIds);
  const existingSet = new Set((existingRows ?? []).map((r) => r.external_id as string));

  // Upsert in chunks — Supabase rejects very large single payloads.
  const upsertRows = jobs.map((j) => ({ ...j, fetched_at: new Date().toISOString() }));
  const CHUNK = 100;
  for (let i = 0; i < upsertRows.length; i += CHUNK) {
    const slice = upsertRows.slice(i, i + CHUNK);
    const { error } = await admin
      .from('jobs')
      .upsert(slice, { onConflict: 'external_id' });
    if (error) errors.push(`upsert(chunk ${i / CHUNK}): ${error.message}`);
  }

  // Staleness sweep — anything not refreshed in 3 days is no longer live.
  const cutoff = new Date(Date.now() - 3 * 86400_000).toISOString();
  const { data: stale } = await admin
    .from('jobs')
    .update({ is_active: false })
    .lt('fetched_at', cutoff)
    .eq('is_active', true)
    .select('id');

  const inserted = jobs.filter((j) => !existingSet.has(j.external_id)).length;
  const updated = jobs.length - inserted;

  return {
    fetched: jobs.length,
    inserted,
    updated,
    deactivated: stale?.length ?? 0,
    errors,
  };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await refresh();
  return Response.json({ ok: true, ...result });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await refresh();
  return Response.json({ ok: true, ...result });
}
