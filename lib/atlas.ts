import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export type AtlasType =
  | 'concept'
  | 'person'
  | 'company'
  | 'robot'
  | 'paper'
  | 'ai'
  | 'component'
  | 'tool'
  | 'application'
  | 'india'
  | 'advanced'
  | 'electronics';

export type AtlasSource = { title: string; url: string };

export type AtlasCategory =
  | 'fundamentals'
  | 'sensors'
  | 'actuators'
  | 'control'
  | 'ai-and-perception'
  | 'robot-types'
  | 'hardware'
  | 'applications';

export const ATLAS_CATEGORIES: AtlasCategory[] = [
  'fundamentals',
  'sensors',
  'actuators',
  'control',
  'ai-and-perception',
  'robot-types',
  'hardware',
  'applications',
];

export type AtlasFrontmatter = {
  title: string;
  summary: string;
  seeAlso?: string[]; // slugs of related entries
  sources?: AtlasSource[];
  lastReviewed?: string; // YYYY-MM-DD
  tags?: string[];
  category?: AtlasCategory; // for new /atlas/concept/* entries
  prerequisites?: string[]; // slugs the reader should grasp first
  hindi_name?: string; // optional Hindi gloss for the term
  phonetic?: string; // optional phonetic pronunciation hint
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  relatedTerms?: string[]; // alias path-aware seeAlso (used by 2026 generator)
  suggestedLessons?: string[]; // academy lesson slugs
  youtubeSearchQuery?: string; // hint for later video resolution
  bucket?: string; // 20-bucket taxonomy slug (extension of category)

  // ── v2 enrichment fields (added by scripts/migrate-atlas-fields.ts) ──
  /** 1 (layman) → 5 (PhD) */
  difficultyLevel?: 1 | 2 | 3 | 4 | 5;
  /** Human-readable label for the difficulty (e.g. "Coffee chat") */
  difficultyLabel?: string;
  /** 8-word hook line. */
  oneLiner?: string;
  /** No-jargon explanation. 2–3 sentences. */
  laymanExplanation?: string;
  /** India-context analogy. */
  analogy?: string;
  /** Formal/technical definition. */
  technicalDefinition?: string;
  /** "Without this, robots can't…" */
  whyItMatters?: string;
  /** Famous robots that use the concept. */
  realRobotsThatUseThis?: string[];
  /** India-specific real-world use. */
  indianExample?: string;
  /** Concept must be understood first. */
  prerequisiteTerms?: string[];
  /** Concepts unlocked by understanding this. */
  unlocksTerms?: string[];
  /** YouTube video ID for an embed. */
  youtubeId?: string;
  /** Mid-page MCQ. */
  quizQuestion?: { q: string; options: string[]; answer: number; explanation: string };
  /** Surprising one-liner fact. */
  mindBlowingFact?: string;
  /** Where it shows up in industry. */
  industryApplications?: string[];

  // ── v3 enrichment fields (Atlas reimagining May 2026) ──
  /** Path to hero illustration (svg/png). */
  conceptImage?: string;
  /** 1-sentence teaser for cards + recommendations. */
  hookLine?: string;
  /** Mathematical formula in LaTeX (rendered with KaTeX if available). */
  formulaLatex?: string;
  /** Short Python code example. */
  codeSnippet?: string;
  /** Slug pointing to a relevant simulator at /visualizer/[slug]. */
  simulatorSlug?: string;
  /** Real-world product example (e.g. "Boston Dynamics Spot"). */
  realWorldProduct?: string;
  /** XP awarded for mastering this concept (default 10). */
  xpValue?: number;
  /** Estimated read time in minutes. */
  estimatedReadTime?: number;
  /** Manually curated similar concepts (slugs). */
  relatedConcepts?: string[];

  // ── v4 Atlas 1000 fields (May 2026) ──
  /** Punchy one-sentence tagline shown under the title. Max ~12 words. */
  tagline?: string;
  /** Diagram / schematic image URL. */
  diagramImage?: string;
  /** Photo of a real robot using this concept. */
  realWorldImage?: string;
  /** Caption shown under the hero image. */
  imageCaption?: string;
  /** Alternative YouTube video IDs. */
  youtubeSuggestions?: string[];
  /** Display title for the primary YouTube video. */
  youtubeTitle?: string;
  /** Detailed (technical) explanation. 2-3 paragraphs. */
  deeperExplanation?: string;
  /** Concepts that contradict / common misconceptions (slugs). */
  contradictsConcepts?: string[];
  /** Specific real products that use this concept. */
  realWorldProducts?: string[];
  /** Companies known for this concept. */
  companies?: string[];
  /** Indian companies / startups using this. */
  indianCompanies?: string[];
  /** "Used in:" applications. */
  usedIn?: string[];
  /** 3-5 bullets of "what to remember". */
  keyTakeaways?: string[];
  /** Common mistakes learners make. */
  commonMistakes?: string[];
  /** One pro-tip / insider insight. */
  proTip?: string;
  /** Simple one-question quick check (Atlas 1000 schema). */
  quizQuestionText?: string;
  /** 4 options for the quick check. */
  quizOptions?: string[];
  /** Correct option index (0-3). */
  quizCorrect?: number;
  /** Named reading paths this concept belongs to. */
  readingPaths?: string[];
  /** Last update ISO date. */
  lastUpdated?: string;
  /** Recently added badge. */
  isNew?: boolean;
  /** Featured / spotlight badge. */
  isFeatured?: boolean;
};

export type AtlasEntry = AtlasFrontmatter & {
  type: AtlasType;
  slug: string;
  body: string; // markdown body
};

const CONTENT_DIR = path.join(process.cwd(), 'content', 'atlas');
const VALID_TYPES: AtlasType[] = [
  'concept', 'person', 'company', 'robot', 'paper',
  'ai', 'component', 'tool', 'application', 'india', 'advanced', 'electronics',
];

function isAtlasType(s: string): s is AtlasType {
  return VALID_TYPES.includes(s as AtlasType);
}

/** YAML auto-parses ISO dates to JS Date. Coerce to YYYY-MM-DD string for safe rendering. */
/**
 * YAML auto-parses ISO dates to JS Date. Coerce to YYYY-MM-DD for safe
 * rendering. Returns undefined when there is no date: it used to return
 * today's, which is a lie with consequences. Entries that reach us without a
 * `lastReviewed` — every row in the atlas_entries table, whose `data` JSON
 * does not carry the field — were claiming they had been reviewed today, on
 * every single regeneration. That put "Last reviewed · <today>" on 501 pages,
 * set JSON-LD dateModified to today, and reported lastmod=today for 501 URLs
 * in the sitemap every day, which is the fastest way to teach Google to
 * ignore lastmod entirely (CLAUDE.md §12).
 *
 * Absent is absent. Callers decide what to show instead.
 */
function normalizeDate(v: unknown): string | undefined {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string' && v.length > 0) return v.slice(0, 10);
  return undefined;
}

function normalizeSources(v: unknown): AtlasSource[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
    .map((s) => ({ title: String(s.title ?? s.name ?? ''), url: String(s.url ?? '') }))
    .filter(s => s.title && s.url);
}

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(String);
}

function normalizeCategory(v: unknown): AtlasCategory | undefined {
  if (typeof v !== 'string') return undefined;
  return ATLAS_CATEGORIES.includes(v as AtlasCategory) ? (v as AtlasCategory) : undefined;
}

/**
 * Summaries are rendered as plain text (lede, meta description, tooltips,
 * JSON-LD), so inline markdown written in frontmatter — `**bold**`, `code`,
 * [links](...) — showed up literally on the page. Strip it here, once.
 */
export function plainSummary(v: unknown): string {
  return String(v ?? '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Build an AtlasEntry from raw frontmatter, coercing every field to a render-safe value. */
export function buildEntry(type: AtlasType, slug: string, data: Record<string, unknown>, body: string): AtlasEntry {
  return {
    type,
    slug,
    title: String(data.title ?? slug).replace(/\s*[|]\s*R2BOT\s*$/i, '').trim(),
    summary: plainSummary(data.summary),
    seeAlso: normalizeStringArray(data.seeAlso),
    sources: normalizeSources(data.sources),
    lastReviewed: normalizeDate(data.lastReviewed),
    tags: normalizeStringArray(data.tags),
    category: normalizeCategory(data.category),
    prerequisites: normalizeStringArray(data.prerequisites),
    hindi_name: typeof data.hindi_name === 'string' && data.hindi_name.trim().length > 0 ? data.hindi_name.trim() : undefined,
    phonetic: typeof data.phonetic === 'string' && data.phonetic.trim().length > 0 ? data.phonetic.trim() : undefined,
    difficulty:
      data.difficulty === 'beginner' || data.difficulty === 'intermediate' || data.difficulty === 'advanced'
        ? (data.difficulty as 'beginner' | 'intermediate' | 'advanced')
        : undefined,
    relatedTerms: normalizeStringArray(data.relatedTerms),
    suggestedLessons: normalizeStringArray(data.suggestedLessons),
    youtubeSearchQuery: typeof data.youtubeSearchQuery === 'string' ? data.youtubeSearchQuery : undefined,
    bucket: typeof data.bucket === 'string' ? data.bucket : undefined,

    // v2 fields
    difficultyLevel:
      typeof data.difficulty === 'number' && data.difficulty >= 1 && data.difficulty <= 5
        ? (data.difficulty as 1 | 2 | 3 | 4 | 5)
        : undefined,
    difficultyLabel: typeof data.difficultyLabel === 'string' ? data.difficultyLabel : undefined,
    oneLiner: typeof data.oneLiner === 'string' ? plainSummary(data.oneLiner) : undefined,
    laymanExplanation: typeof data.laymanExplanation === 'string' ? plainSummary(data.laymanExplanation) : undefined,
    analogy: typeof data.analogy === 'string' ? plainSummary(data.analogy) : undefined,
    technicalDefinition: typeof data.technicalDefinition === 'string' ? data.technicalDefinition : undefined,
    whyItMatters: typeof data.whyItMatters === 'string' ? plainSummary(data.whyItMatters) : undefined,
    realRobotsThatUseThis: normalizeStringArray(data.realRobotsThatUseThis),
    indianExample: typeof data.indianExample === 'string' ? plainSummary(data.indianExample) : undefined,
    prerequisiteTerms: normalizeStringArray(data.prerequisiteTerms),
    unlocksTerms: normalizeStringArray(data.unlocksTerms),
    youtubeId: typeof data.youtubeId === 'string' ? data.youtubeId : undefined,
    quizQuestion:
      data.quizQuestion && typeof data.quizQuestion === 'object'
        ? {
            q: String((data.quizQuestion as Record<string, unknown>).q ?? ''),
            options: normalizeStringArray((data.quizQuestion as Record<string, unknown>).options),
            answer: Number((data.quizQuestion as Record<string, unknown>).answer ?? 0),
            explanation: String((data.quizQuestion as Record<string, unknown>).explanation ?? ''),
          }
        : undefined,
    mindBlowingFact: typeof data.mindBlowingFact === 'string' ? plainSummary(data.mindBlowingFact) : undefined,
    industryApplications: normalizeStringArray(data.industryApplications),
    body,
  };
}

/** Load every Atlas entry from /content/atlas. Server-only. */
export function getAllAtlasEntries(): AtlasEntry[] {
  const entries: AtlasEntry[] = [];
  if (!fs.existsSync(CONTENT_DIR)) return entries;

  for (const type of fs.readdirSync(CONTENT_DIR)) {
    const dir = path.join(CONTENT_DIR, type);
    if (!fs.statSync(dir).isDirectory()) continue;
    if (!isAtlasType(type)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue;
      const slug = file.replace(/\.(mdx|md)$/, '');
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const { data, content } = matter(raw);
      entries.push(buildEntry(type, slug, data as Record<string, unknown>, content));
    }
  }
  return entries.sort((a, b) => a.title.localeCompare(b.title));
}

export function getAtlasEntry(type: AtlasType, slug: string): AtlasEntry | null {
  const file = path.join(CONTENT_DIR, type, `${slug}.mdx`);
  const fileAlt = path.join(CONTENT_DIR, type, `${slug}.md`);
  const target = fs.existsSync(file) ? file : fs.existsSync(fileAlt) ? fileAlt : null;
  if (!target) return null;
  const raw = fs.readFileSync(target, 'utf8');
  const { data, content } = matter(raw);
  return buildEntry(type, slug, data as Record<string, unknown>, content);
}

/**
 * Internal link graph for the "Keep going" cards, built once per process.
 *
 * The old behaviour was: explicit `seeAlso` first, then *every other entry of
 * the same type in alphabetical order*, sliced to three. In practice that meant
 * the three alphabetically-first concepts collected an inbound link from
 * hundreds of pages while 118 entries had no inbound link from anywhere on the
 * site. Pages with no internal links rarely get crawled and never get
 * discovered by a reader.
 *
 * Two changes:
 *   1. The fallback is ranked by relevance (same category, shared tags, similar
 *      difficulty) instead of by alphabet.
 *   2. Among equally relevant candidates, the one with the fewest inbound links
 *      so far wins. The graph is built in one deterministic pass over the
 *      entries, so the result is stable between builds but spreads link equity
 *      instead of piling it on four pages.
 */
type LinkGraph = Map<string, string[]>;
let linkGraph: LinkGraph | null = null;

const relatednessScore = (a: AtlasEntry, b: AtlasEntry): number => {
  let score = 0;
  if (a.type === b.type) score += 2;
  if (a.category && b.category && a.category === b.category) score += 4;
  if (a.bucket && b.bucket && a.bucket === b.bucket) score += 3;
  const tagsB = new Set((b.tags ?? []).map((t) => t.toLowerCase()));
  for (const tag of a.tags ?? []) if (tagsB.has(tag.toLowerCase())) score += 2;
  if (a.difficulty && b.difficulty && a.difficulty === b.difficulty) score += 1;
  if (a.difficultyLevel && b.difficultyLevel && Math.abs(a.difficultyLevel - b.difficultyLevel) <= 1) score += 1;
  return score;
};

// Matches the number of "Keep going" cards the Atlas page renders. If the
// graph builds more than the page shows, the extra picks are computed and then
// thrown away — which is how entries end up with no inbound link despite the
// balancing below.
const RELATED_PER_ENTRY = 3;

function buildLinkGraph(all: AtlasEntry[]): LinkGraph {
  const key = (e: AtlasEntry) => `${e.type}/${e.slug}`;
  const inbound = new Map<string, number>();
  for (const e of all) inbound.set(key(e), 0);

  // Explicit seeAlso links are authored, so they count as inbound first and are
  // never displaced by the balancing below.
  const bySlug = new Map<string, AtlasEntry>();
  for (const e of all) bySlug.set(e.slug.toLowerCase(), e);
  const explicitFor = new Map<string, AtlasEntry[]>();
  for (const e of all) {
    const picks: AtlasEntry[] = [];
    for (const slug of e.seeAlso ?? []) {
      const hit = bySlug.get(slug.toLowerCase());
      if (hit && hit !== e && !picks.includes(hit)) picks.push(hit);
    }
    explicitFor.set(key(e), picks.slice(0, RELATED_PER_ENTRY));
    for (const p of picks.slice(0, RELATED_PER_ENTRY)) {
      inbound.set(key(p), (inbound.get(key(p)) ?? 0) + 1);
    }
  }

  // Deterministic order: entries needing the most filling go first.
  const ordered = [...all].sort((a, b) => {
    const need = (explicitFor.get(key(b))?.length ?? 0) - (explicitFor.get(key(a))?.length ?? 0);
    if (need !== 0) return need;
    return key(a).localeCompare(key(b));
  });

  const graph: LinkGraph = new Map();
  for (const entry of ordered) {
    const picks = [...(explicitFor.get(key(entry)) ?? [])];
    const taken = new Set(picks.map(key));
    if (picks.length < RELATED_PER_ENTRY) {
      const candidates = all
        .filter((c) => c !== entry && !taken.has(key(c)))
        .map((c) => ({ c, score: relatednessScore(entry, c), seen: inbound.get(key(c)) ?? 0 }))
        .filter((x) => x.score > 0)
        .sort((x, y) => {
          // Relevance first, then whichever page needs links more, then slug.
          if (y.score !== x.score) return y.score - x.score;
          if (x.seen !== y.seen) return x.seen - y.seen;
          return key(x.c).localeCompare(key(y.c));
        });
      for (const { c } of candidates) {
        if (picks.length >= RELATED_PER_ENTRY) break;
        picks.push(c);
        taken.add(key(c));
        inbound.set(key(c), (inbound.get(key(c)) ?? 0) + 1);
      }
    }
    graph.set(key(entry), picks.map(key));
  }

  // Rescue pass: any entry still with no inbound link is placed on the page
  // that is most related to it, replacing that page's weakest pick. Relevance
  // ordering alone leaves a tail of entries that never make anyone's top three,
  // and an unlinked page is one a reader can only reach from search.
  const entryByKey = new Map(all.map((e) => [key(e), e]));
  for (const orphan of all) {
    const ok = key(orphan);
    if ((inbound.get(ok) ?? 0) > 0) continue;
    const hosts = all
      .filter((h) => h !== orphan)
      .map((h) => ({ h, score: relatednessScore(h, orphan) }))
      .sort((x, y) => (y.score - x.score) || key(x.h).localeCompare(key(y.h)));
    for (const { h } of hosts) {
      const hk = key(h);
      const picks = graph.get(hk);
      if (!picks || picks.length === 0 || picks.includes(ok)) continue;
      // Never displace an authored seeAlso link.
      const authored = new Set((explicitFor.get(hk) ?? []).map(key));
      const replaceable = [...picks]
        .filter((k) => !authored.has(k))
        .sort((a, b) => {
          const ea = entryByKey.get(a);
          const eb = entryByKey.get(b);
          const sa = ea ? relatednessScore(h, ea) : 0;
          const sb = eb ? relatednessScore(h, eb) : 0;
          // Drop the least relevant pick that is not the only link to its page.
          if (sa !== sb) return sa - sb;
          return (inbound.get(b) ?? 0) - (inbound.get(a) ?? 0);
        });
      const victim = replaceable.find((k) => (inbound.get(k) ?? 0) > 1);
      if (!victim) continue;
      picks[picks.indexOf(victim)] = ok;
      inbound.set(victim, (inbound.get(victim) ?? 1) - 1);
      inbound.set(ok, 1);
      break;
    }
  }
  return graph;
}

export function getRelatedEntries(entry: AtlasEntry, limit = 4): AtlasEntry[] {
  const all = getAllAtlasEntries();
  if (!linkGraph || linkGraph.size !== all.length) linkGraph = buildLinkGraph(all);
  const byKey = new Map(all.map((e) => [`${e.type}/${e.slug}`, e]));
  const keys = linkGraph.get(`${entry.type}/${entry.slug}`) ?? [];
  const picked = keys.map((k) => byKey.get(k)).filter((e): e is AtlasEntry => Boolean(e));
  if (picked.length >= limit) return picked.slice(0, limit);
  // Safety net: never render fewer cards than asked for.
  const extra = all.filter((e) => e !== entry && !picked.includes(e)).slice(0, limit - picked.length);
  return [...picked, ...extra];
}

export function typeLabel(t: AtlasType): string {
  return ({
    concept:    'Concept',
    person:     'Person',
    company:    'Company',
    robot:      'Robot',
    paper:      'Paper',
    ai:         'AI / ML',
    component:  'Component',
    tool:       'Tool / Software',
    application:'Application',
    india:      'India',
    advanced:   'Advanced',
    electronics:'Electronics',
  } as Record<AtlasType, string>)[t] ?? 'Concept';
}
