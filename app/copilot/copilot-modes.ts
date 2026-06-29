// app/copilot/copilot-modes.ts
// Context modes for the /copilot v2 page.

export type CopilotMode = 'general' | 'debug-ros2' | 'explain-paper' | 'project-mentor' | 'quiz-me' | 'career-advice';

export type ModeDef = {
  id: CopilotMode;
  label: string;
  emoji: string;
  description: string;
  systemPrompt: string;
  quickPrompts: string[];
};

export const MODES: ModeDef[] = [
  {
    id: 'general',
    label: 'General',
    emoji: '🤖',
    description: "Ask anything about robotics.",
    systemPrompt: '',
    quickPrompts: [
      'What is SLAM?',
      'Explain PID simply',
      'Best robot for beginners',
      'ROS2 vs ROS1',
      'Python or C++ for robots?',
      'How to start learning robotics',
    ],
  },
  {
    id: 'debug-ros2',
    label: 'Debug ROS2',
    emoji: '🐞',
    description: "Paste your error logs.",
    systemPrompt:
      "You are a ROS2 expert. When given error logs, identify the exact issue and provide step-by-step fix. Include the precise command, file, or configuration to change. Cite the relevant ROS2 docs page when possible.",
    quickPrompts: [
      'rclpy import fails',
      'tf2 frame not found error',
      "Nav2 controller can't reach goal",
      "MoveIt2 'no kinematic solver' error",
      'colcon build C++ link error',
      'DDS discovery between two PCs',
    ],
  },
  {
    id: 'explain-paper',
    label: 'Explain Paper',
    emoji: '📄',
    description: "Decode an academic robotics paper.",
    systemPrompt:
      "You are a robotics researcher. Explain academic papers in simple English. Always relate concepts to real robots — name specific platforms or products. Identify the paper's main contribution, the method, and its real-world implication. If the user just gives a paper title, summarise the most likely paper of that name.",
    quickPrompts: [
      "Explain 'Diffusion Policy' for me",
      "Explain RT-2 paper",
      "What is Voxposer?",
      "Explain the ANYmal RL paper",
      "What's special about RoboCat?",
      "Explain the OpenVLA paper",
    ],
  },
  {
    id: 'project-mentor',
    label: 'Project Mentor',
    emoji: '🧭',
    description: "Guide me through my first robot project.",
    systemPrompt:
      "You are guiding a student through their first robot project. Ask clarifying questions one at a time. Give small achievable steps. Always ask about the student's current skill level, available budget (in INR), and available components before recommending parts. Keep guidance specific to Indian e-commerce (Robu.in, Quartz Components, Amazon India).",
    quickPrompts: [
      'Help me plan a line-follower robot',
      'Plan an obstacle-avoidance bot under ₹2000',
      'My first ROS2 project ideas',
      'How to build a robot arm in Class 11',
      'Robotics project for Atal Tinkering Lab',
      'Final-year B.Tech robotics project ideas',
    ],
  },
  {
    id: 'quiz-me',
    label: 'Quiz Me',
    emoji: '❓',
    description: "Practice with MCQs and feedback.",
    systemPrompt:
      "Generate MCQ quizzes on robotics topics. Each quiz is 5 multiple-choice questions, four options each. After each answer the user gives, explain why it's right or wrong in 2-3 sentences. Track which topics the user gets wrong and revisit them at the end.",
    quickPrompts: [
      'Quiz me on SLAM',
      'Quiz me on PID control',
      'Quiz me on Arduino basics',
      'Quiz me on sensors and actuators',
      'Quiz me on Indian space robotics',
      "Quiz me on humanoid robots",
    ],
  },
  {
    id: 'career-advice',
    label: 'Career Advice',
    emoji: '🎓',
    description: "Career paths for Indian robotics students.",
    systemPrompt:
      "You are a robotics career advisor for Indian students. Give specific, actionable career paths — name companies (Indian first), salary ranges in INR, skills required, and recommended courses on R2BOT Academy. Take into account the student's current education (school, B.Tech, M.Tech, PhD).",
    quickPrompts: [
      'Best robotics jobs in India in 2026',
      'Roadmap from Class 12 to robotics engineer',
      'How to get into DRDO / ISRO',
      'Salary expectations for ROS2 engineers in India',
      'M.Tech robotics in India — best colleges',
      'Should I do MS abroad or work in India?',
    ],
  },
];

export const MODE_BY_ID = new Map(MODES.map((m) => [m.id, m]));
