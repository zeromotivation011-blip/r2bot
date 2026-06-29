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
function normalizeDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string' && v.length > 0) return v.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
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

/** Build an AtlasEntry from raw frontmatter, coercing every field to a render-safe value. */
function buildEntry(type: AtlasType, slug: string, data: Record<string, unknown>, body: string): AtlasEntry {
  return {
    type,
    slug,
    title: String(data.title ?? slug),
    summary: String(data.summary ?? ''),
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
    oneLiner: typeof data.oneLiner === 'string' ? data.oneLiner : undefined,
    laymanExplanation: typeof data.laymanExplanation === 'string' ? data.laymanExplanation : undefined,
    analogy: typeof data.analogy === 'string' ? data.analogy : undefined,
    technicalDefinition: typeof data.technicalDefinition === 'string' ? data.technicalDefinition : undefined,
    whyItMatters: typeof data.whyItMatters === 'string' ? data.whyItMatters : undefined,
    realRobotsThatUseThis: normalizeStringArray(data.realRobotsThatUseThis),
    indianExample: typeof data.indianExample === 'string' ? data.indianExample : undefined,
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
    mindBlowingFact: typeof data.mindBlowingFact === 'string' ? data.mindBlowingFact : undefined,
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

export function getRelatedEntries(entry: AtlasEntry, limit = 4): AtlasEntry[] {
  const all = getAllAtlasEntries();
  const seeAlso = (entry.seeAlso ?? []).map(s => s.toLowerCase());
  // Prefer explicit seeAlso, then same-type others
  const explicit = all.filter(e => e !== entry && seeAlso.includes(e.slug));
  const sameType = all.filter(e => e !== entry && e.type === entry.type && !seeAlso.includes(e.slug));
  return [...explicit, ...sameType].slice(0, limit);
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
