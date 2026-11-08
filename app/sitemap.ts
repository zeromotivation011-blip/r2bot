import type { MetadataRoute } from 'next';
import { getAllAtlasEntriesMerged } from '@/lib/atlas-db';
import { getAllLensMerged } from '@/lib/lens-cms';
import { getArchivedNewsSlugs } from '@/lib/news';
import { getAllAcademyLessons } from '@/lib/academy';
import { ROBOTS } from '@/lib/robots-data';
import { getAllPostsMerged } from '@/lib/blog-db';
import { listProjectSlugs } from '@/lib/build/loader';
import { SIMULATORS } from '@/lib/simulators';
import { AI_TOPICS } from '@/lib/ai-robotics';
import { SHORTS, SHORT_COURSES, liveShorts } from '@/lib/shorts';
import { SHORTS_ZH } from '@/lib/shorts-zh';
import { SHORTS_HI } from '@/lib/shorts-hi';
import { SHORTS_ES } from '@/lib/shorts-es';
import { ZH_TOPICS } from '@/lib/ai-robotics-zh';
import { HI_TOPICS } from '@/lib/ai-robotics-hi';
import { ES_TOPICS } from '@/lib/ai-robotics-es';
import { listPublishedCourses, hasVideo } from '@/lib/courses';
import { GROUP_UPDATED, pageUpdated as at } from '@/lib/content-dates';
import { ATLAS_ROBOTS_REDIRECTED } from '@/lib/canonical-map';

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

// This route reads the Atlas/blog/Lens tables, so it must not be frozen into
// the build output: regenerate it hourly. A statically cached sitemap is how a
// site ends up advertising a months-old view of itself to Google.
export const revalidate = 3600;

/**
 * `lastModified` discipline: every URL gets either a date from its own content
 * (Atlas lastReviewed, blog date, Lens publishedAt, course updated) or an
 * honest hand-maintained date from lib/content-dates.ts. Only genuinely daily
 * surfaces use the current time. Reporting "today" for forty static pages is
 * how a site teaches search engines to ignore its lastmod entirely.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Each simulator is its own indexable page targeting a low-competition
  // "tool" query. High priority: these are the pages most likely to earn
  // external links, which is what the whole domain's authority depends on.
  const simulators = SIMULATORS.map((s) => ({
    url: `${BASE}/visualizer/${s.id}`,
    lastModified: GROUP_UPDATED.simulators,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  // Merged sources: MDX on disk PLUS anything published through the CMS.
  // Reading the filesystem alone meant browser-created content never entered
  // the sitemap, so Google never discovered it.
  const [atlasEntries, blogPostsData, lensVideos, newsSlugs] = await Promise.all([
    getAllAtlasEntriesMerged(),
    getAllPostsMerged(),
    getAllLensMerged(),
    getArchivedNewsSlugs(1000),
  ]);

  // Per-article news pages from the archive (0033 + 0050). These are
  // summarised, self-canonical stories with NewsArticle JSON-LD — the
  // indexable layer over a feed that is otherwise client-rendered and links
  // straight out to the source. lastModified is the story's real publish date,
  // never `now`. Empty until the archive cron has run and 0050 is applied, so
  // this adds nothing to the sitemap until there is something real to list.
  const newsArticles = newsSlugs.map((n) => ({
    url: `${BASE}/news/${n.slug}`,
    lastModified: new Date(n.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  // Slugs that 308 to another entry must not be listed in the sitemap:
  // duplicate concepts, plus the robots that live canonically at /robots/<slug>
  // (five robots previously had two indexable URLs each and competed with
  // themselves — see lib/canonical-map.ts).
  const REDIRECTED_ATLAS = new Set(['drone-uav', 'field-programmable-gate-array', 'ce-marking-robots']);
  const atlas = atlasEntries
    .filter((e) => !REDIRECTED_ATLAS.has(e.slug))
    .filter((e) => !(e.type === 'robot' && ATLAS_ROBOTS_REDIRECTED.has(e.slug)))
    .map((e) => ({
      url: `${BASE}/atlas/${e.type}/${e.slug}`,
      lastModified: new Date(e.lastReviewed ?? GROUP_UPDATED.academy),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }));

  const lens = lensVideos.map((v) => ({
    url: `${BASE}/lens/${v.slug}`,
    lastModified: new Date(v.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const academyLessons = getAllAcademyLessons().map((l) => ({
    url: `${BASE}/academy/${l.track}/${l.slug}`,
    lastModified: GROUP_UPDATED.academy,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Only courses and lessons that actually have a video are listed. A lesson
  // whose video has not been recorded is noindex and must not be advertised.
  const videoCourses = [
    { url: `${BASE}/courses`, lastModified: at('/courses'), changeFrequency: 'weekly' as const, priority: 0.9 },
    ...listPublishedCourses()
      .filter((c) => c.lessons.some(hasVideo))
      .flatMap((c) => [
        { url: `${BASE}/courses/${c.slug}`, lastModified: new Date(c.updated), changeFrequency: 'monthly' as const, priority: 0.8 },
        ...c.lessons.filter(hasVideo).map((l) => ({
          url: `${BASE}/courses/${c.slug}/${l.id}`,
          lastModified: new Date(c.updated),
          changeFrequency: 'monthly' as const,
          priority: 0.7,
        })),
      ]),
  ];

  const academyTracks = (['spark', 'wire', 'forge', 'edge'] as const).map((t) => ({
    url: `${BASE}/academy/${t}`,
    lastModified: GROUP_UPDATED.academy,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const buildProjects = listProjectSlugs().map((slug) => ({
    url: `${BASE}/build/${slug}`,
    lastModified: GROUP_UPDATED.builds,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  const blogPosts = blogPostsData.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.date ?? GROUP_UPDATED.academy),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Quick Lessons are the top of the funnel: one page per one-minute video,
  // in every language that actually has a translation (never advertise a
  // localised URL that falls back to English).
  const quickLessons = [
    { url: `${BASE}/shorts`, lastModified: GROUP_UPDATED.shorts, changeFrequency: 'weekly' as const, priority: 0.9 },
    // One page per mini-course: five pages each written to answer a single
    // real question, instead of one hub trying to answer all five.
    ...SHORT_COURSES.map((c) => ({
      url: `${BASE}/shorts/course/${c.slug}`,
      lastModified: GROUP_UPDATED.shorts,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
    ...liveShorts().map((t) => ({ url: `${BASE}/shorts/${t.slug}`, lastModified: GROUP_UPDATED.shorts, changeFrequency: 'monthly' as const, priority: 0.8 })),
    { url: `${BASE}/hi/shorts`, lastModified: GROUP_UPDATED.shortsTranslations, changeFrequency: 'weekly' as const, priority: 0.8 },
    ...liveShorts().filter((t) => SHORTS_HI[t.slug]).map((t) => ({ url: `${BASE}/hi/shorts/${t.slug}`, lastModified: GROUP_UPDATED.shortsTranslations, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${BASE}/es/shorts`, lastModified: GROUP_UPDATED.shortsTranslations, changeFrequency: 'weekly' as const, priority: 0.8 },
    ...liveShorts().filter((t) => SHORTS_ES[t.slug]).map((t) => ({ url: `${BASE}/es/shorts/${t.slug}`, lastModified: GROUP_UPDATED.shortsTranslations, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${BASE}/zh/shorts`, lastModified: GROUP_UPDATED.shortsTranslations, changeFrequency: 'weekly' as const, priority: 0.8 },
    ...liveShorts().filter((t) => SHORTS_ZH[t.slug]).map((t) => ({ url: `${BASE}/zh/shorts/${t.slug}`, lastModified: GROUP_UPDATED.shortsTranslations, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];

  const aiAndRegional = [
    { url: `${BASE}/ai-robotics`, lastModified: at('/ai-robotics'), changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${BASE}/ai-robotics/glossary`, lastModified: at('/ai-robotics/glossary'), changeFrequency: 'monthly' as const, priority: 0.7 },
    ...AI_TOPICS.map((t) => ({ url: `${BASE}/ai-robotics/${t.slug}`, lastModified: GROUP_UPDATED.aiRobotics, changeFrequency: 'monthly' as const, priority: 0.8 })),
    { url: `${BASE}/kids`, lastModified: at('/kids'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/kids/parents`, lastModified: at('/kids/parents'), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE}/kids/activities`, lastModified: at('/kids/activities'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/india`, lastModified: at('/india'), changeFrequency: 'monthly' as const, priority: 0.75 },
    { url: `${BASE}/teachers`, lastModified: at('/teachers'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/robots/compare`, lastModified: at('/robots/compare'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/robots/directory`, lastModified: at('/robots/directory'), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${BASE}/zh`, lastModified: at('/zh'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/zh/courses`, lastModified: at('/courses'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/zh/ai-robotics`, lastModified: at('/ai-robotics'), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE}/zh/ai-robotics/glossary`, lastModified: at('/ai-robotics/glossary'), changeFrequency: 'monthly' as const, priority: 0.6 },
    ...ZH_TOPICS.map((t) => ({ url: `${BASE}/zh/ai-robotics/${t.slug}`, lastModified: GROUP_UPDATED.aiRobotics, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${BASE}/hi`, lastModified: at('/hi'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/hi/ai-robotics`, lastModified: at('/ai-robotics'), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE}/hi/ai-robotics/glossary`, lastModified: at('/ai-robotics/glossary'), changeFrequency: 'monthly' as const, priority: 0.6 },
    ...HI_TOPICS.map((t) => ({ url: `${BASE}/hi/ai-robotics/${t.slug}`, lastModified: GROUP_UPDATED.aiRobotics, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${BASE}/es`, lastModified: at('/es'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/es/ai-robotics`, lastModified: at('/ai-robotics'), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE}/es/ai-robotics/glossary`, lastModified: at('/ai-robotics/glossary'), changeFrequency: 'monthly' as const, priority: 0.6 },
    ...ES_TOPICS.map((t) => ({ url: `${BASE}/es/ai-robotics/${t.slug}`, lastModified: GROUP_UPDATED.aiRobotics, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];

  return [
    // Core surfaces
    { url: BASE,                       lastModified: at('/'),           changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/start`,            lastModified: at('/start'),      changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/atlas`,            lastModified: at('/atlas'),      changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE}/academy`,          lastModified: at('/academy'),    changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE}/build`,            lastModified: at('/build'),      changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/robots`,           lastModified: at('/robots'),     changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/visualizer`,       lastModified: at('/visualizer'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/diagnostic`,       lastModified: at('/diagnostic'), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${BASE}/copilot`,          lastModified: at('/copilot'),    changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/careers`,          lastModified: at('/careers'),    changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/daily-life`,       lastModified: at('/daily-life'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/blog`,             lastModified: at('/blog'),       changeFrequency: 'weekly',  priority: 0.7 },
    // The news feed genuinely changes every day — the one honest use of `now`.
    { url: `${BASE}/news`,             lastModified: now,               changeFrequency: 'daily',   priority: 0.7 },
    { url: `${BASE}/lens`,             lastModified: at('/lens'),       changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE}/challenge`,        lastModified: at('/challenge'),  changeFrequency: 'daily',   priority: 0.5 },
    { url: `${BASE}/challenges`,       lastModified: at('/challenges'), changeFrequency: 'weekly',  priority: 0.5 },
    { url: `${BASE}/ros2`,             lastModified: at('/ros2'),       changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/workspace`,        lastModified: at('/workspace'),  changeFrequency: 'monthly', priority: 0.5 },

    // Who we are. A named author is worth more than any amount of schema.
    { url: `${BASE}/about`,            lastModified: at('/about'),       changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/about/how-this-is-written`, lastModified: at('/about/how-this-is-written'), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/mission`,          lastModified: at('/mission'),     changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${BASE}/pricing`,          lastModified: at('/pricing'),     changeFrequency: 'yearly',  priority: 0.4 },

    // Boilerplate
    { url: `${BASE}/privacy`,          lastModified: at('/privacy'), changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${BASE}/terms`,            lastModified: at('/terms'),   changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${BASE}/sources`,          lastModified: at('/sources'), changeFrequency: 'yearly',  priority: 0.2 },

    // Content
    ...quickLessons,
    ...videoCourses,
    ...academyTracks,
    ...academyLessons,
    ...aiAndRegional,
    ...simulators,
    ...atlas,
    ...buildProjects,
    ...blogPosts,
    ...lens,
    ...newsArticles,
    ...ROBOTS.map((r) => ({
      url: `${BASE}/robots/${r.slug}`,
      lastModified: GROUP_UPDATED.robots,
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    })),
  ];
}
