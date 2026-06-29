// Auto-discovery core. Fetches from 4 sources, extracts topics via Anthropic
// Haiku, compares against the Atlas slug+title set, and upserts into
// discovery_queue. Designed to be callable from both the Vercel cron route
// (with CRON_SECRET) and the admin "Run now" button (with session auth).

import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getAllAtlasEntries } from '@/lib/atlas';

type RawItem = {
  source: 'arxiv' | 'reddit' | 'hn' | 'github';
  source_url: string;
  title: string;
  summary: string;
};

export type DiscoveryResult = {
  processed: number;
  new_items: number;
  atlas_gaps_found: number;
};

// ---------------- Source fetchers ----------------

async function fetchArxiv(): Promise<RawItem[]> {
  const res = await fetch('https://export.arxiv.org/rss/cs.RO', { cache: 'no-store' });
  if (!res.ok) return [];
  const xml = await res.text();
  // Crude RSS parser — no DOM dependency. Each <item>…</item> block.
  const items: RawItem[] = [];
  const blocks = xml.split(/<item>/i).slice(1, 11);
  for (const block of blocks) {
    const end = block.indexOf('</item>');
    const chunk = block.slice(0, end >= 0 ? end : undefined);
    const title = stripCdata(extract(chunk, 'title'));
    const link = stripCdata(extract(chunk, 'link'));
    const description = stripCdata(extract(chunk, 'description')).replace(/<[^>]+>/g, '').trim();
    if (!link || !title) continue;
    items.push({
      source: 'arxiv',
      source_url: link,
      title,
      summary: description.slice(0, 600),
    });
  }
  return items;
}

async function fetchReddit(): Promise<RawItem[]> {
  const res = await fetch('https://www.reddit.com/r/robotics/top.json?limit=10&t=week', {
    headers: { 'User-Agent': 'R2BOT/1.0' },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { data?: { children?: Array<{ data?: Record<string, unknown> }> } };
  const children = data?.data?.children ?? [];
  const items: RawItem[] = [];
  for (const c of children) {
    const d = c.data;
    if (!d) continue;
    const url = String(d.permalink ? `https://www.reddit.com${d.permalink}` : (d.url ?? ''));
    const title = String(d.title ?? '');
    const selftext = String(d.selftext ?? '').slice(0, 300);
    if (!url || !title) continue;
    items.push({ source: 'reddit', source_url: url, title, summary: selftext });
  }
  return items;
}

async function fetchHN(): Promise<RawItem[]> {
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
  const res = await fetch(
    `https://hn.algolia.com/api/v1/search?query=robotics&tags=story&numericFilters=created_at_i>${sevenDaysAgo}`,
    { cache: 'no-store' },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { hits?: Array<{ title?: string; url?: string; objectID?: string }> };
  const items: RawItem[] = [];
  for (const h of data.hits ?? []) {
    const title = h.title ?? '';
    const url = h.url ?? (h.objectID ? `https://news.ycombinator.com/item?id=${h.objectID}` : '');
    if (!title || !url) continue;
    items.push({ source: 'hn', source_url: url, title, summary: '' });
  }
  return items.slice(0, 10);
}

async function fetchGithub(): Promise<RawItem[]> {
  const res = await fetch(
    'https://api.github.com/search/repositories?q=robotics+OR+ros+OR+robot&sort=stars&order=desc&per_page=10',
    {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'R2BOT/1.0' },
      cache: 'no-store',
    },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    items?: Array<{ name?: string; full_name?: string; description?: string | null; html_url?: string }>;
  };
  const keywords = ['robot', 'ros', 'servo', 'actuator', 'lidar', 'slam', 'autonomous', 'drone'];
  const items: RawItem[] = [];
  for (const r of data.items ?? []) {
    const name = r.name ?? r.full_name ?? '';
    const desc = (r.description ?? '').toLowerCase();
    const url = r.html_url ?? '';
    if (!url) continue;
    if (!keywords.some((k) => name.toLowerCase().includes(k) || desc.includes(k))) continue;
    items.push({
      source: 'github',
      source_url: url,
      title: r.full_name ?? name,
      summary: (r.description ?? '').slice(0, 600),
    });
  }
  return items;
}

function extract(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1] : '';
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

// ---------------- LLM topic extraction ----------------

async function extractTopics(client: Anthropic, item: RawItem): Promise<string[]> {
  const text = `${item.title}\n\n${item.summary}`.slice(0, 2000);
  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-3-5',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Extract up to 5 specific robotics topics, concepts, or technologies from this text as a JSON array of short strings (2-4 words each). Return ONLY the JSON array, nothing else.\n\nText: ${text}`,
        },
      ],
    });
    const raw = resp.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
      .join('')
      .trim();
    // Find the first JSON array in the response.
    const m = raw.match(/\[[\s\S]*?\]/);
    if (!m) return [];
    const parsed = JSON.parse(m[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length >= 2 && s.length <= 60)
      .slice(0, 5);
  } catch {
    return [];
  }
}

// ---------------- Atlas matching ----------------

type AtlasIndex = { slugs: Set<string>; titles: string[]; haystack: string };

function buildAtlasIndex(): AtlasIndex {
  const entries = getAllAtlasEntries();
  const slugs = new Set<string>();
  const titles: string[] = [];
  for (const e of entries) {
    slugs.add(e.slug.toLowerCase());
    slugs.add(e.slug.replace(/-/g, ' ').toLowerCase());
    titles.push(e.title.toLowerCase());
  }
  return {
    slugs,
    titles,
    haystack: titles.join(' || '),
  };
}

function topicExistsInAtlas(topic: string, idx: AtlasIndex): boolean {
  const t = topic.toLowerCase();
  if (idx.slugs.has(t)) return true;
  if (idx.slugs.has(t.replace(/\s+/g, '-'))) return true;
  return idx.haystack.includes(t);
}

// ---------------- Orchestrator ----------------

export async function runDiscovery(): Promise<DiscoveryResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { processed: 0, new_items: 0, atlas_gaps_found: 0 };
  }
  const client = new Anthropic({ apiKey });
  const supabase = createSupabaseAdminClient();
  const atlasIdx = buildAtlasIndex();

  const fetches = await Promise.allSettled([fetchArxiv(), fetchReddit(), fetchHN(), fetchGithub()]);
  const all: RawItem[] = [];
  for (const r of fetches) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }

  let newItems = 0;
  let gapsFound = 0;
  // Process sequentially to keep LLM concurrency bounded.
  for (const item of all) {
    const topics = await extractTopics(client, item);
    const gaps = topics.filter((t) => !topicExistsInAtlas(t, atlasIdx));
    gapsFound += gaps.length;

    // Check if this URL already exists (so we know whether to count it as "new").
    const { data: existing } = await supabase
      .from('discovery_queue')
      .select('id, status, atlas_gaps')
      .eq('source_url', item.source_url)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase.from('discovery_queue').insert({
        source: item.source,
        source_url: item.source_url,
        raw_title: item.title,
        raw_summary: item.summary || null,
        extracted_topics: topics,
        atlas_gaps: gaps,
      });
      if (!error) newItems++;
      continue;
    }

    // Already in queue. Per spec: only update + re-queue if it was dismissed
    // AND we now found a new gap not previously logged.
    if (existing.status === 'dismissed') {
      const prevGaps = new Set((existing.atlas_gaps as string[] | null) ?? []);
      const newlyFoundGap = gaps.some((g) => !prevGaps.has(g));
      if (newlyFoundGap) {
        await supabase
          .from('discovery_queue')
          .update({
            extracted_topics: topics,
            atlas_gaps: gaps,
            status: 'pending',
          })
          .eq('id', existing.id);
      }
    }
  }

  return { processed: all.length, new_items: newItems, atlas_gaps_found: gapsFound };
}
