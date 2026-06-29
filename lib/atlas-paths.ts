// lib/atlas-paths.ts
// Curated learning paths through the Atlas. Each path is an ordered list
// of slugs the reader should walk through in sequence.

export interface LearningPath {
  id: string
  title: string
  description: string
  duration: string
  difficulty: 1 | 2 | 3 | 4 | 5
  termSlugs: string[]
  targetAudience: string
  gradient: string
  emoji: string
}

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'robot-basics',
    title: 'Understand Any Robot in 30 Minutes',
    description: 'The 8 concepts that explain every robot ever built — from a Roomba to a Mars rover.',
    duration: '30 min',
    difficulty: 1,
    termSlugs: [
      'sensor', 'actuator', 'controller', 'feedback-loop',
      'servo-motor', 'pid-control', 'degrees-of-freedom', 'end-effector',
    ],
    targetAudience: 'Complete beginners',
    gradient: 'from-emerald-700 to-teal-900',
    emoji: '🚀',
  },
  {
    id: 'ai-robotics',
    title: 'AI × Robotics',
    description: 'How machine learning rewrote what robots can do — and what they can\'t.',
    duration: '45 min',
    difficulty: 3,
    termSlugs: [
      'computer-vision', 'neural-network', 'reinforcement-learning', 'slam',
      'object-detection', 'point-cloud', 'lidar', 'semantic-segmentation',
    ],
    targetAudience: 'Tech-curious learners',
    gradient: 'from-violet-700 to-purple-900',
    emoji: '🧠',
  },
  {
    id: 'build-your-first-robot',
    title: 'Build a Line Follower',
    description: 'Every concept you need before plugging in your first Arduino.',
    duration: '40 min',
    difficulty: 2,
    termSlugs: [
      'ir-sensor', 'h-bridge', 'pwm', 'differential-drive',
      'pid-control', 'arduino', 'motor-driver', 'encoder',
    ],
    targetAudience: 'Makers & students',
    gradient: 'from-amber-700 to-orange-900',
    emoji: '🛠️',
  },
  {
    id: 'industrial-robotics',
    title: 'How Factories Work',
    description: 'The robots behind every car, phone, and packet of biscuits you own.',
    duration: '35 min',
    difficulty: 3,
    termSlugs: [
      'dof', 'work-envelope', 'teach-pendant', 'repeatability',
      'payload', 'collaborative-robot', 'safety-standards', 'robot-programming-languages',
    ],
    targetAudience: 'Engineering students',
    gradient: 'from-slate-700 to-zinc-900',
    emoji: '🏭',
  },
  {
    id: 'india-robotics-opportunity',
    title: "India's Robotics Story",
    description: 'The technical concepts driving India\'s automation story.',
    duration: '25 min',
    difficulty: 2,
    termSlugs: [
      'robot-density', 'automation', 'cobots', 'amr',
      'pick-and-place', 'vision-guided-robotics', 'human-robot-interaction',
    ],
    targetAudience: 'Business & policy',
    gradient: 'from-rose-700 to-red-900',
    emoji: '🇮🇳',
  },
]
