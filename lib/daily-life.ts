// lib/daily-life.ts — Article catalogue for the "Robotics in Daily Life" surface.
//
// This file is the catalogue only (imported by the client hub). Article bodies
// are MDX files in lib/daily-life-articles/<slug>.mdx, read on the server by
// lib/daily-life-articles/loader.ts. A slug is "published" when it is listed in
// PUBLISHED_SLUGS below (and so has a file and a /daily-life/<slug> page);
// anything else renders a "Coming soon" badge and stays out of the sitemap.
// scripts/check-daily-life.mjs asserts the list and the files agree.

export type DailyLifeCategory =
  | 'manufacturing'
  | 'healthcare'
  | 'agriculture'
  | 'home'
  | 'logistics'

export const CATEGORY_LABEL: Record<DailyLifeCategory, string> = {
  manufacturing: 'Manufacturing',
  healthcare: 'Healthcare',
  agriculture: 'Agriculture',
  home: 'Home',
  logistics: 'Logistics',
}

export const CATEGORY_EMOJI: Record<DailyLifeCategory, string> = {
  manufacturing: '🏭',
  healthcare: '🏥',
  agriculture: '🌾',
  home: '🏠',
  logistics: '📦',
}

export interface DailyLifeAtlasLink {
  slug: string
  label: string
}

export interface DailyLifeArticle {
  id: string
  slug: string
  title: string
  excerpt: string
  category: DailyLifeCategory
  readTime: string
  publishedAt: string
  atlasLinks: DailyLifeAtlasLink[]
  /** Legacy inline body. Kept empty; real bodies live in lib/daily-life-articles/. */
  content: string
}

export const DAILY_LIFE_ARTICLES: DailyLifeArticle[] = [
  {
    id: 'amazon-pack',
    slug: 'the-robot-that-packs-your-amazon-order',
    title: 'The Robot That Packs Your Amazon Order',
    excerpt:
      'Every time you click "Buy Now," a fleet of more than a million machines starts moving. Most of them never touch your package, but they all matter.',
    category: 'logistics',
    readTime: '5 min read',
    publishedAt: '2026-11-11',
    atlasLinks: [
      { slug: 'autonomous-mobile-robot', label: 'Autonomous Mobile Robots' },
      { slug: 'warehouse-robot', label: 'Warehouse Robots' },
      { slug: 'suction-gripper', label: 'Suction Grippers' },
      { slug: 'force-torque-sensor', label: 'Force-Torque Sensors' },
    ],
    content: '',
  },
  {
    id: 'surgical-robots',
    slug: 'how-surgical-robots-are-changing-medicine',
    title: 'How Surgical Robots Are Changing Medicine',
    excerpt:
      'About 3.15 million operations used a da Vinci system in 2025. Here is what the robot actually does in the operating room — and what it does not.',
    category: 'healthcare',
    readTime: '5 min read',
    publishedAt: '2026-11-11',
    atlasLinks: [
      { slug: 'surgical-robot', label: 'Surgical Robots' },
      { slug: 'teleoperation', label: 'Teleoperation' },
      { slug: 'haptic-feedback', label: 'Haptic Feedback' },
      { slug: 'da-vinci-system', label: 'da Vinci System' },
    ],
    content: '',
  },
  {
    id: 'car-built-by-robot',
    slug: 'why-your-car-was-built-by-a-robot',
    title: 'Why Your Car Was Built by a Robot',
    excerpt:
      'Car plants were the first factories to fill with robots and still buy more than any other industry. The reason is less about cost than repeatability.',
    category: 'manufacturing',
    readTime: '5 min read',
    publishedAt: '2026-11-11',
    atlasLinks: [
      { slug: 'industrial-robot', label: 'Industrial Robots' },
      { slug: 'pid-controller', label: 'PID Control' },
      { slug: 'automated-guided-vehicle', label: 'Automated Guided Vehicles' },
      { slug: 'humanoid-robot', label: 'Humanoid Robots' },
    ],
    content: '',
  },
  {
    id: 'ai-farming',
    slug: 'the-ai-farming-robots-feeding-the-world',
    title: 'The AI Farming Robots Feeding the World',
    excerpt:
      'Weeding robots now tell crop from weed plant by plant and kill the weed with a laser or one targeted squirt. The vision and mechanics behind the field.',
    category: 'agriculture',
    readTime: '5 min read',
    publishedAt: '2026-11-11',
    atlasLinks: [
      { slug: 'weeding-robot', label: 'Weeding Robots' },
      { slug: 'computer-vision', label: 'Computer Vision' },
      { slug: 'image-segmentation', label: 'Image Segmentation' },
      { slug: 'precision-agriculture', label: 'Precision Agriculture' },
    ],
    content: '',
  },
  {
    id: 'dark-warehouse',
    slug: 'inside-the-warehouse-where-no-humans-work',
    // Retitled 11 Nov 2026: "Where No Humans Work" was not true of any site.
    title: 'Inside the Warehouse Where Robots Do the Picking',
    excerpt:
      'Ocado’s grid picks a 50-item grocery order in five minutes with almost no human touch. The trade-off is a building designed around robots, not people.',
    category: 'logistics',
    readTime: '5 min read',
    publishedAt: '2026-11-11',
    atlasLinks: [
      { slug: 'warehouse-robotics', label: 'Warehouse Robotics' },
      { slug: 'swarm-robotics', label: 'Swarm Robotics' },
      { slug: 'path-planning', label: 'Path Planning' },
      { slug: 'bin-picking', label: 'Bin Picking' },
    ],
    content: '',
  },
  {
    id: 'dishwasher',
    slug: 'how-your-dishwasher-uses-robotics-principles',
    title: 'How Your Dishwasher Uses Robotics Principles',
    excerpt:
      'It is not a robot, but the way a dishwasher decides how long to wash and how much water to use is the same sense-think-act loop that runs every robot.',
    category: 'home',
    readTime: '4 min read',
    publishedAt: '2026-11-11',
    atlasLinks: [
      { slug: 'sense-think-act-loop', label: 'Sense-Think-Act Loop' },
      { slug: 'feedback-loop', label: 'Feedback Loops' },
      { slug: 'sensor', label: 'Sensors' },
      { slug: 'closed-loop-control', label: 'Closed-Loop Control' },
    ],
    content: '',
  },
  {
    id: 'pizza-delivery',
    slug: 'the-robots-delivering-pizza-in-2026',
    title: 'The Robots Delivering Pizza in 2026',
    excerpt:
      'Sidewalk robots and delivery drones attack the same problem from opposite directions. How each works, where each is running, and where each one wins.',
    category: 'logistics',
    readTime: '5 min read',
    publishedAt: '2026-11-11',
    atlasLinks: [
      { slug: 'last-mile-delivery-robot', label: 'Last-Mile Delivery Robots' },
      { slug: 'delivery-robot', label: 'Delivery Robots' },
      { slug: 'drone', label: 'Drones' },
      { slug: 'levels-of-autonomy', label: 'Levels of Autonomy' },
    ],
    content: '',
  },
  {
    id: 'bd-construction',
    slug: 'how-boston-dynamics-is-changing-construction',
    title: 'How Boston Dynamics Is Changing Construction',
    excerpt:
      'Spot walks a building site on a schedule, scans the same spots every week, and lets managers compare the real building with the 3D model.',
    category: 'manufacturing',
    readTime: '5 min read',
    publishedAt: '2026-11-11',
    atlasLinks: [
      { slug: 'quadruped-robot', label: 'Quadruped Robots' },
      { slug: 'slam', label: 'SLAM' },
      { slug: 'construction-robot', label: 'Construction Robots' },
      { slug: 'digital-twin', label: 'Digital Twins' },
    ],
    content: '',
  },
  {
    id: 'robot-doctors',
    slug: 'robot-doctors-the-future-of-hospital-care',
    title: 'Robot Doctors: The Future of Hospital Care',
    excerpt:
      'Hospital robots do not diagnose anyone. They fetch medication, ride lifts, dispense pills and guide visitors — giving nurses back hours of walking.',
    category: 'healthcare',
    readTime: '5 min read',
    publishedAt: '2026-11-11',
    atlasLinks: [
      { slug: 'service-robot', label: 'Service Robots' },
      { slug: 'autonomous-mobile-robot', label: 'Autonomous Mobile Robots' },
      { slug: 'medical-robotics', label: 'Medical Robotics' },
      { slug: 'human-robot-interaction', label: 'Human-Robot Interaction' },
    ],
    content: '',
  },
  {
    id: 'autonomous-tractors',
    slug: 'how-autonomous-tractors-are-revolutionizing-farming',
    title: 'How Autonomous Tractors Are Revolutionizing Farming',
    excerpt:
      "John Deere's first autonomous tractor watched the field with six pairs of stereo cameras; the newer kit uses 16. The perception software is the hard part.",
    category: 'agriculture',
    readTime: '5 min read',
    publishedAt: '2026-11-11',
    atlasLinks: [
      { slug: 'gps-gnss', label: 'GPS / GNSS' },
      { slug: 'rtk-gps', label: 'RTK GPS' },
      { slug: 'stereo-vision', label: 'Stereo Vision' },
      { slug: 'agricultural-robot', label: 'Agricultural Robots' },
    ],
    content: '',
  },
]

/**
 * Slugs with a written, sourced body in lib/daily-life-articles/<slug>.mdx.
 * Add a slug here in the same commit as its file; the check script fails if
 * either side is missing. Kept as a plain list so the client hub can show the
 * right badge without shipping the article text.
 */
export const PUBLISHED_SLUGS: ReadonlySet<string> = new Set([
  'the-robot-that-packs-your-amazon-order',
  'how-surgical-robots-are-changing-medicine',
  'why-your-car-was-built-by-a-robot',
  'the-ai-farming-robots-feeding-the-world',
  'inside-the-warehouse-where-no-humans-work',
  'how-your-dishwasher-uses-robotics-principles',
  'the-robots-delivering-pizza-in-2026',
  'how-boston-dynamics-is-changing-construction',
  'robot-doctors-the-future-of-hospital-care',
  'how-autonomous-tractors-are-revolutionizing-farming',
])

export function isPublished(article: DailyLifeArticle): boolean {
  return PUBLISHED_SLUGS.has(article.slug) || article.content.trim().length > 0
}

/** Catalogue entries that have a real page, newest first. */
export function publishedDailyLifeArticles(): DailyLifeArticle[] {
  return DAILY_LIFE_ARTICLES.filter(isPublished)
}

export const getDailyLifeStub = (slug: string) => DAILY_LIFE_ARTICLES.find((a) => a.slug === slug)
