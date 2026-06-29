import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export type Country = 'usa' | 'china' | 'india' | 'japan' | 'eu' | 'global';
const COUNTRIES: Country[] = ['usa', 'china', 'india', 'japan', 'eu', 'global'];

export type RelatedAtlasRef = { type: string; slug: string };

export type PulseFrontmatter = {
  title: string;
  summary: string;
  country: Country;
  category: string;
  publishedAt: string; // YYYY-MM-DD
  sourceUrl?: string;
  readMinutes?: number;
  relatedAtlas?: RelatedAtlasRef[];
};

export type PulseArticle = PulseFrontmatter & {
  slug: string;
  body: string;
};

const CONTENT_DIR = path.join(process.cwd(), 'content', 'pulse');

/** YAML auto-parses ISO dates to JS Date. Coerce to YYYY-MM-DD string for safe rendering. */
function normalizeDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string' && v.length > 0) return v.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function normalizeCountry(v: unknown): Country {
  return typeof v === 'string' && COUNTRIES.includes(v as Country) ? (v as Country) : 'global';
}

function normalizeRelated(v: unknown): RelatedAtlasRef[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map(r => ({ type: String(r.type ?? ''), slug: String(r.slug ?? '') }))
    .filter(r => r.type && r.slug);
}

function buildArticle(slug: string, data: Record<string, unknown>, body: string): PulseArticle {
  return {
    slug,
    title: String(data.title ?? slug),
    summary: String(data.summary ?? ''),
    country: normalizeCountry(data.country),
    category: String(data.category ?? 'News'),
    publishedAt: normalizeDate(data.publishedAt),
    sourceUrl: data.sourceUrl ? String(data.sourceUrl) : undefined,
    readMinutes: typeof data.readMinutes === 'number' ? data.readMinutes : 4,
    relatedAtlas: normalizeRelated(data.relatedAtlas),
    body,
  };
}

export function getAllPulse(): PulseArticle[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const out: PulseArticle[] = [];
  for (const file of fs.readdirSync(CONTENT_DIR)) {
    if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue;
    const slug = file.replace(/\.(mdx|md)$/, '');
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    out.push(buildArticle(slug, data as Record<string, unknown>, content));
  }
  return out.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function getPulseArticle(slug: string): PulseArticle | null {
  const fileMdx = path.join(CONTENT_DIR, `${slug}.mdx`);
  const fileMd = path.join(CONTENT_DIR, `${slug}.md`);
  const target = fs.existsSync(fileMdx) ? fileMdx : fs.existsSync(fileMd) ? fileMd : null;
  if (!target) return null;
  const raw = fs.readFileSync(target, 'utf8');
  const { data, content } = matter(raw);
  return buildArticle(slug, data as Record<string, unknown>, content);
}

export function countryLabel(c: Country): string {
  return ({ usa: 'USA', china: 'China', india: 'India', japan: 'Japan', eu: 'EU', global: 'Global' } as const)[c];
}

export function countryClass(c: Country): string {
  // Reuses the .pulse-tag color classes in globals.css
  if (c === 'usa') return 'usa';
  if (c === 'china' || c === 'japan') return 'china';
  return 'india';
}

export function formatPulseDate(d: string): string {
  try {
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}
