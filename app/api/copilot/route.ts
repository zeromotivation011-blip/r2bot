import Anthropic from '@anthropic-ai/sdk';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { getUserSubscription } from '@/lib/subscription';
import { MODE_BY_ID } from '@/app/copilot/copilot-modes';

// Hard caps on what a single request may send to the model. Without these a
// 200 kB body goes straight to Claude at the caller's expense.
const MAX_MESSAGE_CHARS = 4_000;
const MAX_HISTORY_ITEM_CHARS = 4_000;
const MAX_HISTORY_TOTAL_CHARS = 24_000;

const FREE_DAILY_LIMIT_AUTH = 10;
const FREE_DAILY_LIMIT_ANON = 5;

function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return null;
}

// Node.js runtime — the Anthropic SDK has Edge-runtime quirks in newer versions,
// and the Supabase service role client needs Node primitives.
export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT_BASE = `You are R2 Co-pilot, the AI brain of R2BOT — the world's most accessible robotics platform.

YOUR JOB
Explain anything in robotics — concepts, robots, companies, papers, people, current events — in plain English. Make a smart 14-year-old with no engineering background understand. Never patronise; never bluff.

VOICE
- Plain words first, technical terms second. Always define a term the moment you use it.
- Show, then label. Open with an analogy or quick image, then give it a name.
- Confidently uncertain. If you don't know, say so. Don't invent.
- Curious. End with one short question the reader didn't think to ask.

RULES
- Default audience: a smart, curious teenager learning robotics on their own.
- Indian English with global readability (use "analyze" not "analyse").
- Never more than 220 words unless the user asks for depth.
- No bullet points unless the answer is genuinely a list of three or more discrete items.
- If asked about something outside robotics, politely steer back: "I'm R2 — I stick to robotics. But here's the robotics angle on your question…"
- If the user is a beginner, recommend the Spark track. If intermediate, Wire. If advanced, Forge or Edge.

ABOUT R2BOT (for context only)
R2BOT is a free robotics encyclopedia, course platform and AI co-pilot, written and built by R2BOT Editorial — one person who taught science before building robots. The brand promise is "ROBOT, decoded." — every concept explained plainly, every claim cited. If asked who made R2BOT, say it is written by one person who prefers to stay unnamed, and point to /about/how-this-is-written. Never state or guess a personal name.
`;

type ChatMsg = { role: 'user' | 'assistant'; content: string };

const TRACK_GUIDANCE: Record<'spark' | 'wire' | 'forge' | 'edge', string> = {
  spark:
    "User is on the SPARK track (complete beginner). Explain using simple analogies, no jargon. Assume zero prior knowledge. Define every technical word the first time you use it.",
  wire:
    "User is on the WIRE track (basic electronics + Arduino knowledge). Use ROS terminology freely. Don't re-explain what a sensor or an actuator is.",
  forge:
    "User is on the FORGE track (intermediate). Discuss tradeoffs, architecture, and real-world implementations. Skip introductory material — go straight to the engineering substance.",
  edge:
    "User is on the EDGE track (advanced). Be technical and direct. Cite papers when relevant. No hand-holding. Assume they know the standard tooling and math.",
};

function trackGuidance(track: 'spark' | 'wire' | 'forge' | 'edge' | null | undefined): string | null {
  if (!track || !(track in TRACK_GUIDANCE)) return null;
  return TRACK_GUIDANCE[track];
}

/** Pull the SUGGESTIONS:[...] line off an assistant message (history hygiene). */
function stripSuggestions(text: string): { text: string; suggestions: string[] } {
  const m = text.match(/\bSUGGESTIONS:\s*(\[[\s\S]*?\])\s*$/);
  if (!m) return { text, suggestions: [] };
  let suggestions: string[] = [];
  try {
    const parsed = JSON.parse(m[1]);
    if (Array.isArray(parsed)) suggestions = parsed.filter((x): x is string => typeof x === 'string').slice(0, 3);
  } catch {
    /* malformed — drop silently */
  }
  return { text: text.slice(0, m.index).trimEnd(), suggestions };
}

type RetrievedEntry = {
  id: string;
  type: string;
  slug: string;
  title: string;
  summary: string;
  body_md: string;
  similarity: number;
};

// ---- 1. Embedding ----
async function embedQuery(text: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 30_000),
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: { embedding: number[] }[] };
    return json.data[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

// ---- 2. Atlas retrieval ----
async function retrieveAtlas(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  embedding: number[] | null,
): Promise<RetrievedEntry[]> {
  if (!embedding) return [];
  const { data, error } = await supabase.rpc('match_atlas_entries', {
    query_embedding: embedding,
    match_threshold: 0.45, // text-embedding-3-small runs cooler than ada-002; 0.45 is a generous floor
    match_count: 5,
  });
  if (error || !data) return [];
  return data as RetrievedEntry[];
}

/**
 * Last resort when vector search comes back empty.
 *
 * The atlas_entries table was empty in production — no rows, no embeddings —
 * so match_atlas_entries returned nothing on every question and the Co-pilot
 * answered entirely from general knowledge, without a single citation, while
 * the site promised answers grounded in the Atlas. POST
 * /api/admin/atlas/reindex fixes the cause; this makes the symptom impossible
 * to repeat silently, because an unindexed Atlas should degrade to "fewer
 * sources", never to "no sources and no sign anything is wrong".
 *
 * Title-keyword matching, not semantics. It will miss things vector search
 * would find; it will not invent a page that does not exist.
 */
async function retrieveAtlasByKeyword(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  question: string,
): Promise<RetrievedEntry[]> {
  const STOP = new Set([
    'what', 'when', 'where', 'which', 'with', 'this', 'that', 'from', 'does', '做',
    'your', 'about', 'have', 'between', 'difference', 'would', 'should', 'could',
    'there', 'their', 'robot', 'robots', 'explain', 'tell', 'much', 'many', 'into',
  ]);
  const terms = Array.from(
    new Set(
      question
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP.has(w)),
    ),
  ).slice(0, 6);
  if (terms.length === 0) return [];

  const { data, error } = await supabase
    .from('atlas_entries')
    .select('id, type, slug, title, summary, body_md')
    .or(terms.map((t) => `title.ilike.%${t}%`).join(','))
    .limit(4);
  if (error || !data) return [];
  return (data as Omit<RetrievedEntry, 'similarity'>[]).map((e) => ({ ...e, similarity: 0 }));
}

// ---- 3. Prompt assembly ----
function buildGroundedPrompt(base: string, entries: RetrievedEntry[]): string {
  if (entries.length === 0) return base;

  const sources = entries
    .map((e, i) => {
      const body = e.body_md.length > 1400 ? e.body_md.slice(0, 1400) + '…' : e.body_md;
      return `[Source ${i + 1}: "${e.title}" — /atlas/${e.type}/${e.slug}]\n${e.summary}\n\n${body}`;
    })
    .join('\n\n---\n\n');

  return `${base}

GROUNDING — RELEVANT ATLAS ENTRIES
When any of the sources below are on-topic, treat them as your primary truth and cite them inline as markdown links: [<title>](/atlas/<type>/<slug>). For example: "as covered in [SLAM](/atlas/concept/slam)". Use the exact path shown in each source header. Cite at least one source whenever one is genuinely relevant — the links are how a reader goes deeper, and an answer with none is a dead end. If none of the sources are on-topic, answer from general knowledge and say so in one short line, and do not invent an /atlas/ path for a page that is not listed above.

${sources}
`;
}

// ---- 4. Route handler ----
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      'R2 Co-pilot is not configured yet. Set ANTHROPIC_API_KEY in Vercel environment variables.',
      { status: 500 },
    );
  }

  let body: {
    message?: string;
    history?: ChatMsg[];
    pageContext?: { title?: string; summary?: string; kind?: 'atlas' | 'academy' | 'pulse' } | null;
    mode?: 'answer' | 'teach';
    currentTrack?: 'spark' | 'wire' | 'forge' | 'edge' | null;
    suggestions?: boolean;
    /** One of the ids in app/copilot/copilot-modes.ts. Free-text system prompts are not accepted. */
    modeId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body.', { status: 400 });
  }

  const message = (body.message || '').trim();
  if (!message) return new Response('Empty message.', { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) return new Response('Message too long.', { status: 413 });

  const history: ChatMsg[] = Array.isArray(body.history)
    ? body.history
        .filter((m): m is ChatMsg =>
          !!m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0,
        )
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_HISTORY_ITEM_CHARS) }))
    : [];
  if (history.reduce((n, m) => n + m.content.length, 0) > MAX_HISTORY_TOTAL_CHARS) {
    return new Response('Conversation history too long.', { status: 413 });
  }

  // Strip any prior SUGGESTIONS lines from history so they don't pollute context.
  const cleanHistory = history.map((m) =>
    m.role === 'assistant' ? { ...m, content: stripSuggestions(m.content).text } : m,
  );

  // Track-aware complexity guidance.
  const trackHint = trackGuidance(body.currentTrack);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const clientIp = getClientIp(req);

  // Rate limiting — 10/day for free auth users, 5/day per IP for anon.
  // Authenticated users can count their own rows under RLS. The anonymous
  // count runs on the service-role client: the old RLS policy let any anon
  // session read EVERY conversation (and IP) so that this count would work,
  // which was a data leak. Migration 0051 closed it.
  const since24h = new Date(Date.now() - 86_400_000).toISOString();
  if (user) {
    const sub = await getUserSubscription(user.id);
    if (!sub.isPro) {
      const { count } = await supabase
        .from('copilot_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('created_at', since24h);
      if ((count ?? 0) >= FREE_DAILY_LIMIT_AUTH) {
        return Response.json(
          {
            error: "You've used your 10 R2 messages for today. It resets in 24 hours — the Atlas and every lesson stay open meanwhile.",
          },
          { status: 429 },
        );
      }
    }
  } else if (clientIp) {
    const { count } = await createSupabaseAdminClient()
      .from('copilot_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', clientIp)
      .gt('created_at', since24h);
    if ((count ?? 0) >= FREE_DAILY_LIMIT_ANON) {
      return Response.json(
        {
          error: 'Sign in (free) to get 10 R2 messages a day.',
          loginUrl: '/login',
        },
        { status: 429 },
      );
    }
  }

  // RAG: embed → retrieve → ground. All steps degrade silently if any piece fails.
  const embedding = await embedQuery(message);
  let retrieved = await retrieveAtlas(supabase, embedding);
  if (retrieved.length === 0) retrieved = await retrieveAtlasByKeyword(supabase, message);

  // Mode-switch: in "teach" mode R2 becomes a Socratic tutor; default keeps existing behaviour.
  const mode = body.mode === 'teach' ? 'teach' : 'answer';
  const basePrompt =
    mode === 'teach'
      ? `You are R2, a Socratic robotics tutor. The user is learning robotics.
NEVER give direct answers. Instead:
1. Ask ONE probing question that guides them toward the answer
2. If they're on the right track, confirm it and ask a follow-up question that goes deeper
3. If they're wrong, say "Interesting — what makes you think that?" and hint at the right direction
4. After 3 exchanges on the same concept, you may reveal the answer with an explanation
Keep responses short (2-4 sentences max). End every response with a question.

ABOUT R2BOT (for context only)
R2BOT is a free robotics encyclopedia, course platform and AI co-pilot, written and built by R2BOT Editorial — one person who taught science before building robots. The brand promise is "ROBOT, decoded." — every concept explained plainly, every claim cited. If asked who made R2BOT, say it is written by one person who prefers to stay unnamed, and point to /about/how-this-is-written. Never state or guess a personal name.
`
      : SYSTEM_PROMPT_BASE;

  let systemPrompt = buildGroundedPrompt(basePrompt, retrieved);

  if (trackHint) {
    systemPrompt = `${systemPrompt}\n\nLEARNER LEVEL\n${trackHint}`;
  }

  // Context mode from the /copilot page (Debug ROS 2, Quiz Me, etc.). The
  // client sends an id and the prompt text comes from our own table — a
  // user-supplied system prompt was a sanctioned way to make R2 say anything.
  const modeDef = typeof body.modeId === 'string' ? MODE_BY_ID.get(body.modeId as never) : undefined;
  if (modeDef?.systemPrompt) {
    systemPrompt = `${systemPrompt}\n\nCONTEXT MODE\n${modeDef.systemPrompt}`;
  }

  if (body.suggestions) {
    systemPrompt = `${systemPrompt}

FOLLOW-UPS
After your answer, add exactly this JSON on the very last line (no markdown fence, no commentary):
SUGGESTIONS:["Question 1?","Question 2?","Question 3?"]
The three questions must be short, natural next things this learner would ask given your answer. Do NOT use double-quotes inside the questions; rephrase if needed.`;
  }

  // Page context — primes R2 with what the reader is currently looking at.
  const ctx = body.pageContext;
  if (ctx?.title) {
    const titleSafe = String(ctx.title).slice(0, 200);
    const summarySafe = ctx.summary ? String(ctx.summary).slice(0, 400) : '';
    let line = '';
    if (ctx.kind === 'academy') {
      line = `The user is currently reading the R2BOT Academy lesson "${titleSafe}". Answer in the context of this lesson first.`;
    } else if (ctx.kind === 'pulse') {
      line = `The user is currently reading the R2BOT Pulse news story "${titleSafe}". Answer in the context of this story first.`;
    } else {
      line = `The user is currently reading the Atlas entry for "${titleSafe}". Answer questions about this topic first.`;
    }
    if (summarySafe) line += `\nSummary: ${summarySafe}`;
    systemPrompt = `${systemPrompt}\n\nCURRENT PAGE\n${line}`;
  }

  const messages = [...cleanHistory, { role: 'user' as const, content: message }];
  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  let assistantText = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        });

        for await (const chunk of response) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            assistantText += chunk.delta.text;
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        console.error('[copilot] model call failed:', err);
        controller.enqueue(encoder.encode('\n\n[R2 could not finish that answer. Please try again in a moment.]'));
        controller.close();
        return;
      }

      // Fire-and-forget logging — must not block the response.
      // Service role client bypasses RLS since copilot_conversations has no INSERT policy by design.
      try {
        const admin = createSupabaseAdminClient();
        await admin.from('copilot_conversations').insert({
          user_id: user?.id ?? null,
          messages: [...messages, { role: 'assistant', content: assistantText }],
          retrieved_entry_ids: retrieved.map((r) => r.id),
          highest_similarity: retrieved[0]?.similarity ?? null,
          page_context: req.headers.get('referer') ?? null,
          ip_address: clientIp,
        });
      } catch (err) {
        // Logging is best-effort; never let it crash the response.
        console.error('[copilot] log insert failed:', err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
