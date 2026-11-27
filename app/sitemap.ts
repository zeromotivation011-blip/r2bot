import type { MetadataRoute } from 'next';
import { REDIRECTED_ATLAS_CONCEPTS } from '@/lib/atlas-redirects';
import { getAllAtlasEntriesMerged } from '@/lib/atlas-db';
import { getAllLensMerged } from '@/lib/lens-cms';
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
import { GROUP_UPDATED, PAGE_UPDATED, pageUpdated as at } from '@/lib/content-dates';
import { ATLAS_ROBOTS_REDIRECTED } from '@/lib/canonical-map';
import { getAllDailyLifeArticles } from '@/lib/daily-life-articles/loader';
import { listTranslations, atlasPath } from '@/lib/atlas-i18n';
import { ROS2_FIXES } from '@/lib/ros2-fixes';
import { EPISODES as KIDS_EPISODES } from '@/lib/kids/stories';
import { GAMES as KIDS_GAMES, WORLDS as KIDS_WORLDS } from '@/lib/kids/universe/worlds';
import { TRACKS as KIDS_TRACKS } from '@/lib/kids/activities/types';
import { LEVEL1_SESSIONS } from '@/lib/kids/curriculum/level1';
import { LEVEL2_SESSIONS } from '@/lib/kids/curriculum/level2';
import { guideParamsL34 } from '@/lib/kids/curriculum/level3/teacher-guide';
import { MAKERS as KIDS_MAKERS } from '@/lib/kids/makers/makers';
import { MATHS_CONCEPTS as KIDS_MATHS } from '@/lib/kids/maths/concepts';
import { THEATRE_EPISODES as KIDS_THEATRE } from '@/lib/kids/episodes/theatre';
import { HOME_BUILDS as KIDS_HOME_BUILDS } from '@/lib/kids/builds/builds';
import { allUnpluggedLessons } from '@/lib/kids/unplugged';

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
  const [atlasEntries, blogPostsData, lensVideos] = await Promise.all([
    getAllAtlasEntriesMerged(),
    getAllPostsMerged(),
    getAllLensMerged(),
  ]);

  // Per-story news pages (/news/<slug>) are NOT listed. 9 Nov 2026: the per-story pages are machine summaries of other outlets'
  // reporting — 835 of them, 47% of the sitemap, with duplicates and
  // off-topic items. That is the footprint Google's scaled-content policy
  // targets, and it starved the 500 Atlas pages of crawl budget. The story
  // pages still exist for readers (noindex, follow) but are not offered to
  // search engines; /news itself is. Re-enable per story only when a story
  // carries original analysis.
  const newsArticles: MetadataRoute.Sitemap = [];

  // Slugs that 308 to another entry must not be listed in the sitemap:
  // duplicate concepts, plus the robots that live canonically at /robots/<slug>
  // (five robots previously had two indexable URLs each and competed with
  // themselves — see lib/canonical-map.ts).
  const REDIRECTED_ATLAS = REDIRECTED_ATLAS_CONCEPTS; // lib/atlas-redirects.ts
  const atlas = atlasEntries
    .filter((e) => !REDIRECTED_ATLAS.has(e.slug))
    .filter((e) => !(e.type === 'robot' && ATLAS_ROBOTS_REDIRECTED.has(e.slug)))
    .map((e) => ({
      url: `${BASE}/atlas/${e.type}/${e.slug}`,
      lastModified: new Date(e.lastReviewed ?? GROUP_UPDATED.academy),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }));

  // Reviewed Atlas translations only (lib/atlas-i18n.ts). lastmod is the date
  // of the review pass, the last time that page's content really changed.
  const atlasTranslations = listTranslations().map((t) => ({
    url: `${BASE}${atlasPath(t.type, t.slug, t.lang)}`,
    lastModified: new Date(t.reviewed),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
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
    lastModified: new Date(p.updated ?? p.date ?? GROUP_UPDATED.academy),
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
    { url: `${BASE}/glossary`, lastModified: at('/glossary'), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE}/learn/ros2-cheatsheet`, lastModified: at('/learn/ros2-cheatsheet'), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${BASE}/compare`, lastModified: at('/compare'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/compare/lidar-vs-camera-slam`, lastModified: at('/compare/lidar-vs-camera-slam'), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${BASE}/compare/arduino-vs-esp32-vs-raspberry-pi`, lastModified: at('/compare/arduino-vs-esp32-vs-raspberry-pi'), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${BASE}/compare/spot-vs-unitree-go2-vs-anymal`, lastModified: at('/compare/spot-vs-unitree-go2-vs-anymal'), changeFrequency: 'monthly' as const, priority: 0.8 },
    // ROS 2 error fixes: dated by each fix's own `updated` (lib/ros2-fixes.ts).
    { url: `${BASE}/ros2/fix`, lastModified: at('/ros2/fix'), changeFrequency: 'monthly' as const, priority: 0.7 },
    ...ROS2_FIXES.map((f) => ({ url: `${BASE}/ros2/fix/${f.slug}`, lastModified: new Date(`${f.updated}T00:00:00.000Z`), changeFrequency: 'monthly' as const, priority: 0.8 })),
    // Long-form "Robotics in Daily Life" articles: only slugs with a written,
    // sourced body on disk; unwritten stubs have no page and are not listed.
    ...getAllDailyLifeArticles().map((a) => ({ url: `${BASE}/daily-life/${a.slug}`, lastModified: new Date(`${a.updatedAt}T00:00:00.000Z`), changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...AI_TOPICS.map((t) => ({ url: `${BASE}/ai-robotics/${t.slug}`, lastModified: GROUP_UPDATED.aiRobotics, changeFrequency: 'monthly' as const, priority: 0.8 })),
    { url: `${BASE}/kids`, lastModified: at('/kids'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/kids/parents`, lastModified: at('/kids/parents'), changeFrequency: 'monthly' as const, priority: 0.6 },
    // Make It at Home (formerly /kids/activities, 308 in next.config.mjs): the hub and one page per build (lib/kids/builds/builds.ts).
    { url: `${BASE}/kids/printables`, lastModified: at('/kids/printables'), changeFrequency: 'monthly' as const, priority: 0.7 },
    ...KIDS_HOME_BUILDS.map((b) => ({ url: `${BASE}/kids/printables/${b.id}`, lastModified: at('/kids/printables'), changeFrequency: 'monthly' as const, priority: 0.6 })),
    { url: `${BASE}/kids/course`, lastModified: at('/kids/course'), changeFrequency: 'monthly' as const, priority: 0.8 },
    // Every course level is written in full and indexable (app/kids/course/[level]/page.tsx PLAYABLE).
    ...[1, 2, 3, 4].map((n) => ({ url: `${BASE}/kids/course/${n}`, lastModified: at(`/kids/course/${n}`), changeFrequency: 'monthly' as const, priority: 0.8 })),
    { url: `${BASE}/kids/robodex`, lastModified: at('/kids/robodex'), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE}/kids/careers`, lastModified: at('/kids/careers'), changeFrequency: 'monthly' as const, priority: 0.6 },
    ...KIDS_MAKERS.map((m) => ({ url: `${BASE}/kids/careers/${m.id}`, lastModified: GROUP_UPDATED.kidsMakers, changeFrequency: 'monthly' as const, priority: 0.5 })),
    // Robot Maths (roadmap #86): the hub and one page per concept.
    { url: `${BASE}/kids/maths`, lastModified: at('/kids/maths'), changeFrequency: 'monthly' as const, priority: 0.6 },
    ...KIDS_MATHS.map((c) => ({ url: `${BASE}/kids/maths/${c.id}`, lastModified: GROUP_UPDATED.kidsMaths, changeFrequency: 'monthly' as const, priority: 0.5 })),
    { url: `${BASE}/kids/lab/power`, lastModified: at('/kids/lab/power'), changeFrequency: 'monthly' as const, priority: 0.6 },
    // Link Lab + Robot Security Check (roadmap #88).
    { url: `${BASE}/kids/lab/network`, lastModified: at('/kids/lab/network'), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE}/kids/lab/network/guardian`, lastModified: at('/kids/lab/network/guardian'), changeFrequency: 'monthly' as const, priority: 0.6 },
    // The one grown-up front door (roadmap #20).
    { url: `${BASE}/kids/grown-ups`, lastModified: at('/kids/grown-ups'), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE}/kids/hangar`, lastModified: at('/kids/hangar'), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE}/kids/play`, lastModified: at('/kids/play'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/kids/galaxy`, lastModified: at('/kids/galaxy'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/kids/galaxy/concepts`, lastModified: at('/kids/galaxy/concepts'), changeFrequency: 'monthly' as const, priority: 0.6 },
    // Skill Galaxy tracks (the 400+ activity pages themselves are noindex: playable, not reference).
    ...KIDS_TRACKS.map((t) => ({ url: `${BASE}/kids/galaxy/${t.id}`, lastModified: at('/kids/galaxy'), changeFrequency: 'monthly' as const, priority: 0.6 })),
    // Universe games: every game has a built, indexable page.
    // (world flagship games carry their own date in lib/content-dates.ts; the rest fall back to /kids/play's).
    ...KIDS_GAMES.map((g) => ({ url: `${BASE}/kids/play/${g.id}`, lastModified: PAGE_UPDATED[`/kids/play/${g.id}`] ? at(`/kids/play/${g.id}`) : at('/kids/play'), changeFrequency: 'monthly' as const, priority: 0.7 })),
    // Universe worlds: the index and one indexable page per world (lib/kids/universe/worlds.ts WORLDS).
    { url: `${BASE}/kids/worlds`, lastModified: at('/kids/worlds'), changeFrequency: 'monthly' as const, priority: 0.7 },
    ...KIDS_WORLDS.map((w) => ({ url: `${BASE}/kids/worlds/${w.id}`, lastModified: at(`/kids/worlds/${w.id}`), changeFrequency: 'monthly' as const, priority: 0.7 })),
    // Spark Trail: the old Robot World (/kids/world 308s here, next.config.mjs).
    { url: `${BASE}/kids/spark-trail`, lastModified: at('/kids/spark-trail'), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE}/kids/ai`, lastModified: at('/kids/ai'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/kids/schools`, lastModified: at('/kids/schools'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/kids/stories`, lastModified: at('/kids/stories'), changeFrequency: 'monthly' as const, priority: 0.7 },
    ...KIDS_EPISODES.map((e) => ({ url: `${BASE}/kids/stories/${e.slug}`, lastModified: new Date(e.updated), changeFrequency: 'monthly' as const, priority: 0.6 })),
    // Episodes Theatre (roadmap #8): one page per voiced 3D course episode.
    ...KIDS_THEATRE.map((e) => ({ url: `${BASE}${e.href}`, lastModified: GROUP_UPDATED.kidsTheatre, changeFrequency: 'monthly' as const, priority: 0.5 })),
    { url: `${BASE}/kids/workshop`, lastModified: at('/kids/workshop'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/kids/code-lab`, lastModified: at('/kids/code-lab'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/kids/teach`, lastModified: at('/kids/teach'), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/kids/teach/training`, lastModified: at('/kids/teach/training'), changeFrequency: 'monthly' as const, priority: 0.5 },
    ...LEVEL1_SESSIONS.map((s) => ({ url: `${BASE}/kids/teach/1/${s.number}`, lastModified: at('/kids/teach'), changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...LEVEL2_SESSIONS.map((s) => ({ url: `${BASE}/kids/teach/2/${s.number}`, lastModified: GROUP_UPDATED.kidsTeachL2, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...guideParamsL34().map((g) => ({ url: `${BASE}/kids/teach/${g.level}/${g.session}`, lastModified: GROUP_UPDATED.kidsTeachL34, changeFrequency: 'monthly' as const, priority: 0.6 })),
    // Wave 2 batch C: standards map, Trust Pack, clubs / family / library, and the unplugged lessons.
    ...['standards', 'trust', 'clubs', 'family', 'library', 'unplugged'].map((p) => ({ url: `${BASE}/kids/teach/${p}`, lastModified: at(`/kids/teach/${p}`), changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...allUnpluggedLessons().map((l) => ({ url: `${BASE}/kids/teach/unplugged/${l.number}`, lastModified: at('/kids/teach/unplugged'), changeFrequency: 'monthly' as const, priority: 0.5 })),
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
    { url: `${BASE}/tools/motor-torque-calculator`, lastModified: at('/tools/motor-torque-calculator'), changeFrequency: 'monthly', priority: 0.8 },
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
    ...atlasTranslations,
    ...buildProjects,
    ...blogPosts,
    ...lens,
    ...newsArticles,
    ...ROBOTS.map((r) => ({
      url: `${BASE}/robots/${r.slug}`,
      // Each profile's own verification date, so adding a robot does not re-date the other 61.
      lastModified: r.lastVerified ? new Date(`${r.lastVerified}T00:00:00.000Z`) : GROUP_UPDATED.robots,
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    })),
  ];
}
