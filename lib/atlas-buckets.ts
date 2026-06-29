// lib/atlas-buckets.ts
// 20-bucket taxonomy for the Atlas. Each entry's `bucket` frontmatter slug
// maps here. Old entries that only have a `category` are mapped by `legacyCategories`.

import type { AtlasEntry } from './atlas';

export type AtlasBucket = {
  slug: string;
  label: string;
  emoji: string;
  description: string;
  /** Old AtlasCategory values that should count toward this bucket if no `bucket` field is set. */
  legacyCategories: string[];
};

export const ATLAS_BUCKETS: AtlasBucket[] = [
  {
    slug: 'sensors',
    label: 'Sensors',
    emoji: '👁️',
    description: 'Cameras, LIDAR, IMU, encoders — how robots perceive the world.',
    legacyCategories: ['sensors'],
  },
  {
    slug: 'actuators',
    label: 'Actuators',
    emoji: '💪',
    description: 'Motors, grippers, hydraulics — what makes a robot move.',
    legacyCategories: ['actuators'],
  },
  {
    slug: 'control-systems',
    label: 'Control Systems',
    emoji: '🎛️',
    description: 'PID, MPC, Kalman filters — the maths of stable motion.',
    legacyCategories: ['control'],
  },
  {
    slug: 'programming-software',
    label: 'Programming & Software',
    emoji: '💻',
    description: 'ROS2, Python, C++, behaviour trees — software stack.',
    legacyCategories: [],
  },
  {
    slug: 'mechanical-design',
    label: 'Mechanical Design',
    emoji: '⚙️',
    description: 'Kinematics, joints, gears, frames — the body of a robot.',
    legacyCategories: ['fundamentals'],
  },
  {
    slug: 'ai-machine-learning',
    label: 'AI & Machine Learning',
    emoji: '🧠',
    description: 'Neural nets, RL, foundation models — the brain layer.',
    legacyCategories: ['ai-and-perception'],
  },
  {
    slug: 'computer-vision',
    label: 'Computer Vision',
    emoji: '🔍',
    description: 'Detection, SLAM features, segmentation, depth — robot sight.',
    legacyCategories: [],
  },
  {
    slug: 'navigation-localization',
    label: 'Navigation & Localisation',
    emoji: '🧭',
    description: 'SLAM, A*, RRT, costmaps — how robots find their way.',
    legacyCategories: [],
  },
  {
    slug: 'power-electronics',
    label: 'Power & Electronics',
    emoji: '⚡',
    description: 'Batteries, drivers, microcontrollers, voltage rails.',
    legacyCategories: ['hardware'],
  },
  {
    slug: 'robot-types',
    label: 'Robot Types & Applications',
    emoji: '🤖',
    description: 'Humanoid, drone, surgical, agri, defence — the full catalogue.',
    legacyCategories: ['robot-types', 'applications'],
  },
  {
    slug: 'ros2-ecosystem',
    label: 'ROS2 Ecosystem',
    emoji: '🌐',
    description: 'Distros, packages, DDS, Nav2, MoveIt2 — the ROS2 universe.',
    legacyCategories: [],
  },
  {
    slug: 'safety-standards',
    label: 'Safety & Standards',
    emoji: '🛡️',
    description: 'ISO 10218, functional safety, cobot rules, CE marking.',
    legacyCategories: [],
  },
  {
    slug: 'materials-manufacturing',
    label: 'Materials & Manufacturing',
    emoji: '🏭',
    description: 'Alloys, composites, 3D printing, CNC — building robots.',
    legacyCategories: [],
  },
  {
    slug: 'human-robot-interaction',
    label: 'Human-Robot Interaction',
    emoji: '🤝',
    description: 'Speech, haptics, social robots, trust, ethics.',
    legacyCategories: [],
  },
  {
    slug: 'india-emerging-markets',
    label: 'India & Emerging Markets',
    emoji: '🇮🇳',
    description: 'ISRO, DRDO, IITs, GreyOrange, NRM — robotics in India.',
    legacyCategories: [],
  },
  {
    slug: 'space-robotics',
    label: 'Space Robotics',
    emoji: '🛰️',
    description: 'Mars rovers, on-orbit servicing, Vyommitra, lunar landers.',
    legacyCategories: [],
  },
  {
    slug: 'medical-robotics',
    label: 'Medical Robotics',
    emoji: '🏥',
    description: 'Surgical robots, prosthetics, rehab, capsule endoscopes.',
    legacyCategories: [],
  },
  {
    slug: 'agricultural-robotics',
    label: 'Agricultural Robotics',
    emoji: '🌾',
    description: 'Harvesting, weeding, drones, dairy automation.',
    legacyCategories: [],
  },
  {
    slug: 'history-concepts',
    label: 'History & Foundational Concepts',
    emoji: '📚',
    description: 'Three Laws, Unimate, SHAKEY, DARPA challenges, R.U.R.',
    legacyCategories: [],
  },
  {
    slug: 'business-industry',
    label: 'Business & Industry',
    emoji: '💼',
    description: 'ROI, RaaS, market sizing, investment — robotics economics.',
    legacyCategories: [],
  },
];

export const ATLAS_BUCKET_BY_SLUG = new Map(ATLAS_BUCKETS.map((b) => [b.slug, b]));

export function resolveBucket(entry: Pick<AtlasEntry, 'bucket' | 'category'>): string | null {
  if (entry.bucket && ATLAS_BUCKET_BY_SLUG.has(entry.bucket)) return entry.bucket;
  if (!entry.category) return null;
  for (const b of ATLAS_BUCKETS) {
    if (b.legacyCategories.includes(entry.category)) return b.slug;
  }
  return null;
}

export function countByBucket(entries: AtlasEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const b of ATLAS_BUCKETS) counts.set(b.slug, 0);
  counts.set('__unbucketed__', 0);
  for (const e of entries) {
    const b = resolveBucket(e);
    const key = b ?? '__unbucketed__';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
