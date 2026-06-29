// lib/daily-life.ts — Article catalogue for the "Robotics in Daily Life" surface.
// Content stubs ship now; full article bodies are written by the editorial team.
// A stub renders a "Coming soon" badge until `content` becomes non-empty.

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
  content: string // empty until written — UI shows a "Coming soon" badge in that case
}

export const DAILY_LIFE_ARTICLES: DailyLifeArticle[] = [
  {
    id: 'amazon-pack',
    slug: 'the-robot-that-packs-your-amazon-order',
    title: 'The Robot That Packs Your Amazon Order',
    excerpt:
      'Every time you click "Buy Now," a coordinated dance of 750,000+ machines begins. Most of them never touch your package, but they all matter.',
    category: 'logistics',
    readTime: '6 min read',
    publishedAt: '2026-05-22',
    atlasLinks: [
      { slug: 'amr', label: 'AMRs' },
      { slug: 'collaborative-robot', label: 'Collaborative Robots' },
    ],
    content: '',
  },
  {
    id: 'surgical-robots',
    slug: 'how-surgical-robots-are-changing-medicine',
    title: 'How Surgical Robots Are Changing Medicine',
    excerpt:
      'The da Vinci system has done over 14 million procedures. Here is what it actually does — and what it does not do — inside an operating room.',
    category: 'healthcare',
    readTime: '5 min read',
    publishedAt: '2026-05-19',
    atlasLinks: [
      { slug: 'haptic-feedback', label: 'Haptic Feedback' },
      { slug: 'computer-vision', label: 'Computer Vision' },
    ],
    content: '',
  },
  {
    id: 'car-built-by-robot',
    slug: 'why-your-car-was-built-by-a-robot',
    title: 'Why Your Car Was Built by a Robot',
    excerpt:
      'Auto manufacturing was the first industry to industrialise robotics. The reason has nothing to do with cost — it is about repeatability.',
    category: 'manufacturing',
    readTime: '7 min read',
    publishedAt: '2026-05-15',
    atlasLinks: [
      { slug: 'industrial-robot', label: 'Industrial Robots' },
      { slug: 'pid-control', label: 'PID Control' },
    ],
    content: '',
  },
  {
    id: 'ai-farming',
    slug: 'the-ai-farming-robots-feeding-the-world',
    title: 'The AI Farming Robots Feeding the World',
    excerpt:
      'A weeding robot now distinguishes lettuce from weed with 99% accuracy. Here is the computer-vision and articulation work behind that number.',
    category: 'agriculture',
    readTime: '6 min read',
    publishedAt: '2026-05-12',
    atlasLinks: [
      { slug: 'computer-vision', label: 'Computer Vision' },
      { slug: 'autonomous-navigation', label: 'Autonomous Navigation' },
    ],
    content: '',
  },
  {
    id: 'dark-warehouse',
    slug: 'inside-the-warehouse-where-no-humans-work',
    title: 'Inside the Warehouse Where No Humans Work',
    excerpt:
      'Ocado runs a fulfilment centre in the UK with zero humans on the floor. The trade-off: completely flat, climate-controlled, single-product-per-bin.',
    category: 'logistics',
    readTime: '8 min read',
    publishedAt: '2026-05-09',
    atlasLinks: [
      { slug: 'amr', label: 'AMRs' },
      { slug: 'slam', label: 'SLAM' },
    ],
    content: '',
  },
  {
    id: 'dishwasher',
    slug: 'how-your-dishwasher-uses-robotics-principles',
    title: 'How Your Dishwasher Uses Robotics Principles',
    excerpt:
      'It is not technically a robot — but the way your dishwasher decides spray angle, water temperature, and cycle length is pure control theory.',
    category: 'home',
    readTime: '4 min read',
    publishedAt: '2026-05-06',
    atlasLinks: [
      { slug: 'feedback-loop', label: 'Feedback Loops' },
      { slug: 'sensor', label: 'Sensors' },
    ],
    content: '',
  },
  {
    id: 'pizza-delivery',
    slug: 'the-robots-delivering-pizza-in-2026',
    title: 'The Robots Delivering Pizza in 2026',
    excerpt:
      'Sidewalk delivery bots and aerial drones are converging on the same problem from opposite directions. Here is where each one actually wins.',
    category: 'logistics',
    readTime: '5 min read',
    publishedAt: '2026-05-03',
    atlasLinks: [
      { slug: 'autonomous-navigation', label: 'Autonomous Navigation' },
      { slug: 'lidar', label: 'LIDAR' },
    ],
    content: '',
  },
  {
    id: 'bd-construction',
    slug: 'how-boston-dynamics-is-changing-construction',
    title: 'How Boston Dynamics Is Changing Construction',
    excerpt:
      'Spot patrols construction sites comparing the as-built reality to the BIM model. A scan that used to take a survey team a day now takes an hour.',
    category: 'manufacturing',
    readTime: '6 min read',
    publishedAt: '2026-04-29',
    atlasLinks: [
      { slug: 'quadruped-robot', label: 'Quadruped Robots' },
      { slug: 'slam', label: 'SLAM' },
    ],
    content: '',
  },
  {
    id: 'robot-doctors',
    slug: 'robot-doctors-the-future-of-hospital-care',
    title: 'Robot Doctors: The Future of Hospital Care',
    excerpt:
      'Triage robots, pharmacy robots, robot phlebotomists. Most are not autonomous in the sci-fi sense — they are specialised tools that free up clinician time.',
    category: 'healthcare',
    readTime: '6 min read',
    publishedAt: '2026-04-26',
    atlasLinks: [
      { slug: 'collaborative-robot', label: 'Collaborative Robots' },
      { slug: 'computer-vision', label: 'Computer Vision' },
    ],
    content: '',
  },
  {
    id: 'autonomous-tractors',
    slug: 'how-autonomous-tractors-are-revolutionizing-farming',
    title: 'How Autonomous Tractors Are Revolutionizing Farming',
    excerpt:
      "John Deere's autonomous tractor uses six pairs of stereo cameras to drive itself across a field. The mechanics matter less than the perception software.",
    category: 'agriculture',
    readTime: '7 min read',
    publishedAt: '2026-04-23',
    atlasLinks: [
      { slug: 'autonomous-navigation', label: 'Autonomous Navigation' },
      { slug: 'gps', label: 'GPS' },
    ],
    content: '',
  },
]

export function isPublished(article: DailyLifeArticle): boolean {
  return article.content.trim().length > 0
}
