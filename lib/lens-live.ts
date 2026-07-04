// lib/lens-live.ts — Automated Lens ingestion.
//
// Pulls the latest videos from curated robotics YouTube channels via their
// public RSS feeds (no API key required) and enriches each with a short
// Claude-Haiku summary. Mirrors the lib/news.ts pattern.
//
// Channels are configured in content/lens-channels.json so they can be edited
// without touching code. Results are cached (unstable_cache) for 6 hours, so
// the page is fast and we don't re-summarize on every request.

import fs from 'node:fs';
import path from 'node:path';
import { unstable_cache } from 'next/cache';

export type LiveLensVideo = {
  videoId: string;
  title: string;
  summary: string;       // Claude summary, or the video description as fallback
  channel: string;
  url: string;           // https://www.youtube.com/watch?v=...
  thumbnailUrl: string;  // i.ytimg.com deterministic thumbnail
  publishedAt: string;   // ISO
  topic: string;
};

type ChannelConfig = { name: string; channelId: string; alwaysRelevant: boolean };

const CONFIG_PATH = path.join(process.cwd(), 'content', 'lens-channels.json');
const CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 hours
const MAX_VIDEOS = 24;
const MAX_SUMMARIES = 12;

// ────────────────────────────────────────────────────────────────────────────
// Robotics relevance
// ────────────────────────────────────────────────────────────────────────────
const ROBOTICS_KEYWORDS = [
  'robot', 'robotic', 'humanoid', 'quadruped', 'ros', 'ros2', 'slam',
  'manipulation', 'gripper', 'actuator', 'autonomy', 'autonomous', 'drone',
  'optimus', 'atlas', 'spot', 'reinforcement learning', 'imitation learning',
  'embodied', 'locomotion', 'dexterous', 'teleoperation', 'sim-to-real',
  'lidar', 'computer vision', 'motion planning', 'legged', 'arm ',
];

function isRoboticsRelevant(title: string, description: string): boolean {
  const hay = `${title} ${description}`.toLowerCase();
  return ROBOTICS_KEYWORDS.some((k) => hay.includes(k));
}

function classifyTopic(title: string, description: string): string {
  const hay = `${title} ${description}`.toLowerCase();
  if (/humanoid|optimus|atlas|figure|sanctuary/.test(hay)) return 'Humanoids';
  if (/reinforcement|learning|neural|ai model|foundation model|policy/.test(hay)) return 'AI & Learning';
  if (/slam|navigation|mapping|localization|autonomy|autonomous/.test(hay)) return 'Navigation';
  if (/manipulation|gripper|arm|dexterous|grasp/.test(hay)) return 'Manipulation';
  if (/drone|uav|aerial|quadcopter/.test(hay)) return 'Drones';
  if (/quadruped|legged|locomotion|spot|walk/.test(hay)) return 'Legged Robots';
  return 'Robotics';
}

// ────────────────────────────────────────────────────────────────────────────
// XML parsing (YouTube Atom feed)
// ────────────────────────────────────────────────────────────────────────────
function extractEntries(xml: string): string[] {
  const out: string[] = [];
  const re = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}

function tag(entry: string, name: string): string {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i').exec(entry);
  return m ? m[1].trim() : '';
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

type RawVideo = { videoId: string; title: string; description: string; channel: string; publishedAt: string };

function parseChannelFeed(xml: string, fallbackName: string): RawVideo[] {
  const out: RawVideo[] = [];
  for (const entry of extractEntries(xml)) {
    const videoId = tag(entry, 'yt:videoId');
    if (!videoId) continue;
    const title = decode(tag(entry, 'title'));
    const description = decode(tag(entry, 'media:description')).slice(0, 500);
    const channel = decode(tag(entry, 'name')) || fallbackName;
    const publishedRaw = tag(entry, 'published');
    const publishedAt = publishedRaw && !isNaN(Date.parse(publishedRaw))
      ? new Date(publishedRaw).toISOString()
      : new Date(0).toISOString();
    if (!title) continue;
    out.push({ videoId, title, description, channel, publishedAt });
  }
  return out;
}

async function fetchChannel(c: ChannelConfig): Promise<RawVideo[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(c.channelId)}`,
      {
        headers: { 'User-Agent': 'R2BOT-LensBot/1.0 (+https://r2bot.in)' },
        next: { revalidate: CACHE_TTL_SECONDS },
        signal: AbortSignal.timeout(9000),
      },
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const raw = parseChannelFeed(xml, c.name);
    return c.alwaysRelevant
      ? raw
      : raw.filter((v) => isRoboticsRelevant(v.title, v.description));
  } catch {
    return [];
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Claude Haiku summaries (opt-in via ANTHROPIC_API_KEY)
// ────────────────────────────────────────────────────────────────────────────
async function summarize(title: string, description: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 160,
        messages: [
          {
            role: 'user',
            content:
              'In exactly 2 sentences, tell a robotics student what this YouTube video covers and why it is worth watching. Be specific and concrete. Title and description:\n\n' +
              `${title}\n\n${description.slice(0, 400)}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = json.content?.find((c) => c.type === 'text')?.text?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

function loadChannels(): ChannelConfig[] {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as { channels?: unknown };
    if (!Array.isArray(parsed.channels)) return [];
    return parsed.channels
      .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
      .map((c) => ({
        name: String(c.name ?? 'YouTube'),
        channelId: String(c.channelId ?? ''),
        alwaysRelevant: Boolean(c.alwaysRelevant),
      }))
      .filter((c) => c.channelId.length > 0);
  } catch {
    return [];
  }
}

async function ingest(): Promise<LiveLensVideo[]> {
  const channels = loadChannels();
  if (channels.length === 0) return [];

  const fetched = await Promise.all(channels.map(fetchChannel));
  const all = fetched.flat();

  // Dedupe by videoId, newest first.
  const byId = new Map<string, RawVideo>();
  for (const v of all) if (!byId.has(v.videoId)) byId.set(v.videoId, v);
  const sorted = Array.from(byId.values())
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, MAX_VIDEOS);

  const videos: LiveLensVideo[] = sorted.map((v) => ({
    videoId: v.videoId,
    title: v.title,
    summary: v.description || 'A robotics video worth watching.',
    channel: v.channel,
    url: `https://www.youtube.com/watch?v=${v.videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
    publishedAt: v.publishedAt,
    topic: classifyTopic(v.title, v.description),
  }));

  // Enrich the top N with Claude summaries (bounded).
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    await Promise.all(
      videos.slice(0, MAX_SUMMARIES).map(async (v, i) => {
        const summary = await summarize(v.title, sorted[i].description, apiKey);
        if (summary) v.summary = summary;
      }),
    );
  }

  return videos;
}

// Cache the whole ingest (feeds + summaries) for 6 hours.
export const getLiveLensVideos = unstable_cache(ingest, ['lens-live-videos'], {
  revalidate: CACHE_TTL_SECONDS,
  tags: ['lens-live'],
});
