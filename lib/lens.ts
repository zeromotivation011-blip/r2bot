import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export type RelatedAtlasRef = { type: string; slug: string };

export type LensFrontmatter = {
  title: string;
  summary: string;
  topic: string;
  durationSeconds: number;            // length of our written/audio summary
  originalDurationSeconds?: number;   // length of the original video, if curated
  youtubeId?: string;                 // optional — clean ID like "abc123"
  uploadedUrl?: string;               // if original-host (Mux later)
  externalUrl?: string;               // direct link to the original
  publishedAt: string;                // YYYY-MM-DD
  relatedAtlas?: RelatedAtlasRef[];
};

export type LensVideo = LensFrontmatter & {
  slug: string;
  body: string;
};

const CONTENT_DIR = path.join(process.cwd(), 'content', 'lens');

function normalizeDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string' && v.length > 0) return v.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function normalizeRelated(v: unknown): RelatedAtlasRef[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map(r => ({ type: String(r.type ?? ''), slug: String(r.slug ?? '') }))
    .filter(r => r.type && r.slug);
}

function buildVideo(slug: string, data: Record<string, unknown>, body: string): LensVideo {
  return {
    slug,
    title: String(data.title ?? slug),
    summary: String(data.summary ?? ''),
    topic: String(data.topic ?? 'General'),
    durationSeconds: typeof data.durationSeconds === 'number' ? data.durationSeconds : 240,
    originalDurationSeconds: typeof data.originalDurationSeconds === 'number' ? data.originalDurationSeconds : undefined,
    youtubeId: data.youtubeId ? String(data.youtubeId) : undefined,
    uploadedUrl: data.uploadedUrl ? String(data.uploadedUrl) : undefined,
    externalUrl: data.externalUrl ? String(data.externalUrl) : undefined,
    publishedAt: normalizeDate(data.publishedAt),
    relatedAtlas: normalizeRelated(data.relatedAtlas),
    body,
  };
}

export function getAllLens(): LensVideo[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const out: LensVideo[] = [];
  for (const file of fs.readdirSync(CONTENT_DIR)) {
    if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue;
    const slug = file.replace(/\.(mdx|md)$/, '');
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    out.push(buildVideo(slug, data as Record<string, unknown>, content));
  }
  return out.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function getLensVideo(slug: string): LensVideo | null {
  const fileMdx = path.join(CONTENT_DIR, `${slug}.mdx`);
  const fileMd = path.join(CONTENT_DIR, `${slug}.md`);
  const target = fs.existsSync(fileMdx) ? fileMdx : fs.existsSync(fileMd) ? fileMd : null;
  if (!target) return null;
  const raw = fs.readFileSync(target, 'utf8');
  const { data, content } = matter(raw);
  return buildVideo(slug, data as Record<string, unknown>, content);
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
