// Daily Robot Challenge — 60 deterministic scenarios that cycle every 60 days.
// dayOfYear is computed in UTC so every reader sees the same challenge at
// the same wall-clock instant.

export type ChallengeLevel = 'spark' | 'wire' | 'forge' | 'edge';

export type Challenge = {
  id: number;
  level: ChallengeLevel;
  question: string;
  hint: string;
  answer: string;
  points: number;
};

export const LEVEL_ACCENT: Record<ChallengeLevel, string> = {
  spark: '#00B8D4',
  wire: '#A56BFF',
  forge: '#00E5FF',
  edge: '#FFB800',
};

export const LEVEL_LABEL: Record<ChallengeLevel, string> = {
  spark: 'Spark',
  wire: 'Wire',
  forge: 'Forge',
  edge: 'Edge',
};

const challenges: Challenge[] = [
  // SPARK LEVEL (days 1-20)
  { id: 1, level: 'spark', question: "A robot's arm stops moving mid-task. Name the THREE systems you'd check first.", hint: 'Think Sense-Think-Act', answer: 'Power/actuator, controller/code, sensor feedback', points: 10 },
  { id: 2, level: 'spark', question: "What's the difference between an open-loop and closed-loop control system? Give a robot example of each.", hint: 'Think: does the robot know if it succeeded?', answer: 'Open-loop: timer-based motor run. Closed-loop: encoder confirms wheel rotated X degrees.', points: 10 },
  { id: 3, level: 'spark', question: 'Name 3 sensors a self-driving car uses that a warehouse robot does NOT need.', hint: 'Think about the environment differences', answer: 'Rain sensor, high-beam camera, GPS (warehouse uses local maps)', points: 10 },
  { id: 4, level: 'spark', question: "Your servo motor won't move. You have a multimeter. List 4 things to check in order.", hint: 'Start from power, move to signal', answer: '1.Power supply voltage 2.Ground connection 3.PWM signal present 4.Servo range limits in code', points: 10 },
  { id: 5, level: 'spark', question: 'Explain the Sense-Think-Act loop using a vending machine as the robot.', hint: 'What does it sense? What does it think? What does it do?', answer: 'Sense: button press + money inserted. Think: check item available + correct payment. Act: dispense item + give change.', points: 10 },
  { id: 6, level: 'spark', question: 'Why do robots in hospitals use wheels instead of legs?', hint: 'Think about reliability, speed, surface, and safety', answer: 'Wheels more reliable (fewer failure points), faster on flat surfaces, easier to sanitize, predictable movement near patients', points: 10 },
  { id: 7, level: 'spark', question: 'A drone needs to hold position in wind. Which sensor is essential and why?', hint: 'Think about what changes when wind pushes it', answer: 'IMU (Inertial Measurement Unit) detects orientation/acceleration changes; feeds PID controller to correct position', points: 10 },
  { id: 8, level: 'spark', question: "What does 'degrees of freedom' mean for a robot arm? How many does a human arm have?", hint: 'Think about directions of movement', answer: 'DOF = number of independent movements possible. Human arm ≈ 7 DOF (shoulder 3, elbow 1, wrist 3)', points: 10 },
  { id: 9, level: 'spark', question: 'Name the actuator type best suited for: 1) precise angle control 2) continuous rotation 3) linear push', hint: 'Three different actuator types', answer: '1) Servo motor 2) DC motor 3) Linear actuator / solenoid', points: 10 },
  { id: 10, level: 'spark', question: "A robot's battery lasts 2 hours at full speed. How would you extend runtime to 4 hours without buying a new battery?", hint: 'Think about power consumption, not just battery size', answer: 'Reduce motor speed (PWM duty cycle), sleep unused sensors, optimize code loops, add regenerative braking', points: 10 },
  { id: 11, level: 'spark', question: 'What is the purpose of a motor driver (like L298N) between Arduino and a DC motor?', hint: "Why can't Arduino power the motor directly?", answer: 'Arduino GPIO outputs 5V/40mA max. DC motors need much higher current. Motor driver amplifies current from separate power supply.', points: 10 },
  { id: 12, level: 'spark', question: 'List 3 ways a robot can fail that have nothing to do with its code.', hint: 'Think physical, electrical, environmental', answer: 'Mechanical wear (gear slip), power brownout, sensor contamination (dust on LiDAR), loose connectors, thermal shutdown', points: 10 },
  { id: 13, level: 'spark', question: 'Why is a 360° LiDAR more useful than a forward-facing ultrasonic sensor for navigation?', hint: "Think about what each can 'see'", answer: 'LiDAR builds full 2D map of surroundings (360°), enables SLAM. Ultrasonic only detects objects directly in front, no mapping.', points: 10 },
  { id: 14, level: 'spark', question: "What is 'dead reckoning' in robotics and what makes it unreliable over long distances?", hint: 'Think about a ship navigating without GPS', answer: 'Dead reckoning: estimating position using known speed + direction + time from last known point. Unreliable because small errors compound (drift).', points: 10 },
  { id: 15, level: 'spark', question: "A robot needs to pick up objects of different weights. What sensor would help it 'feel' the weight?", hint: 'Think about what humans use to feel resistance', answer: 'Force/torque sensor (or current sensor monitoring motor load — higher current = heavier object)', points: 10 },
  { id: 16, level: 'spark', question: 'Explain why a robot used outdoors needs different sensors than one used indoors.', hint: 'Think about GPS, lighting, weather, terrain', answer: 'Outdoor: GPS, rain sensor, higher-IP rated enclosures, RTK for precision. Indoor: local positioning (UWB), ceiling cameras, no weather sealing needed', points: 10 },
  { id: 17, level: 'spark', question: 'What is PWM and how does it control motor speed? Explain with percentages.', hint: "Think about how 'on time' relates to average voltage", answer: 'PWM (Pulse Width Modulation): rapidly switches power on/off. 50% duty cycle = 50% average voltage = ~half speed. 100% = full speed.', points: 10 },
  { id: 18, level: 'spark', question: 'Why do industrial robot arms stop when a human enters their workspace?', hint: 'Think about safety systems and sensors', answer: 'Safety laser scanners / light curtains detect human presence. Emergency stop (E-stop) triggers. Some use collaborative mode (force limits).', points: 10 },
  { id: 19, level: 'spark', question: "What is the difference between a robot's 'payload' and 'reach'? Why do both matter for buying decisions?", hint: 'Think about what a robot arm can carry vs how far', answer: 'Payload: max weight robot can handle (kg). Reach: max distance from base to end-effector (mm). Both determine what tasks the robot can physically perform.', points: 10 },
  { id: 20, level: 'spark', question: 'A line-following robot loses the line at a junction. Describe 2 strategies it could use to recover.', hint: 'Think about what information it has and what it can try', answer: '1) Spin in place to search for line (last known direction). 2) Back up to last confirmed position then re-scan. 3) Use memory of last turn direction.', points: 10 },

  // WIRE LEVEL (days 21-40)
  { id: 21, level: 'wire', question: 'In ROS2, what is the difference between a topic and a service? Give a real robot use case for each.', hint: 'Think: one-way stream vs request-response', answer: 'Topic: continuous data stream (camera feed, LiDAR scan). Service: one-time request-response (take photo, reset odometry).', points: 15 },
  { id: 22, level: 'wire', question: "Your ROS2 node is publishing to /cmd_vel but the robot doesn't move. List 5 debugging steps.", hint: 'Think: is it receiving? Is it interpreting? Is it acting?', answer: '1.rostopic echo /cmd_vel 2.Check topic QoS match 3.Verify motor driver node subscribed 4.Check E-stop not triggered 5.Confirm correct frame_id', points: 15 },
  { id: 23, level: 'wire', question: 'Explain odometry drift and why fusing wheel encoders with IMU reduces it.', hint: 'Why is one source of truth insufficient?', answer: "Wheel slip causes encoder error; IMU drifts over time but has no slip. Sensor fusion (Extended Kalman Filter) combines both—each corrects the other's weakness.", points: 15 },
  { id: 24, level: 'wire', question: 'What is a URDF file and what does it contain? Why does ROS need it?', hint: "Think about what a robot's digital twin needs", answer: "URDF (Unified Robot Description Format): XML describing robot's links, joints, geometry, inertia, collision. ROS uses it for simulation, kinematics, visualization.", points: 15 },
  { id: 25, level: 'wire', question: 'Describe the Nav2 stack in ROS2. What are its 4 main components?', hint: 'Think: global plan, local plan, localization, behavior', answer: '1.Global planner (A* path from A to B) 2.Local planner (DWB—avoids dynamic obstacles) 3.AMCL (localization) 4.Behavior trees (recovery behaviors)', points: 15 },
  { id: 26, level: 'wire', question: 'What is the purpose of tf2 in ROS2? Why is it needed for a robot with multiple sensors?', hint: 'Think about coordinate frames', answer: 'tf2 manages coordinate frame transforms. Robot has many frames (base_link, camera_frame, lidar_frame). tf2 tracks their spatial relationships over time.', points: 15 },
  { id: 27, level: 'wire', question: "A robot's SLAM map has duplicate walls (ghosting). What typically causes this?", hint: 'Think about what inputs SLAM uses', answer: "Loop closure failure. Robot revisited a location but LiDAR scan didn't match stored map due to accumulated odometry error. Solution: better loop closure algorithm or ground truth corrections.", points: 15 },
  { id: 28, level: 'wire', question: 'Explain the difference between LIDAR-based SLAM and Visual SLAM (VSLAM). When would you use each?', hint: 'Think about lighting, cost, and environment structure', answer: 'LiDAR SLAM: robust, works in dark, expensive ($500+). VSLAM: camera-based, cheap, fails in poor lighting/texture-less environments. Use VSLAM indoors with good lighting, LiDAR for outdoor/industrial.', points: 15 },
  { id: 29, level: 'wire', question: 'What is a QoS profile in ROS2 and why does a mismatch between publisher and subscriber cause issues?', hint: 'Think about reliability guarantees', answer: "QoS defines reliability (RELIABLE/BEST_EFFORT), durability, history. Mismatch means subscriber won't receive data. E.g., sensor publishes BEST_EFFORT but controller subscribes RELIABLE—no data flows.", points: 15 },
  { id: 30, level: 'wire', question: 'Your robot navigation works in simulation (Gazebo) but fails on real hardware. Name 5 sim-to-real gap causes.', hint: 'Think about what Gazebo idealizes', answer: '1.Perfect sensors in sim vs noisy real sensors 2.No wheel slip in sim 3.Floor friction difference 4.Real motor latency 5.Network latency on real hardware', points: 15 },
  { id: 31, level: 'wire', question: 'What is an action server in ROS2 vs a service? When would a navigation task use an action?', hint: 'Think about long-running tasks with feedback', answer: "Service: instant request-response. Action: long-running goal with feedback+cancellation. Navigation uses action—it takes seconds/minutes, needs progress feedback ('50% to goal') and cancel option.", points: 15 },
  { id: 32, level: 'wire', question: 'Explain the Kalman Filter in one sentence, then give a concrete robot sensor fusion example.', hint: 'Think: prediction + correction', answer: 'Kalman Filter: optimally combines noisy predictions with noisy measurements weighted by their uncertainty. Example: fuses GPS (10m accuracy) with IMU (precise but drifting) for smooth position estimate.', points: 15 },
  { id: 33, level: 'wire', question: 'A manipulator arm needs to reach point (x=0.3, y=0.2, z=0.5) in Cartesian space. What math converts this to joint angles?', hint: 'Think forward vs inverse', answer: "Inverse Kinematics (IK). Forward kinematics: joint angles → end-effector position. IK reverses this. For non-trivial arms: numerical IK solvers (MoveIt's KDL/TRAC-IK) or analytical solutions.", points: 15 },
  { id: 34, level: 'wire', question: "What is DDS (Data Distribution Service) and why did ROS2 adopt it over ROS1's roscore?", hint: 'Think about reliability and distributed systems', answer: 'DDS: industry-standard middleware for real-time pub/sub. ROS2 uses it for: no single point of failure (no roscore), QoS control, better multi-robot support, runs on embedded systems.', points: 15 },
  { id: 35, level: 'wire', question: 'Explain the role of a behavior tree in robot navigation. How is it different from a state machine?', hint: 'Think about modularity and reusability', answer: 'State machines: rigid, hard to reuse nodes across tasks. Behavior trees: hierarchical, modular, nodes reusable across different behaviors. BTs handle complex conditional logic more cleanly for autonomous systems.', points: 15 },
  { id: 36, level: 'wire', question: "Your ROS2 robot's CPU is at 95% during navigation. Which nodes are typically the heaviest consumers?", hint: 'Think about data-intensive operations', answer: '1.LiDAR processing/SLAM (dense point clouds) 2.Camera/image processing 3.Global costmap updates. Solutions: reduce sensor publish rate, use GPU for perception, use compressed image topics.', points: 15 },
  { id: 37, level: 'wire', question: 'What is costmap in ROS2 Nav2 and what is the difference between global and local costmap?', hint: 'Think about planning horizons', answer: 'Costmap: grid marking obstacle locations + inflation zones. Global costmap: full known map for long-range path planning (static). Local costmap: small area around robot for real-time dynamic obstacle avoidance.', points: 15 },
  { id: 38, level: 'wire', question: "Explain what a watchdog timer does in an embedded robot controller and why it's safety-critical.", hint: 'Think about what happens when code hangs', answer: "Watchdog: hardware timer that resets microcontroller if not 'kicked' within a time window. If robot code hangs, actuators get last command indefinitely (dangerous). Watchdog forces safe reset/stop.", points: 15 },
  { id: 39, level: 'wire', question: 'What is the difference between position control and velocity control for a robot joint?', hint: 'Think about what the controller is trying to achieve', answer: 'Position control: servo to a specific angle (end state matters). Velocity control: maintain a specific speed (useful for wheels). Impedance/torque control is a third mode for human-safe cobots.', points: 15 },
  { id: 40, level: 'wire', question: 'A ROS2 robot needs to recover from getting stuck. Design a simple recovery behavior sequence.', hint: 'Think about what a human would do if stuck', answer: "1.Detect stuck (velocity command sent but no odometry change >2s) 2.Back up 30cm 3.Rotate 45° 4.Retry original goal. If fails 3 times: publish 'navigation_failed' event, request human assist.", points: 15 },

  // FORGE/EDGE LEVEL (days 41-60)
  { id: 41, level: 'forge', question: 'Explain how SLAM uses loop closure. What happens mathematically when a loop is detected?', hint: 'Think about graph optimization', answer: 'When robot recognises a previously visited place, it adds a constraint to the pose graph. Graph optimization (g2o, GTSAM) redistributes accumulated error across all poses to minimize total inconsistency.', points: 20 },
  { id: 42, level: 'forge', question: 'Compare EKF (Extended Kalman Filter) and particle filter for robot localization. When does each fail?', hint: 'Think about linearity assumptions and computational cost', answer: 'EKF: fast, assumes Gaussian noise, fails in non-Gaussian/multimodal distributions (e.g., robot lost in symmetric corridor). Particle filter: handles multimodal uncertainty, computationally expensive, needs many particles for accuracy.', points: 20 },
  { id: 43, level: 'forge', question: 'What is model predictive control (MPC) and why is it preferred over PID for autonomous vehicles?', hint: 'Think about prediction horizon and constraints', answer: 'MPC: optimizes control inputs over a future time horizon subject to constraints (speed limits, steering limits). PID is reactive (no future planning). MPC handles constraints and multi-input-multi-output systems natively.', points: 20 },
  { id: 44, level: 'forge', question: 'Explain the sim-to-real gap in reinforcement learning for robot manipulation. Name 2 techniques to reduce it.', hint: 'Think about what simulation gets wrong', answer: 'Sim-to-real: policies trained in simulation fail on real robots due to sensor noise, contact physics inaccuracies, visual differences. Techniques: domain randomization (randomize sim parameters), real-to-sim (use real camera frames in sim via NeRF).', points: 20 },
  { id: 45, level: 'forge', question: "What is a neural network's role in modern SLAM? How does it differ from classical geometric SLAM?", hint: 'Think about learned vs hand-crafted features', answer: 'Classical SLAM: hand-crafted feature descriptors (ORB, SIFT), explicit map representation. Neural SLAM: learned feature extraction (SuperPoint), implicit map (NeRF-based), better generalization to new environments but less interpretable.', points: 20 },
  { id: 46, level: 'forge', question: 'Describe the architecture of a complete autonomous mobile robot system. What are the 6 software layers?', hint: 'Think from hardware to mission', answer: '1.HAL (Hardware Abstraction) 2.Perception (sensors→world model) 3.Localization (where am I?) 4.Mapping (what\'s around me?) 5.Planning (path/task) 6.Control (motor commands). Each layer has defined interfaces.', points: 20 },
  { id: 47, level: 'forge', question: 'What is whole-body control in humanoid robotics and why is it computationally challenging?', hint: 'Think about coupled dynamics', answer: 'WBC: simultaneously optimizes all joint torques to satisfy multiple tasks (balance + arm motion + gaze) with priorities. Challenging: humanoid has 30+ DOF, all dynamically coupled, must solve QP at 1kHz.', points: 20 },
  { id: 48, level: 'forge', question: 'Explain how a transformer architecture is being applied to robot foundation models (like RT-2). What is tokenized?', hint: 'Think about what gets turned into tokens', answer: 'RT-2: tokenizes camera images (ViT patches) + language instructions + robot actions (discretized joint angles). Trained on internet-scale vision-language data + robot demonstrations. Actions emerge as next-token prediction.', points: 20 },
  { id: 49, level: 'forge', question: 'What is a Jacobian in robot kinematics and how is it used for velocity control of a manipulator?', hint: 'Think about the relationship between joint velocities and end-effector velocity', answer: 'Jacobian: matrix mapping joint velocities (θ̇) to end-effector velocity (ẋ). ẋ = J(θ)θ̇. For velocity control: θ̇ = J⁺ẋ (pseudo-inverse). Singularities occur when J loses rank—robot loses DOF.', points: 20 },
  { id: 50, level: 'forge', question: 'How does a force-torque sensor enable compliant robot behavior? Describe impedance control.', hint: 'Think about feeling vs seeing', answer: "F/T sensor measures forces at end-effector. Impedance control: robot behaves like spring-damper system. Target: F = K(x_d - x) + B(ẋ_d - ẋ). Robot 'yields' to external forces rather than rigidly tracking position.", points: 20 },
  { id: 51, level: 'edge', question: 'Derive the forward kinematics of a 2-DOF planar arm using DH parameters.', hint: 'Think about homogeneous transformation matrices', answer: 'T = T₁ × T₂ where each Tᵢ = Rot(z,θᵢ)×Trans(aᵢ,0,0). End-effector position: x = l₁cos(θ₁) + l₂cos(θ₁+θ₂), y = l₁sin(θ₁) + l₂sin(θ₁+θ₂).', points: 25 },
  { id: 52, level: 'edge', question: "What is the IROS paper 'Dynamic Movement Primitives' about? How are DMPs used for robot imitation learning?", hint: 'Think about encoding motion as a dynamical system', answer: 'DMPs: encode demonstrations as dynamical systems (spring-damper + learned forcing function). Robot learns the forcing function from demonstrations. Generalizes to new start/goal positions. Used in LfD (Learning from Demonstration).', points: 25 },
  { id: 53, level: 'edge', question: 'Explain the difference between model-based and model-free reinforcement learning for robot locomotion.', hint: 'Think about sample efficiency and computation', answer: 'Model-based: learns environment dynamics, plans in imagination (Dreamer, MBPO). Sample efficient but model errors compound. Model-free: directly learns policy from real experience (PPO, SAC). More samples needed but no model errors.', points: 25 },
  { id: 54, level: 'edge', question: 'What is the correspondence problem in visual robot grasping and how does deep learning address it?', hint: 'Think about matching 2D image to 3D grasp', answer: 'Correspondence: mapping pixel locations to 3D grasp poses. Classical: depth camera + point cloud segmentation. DL: GraspNet, 6-DoF GraspNet learn grasp quality directly from RGB-D. Implicit neural representations (NeRF) enable novel-view grasp planning.', points: 25 },
  { id: 55, level: 'edge', question: 'Explain why safety is the fundamental unsolved problem in autonomous robotics. What are 3 current approaches?', hint: 'Think about guarantees vs probabilities', answer: "Robots can't guarantee safety in open-world (infinite edge cases). Approaches: 1.Formal verification (provably safe within model, fails outside) 2.Runtime monitoring (shield policies block unsafe actions) 3.Conservative planning (uncertainty → slow down, request human).", points: 25 },
  { id: 56, level: 'edge', question: 'What is RLHF and how would you apply it to train a robot manipulation policy?', hint: 'Think about human preference as reward signal', answer: 'RLHF: Reinforcement Learning from Human Feedback. For manipulation: 1.Collect demonstrations 2.Show pairs of robot grasps to humans 3.Train reward model on preferences 4.Use reward model to fine-tune policy with RL. Avoids hand-crafting reward functions.', points: 25 },
  { id: 57, level: 'edge', question: 'Describe the architecture of NVIDIA Isaac ROS and how it accelerates perception pipelines.', hint: 'Think about GPU-accelerated nodes', answer: 'Isaac ROS: CUDA-accelerated ROS2 packages. Key: cuVSLAM (GPU SLAM), cuDNN inference (detection at 60fps), Isaac Perceptor (3D reconstruction). Eliminates CPU bottleneck for dense perception. Jetson Orin: 275 TOPS for edge deployment.', points: 25 },
  { id: 58, level: 'edge', question: 'What is Task and Motion Planning (TAMP) and why is it harder than motion planning alone?', hint: 'Think about combining symbolic and geometric reasoning', answer: 'TAMP: combines symbolic task planning (pick, place, open door) with geometric motion planning. Hard because: task plan validity depends on geometric feasibility, search space is combinatorial (discrete×continuous), and replanning needed when actions fail.', points: 25 },
  { id: 59, level: 'edge', question: 'Explain how diffusion models are being applied to robot policy learning (Diffusion Policy).', hint: 'Think about denoising as action generation', answer: 'Diffusion Policy: models action distribution as reverse diffusion process. Training: add noise to expert actions. Inference: iteratively denoise random noise → action sequence. Benefits: multimodal action distribution (multiple valid grasps), stable training vs GAN-based imitation.', points: 25 },
  { id: 60, level: 'edge', question: 'Design a minimal safe architecture for a surgical robot assistant operating near a human. What are the 5 non-negotiable safety systems?', hint: 'Think about hardware and software layers', answer: '1.Hardware E-stop (mechanical, not software) 2.Force limits (max torque at all joints, hardware-enforced) 3.Workspace monitoring (forbidden zones, laser curtains) 4.Redundant sensors (dual encoders, cross-checked) 5.Human-in-the-loop confirmation for irreversible actions.', points: 25 },
];

function dayOfYearUTC(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((now - start) / 86_400_000);
}

/** YYYY-MM-DD in UTC — used as the localStorage key per day. */
export function todayKeyUTC(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDailyChallenge(now: Date = new Date()): Challenge {
  const idx = dayOfYearUTC(now) % challenges.length;
  return challenges[idx];
}

export function getChallengeById(id: number): Challenge | undefined {
  return challenges.find((c) => c.id === id);
}

/** Most recent N challenges by date (today first, going back). */
export function getRecentChallenges(count: number, now: Date = new Date()): Array<{ dateISO: string; challenge: Challenge }> {
  const out: Array<{ dateISO: string; challenge: Challenge }> = [];
  const baseDay = dayOfYearUTC(now);
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const idx = (baseDay - i + challenges.length * 100) % challenges.length;
    const dateISO = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    out.push({ dateISO, challenge: challenges[idx] });
  }
  return out;
}

export function totalChallengeCount(): number {
  return challenges.length;
}
