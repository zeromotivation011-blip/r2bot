// lib/compare/index.ts — the side-by-side comparisons hub.
//
// Comparison queries ("X vs Y") are decision queries: the reader has two
// options and wants to know which. The blog owns "X vs Y" per the canonical
// map; this hub collects every comparison on the site in one place so the
// format is discoverable, and holds the data for the structured comparison
// pages under /compare/<slug>.

export type CompareRow = { aspect: string; a: string; b: string; verdict?: 'a' | 'b' | 'tie' };

export type Comparison = {
  slug: string;
  title: string;
  a: string;
  b: string;
  question: string;
  summary: string;
  oneLineAnswer: string;
  rows: CompareRow[];
  chooseA: string[];
  chooseB: string[];
  related: { href: string; label: string }[];
  sources: { name: string; url: string }[];
  updated: string;
};

export const COMPARISONS: Comparison[] = [
  {
    slug: 'lidar-vs-camera-slam',
    title: 'Lidar SLAM vs camera (visual) SLAM',
    a: 'Lidar SLAM',
    b: 'Visual SLAM',
    question: 'Should my robot map the world with a laser or a camera?',
    summary:
      'Both build a map while tracking the robot inside it. Lidar measures distance directly and works in the dark; a camera is cheaper, lighter and sees texture and objects, but has to infer distance and fails in low light or on blank walls.',
    oneLineAnswer:
      'Pick lidar when you need reliable geometry (indoor navigation, warehouses, anything that must not bump into things); pick a camera when weight, cost or power rule lidar out, or when you also need to recognise what you see. Serious robots fuse both.',
    rows: [
      { aspect: 'What the sensor measures', a: 'Distance to the nearest surface along each laser beam — direct range', b: 'Brightness per pixel — depth has to be inferred from parallax, stereo or a learned model', verdict: 'a' },
      { aspect: 'Lighting', a: 'Works in total darkness; dazzled by direct sun on some units', b: 'Needs light; struggles with glare, darkness and fast exposure changes', verdict: 'a' },
      { aspect: 'Featureless spaces (long corridors, white walls)', a: 'Corridors are ambiguous for 2D lidar, but walls still give range', b: 'Few visual features to track; drift and tracking loss are common', verdict: 'a' },
      { aspect: 'Glass and mirrors', a: 'Lasers pass through or reflect off glass — classic lidar failure', b: 'Also confused by reflections, but texture behind glass can still be tracked', verdict: 'tie' },
      { aspect: 'Dynamic scenes (people walking past)', a: 'Moving blobs corrupt scan matching unless filtered', b: 'Moving objects corrupt feature tracking unless masked', verdict: 'tie' },
      { aspect: 'Semantic information (what is that?)', a: 'A point cloud has shape but no labels', b: 'Images carry colour, text, object identity — recognise a door, a charger, a person', verdict: 'b' },
      { aspect: 'Cost', a: '2D units from ~$100 (robot-vacuum class) to several thousand for 3D', b: 'A usable camera from ~$20; stereo or RGB-D from ~$150', verdict: 'b' },
      { aspect: 'Size, weight, power', a: 'Spinning 2D units ~150–300 g; 3D units heavier and power-hungry', b: 'Grams, milliwatts — fits on a drone or a toy', verdict: 'b' },
      { aspect: 'Compute', a: 'Scan matching is cheap; 2D SLAM runs on a Raspberry Pi', b: 'Feature extraction and bundle adjustment are heavier; real-time needs a decent CPU or GPU', verdict: 'a' },
      { aspect: 'Loop closure (recognising a place you have been)', a: 'Possible from geometry, but similar rooms look alike to a laser', b: 'Strong: place recognition from appearance is what cameras are good at', verdict: 'b' },
      { aspect: 'Scale', a: 'Metric by construction — the map is in metres', b: 'Monocular SLAM has no absolute scale without an IMU, stereo or depth sensor', verdict: 'a' },
      { aspect: 'Mature open-source stacks', a: 'SLAM Toolbox, Cartographer, GMapping (2D); LIO-SAM, FAST-LIO (3D)', b: 'ORB-SLAM3, RTAB-Map (RGB-D), VINS-Fusion, OpenVINS', verdict: 'tie' },
    ],
    chooseA: [
      'Indoor mobile robots that must navigate reliably: warehouses, hospitals, offices.',
      'Anything that operates at night or in windowless rooms.',
      'You want a metric 2D map you can hand to Nav2 today.',
      'Compute is small (a Pi or a Jetson Nano) and the budget allows a ~$100+ 2D lidar.',
    ],
    chooseB: [
      'Weight or power is critical: drones, small wheeled robots, wearables.',
      'You also need to recognise objects, read signs or find a specific thing.',
      'Budget is tens of dollars, not hundreds.',
      'You can add an IMU (for scale and robustness) — visual-inertial SLAM is far stronger than a bare camera.',
    ],
    related: [
      { href: '/atlas/concept/slam', label: 'SLAM explained' },
      { href: '/atlas/concept/lidar', label: 'Lidar explained' },
      { href: '/atlas/concept/visual-odometry', label: 'Visual odometry' },
      { href: '/atlas/concept/sensor-fusion', label: 'Sensor fusion' },
      { href: '/visualizer/fusion', label: 'Try it: Kalman filter sensor-fusion simulator' },
    ],
    sources: [
      { name: 'Cadena et al., "Past, Present, and Future of SLAM" (IEEE T-RO, 2016)', url: 'https://ieeexplore.ieee.org/document/7747236' },
      { name: 'SLAM Toolbox (ROS 2) — repository and docs', url: 'https://github.com/SteveMacenski/slam_toolbox' },
      { name: 'ORB-SLAM3 — Campos et al., IEEE T-RO 2021', url: 'https://ieeexplore.ieee.org/document/9440682' },
      { name: 'Wikipedia: Simultaneous localization and mapping', url: 'https://en.wikipedia.org/wiki/Simultaneous_localization_and_mapping' },
    ],
    updated: '2026-11-09',
  },
];

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}

/** Comparison-shaped blog posts, so the hub shows every "X vs Y" on the site. */
export const BLOG_COMPARISONS: { href: string; title: string }[] = [
  { href: '/blog/arduino-vs-esp32-vs-raspberry-pi-for-robots', title: 'Arduino vs ESP32 vs Raspberry Pi for robots' },
  { href: '/blog/motors-for-robots-dc-servo-stepper', title: 'DC motor vs servo vs stepper' },
  { href: '/blog/robotics-vs-automation-vs-ai', title: 'Robotics vs automation vs AI' },
  { href: '/blog/ai-vs-traditional-robot-programming', title: 'AI vs traditional robot programming' },
];
