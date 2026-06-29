export const ATLAS_ACADEMY_MAP: Record<string, { track: string; slug: string; title: string }> = {
  'pid-controller': { track: 'wire', slug: 'w-03-pid-control-practice', title: 'W-03: PID Control in Practice' },
  'ros': { track: 'wire', slug: 'w-01-ros2-fundamentals', title: 'W-01: ROS2 Fundamentals' },
  'ros2': { track: 'wire', slug: 'w-01-ros2-fundamentals', title: 'W-01: ROS2 Fundamentals' },
  'slam': { track: 'forge', slug: 'f-01-ros2-nav2', title: 'F-01: ROS2 Navigation Stack' },
  'lidar': { track: 'wire', slug: 'w-02-sensor-integration', title: 'W-02: Sensor Integration' },
  'imu': { track: 'wire', slug: 'w-02-sensor-integration', title: 'W-02: Sensor Integration' },
  'sensor-fusion': { track: 'wire', slug: 'w-02-sensor-integration', title: 'W-02: Sensor Integration' },
  'computer-vision': { track: 'wire', slug: 'w-05-computer-vision-robots', title: 'W-05: Computer Vision for Robots' },
  'inverse-kinematics': { track: 'forge', slug: 'f-02-moveit2-manipulation', title: 'F-02: Robot Manipulation with MoveIt2' },
  'kinematics': { track: 'forge', slug: 'f-02-moveit2-manipulation', title: 'F-02: Robot Manipulation with MoveIt2' },
  'robot-arm': { track: 'forge', slug: 'f-02-moveit2-manipulation', title: 'F-02: Robot Manipulation with MoveIt2' },
  'neural-network': { track: 'forge', slug: 'f-03-edge-ai-robots', title: 'F-03: Edge AI on Robots' },
  'edge-computing': { track: 'forge', slug: 'f-03-edge-ai-robots', title: 'F-03: Edge AI on Robots' },
  'mobile-robot': { track: 'wire', slug: 'w-04-mobile-robot-build', title: 'W-04: Building a Mobile Robot' },
  'odometry': { track: 'wire', slug: 'w-04-mobile-robot-build', title: 'W-04: Building a Mobile Robot' },
  'feedback-loop': { track: 'spark', slug: 's-05-robot-brain', title: 'S-05: The Robot Brain' },
  'servo-motor': { track: 'spark', slug: 's-04-how-robots-move', title: 'S-04: How Robots Move' },
  'microcontroller': { track: 'spark', slug: 's-05-robot-brain', title: 'S-05: The Robot Brain' },
  'sensor': { track: 'spark', slug: 's-03-how-robots-sense', title: 'S-03: How Robots Sense' },
  'actuator': { track: 'spark', slug: 's-04-how-robots-move', title: 'S-04: How Robots Move' },
};

const TRACK_EMOJI: Record<string, string> = {
  spark: '⚡',
  wire: '🔌',
  forge: '🔥',
  edge: '⚡️',
};

const TRACK_NAME: Record<string, string> = {
  spark: 'Spark',
  wire: 'Wire',
  forge: 'Forge',
  edge: 'Edge',
};

export function getAcademyLessonForAtlasTerm(slug: string) {
  return ATLAS_ACADEMY_MAP[slug] ?? null;
}

export { TRACK_EMOJI, TRACK_NAME };
