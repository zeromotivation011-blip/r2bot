import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

// Academy v2 — block-based content. Re-exported here so `@/lib/academy`
// (which resolves to this file, not the directory) returns both v1 and v2 APIs.
// AcademyTrack is also defined in the new courses module — re-export from there
// to keep a single source of truth.
export * from './academy/blocks';
export * from './academy/courses';
import type { AcademyTrack } from './academy/courses';

export type AcademySource = { name: string; url: string };

export type AcademyLesson = {
  track: AcademyTrack;
  lesson: number;
  slug: string; // e.g. "01"
  title: string;
  description: string;
  duration: string;
  sources: AcademySource[];
  body: string;
  // Wire/Forge/Edge additions
  hindi_name?: string;
  xp?: number;
  estimated_minutes?: number;
  atlas_links?: string[]; // slugs of related Atlas concept entries
  url_slug?: string; // descriptive slug, e.g. "w-01-ros2-fundamentals"
  prerequisites?: string[]; // lesson slugs in same/earlier track
};

const CONTENT_DIR = path.join(process.cwd(), 'content', 'academy');
const VALID_TRACKS: AcademyTrack[] = ['spark', 'wire', 'forge', 'edge'];

function isTrack(s: string): s is AcademyTrack {
  return VALID_TRACKS.includes(s as AcademyTrack);
}

function normalizeSources(v: unknown): AcademySource[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
    .map((s) => ({ name: String(s.name ?? ''), url: String(s.url ?? '') }))
    .filter((s) => s.name && s.url);
}

function normalizeLesson(v: unknown): number {
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((s) => String(s)).filter((s) => s.length > 0);
}

function normalizeOptString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

function normalizeOptNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function buildLesson(
  track: AcademyTrack,
  slug: string,
  data: Record<string, unknown>,
  body: string,
): AcademyLesson {
  return {
    track,
    lesson: normalizeLesson(data.lesson),
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ''),
    duration: String(data.duration ?? ''),
    sources: normalizeSources(data.sources),
    body,
    hindi_name: normalizeOptString(data.hindi_name),
    xp: normalizeOptNumber(data.xp),
    estimated_minutes: normalizeOptNumber(data.estimated_minutes),
    atlas_links: normalizeStringArray(data.atlas_links),
    url_slug: normalizeOptString(data.url_slug),
    prerequisites: normalizeStringArray(data.prerequisites),
  };
}

export function getAcademyLesson(track: AcademyTrack, slug: string): AcademyLesson | null {
  const file = path.join(CONTENT_DIR, track, `${slug}.mdx`);
  const fileAlt = path.join(CONTENT_DIR, track, `${slug}.md`);
  const target = fs.existsSync(file) ? file : fs.existsSync(fileAlt) ? fileAlt : null;
  if (!target) return null;
  const raw = fs.readFileSync(target, 'utf8');
  const { data, content } = matter(raw);
  return buildLesson(track, slug, data as Record<string, unknown>, content);
}

export function getLessonsForTrack(track: AcademyTrack): AcademyLesson[] {
  const dir = path.join(CONTENT_DIR, track);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  const lessons: AcademyLesson[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue;
    const slug = file.replace(/\.(mdx|md)$/, '');
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const { data, content } = matter(raw);
    lessons.push(buildLesson(track, slug, data as Record<string, unknown>, content));
  }
  return lessons.sort((a, b) => a.lesson - b.lesson);
}

export function getAllAcademyLessons(): AcademyLesson[] {
  const lessons: AcademyLesson[] = [];
  if (!fs.existsSync(CONTENT_DIR)) return lessons;
  for (const track of fs.readdirSync(CONTENT_DIR)) {
    if (!isTrack(track)) continue;
    const dir = path.join(CONTENT_DIR, track);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue;
      const slug = file.replace(/\.(mdx|md)$/, '');
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const { data, content } = matter(raw);
      lessons.push(buildLesson(track, slug, data as Record<string, unknown>, content));
    }
  }
  return lessons.sort((a, b) => {
    if (a.track !== b.track) return a.track.localeCompare(b.track);
    return a.lesson - b.lesson;
  });
}

export function trackLabel(t: AcademyTrack): string {
  return { spark: 'Spark', wire: 'Wire', forge: 'Forge', edge: 'Edge' }[t];
}

export const TRACK_ORDER: AcademyTrack[] = ['spark', 'wire', 'forge', 'edge'];

export const TRACK_ACCENT: Record<AcademyTrack, string> = {
  spark: '#FFB800', // amber
  wire: '#3B82F6', // blue
  forge: '#A56BFF', // purple
  edge: '#EF4444', // red
};

export const TRACK_BLURB: Record<AcademyTrack, string> = {
  spark: 'The foundations. What a robot is, how it senses, thinks, and acts. For absolute beginners.',
  wire: 'Build real ROS2 robots. Nodes, topics, sensors, PID control, mobile robot kinematics, computer vision.',
  forge: 'Production robotics. Nav2, MoveIt2, edge AI on Jetson, full warehouse-robot pipeline.',
  edge: 'Research-level. Multi-robot fleets, SLAM from scratch, novel system design.',
};

/** ISO 8601 duration like "PT25M" from minutes. */
export function isoDuration(minutes: number | undefined): string | undefined {
  if (!minutes || !Number.isFinite(minutes)) return undefined;
  return `PT${Math.round(minutes)}M`;
}
