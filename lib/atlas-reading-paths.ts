// lib/atlas-reading-paths.ts
// Curated learning journeys through the Atlas. Linear lists of concept slugs.
// Mirrors the READING_PATHS defined in scripts/atlas-topics-list.ts so server
// components can import them without depending on the scripts dir.

export interface ReadingPath {
  id: string
  title: string
  emoji: string
  color: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  description: string
  estimatedMinutes: number
  concepts: string[]
}

export const READING_PATHS: ReadingPath[] = [
  {
    id: 'robot-basics',
    title: 'Robot Basics',
    emoji: '🤖',
    color: '#6366f1',
    level: 'Beginner',
    description: 'Perfect first path. 8 concepts, ~45 minutes.',
    estimatedMinutes: 45,
    concepts: [
      'sensor', 'actuator', 'controller', 'feedback-loop',
      'pid-controller', 'differential-drive-deep', 'arduino-explained', 'python-for-robotics',
    ],
  },
  {
    id: 'computer-vision',
    title: 'See Like a Robot',
    emoji: '👁️',
    color: '#0891b2',
    level: 'Intermediate',
    description: 'How robots understand what they see. 12 concepts.',
    estimatedMinutes: 90,
    concepts: [
      'camera-calibration', 'image-basics', 'feature-detection',
      'object-detection-explained', 'yolo-explained', 'optical-flow',
      'depth-from-stereo', 'slam-explained', 'visual-slam', 'orb-slam',
      'semantic-segmentation', 'pose-estimation-vision',
    ],
  },
  {
    id: 'build-robot-arm',
    title: 'Build a Robot Arm',
    emoji: '🦾',
    color: '#16a34a',
    level: 'Intermediate',
    description: 'From motors to manipulation. 10 concepts.',
    estimatedMinutes: 75,
    concepts: [
      'servo-motor-types', 'dof-degrees-of-freedom', 'forward-kinematics-deep',
      'inverse-kinematics-deep', 'jacobian-matrix', 'pid-controller',
      'gripper-types', 'trajectory-planning-arms', 'ros2-moveit2', 'assembly-robotics',
    ],
  },
  {
    id: 'self-driving-101',
    title: 'Self-Driving 101',
    emoji: '🚗',
    color: '#dc2626',
    level: 'Advanced',
    description: 'How autonomous cars work. 15 concepts.',
    estimatedMinutes: 120,
    concepts: [
      'lidar-types', 'camera-calibration', 'sensor-fusion-basics',
      'object-detection-explained', 'slam-explained', 'path-planning-explained',
      'a-star-algorithm', 'pid-controller', 'model-predictive-control',
      'ackermann-steering-deep', 'occupancy-grid', 'kalman-filter-sensors',
      'particle-filter', 'amcl-explained', 'cybersecurity-robots',
    ],
  },
  {
    id: 'ai-for-robots',
    title: 'AI for Robots',
    emoji: '🧠',
    color: '#7c3aed',
    level: 'Advanced',
    description: 'Machine learning meets robotics. 12 concepts.',
    estimatedMinutes: 100,
    concepts: [
      'neural-network-deep', 'cnn-explained', 'reinforcement-learning-deep',
      'q-learning', 'proximal-policy-optimization', 'imitation-learning',
      'sim-to-real', 'domain-randomization', 'foundation-models-robotics',
      'large-language-model-robots', 'multimodal-ai-robots', 'world-model-robots',
    ],
  },
]

export function getReadingPath(id: string): ReadingPath | null {
  return READING_PATHS.find(p => p.id === id) ?? null
}
