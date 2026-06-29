// app/copilot/copilot-links.ts
// Post-process maps: atlas deep-link terms + related-lesson topic suggestions.

export type AtlasLink = { term: string; href: string };

export const ATLAS_LINK_TERMS: AtlasLink[] = [
  { term: 'SLAM', href: '/atlas/concept/slam' },
  { term: 'PID', href: '/atlas/concept/pid-controller' },
  { term: 'PID controller', href: '/atlas/concept/pid-controller' },
  { term: 'ROS2', href: '/atlas/concept/ros2' },
  { term: 'LIDAR', href: '/atlas/concept/lidar' },
  { term: 'IMU', href: '/atlas/concept/imu' },
  { term: 'Kalman filter', href: '/atlas/concept/kalman-filter' },
  { term: 'Extended Kalman Filter', href: '/atlas/concept/extended-kalman-filter' },
  { term: 'particle filter', href: '/atlas/concept/particle-filter' },
  { term: 'visual SLAM', href: '/atlas/concept/visual-slam' },
  { term: 'LIDAR SLAM', href: '/atlas/concept/lidar-slam' },
  { term: 'AMCL', href: '/atlas/concept/amcl' },
  { term: 'Nav2', href: '/atlas/concept/nav2-stack' },
  { term: 'MoveIt2', href: '/atlas/concept/moveit2-stack' },
  { term: 'URDF', href: '/atlas/concept/ros2-urdf' },
  { term: 'tf2', href: '/atlas/concept/ros2-tf' },
  { term: 'rosbag', href: '/atlas/concept/rosbag2' },
  { term: 'rosbag2', href: '/atlas/concept/rosbag2' },
  { term: 'RViz2', href: '/atlas/concept/rviz2' },
  { term: 'Docker', href: '/atlas/concept/docker-robotics' },
  { term: 'CNN', href: '/atlas/concept/convolutional-neural-network' },
  { term: 'transformer', href: '/atlas/concept/transformer-architecture' },
  { term: 'reinforcement learning', href: '/atlas/concept/reinforcement-learning' },
  { term: 'imitation learning', href: '/atlas/concept/imitation-learning' },
  { term: 'sim-to-real', href: '/atlas/concept/sim-to-real-transfer' },
  { term: 'foundation model', href: '/atlas/concept/foundation-model-robotics' },
  { term: 'LLM', href: '/atlas/concept/large-language-model-robotics' },
  { term: 'object detection', href: '/atlas/concept/object-detection' },
  { term: 'image segmentation', href: '/atlas/concept/image-segmentation' },
  { term: 'pose estimation', href: '/atlas/concept/pose-estimation' },
  { term: 'visual odometry', href: '/atlas/concept/visual-odometry' },
  { term: 'kinematics', href: '/atlas/concept/kinematics' },
  { term: 'forward kinematics', href: '/atlas/concept/forward-kinematics' },
  { term: 'inverse kinematics', href: '/atlas/concept/inverse-kinematics' },
  { term: 'A*', href: '/atlas/concept/a-star-algorithm' },
  { term: 'A-star', href: '/atlas/concept/a-star-algorithm' },
  { term: 'RRT', href: '/atlas/concept/rrt' },
  { term: 'cobot', href: '/atlas/concept/cobot' },
  { term: 'humanoid robot', href: '/atlas/concept/humanoid-robot' },
  { term: 'quadruped', href: '/atlas/concept/quadruped-robot' },
  { term: 'drone', href: '/atlas/concept/drone' },
  { term: 'ISRO', href: '/atlas/concept/isro-robotics' },
  { term: 'DRDO', href: '/atlas/concept/drdo-robots' },
  { term: 'GreyOrange', href: '/atlas/concept/greyorange' },
  { term: 'Pragyan', href: '/atlas/concept/isro-chandrayaan-robot' },
  { term: 'Vyommitra', href: '/atlas/concept/isro-robotics' },
  { term: 'BLDC', href: '/atlas/concept/brushless-motor' },
  { term: 'FOC', href: '/atlas/concept/field-oriented-control' },
  { term: 'Jetson Nano', href: '/atlas/concept/jetson-nano' },
  { term: 'Jetson Orin', href: '/atlas/concept/jetson-orin' },
  { term: 'Arduino', href: '/atlas/concept/arduino-control' },
];

export type RelatedLink = { keywords: string[]; label: string; href: string };

// Keyword → academy lesson or atlas mapping for the "Related Lessons" card.
export const RELATED_LESSONS: RelatedLink[] = [
  { keywords: ['slam', 'mapping', 'localization', 'localisation'], label: 'SLAM in Academy', href: '/academy/wire/slam-fundamentals' },
  { keywords: ['pid', 'controller', 'tuning'], label: 'PID Tuning Lab', href: '/visualizer#pid' },
  { keywords: ['ros2', 'ros 2', 'ros'], label: 'ROS2 Playground', href: '/ros2' },
  { keywords: ['kinematics', 'inverse', 'forward'], label: 'IK Solver Simulator', href: '/visualizer#ik' },
  { keywords: ['arduino', 'first robot', 'line follower'], label: 'Line Follower Tutorial', href: '/academy/spark?project=line-follower' },
  { keywords: ['obstacle', 'avoidance', 'ultrasonic'], label: 'Obstacle Avoidance Project', href: '/academy/spark?project=obstacle-avoidance' },
  { keywords: ['career', 'job', 'salary', 'hiring'], label: 'India Robotics Jobs Board', href: '/jobs' },
  { keywords: ['drone', 'uav', 'quadcopter'], label: 'Drone Pulse Coverage', href: '/pulse?tag=drones' },
  { keywords: ['humanoid', 'optimus', 'atlas', 'figure'], label: 'Humanoid Robotics Pulse', href: '/pulse?tag=humanoid' },
  { keywords: ['mars', 'isro', 'space', 'chandrayaan', 'vyommitra'], label: 'Space Robotics Atlas', href: '/atlas/concept/space-robotics' },
  { keywords: ['neural network', 'cnn', 'deep learning'], label: 'Neural Networks for Robotics', href: '/atlas/concept/neural-networks-robotics' },
  { keywords: ['transformer', 'llm', 'gpt', 'claude'], label: 'LLMs in Robotics', href: '/atlas/concept/large-language-model-robotics' },
  { keywords: ['kalman', 'filter', 'state estimation'], label: 'Kalman Filter Atlas', href: '/atlas/concept/kalman-filter' },
  { keywords: ['nav2', 'amcl', 'costmap', 'navigation stack'], label: 'Nav2 Atlas Entry', href: '/atlas/concept/nav2-stack' },
  { keywords: ['moveit', 'arm', 'manipulation'], label: 'MoveIt2 Atlas Entry', href: '/atlas/concept/moveit2-stack' },
  { keywords: ['greyorange', 'warehouse', 'amr', 'flipkart'], label: 'AMR Atlas Entry', href: '/atlas/concept/autonomous-mobile-robot' },
  { keywords: ['ethics', 'asimov', 'three laws'], label: 'Asimov\'s Three Laws', href: '/atlas/concept/three-laws-robotics' },
  { keywords: ['kids', '8 years', '10 years', '12 years', 'class 6', 'class 7', 'class 8', 'class 9'], label: 'R2BOT for Kids', href: '/kids' },
  { keywords: ['daily life', 'every day', 'atm', 'roomba', 'invisible robots'], label: 'Robots in Daily Life', href: '/daily-life' },
  { keywords: ['history', 'unimate', 'first robot', '1961'], label: 'History of Robotics', href: '/history' },
  { keywords: ['world map', 'density', 'south korea', 'india gap', 'how many robots'], label: 'World Robotics Map', href: '/atlas' },
  { keywords: ['famous robot', 'asimo', 'spot', 'da vinci', 'optimus tesla'], label: 'Famous Robots Encyclopedia', href: '/robots' },
];

/**
 * Auto-link known atlas terms in markdown body text.
 * Lower-cases for matching; preserves the original-cased term in the output.
 * Skips any term inside an existing markdown link, inside code fences, or inline code.
 */
export function autoLinkAtlasTerms(md: string): string {
  // Split into segments — out-of-code (process) and code (preserve as-is).
  const parts: { text: string; isCode: boolean }[] = [];
  const regex = /```[\s\S]*?```|`[^`]*`/g;
  let lastIdx = 0;
  for (const m of md.matchAll(regex)) {
    const start = m.index ?? 0;
    if (start > lastIdx) parts.push({ text: md.slice(lastIdx, start), isCode: false });
    parts.push({ text: m[0], isCode: true });
    lastIdx = start + m[0].length;
  }
  if (lastIdx < md.length) parts.push({ text: md.slice(lastIdx), isCode: false });

  // Sort terms longest-first to avoid sub-matching.
  const sorted = [...ATLAS_LINK_TERMS].sort((a, b) => b.term.length - a.term.length);
  // Track terms already linked (only link first occurrence to keep prose clean).
  const linked = new Set<string>();

  for (const part of parts) {
    if (part.isCode) continue;
    for (const t of sorted) {
      const key = t.term.toLowerCase();
      if (linked.has(key)) continue;
      const pattern = new RegExp(
        `(^|[^\\w/\\-\\[])(${t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([^\\w/\\-\\]]|$)`,
        'i',
      );
      const found = part.text.match(pattern);
      if (!found) continue;
      // Skip if already inside a markdown link.
      const fullIdx = part.text.indexOf(found[0]);
      const pre = part.text.slice(0, fullIdx);
      const openBrackets = (pre.match(/\[/g) ?? []).length;
      const closeBrackets = (pre.match(/\]/g) ?? []).length;
      if (openBrackets > closeBrackets) continue;
      part.text = part.text.replace(pattern, `$1[$2](${t.href})$3`);
      linked.add(key);
    }
  }

  return parts.map((p) => p.text).join('');
}

export function findRelatedLesson(text: string): RelatedLink | null {
  const lower = text.toLowerCase();
  for (const r of RELATED_LESSONS) {
    if (r.keywords.some((k) => lower.includes(k))) return r;
  }
  return null;
}
