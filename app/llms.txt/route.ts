import { getAllAtlasEntriesMerged } from '@/lib/atlas-db';
import { getAllAcademyLessons } from '@/lib/academy';
import { getAllPostsMerged } from '@/lib/blog-db';

// llms.txt — a plain-text map of the site for AI assistants and answer engines
// (ChatGPT, Perplexity, Gemini, Claude, Copilot). Regenerated daily.
export const revalidate = 86400;

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

const clean = (s: unknown, n = 160) =>
  String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export async function GET() {
  const [atlas, posts] = await Promise.all([getAllAtlasEntriesMerged(), getAllPostsMerged()]);
  const lessons = getAllAcademyLessons();

  const lines: string[] = [];
  lines.push('# R2BOT');
  lines.push('');
  lines.push('> R2BOT is a free robotics learning platform: a plain-English encyclopedia of robotics concepts (the Atlas), structured beginner-to-advanced lessons (the Academy), interactive simulators, guided robot builds, and an AI mentor. Content is written for beginners and students worldwide, with sources cited on every Atlas page.');
  lines.push('');
  lines.push('## Main sections');
  lines.push(`- [Atlas](${BASE}/atlas): ${atlas.length} robotics concepts, robots, companies and people explained simply, each with cited sources`);
  lines.push(`- [Academy](${BASE}/academy): four tracks — Spark (beginner), Wire (Arduino/ROS2 basics), Forge (Nav2, MoveIt2), Edge (SLAM, multi-robot)`);
  lines.push(`- [Simulators](${BASE}/visualizer): interactive tools for PID control, kinematics, SLAM and more`);
  lines.push(`- [Robot projects](${BASE}/build): guided builds from line followers to ROS2 navigation`);
  lines.push(`- [Blog](${BASE}/blog): long-form guides`);
  lines.push(`- [News](${BASE}/news): daily robotics news with context`);
  lines.push(`- [AI mentor](${BASE}/copilot): ask robotics questions`);
  lines.push('');
  lines.push('## Academy lessons');
  for (const l of lessons) {
    lines.push(`- [${clean(l.title, 100)}](${BASE}/academy/${l.track}/${l.slug})`);
  }
  lines.push('');
  lines.push('## Blog');
  for (const p of posts) {
    lines.push(`- [${clean(p.title, 120)}](${BASE}/blog/${p.slug})`);
  }
  lines.push('');
  lines.push('## Atlas (concepts, robots, companies, people)');
  for (const e of atlas) {
    lines.push(`- [${clean(e.title, 80)}](${BASE}/atlas/${e.type}/${e.slug}): ${clean(e.summary)}`);
  }
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
