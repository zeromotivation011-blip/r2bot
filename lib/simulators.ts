// lib/simulators.ts
//
// The single registry for every interactive simulator.
//
// WHY THIS EXISTS: all ten simulators used to live as hash anchors on one
// /visualizer page. That meant Google saw a single URL for ten distinct tools,
// and sharing a link gave you "/visualizer#pid" — which most platforms treat as
// the same page and which cannot rank for its own query.
//
// Each simulator now gets a real route, its own metadata, its own OG image and
// its own sitemap entry. The keywords below deliberately target "tool" intent
// ("interactive pid simulator") rather than "explainer" intent ("what is pid"),
// because tool queries are far less contested — we are not fighting Wikipedia
// for them — and they are what people actually link to.

export type SimulatorId =
  | 'pid'
  | 'astar'
  | 'slam'
  | 'ik'
  | 'fusion'
  | 'motor'
  | 'playground'
  | 'robots'
  | 'sense-think-act'
  | 'robot-types'

export type Simulator = {
  /** URL slug — also the anchor id on the /visualizer index page. */
  id: SimulatorId
  /** Short label used in cards and nav. */
  title: string
  /** The <h1> and OG title. Written for the query we want to win. */
  heading: string
  /** One line under the heading. */
  blurb: string
  /** <meta description> — under 160 chars, written to earn the click. */
  description: string
  /** Primary query this page targets, plus close variants. */
  keywords: string[]
  /** Shown on the page as a plain-language "what you can do here". */
  whatYouCanDo: string[]
  /** Academy lesson to deepen into, if one exists. */
  lesson?: { href: string; title: string }
  /** Related Atlas concepts — internal linking for both users and crawlers. */
  related: { href: string; label: string }[]
  /** Accent used by the OG image. */
  accent: string
  featured?: boolean
}

export const SIMULATORS: Simulator[] = [
  {
    id: 'pid',
    title: 'PID Tuner',
    heading: 'Interactive PID Controller Simulator',
    blurb: 'Drag P, I and D and watch the system settle, overshoot or oscillate in real time.',
    description:
      'A free interactive PID tuner. Adjust proportional, integral and derivative gains and watch the response curve change instantly. No install, no signup.',
    keywords: [
      'interactive pid simulator',
      'pid tuner online',
      'pid controller visualizer',
      'pid tuning simulator free',
    ],
    whatYouCanDo: [
      'Drag each gain and see overshoot, settling time and steady-state error change live',
      'Watch what happens when D is too high and the system starts chattering',
      'Find the difference between a fast-but-unstable and a slow-but-safe tune',
    ],
    lesson: { href: '/academy/wire/w-03-pid-control-practice', title: 'W-03: PID Control in Practice' },
    related: [
      { href: '/atlas/concept/pid-controller', label: 'PID Controller' },
      { href: '/atlas/concept/closed-loop-control', label: 'Closed-Loop Control' },
      { href: '/atlas/concept/feedback-loop', label: 'Feedback Loop' },
    ],
    accent: '#00E5FF',
    featured: true,
  },
  {
    id: 'astar',
    title: 'A* Pathfinder',
    heading: 'A* Pathfinding Algorithm Visualizer',
    blurb: 'Draw walls, drop a start and goal, and watch A* search the grid step by step.',
    description:
      'A free interactive A* pathfinding visualizer. Draw a maze and watch the algorithm expand nodes and find the shortest path, one step at a time.',
    keywords: [
      'a star pathfinding visualizer',
      'a* algorithm simulator',
      'pathfinding visualizer online',
      'a star visualization robotics',
    ],
    whatYouCanDo: [
      'Draw your own obstacles and re-run the search instantly',
      'Watch the open and closed sets grow so the heuristic stops being abstract',
      'See why A* explores far fewer nodes than a naive breadth-first search',
    ],
    lesson: { href: '/academy/forge/f-01-ros2-nav2', title: 'F-01: ROS2 Navigation Stack' },
    related: [
      { href: '/atlas/concept/a-star-algorithm', label: 'A* Algorithm' },
      { href: '/atlas/concept/path-planning', label: 'Path Planning' },
      { href: '/atlas/concept/kinematics', label: 'Kinematics' },
    ],
    accent: '#A56BFF',
  },
  {
    id: 'slam',
    title: 'SLAM Simulator',
    heading: 'Interactive SLAM Simulator',
    blurb: 'Drive a robot through an unknown world and watch it build a map while locating itself.',
    description:
      'A free interactive SLAM simulator. Drive a robot through unknown space and watch simultaneous localisation and mapping build the map in real time.',
    keywords: [
      'slam simulator online',
      'interactive slam visualization',
      'simultaneous localization and mapping demo',
      'slam robotics simulator free',
    ],
    whatYouCanDo: [
      'Drive the robot and watch the occupancy grid fill in from sensor hits',
      'See drift accumulate, then watch a loop closure snap the map back into place',
      'Understand why mapping and localising at the same time is a chicken-and-egg problem',
    ],
    lesson: { href: '/academy/forge/f-01-ros2-nav2', title: 'F-01: ROS2 Navigation Stack' },
    related: [
      { href: '/atlas/concept/slam', label: 'SLAM' },
      { href: '/atlas/concept/occupancy-grid', label: 'Occupancy Grid' },
      { href: '/atlas/concept/loop-closure', label: 'Loop Closure' },
    ],
    accent: '#22C55E',
    featured: true,
  },
  {
    id: 'ik',
    title: 'IK Solver',
    heading: 'Inverse Kinematics Solver — Interactive Robot Arm',
    blurb: 'Drag the gripper anywhere and watch the joint angles solve themselves.',
    description:
      'A free interactive inverse kinematics demo. Drag a robot arm gripper to any point and watch the joint angles solve in real time. No install needed.',
    keywords: [
      'inverse kinematics simulator',
      'robot arm ik visualizer',
      'interactive inverse kinematics demo',
      'ik solver online',
    ],
    whatYouCanDo: [
      'Drag the end effector and watch every joint angle recompute instantly',
      'Push the gripper outside the arm’s reach and see the solver fail — and why',
      'Feel the difference between forward and inverse kinematics in a few seconds',
    ],
    lesson: { href: '/academy/forge/f-02-moveit2-manipulation', title: 'F-02: Robot Manipulation' },
    related: [
      { href: '/atlas/concept/inverse-kinematics', label: 'Inverse Kinematics' },
      { href: '/atlas/concept/forward-kinematics', label: 'Forward Kinematics' },
      { href: '/atlas/concept/degrees-of-freedom', label: 'Degrees of Freedom' },
    ],
    accent: '#FFB020',
  },
  {
    id: 'fusion',
    title: 'Sensor Fusion',
    heading: 'Sensor Fusion Simulator — GPS + IMU',
    blurb: 'Two noisy sensors, one clean estimate. Watch a filter combine them live.',
    description:
      'A free interactive sensor fusion demo. Watch noisy GPS and drifting IMU data combine into a single smooth position estimate, in real time.',
    keywords: [
      'sensor fusion simulator',
      'kalman filter visualizer',
      'gps imu fusion demo',
      'interactive sensor fusion robotics',
    ],
    whatYouCanDo: [
      'Crank up the GPS noise and watch the fused estimate stay stable',
      'Let the IMU drift alone and see how fast dead reckoning falls apart',
      'See why neither sensor alone is good enough for a real robot',
    ],
    lesson: { href: '/academy/wire/w-02-sensor-integration', title: 'W-02: Sensor Integration' },
    related: [
      { href: '/atlas/concept/sensor-fusion', label: 'Sensor Fusion' },
      { href: '/atlas/concept/kalman-filter', label: 'Kalman Filter' },
      { href: '/atlas/concept/imu', label: 'IMU' },
    ],
    accent: '#00B8D4',
  },
  {
    id: 'motor',
    title: 'Motor Controller',
    heading: 'PWM Motor Control Simulator',
    blurb: 'Change the duty cycle and watch torque, speed and current respond.',
    description:
      'A free interactive PWM motor control simulator. Adjust the duty cycle and watch how a DC motor’s speed and torque respond in real time.',
    keywords: [
      'pwm simulator online',
      'motor control simulator',
      'dc motor pwm demo',
      'interactive motor controller robotics',
    ],
    whatYouCanDo: [
      'Sweep the duty cycle from 0 to 100% and watch the speed curve follow',
      'See why a motor stalls under load even at high duty cycle',
      'Build intuition for what your Arduino analogWrite() is actually doing',
    ],
    lesson: { href: '/academy/spark/s-04-how-robots-move', title: 'S-04: How Robots Move' },
    related: [
      { href: '/atlas/concept/pwm', label: 'PWM' },
      { href: '/atlas/concept/dc-motor', label: 'DC Motor' },
      { href: '/atlas/concept/motor-driver', label: 'Motor Driver' },
    ],
    accent: '#F97316',
  },
  {
    id: 'playground',
    title: 'Code Playground',
    heading: 'Robot Code Playground — Write Python, Watch It Move',
    blurb: 'Write real Python in the browser and drive a simulated robot with it.',
    description:
      'Write Python in your browser and watch a simulated robot execute it. A free robotics code playground — no install, no setup, no signup.',
    keywords: [
      'robot programming playground online',
      'python robot simulator browser',
      'learn robot coding online free',
      'robotics code sandbox',
    ],
    whatYouCanDo: [
      'Write real Python and watch the robot execute it line by line',
      'Break it, fix it, re-run it — nothing to install and nothing to damage',
      'Go from "move forward" to a working obstacle-avoider in one sitting',
    ],
    lesson: { href: '/academy/wire/w-06-capstone-navigator', title: 'W-06: Capstone Navigator' },
    related: [
      { href: '/atlas/concept/robot-programming-basics', label: 'Robot Programming Basics' },
      { href: '/atlas/concept/python-robotics', label: 'Python for Robotics' },
    ],
    accent: '#00E5FF',
    featured: true,
  },
  {
    id: 'robots',
    title: '3D Robot Explorer',
    heading: '3D Robot Explorer — Inspect Real Robot Models',
    blurb: 'Rotate, zoom and move the joints of real robots rendered from their URDF files.',
    description:
      'Explore real robot models in 3D. Rotate, zoom and articulate joints from actual URDF files, right in your browser. Free, no install.',
    keywords: [
      'urdf viewer online',
      '3d robot model viewer',
      'robot urdf visualizer browser',
      'interactive 3d robot explorer',
    ],
    whatYouCanDo: [
      'Rotate and zoom real robot models rendered straight from URDF',
      'Move individual joints and see the kinematic chain respond',
      'Compare how an arm, a quadruped and a mobile base are actually built',
    ],
    related: [
      { href: '/atlas/concept/urdf', label: 'URDF' },
      { href: '/atlas/concept/kinematics', label: 'Kinematics' },
      { href: '/atlas/concept/joint', label: 'Joints' },
    ],
    accent: '#00E5FF',
    featured: true,
  },
  {
    id: 'sense-think-act',
    title: 'Sense–Think–Act',
    heading: 'Sense–Think–Act Loop — Interactive Demo',
    blurb: 'The loop every robot runs, shown one stage at a time.',
    description:
      'An interactive walkthrough of the sense–think–act loop that every robot runs. See how sensing, decision and actuation chain together.',
    keywords: [
      'sense think act loop robotics',
      'robot control loop demo',
      'how robots work interactive',
    ],
    whatYouCanDo: [
      'Step through each stage and see what the robot knows at that moment',
      'Break one stage and watch the whole behaviour fall over',
      'Understand the loop that underpins every robot ever built',
    ],
    lesson: { href: '/academy/spark/s-01-what-is-a-robot', title: 'S-01: What is a Robot?' },
    related: [
      { href: '/atlas/concept/sense-think-act-loop', label: 'Sense–Think–Act Loop' },
      { href: '/atlas/concept/closed-loop-control', label: 'Closed-Loop Control' },
    ],
    accent: '#A56BFF',
  },
  {
    id: 'robot-types',
    title: 'Robot Types',
    heading: 'Types of Robots — Interactive Explorer',
    blurb: 'Arms, mobile bases, drones, humanoids — what separates them and why it matters.',
    description:
      'An interactive explorer of robot types: manipulators, mobile robots, drones, humanoids and more. See what distinguishes each class.',
    keywords: [
      'types of robots explained',
      'robot classification interactive',
      'kinds of robots comparison',
    ],
    whatYouCanDo: [
      'Compare robot classes side by side on the properties that actually differ',
      'See which type suits which job, and why the wrong choice fails',
    ],
    lesson: { href: '/academy/spark/s-02-types-of-robots', title: 'S-02: Types of Robots' },
    related: [
      { href: '/atlas/concept/mobile-robot', label: 'Mobile Robots' },
      { href: '/atlas/concept/redundant-manipulator', label: 'Manipulators' },
      { href: '/atlas/concept/mobile-robot', label: 'Mobile Robots' },
    ],
    accent: '#22C55E',
  },
]

export function getSimulator(id: string): Simulator | undefined {
  return SIMULATORS.find((s) => s.id === id)
}

export function getAllSimulatorIds(): SimulatorId[] {
  return SIMULATORS.map((s) => s.id)
}

/**
 * Older links pointed at descriptive slugs that were never real routes.
 * They must keep resolving — inbound links are the whole point of this work.
 */
export const SLUG_ALIASES: Record<string, SimulatorId> = {
  'line-follower': 'pid',
  'pid-controller': 'pid',
  'pid-tuner': 'pid',
  'a-star': 'astar',
  'a-star-pathfinding': 'astar',
  'pathfinding': 'astar',
  'grid-navigator': 'astar',
  'grid-pathfinder': 'astar',
  'arm-kinematics': 'ik',
  'inverse-kinematics': 'ik',
  'sensor-fusion': 'fusion',
  'kalman': 'fusion',
  'kalman-filter': 'fusion',
  'motor-control': 'motor',
  'pwm': 'motor',
  'code-playground': 'playground',
  '3d': 'robots',
  'urdf': 'robots',
  'urdf-viewer': 'robots',
  'robot-explorer': 'robots',
  'stl': 'sense-think-act',
  'types-of-robots': 'robot-types',
}

/** Resolves a slug or a legacy alias to a canonical simulator id. */
export function resolveSimulatorId(slug: string): SimulatorId | undefined {
  const s = slug.toLowerCase()
  if (SIMULATORS.some((sim) => sim.id === s)) return s as SimulatorId
  return SLUG_ALIASES[s]
}
