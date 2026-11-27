// lib/kids/makers/next-step.ts
// Graduate to R2BOT (roadmap #35): the map from a child's mastered concepts to
// the main R2BOT platform (Quick Lessons, Academy Forge and Edge, Robot
// Projects, the ROS 2 Playground, Career Paths).
//
// This file is the DATA (slugs and concepts). The server page resolves titles
// and checks each Quick Lesson is live with liveShorts(), so a scheduled lesson
// is never advertised early, and drops anything that no longer exists.
//
// Who sees the links: Engineers (14–17) see them; everyone under 13 sees them
// only in the grown-up view behind the parental gate. Every link leaves /kids,
// so the screen renders them with <GrownUpLink> either way.

import type { ConceptId } from '../curriculum/types'

/** Quick Lesson slugs (lib/shorts.ts) that extend each concept on the main site. */
export const SHORTS_FOR_CONCEPT: Readonly<Partial<Record<ConceptId, readonly string[]>>> = {
  'sense-think-act': ['state-machine', 'sensor-fusion'],
  sequences: ['robot-arm-six-motors', 'repeatability'],
  decomposition: ['inverse-kinematics', 'degrees-of-freedom'],
  loops: ['line-follower', 'feedback-control'],
  debugging: ['watchdog-timer', 'averaging-noise'],
  'events-timing': ['robot-latency', 'pwm-motor-speed'],
  sensors: ['ultrasonic-sensor', 'lidar', 'depth-camera', 'gyroscope-imu'],
  conditions: ['state-machine', 'behavior-tree'],
  variables: ['potentiometer-angle', 'dead-reckoning'],
  'feedback-control': ['pid-controller', 'gain-and-damping', 'drone-stays-level'],
  physics: ['gears', 'torque-vs-speed', 'payload-vs-reach'],
  autonomy: ['slam', 'a-star', 'mars-rover-delay'],
  data: ['computer-vision', 'sim-to-real', 'robots-learn-to-walk'],
  'design-process': ['end-effectors', 'wheels-vs-legs', 'soft-grippers'],
  'safety-ethics': ['emergency-stop', 'cobot', 'safety-cages'],
}

export type NextStepKind = 'academy' | 'project' | 'playground' | 'careers'

export interface NextStepPlace {
  id: string
  kind: NextStepKind
  /** Path on the main site. Titles for Academy lessons are read from content/academy. */
  href: string
  /** Fallback title (Academy lessons use their own). */
  title: string
  concepts: readonly ConceptId[]
  /** One line: why this is the next step. */
  why: string
}

/** Fixed destinations (Academy lessons are checked against content/academy by the page). */
export const NEXT_STEP_PLACES: readonly NextStepPlace[] = [
  { id: 'forge-01', kind: 'academy', href: '/academy/forge/01', title: 'Academy Forge: navigation', concepts: ['autonomy', 'sensors'], why: 'How real robots plan routes and avoid obstacles with ROS 2 Nav2.' },
  { id: 'forge-02', kind: 'academy', href: '/academy/forge/02', title: 'Academy Forge: manipulation', concepts: ['physics', 'decomposition'], why: 'Robot arms for real: motion planning and grasping with MoveIt 2.' },
  { id: 'forge-03', kind: 'academy', href: '/academy/forge/03', title: 'Academy Forge: AI on robots', concepts: ['data', 'sensors'], why: 'Running machine-learning models on a robot’s own computer.' },
  { id: 'forge-04', kind: 'academy', href: '/academy/forge/04', title: 'Academy Forge capstone', concepts: ['design-process', 'autonomy'], why: 'Put it together: design a warehouse robot end to end.' },
  { id: 'edge-01', kind: 'academy', href: '/academy/edge/01', title: 'Academy Edge: multi-robot systems', concepts: ['autonomy', 'loops'], why: 'Many robots, one job: coordination, like the Swarm Reef, for real.' },
  { id: 'edge-02', kind: 'academy', href: '/academy/edge/02', title: 'Academy Edge: SLAM', concepts: ['autonomy', 'data', 'sensors'], why: 'How a robot maps a place it has never seen, built from scratch.' },
  { id: 'edge-03', kind: 'academy', href: '/academy/edge/03', title: 'Academy Edge capstone', concepts: ['design-process', 'debugging'], why: 'A research-style robot project, from question to working system.' },
  { id: 'build', kind: 'project', href: '/build', title: 'Robot Projects', concepts: ['design-process', 'sensors', 'debugging'], why: 'Guided builds with real parts lists, code and a simulator fallback.' },
  { id: 'ros2', kind: 'playground', href: '/ros2', title: 'ROS 2 Playground', concepts: ['sequences', 'events-timing', 'debugging'], why: 'Run real ROS 2 commands in your browser: the software real robots use.' },
  { id: 'careers', kind: 'careers', href: '/careers', title: 'Career Paths', concepts: ['careers', 'safety-ethics'], why: 'Roadmaps from where you are now to a job in robotics.' },
]
