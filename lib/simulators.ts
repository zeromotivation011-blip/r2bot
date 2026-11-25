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
    // "pid visualizer" had 46 impressions at position 7 and no clicks (Search
    // Console, Nov 2026): the old title never said "visualizer". Lead with the
    // query, keep the simulator wording after it. Measure CTR from 7 Dec.
    heading: 'PID Visualizer: Interactive PID Controller Simulator',
    blurb: 'Drag P, I and D and watch the system settle, overshoot or oscillate in real time.',
    description:
      'A free PID visualizer: drag the P, I and D gains and watch the response curve overshoot, oscillate or settle on target in real time. Runs in your browser.',
    keywords: [
      'pid visualizer',
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
    // 25 Nov 2026: the copy promised driving, drift and loop closure. The demo
    // is a wall-following robot building a map from 16 range rays with its
    // position known (components/visuals/SLAMVisual.tsx). Copy now says that;
    // adding pose drift + loop closure is the upgrade that would earn "SLAM".
    heading: 'SLAM Mapping Demo: Watch a Robot Map an Unknown Room',
    blurb: 'A robot follows the walls of an unknown room and builds a map from its range-sensor hits.',
    description:
      'A free interactive mapping demo: a robot explores an unknown room with a 16-ray range sensor and builds the map in real time. The mapping half of SLAM, shown simply.',
    keywords: [
      'slam simulator online',
      'interactive slam visualization',
      'simultaneous localization and mapping demo',
      'slam robotics simulator free',
    ],
    whatYouCanDo: [
      'Watch the map fill in from the range-sensor hits as the robot follows the walls',
      'Change the speed, pause, and see how much of the room each lap uncovers',
      'See the mapping half of SLAM; the demo knows the robot\'s position, which real SLAM must estimate at the same time',
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
    accent: '#FC6818',
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
      'complementary filter demo',
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
      { href: '/tools/motor-torque-calculator', label: 'Motor torque calculator' },
    ],
    accent: '#F97316',
  },
  {
    id: 'playground',
    title: 'Code Playground',
    // 25 Nov 2026: this used to promise "real Python". The playground runs a
    // fixed set of Python-style commands line by line (no loops or if), so the
    // copy now says exactly that — it is the page we send Hacker News to.
    heading: 'Robot Code Playground: Drive a Robot with Python-Style Commands',
    blurb: 'Type Python-style commands in the browser and watch a simulated robot drive, turn and read its distance sensor.',
    description:
      'Type Python-style robot commands in your browser and watch a simulated robot run them line by line. A free robot code playground: no install, no signup.',
    keywords: [
      'robot programming playground online',
      'python robot simulator browser',
      'learn robot coding online free',
      'robotics code sandbox',
    ],
    whatYouCanDo: [
      'Write Python-style commands (forward, turn, wait, set_speed, sensor.distance) and watch the robot run them line by line',
      'Break it, fix it, re-run it — nothing to install and nothing to damage',
      'Plan a route around the obstacles one command at a time, then compare it with the built-in examples',
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
    // 25 Nov 2026: the copy said these were "rendered from their URDF files".
    // They are simplified Three.js models built in code (components/visuals/
    // URDFViewer.tsx), with joints you can move. The copy now says so, and no
    // longer targets "urdf viewer" queries this page cannot answer.
    heading: '3D Robot Explorer: Move the Joints of Four Robot Types',
    blurb: 'Rotate, zoom and move the joints of simplified 3D models of an arm, a quadruped, a mobile base and a drone.',
    description:
      'Rotate, zoom and move the joints of simplified 3D models of a six-axis arm, a quadruped, a TurtleBot-style base and a quadrotor, right in your browser.',
    keywords: [
      '3d robot model viewer',
      'interactive 3d robot explorer',
      'robot joints 3d browser',
    ],
    whatYouCanDo: [
      'Rotate and zoom simplified models of four common robot types',
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
