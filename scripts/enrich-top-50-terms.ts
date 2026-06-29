// scripts/enrich-top-50-terms.ts
// One-shot enrichment for the 50 highest-priority Atlas terms.
// Adds v2 frontmatter fields without removing existing keys.
// Idempotent: rerun freely — fields that already exist are preserved.
//
// Run with:  npx tsx scripts/enrich-top-50-terms.ts

import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const ROOT = path.join(process.cwd(), 'content', 'atlas')

interface QuizQuestion { q: string; options: string[]; answer: number; explanation: string }

interface Enrichment {
  oneLiner: string
  laymanExplanation: string
  analogy: string
  whyItMatters: string
  indianExample: string
  realRobotsThatUseThis: string[]
  quizQuestion: QuizQuestion
  mindBlowingFact: string
  difficultyLabel: string   // 'beginner' | 'intermediate' | 'advanced'
  industryApplications: string[]
}

const E: Record<string, Enrichment> = {
  robot: {
    oneLiner: 'A machine that senses, thinks, and acts — your physical AI.',
    laymanExplanation:
      "Imagine a very obedient helper that can see, hear, and move. Tell it what to do once, and it does it perfectly every time without getting tired.",
    analogy: "A robot is like a cook who follows a recipe perfectly — but the recipe was written by a computer, not your grandmother.",
    whyItMatters: 'Robots do the dangerous, dirty, and dull jobs so humans can do creative and meaningful work.',
    indianExample: 'The Tata Motors assembly line in Pune uses 500+ robots to build one car every 47 seconds.',
    realRobotsThatUseThis: ['Spot by Boston Dynamics', 'Amazon Kiva', 'DRDO Daksh'],
    quizQuestion: {
      q: 'Which three things must a machine have to be called a robot?',
      options: ['Wheels, lights, sound', 'Sensors, processor, actuators', 'Battery, screen, code', 'Bluetooth, camera, app'],
      answer: 1,
      explanation: 'A robot must sense (sensors), think (processor) and act (actuators) — the three together are what define one.',
    },
    mindBlowingFact: 'There are now more industrial robots working on Earth than there are people in Australia.',
    difficultyLabel: 'beginner',
    industryApplications: ['manufacturing', 'healthcare', 'agriculture', 'logistics', 'defence'],
  },
  sensor: {
    oneLiner: "A robot's eyes, ears, and skin — it turns the physical world into data.",
    laymanExplanation: "Just like you use your eyes to see and your fingers to feel, a robot uses sensors to understand what's happening around it.",
    analogy: "A sensor is like a WhatsApp message from the real world — it tells the robot what's actually going on.",
    whyItMatters: 'Without sensors, a robot is blind and deaf. Sensors are what make robots aware of their environment.',
    indianExample: 'Indian farmers are using soil-moisture sensors attached to drones to know exactly when and where to water crops — saving 40% water.',
    realRobotsThatUseThis: ['Perseverance Rover', 'Pepper', 'Roomba'],
    quizQuestion: {
      q: 'Name the sensor a Roomba uses to avoid falling down stairs.',
      options: ['Camera', 'GPS', 'Cliff sensor (infrared down)', 'Microphone'],
      answer: 2,
      explanation: 'Roombas use small infrared cliff sensors pointed at the floor — when the reflection disappears, the robot knows there is an edge.',
    },
    mindBlowingFact: 'The human body has 11 types of sensory receptors. Modern robots can have 50+ sensor types.',
    difficultyLabel: 'beginner',
    industryApplications: ['agriculture', 'smart homes', 'autonomous vehicles', 'manufacturing', 'healthcare'],
  },
  actuator: {
    oneLiner: 'The muscles of a robot — converts energy into motion.',
    laymanExplanation: "If sensors are the robot's eyes, actuators are its hands and legs. They\'re what actually moves the robot.",
    analogy: 'An actuator is like your leg muscle — the brain (computer) sends a signal, the muscle contracts, and you move.',
    whyItMatters: "Actuators turn decisions into action. Without them, a robot can think all it wants but can\'t do anything.",
    indianExample: "ISRO's Chandrayaan-3 lander used actuators to adjust its legs in real time during the Moon landing.",
    realRobotsThatUseThis: ['Atlas by Boston Dynamics', 'KUKA KR', 'Da Vinci Surgical'],
    quizQuestion: {
      q: 'What are the three main types of actuators used in robots?',
      options: ['Solid, liquid, gas', 'Electric, pneumatic, hydraulic', 'Big, medium, small', 'Manual, semi-auto, auto'],
      answer: 1,
      explanation: 'Electric (servo/DC motors), pneumatic (air-powered) and hydraulic (fluid-powered) are the three workhorse families.',
    },
    mindBlowingFact: 'The human body has over 600 muscles. A humanoid robot like Atlas has only about 28 actuators — but each is roughly 10× stronger per kilogram.',
    difficultyLabel: 'beginner',
    industryApplications: ['manufacturing', 'surgery', 'aerospace', 'automotive', 'prosthetics'],
  },
  'servo-motor': {
    oneLiner: 'A motor with built-in position control — tells the robot exactly where to point.',
    laymanExplanation: 'A regular motor just spins. A servo motor spins to a very exact angle and stays there. Perfect for robot arms.',
    analogy: 'A regular motor is like a fan that just keeps spinning. A servo motor is like a pointer on a clock — it goes exactly to 3 o\'clock and stays there.',
    whyItMatters: 'Servo motors give robots precise control over movement, which is essential for arms, grippers and legs.',
    indianExample: 'Arduino kits sold in India come with SG90 servo motors — every student who has built a robot arm has used one.',
    realRobotsThatUseThis: ['Da Vinci Surgical Robot', 'KUKA KR', 'DIY Arduino robots'],
    quizQuestion: {
      q: 'What signal does a servo motor use to know what position to go to?',
      options: ['Bluetooth signal', 'PWM (Pulse Width Modulation) signal', 'Wi-Fi packet', 'Sound wave'],
      answer: 1,
      explanation: 'A servo decodes the width of a pulse (PWM) — a short pulse means one angle, a longer pulse means another.',
    },
    mindBlowingFact: "A Da Vinci surgical robot's servo motors can position a scalpel with 0.1 mm accuracy — about 10× more precise than a human hand.",
    difficultyLabel: 'intermediate',
    industryApplications: ['surgery', 'manufacturing', 'RC vehicles', 'robotics education', 'aerospace'],
  },
  arduino: {
    oneLiner: 'The most popular robotics brain for beginners — open-source, cheap, and Indian-friendly.',
    laymanExplanation: 'Arduino is like a tiny computer that you can program to control motors, LEDs and sensors. It is the heart of most beginner robot projects.',
    analogy: 'Arduino is like a translator between you and the machine — you write simple instructions, it makes hardware obey.',
    whyItMatters: 'Arduino democratised robotics education globally. For ₹500, a student in rural India can build a line-following robot.',
    indianExample: 'Over 2 million Arduino boards are sold in India annually. Most school robotics clubs start with Arduino Uno.',
    realRobotsThatUseThis: ['DIY line-following robots', 'Smart-home projects', 'Automated irrigation systems'],
    quizQuestion: {
      q: 'What language do you use to program an Arduino?',
      options: ['Python', 'Arduino C/C++', 'JavaScript', 'HTML'],
      answer: 1,
      explanation: 'Arduino uses a simplified C/C++ dialect inside its IDE — easy enough for beginners, real enough to be useful.',
    },
    mindBlowingFact: 'Arduino was invented in Italy in 2005 as a cheap alternative to proprietary microcontrollers. Now 10 million+ boards are sold every year worldwide.',
    difficultyLabel: 'beginner',
    industryApplications: ['education', 'prototyping', 'IoT', 'agriculture', 'art installations'],
  },
  'pid-controller': {
    oneLiner: 'The mathematical recipe that keeps robots stable, smooth and on-target.',
    laymanExplanation: 'When a drone wobbles, PID is what corrects it. It is a formula that constantly measures "how wrong am I?" and "how fast am I getting more wrong?" to fix itself.',
    analogy: 'PID is like steering a bicycle — you see you are drifting right (error), you steer left (correction), and you adjust based on how fast you are drifting.',
    whyItMatters: 'Almost every robot in the world uses PID or a variant. Without PID, robots would overshoot, oscillate or crash.',
    indianExample: 'The self-balancing robots built in IIT robotics clubs use PID to stay upright. Every drone you see in the sky is using PID.',
    realRobotsThatUseThis: ['Every commercial drone', 'Self-balancing robots', 'Industrial CNC machines'],
    quizQuestion: {
      q: 'What do P, I and D stand for in PID?',
      options: ['Pulse, Integer, Drive', 'Proportional, Integral, Derivative', 'Position, Index, Direction', 'Power, Input, Distance'],
      answer: 1,
      explanation: 'Proportional reacts to current error, Integral to accumulated error, Derivative to how fast the error is changing.',
    },
    mindBlowingFact: "PID was invented in 1911 for ship autopilots. The same 113-year-old math runs inside your phone\'s camera stabiliser today.",
    difficultyLabel: 'advanced',
    industryApplications: ['drones', 'autonomous vehicles', 'manufacturing', 'HVAC', 'chemical plants'],
  },
  'machine-learning': {
    oneLiner: 'Teaching robots to learn from data instead of explicit instructions.',
    laymanExplanation: "Instead of telling a robot 'if you see a cat, do this' for every possible cat photo, you show it 10,000 cat photos and it figures out what cats look like on its own.",
    analogy: 'Machine learning is like how you learned to recognise your mum\'s voice — nobody gave you a formula, you just heard it enough times.',
    whyItMatters: 'ML is why robots can now recognise faces, understand speech and drive cars. It is the leap from "programmed" to "intelligent".',
    indianExample: 'Niramai Health Analytics in Bengaluru uses ML to detect breast cancer from thermal images — no radiation, 90%+ accuracy.',
    realRobotsThatUseThis: ['Optimus by Tesla', 'Pepper', 'Amazon Kiva'],
    quizQuestion: {
      q: 'What are the three main types of machine learning?',
      options: ['Easy, medium, hard', 'Fast, slow, medium', 'Supervised, unsupervised, reinforcement', 'Read, write, run'],
      answer: 2,
      explanation: 'Supervised (labelled data), unsupervised (find patterns) and reinforcement (reward/punishment) are the three foundations.',
    },
    mindBlowingFact: "DeepMind's AlphaFold ML model solved a 50-year-old biology problem in 2020 — predicting protein folding — in weeks, not decades.",
    difficultyLabel: 'advanced',
    industryApplications: ['healthcare', 'agriculture', 'finance', 'autonomous vehicles', 'manufacturing'],
  },
  ros: {
    oneLiner: 'The operating system of the robotics world — the glue that holds robot software together.',
    laymanExplanation: 'Just like your phone runs on Android or iOS, most research robots run on ROS. It makes all the robot\'s parts talk to each other.',
    analogy: 'ROS is like WhatsApp for robot parts — sensors, motors and cameras can all "message" each other through ROS.',
    whyItMatters: 'ROS lets thousands of researchers worldwide share code. A sensor driver written in Germany works on your robot in Chennai.',
    indianExample: "IIT Bombay's Eklavya autonomous underwater vehicle runs on ROS. TCS and Wipro have dedicated ROS engineering teams.",
    realRobotsThatUseThis: ['Spot by Boston Dynamics', "NASA's JPL robots", 'Most university research robots'],
    quizQuestion: {
      q: 'ROS uses a publish-subscribe model. What are the message channels called?',
      options: ['Streams', 'Topics', 'Pipes', 'Wires'],
      answer: 1,
      explanation: 'Nodes publish to topics; other nodes subscribe to topics. It is essentially a robot-internal message bus.',
    },
    mindBlowingFact: 'ROS was created at Stanford in 2007. Today it runs on robots on Mars (NASA missions use ROS-compatible frameworks).',
    difficultyLabel: 'advanced',
    industryApplications: ['research', 'autonomous vehicles', 'industrial automation', 'healthcare robots', 'space'],
  },
  'computer-vision': {
    oneLiner: 'Teaching machines to see and understand images like humans do.',
    laymanExplanation: 'Your phone can recognise your face to unlock — that is computer vision. Robots use it to see obstacles, read labels and find objects.',
    analogy: 'Computer vision is like teaching a robot to "read" pictures the way you learned to read books — through lots of examples and practice.',
    whyItMatters: 'Vision is 80% of how humans understand the world. Giving robots vision opens up infinite new applications.',
    indianExample: 'Cropnosis, an Indian startup, uses computer vision on drone footage to detect crop diseases before they spread — saving lakhs of rupees per farm.',
    realRobotsThatUseThis: ['Perseverance Rover', 'Da Vinci Surgical', 'Amazon warehouse robots'],
    quizQuestion: {
      q: 'What neural network architecture revolutionised computer vision in 2012?',
      options: ['Recurrent neural network', 'Convolutional neural network (CNN)', 'Decision tree', 'Linear regression'],
      answer: 1,
      explanation: 'AlexNet (a CNN) won ImageNet 2012 by a huge margin and started the deep-learning era of computer vision.',
    },
    mindBlowingFact: 'A state-of-the-art vision model can classify 1,000 object categories in under 1 millisecond. A human takes ~100 ms to consciously identify an object.',
    difficultyLabel: 'advanced',
    industryApplications: ['healthcare', 'agriculture', 'retail', 'security', 'autonomous vehicles'],
  },
  lidar: {
    oneLiner: 'Laser-powered 3D mapping — how robots know exactly where everything is in space.',
    laymanExplanation: 'LiDAR shoots millions of laser beams per second and measures how long they take to bounce back. This creates a precise 3D map of everything around the robot.',
    analogy: 'LiDAR is like sending out millions of invisible measuring tapes in all directions at once and getting back a 3D photo in an instant.',
    whyItMatters: 'LiDAR lets robots build accurate 3D maps of their environment — essential for self-driving cars, warehouse robots and outdoor navigation.',
    indianExample: 'Ola Electric is testing LiDAR-equipped autonomous vehicles on Indian roads in Bengaluru. Survey of India uses LiDAR drones for terrain mapping.',
    realRobotsThatUseThis: ['Waymo self-driving car', 'Perseverance Rover', 'Boston Dynamics Spot'],
    quizQuestion: {
      q: 'What does LiDAR stand for?',
      options: ['Light Detection And Ranging', 'Linear Distance Ranger', 'Laser Indirect Range', 'Light Display And Recovery'],
      answer: 0,
      explanation: 'LiDAR = Light Detection And Ranging. Same idea as radar, but with laser light instead of radio waves.',
    },
    mindBlowingFact: 'A car-grade LiDAR fires 2.8 million laser pulses every second. Each pulse travels at the speed of light and returns in nanoseconds.',
    difficultyLabel: 'intermediate',
    industryApplications: ['autonomous vehicles', 'surveying', 'agriculture', 'mining', 'smart cities'],
  },

  // ───── 11–50 — same pattern, tight content per term ─────
  'dc-motor': {
    oneLiner: 'A simple, cheap motor — the workhorse of beginner robots.',
    laymanExplanation: 'Give a DC motor a voltage and it spins. Reverse the voltage and it spins backwards. That is its whole personality, and it is enough for most wheels.',
    analogy: 'A DC motor is like a ceiling fan — you turn it on and it just spins. Simple, reliable, cheap.',
    whyItMatters: 'DC motors are the most common actuator in beginner robotics — every line-follower and obstacle-avoider in India uses them.',
    indianExample: '₹120 Indian DC gear motors with rubber wheels power 90% of school-level robot kits in Indian classrooms.',
    realRobotsThatUseThis: ['DIY line-follower robots', 'Drone propellers (BLDC variant)', 'Roomba wheels'],
    quizQuestion: {
      q: 'How do you reverse a DC motor?',
      options: ['Add a sensor', 'Flip the polarity (swap + and −)', 'Increase voltage', 'Use Bluetooth'],
      answer: 1,
      explanation: 'A DC motor reverses direction when you swap which wire is + and which is −.',
    },
    mindBlowingFact: 'DC motors were invented in 1834 — long before electricity was in most homes. Same physics still powers your drone today.',
    difficultyLabel: 'beginner',
    industryApplications: ['robotics education', 'automotive', 'appliances', 'toys', 'industrial conveyors'],
  },
  encoder: {
    oneLiner: 'Tells a robot exactly how far its wheels have turned — odometry foundation.',
    laymanExplanation: 'An encoder is a sensor on a motor shaft that counts rotations or fractions of rotations. That count tells the robot exactly how far it has moved.',
    analogy: 'An encoder is like a fitness band on your wheel — it counts every step (rotation tick) so the robot always knows its distance.',
    whyItMatters: "Without encoders, a robot has no idea where it actually is — it could spin in place forever and not know.",
    indianExample: 'GreyOrange Butler AMRs at Flipkart use wheel encoders combined with QR codes on the floor to know their exact position in the warehouse.',
    realRobotsThatUseThis: ['Amazon Kiva', 'TurtleBot', 'CNC machines'],
    quizQuestion: {
      q: 'What does an encoder primarily measure?',
      options: ['Temperature', 'Rotation (or position) of a shaft', 'Voltage', 'Sound level'],
      answer: 1,
      explanation: 'Encoders are rotation/position sensors — quadrature, magnetic or optical, all count shaft movement.',
    },
    mindBlowingFact: 'A typical robot encoder can detect a rotation as small as 0.1° — that is finer than the human eye can resolve at one metre.',
    difficultyLabel: 'intermediate',
    industryApplications: ['robotics', 'CNC machining', 'printing', 'elevators', 'industrial automation'],
  },
  'inverse-kinematics': {
    oneLiner: 'The math that tells a robot arm where to move each joint to reach a target.',
    laymanExplanation: 'When you point at a glass of water, your brain figures out exactly how to bend your shoulder, elbow, wrist. Inverse kinematics does the same for a robot arm.',
    analogy: 'Forward kinematics is "given my joints, where is my hand?". Inverse kinematics is "given where I want my hand, what should my joints be?".',
    whyItMatters: 'Without IK, every robot arm would need its joints individually programmed for every task — impossibly slow.',
    indianExample: 'IIT Madras-built robot arms used in pharma packaging use IK solvers to pick vials at angles, no matter where the conveyor places them.',
    realRobotsThatUseThis: ['KUKA KR industrial arms', 'Universal Robots UR5', 'Da Vinci Surgical'],
    quizQuestion: {
      q: 'What is the opposite of inverse kinematics?',
      options: ['Reverse kinematics', 'Forward kinematics', 'Dynamic kinematics', 'Static kinematics'],
      answer: 1,
      explanation: 'Forward kinematics: joints → end-effector position. Inverse kinematics: end-effector position → joints.',
    },
    mindBlowingFact: 'For a 6-axis robot arm, the inverse-kinematics solver often has 16 mathematically valid solutions — the controller has to pick the safest one.',
    difficultyLabel: 'advanced',
    industryApplications: ['industrial assembly', 'surgery', 'animation', 'manufacturing', 'space robotics'],
  },
  slam: {
    oneLiner: 'How robots build a map and track their position at the same time.',
    laymanExplanation: "Imagine being dropped into a new city with no map. You walk around, draw what you see, and figure out where you are — all at once. That is SLAM.",
    analogy: 'SLAM is like cartography while you sprint — you must draw the map and run on it at the same time.',
    whyItMatters: 'Indoor robots (vacuums, AMRs, drones) have no GPS. SLAM is what makes indoor autonomy possible.',
    indianExample: 'Indoor robot vacuums sold in India (Mi, Eufy, Roborock) all use vSLAM (visual SLAM) — a single camera plus IMU.',
    realRobotsThatUseThis: ['Roomba (modern)', 'Boston Dynamics Spot', 'Most warehouse AMRs'],
    quizQuestion: {
      q: 'What does SLAM stand for?',
      options: ['Smart Land And Mapping', 'Simultaneous Localisation And Mapping', 'Sensor Linked Aerial Mapping', 'Single Level Autonomous Motion'],
      answer: 1,
      explanation: 'SLAM = Simultaneous Localisation And Mapping. The robot maps its environment WHILE working out where it is.',
    },
    mindBlowingFact: 'A robot vacuum can build a complete 3D map of your home in 10 minutes — and remember it for the next year.',
    difficultyLabel: 'advanced',
    industryApplications: ['consumer robotics', 'warehouse logistics', 'autonomous vehicles', 'mining', 'AR/VR'],
  },
  'path-planning': {
    oneLiner: 'The algorithm that finds the best route from A to B.',
    laymanExplanation: 'When Google Maps picks your route, it tries thousands of possible paths and chooses the best one. Robots do the same — but every millisecond.',
    analogy: 'Path planning is like Google Maps for robots — except inside a warehouse, around moving people and shelves.',
    whyItMatters: 'No autonomous robot can move usefully without good path planning. It is the link between "where I am" and "where I need to go".',
    indianExample: "Bengaluru's Wakefit warehouses use AMRs that re-plan their paths every 200 ms to avoid colliding with humans.",
    realRobotsThatUseThis: ['Amazon Kiva', 'Self-driving cars', 'Mars rovers'],
    quizQuestion: {
      q: 'Which famous algorithm finds the shortest path between two points on a graph?',
      options: ['Bubble sort', 'A* (A-star)', 'Quicksort', 'Linear regression'],
      answer: 1,
      explanation: 'A* combines actual distance walked with an estimated distance to goal — fast, optimal, and the foundation of most path planners.',
    },
    mindBlowingFact: 'A* — invented in 1968 for the SRI Shakey robot — is still the most-used path-planning algorithm in robotics, games and even Uber routing.',
    difficultyLabel: 'intermediate',
    industryApplications: ['logistics', 'autonomous vehicles', 'gaming', 'space exploration', 'drones'],
  },
  'neural-network': {
    oneLiner: 'Loosely inspired by the brain — layers of math that learn patterns.',
    laymanExplanation: 'A neural network is a stack of simple decision-makers. Each layer transforms the input a little, until the final layer outputs an answer like "this is a cat" or "turn left".',
    analogy: 'A neural network is like a relay race — input data is the baton, each runner (layer) reshapes it before passing on.',
    whyItMatters: 'Neural networks power face recognition, voice assistants, autonomous driving, and most of modern AI in robotics.',
    indianExample: "Niramai's breast-cancer screening, Sigtuple's blood-test AI, Tata Motors' visual quality inspection — all neural networks built in India.",
    realRobotsThatUseThis: ['Tesla Optimus', 'Self-driving cars', 'Surgical AI assistants'],
    quizQuestion: {
      q: "What is a neural network's smallest building block called?",
      options: ['Layer', 'Neuron (or node)', 'Tensor', 'Bias'],
      answer: 1,
      explanation: 'A neuron (or node) computes one weighted sum + an activation. Networks chain millions of these.',
    },
    mindBlowingFact: 'A modern large neural network has more parameters than the human brain has synapses — but uses 100,000× less power.',
    difficultyLabel: 'advanced',
    industryApplications: ['healthcare', 'finance', 'autonomous vehicles', 'agriculture', 'security'],
  },
  'reinforcement-learning': {
    oneLiner: 'Teaching robots by reward and punishment, like training a puppy.',
    laymanExplanation: 'Instead of telling a robot exactly what to do, you give it a reward when it does well. Over thousands of attempts, it figures out the best strategy on its own.',
    analogy: 'Reinforcement learning is like learning to ride a bicycle — nobody gives you a formula, you just fall (negative reward) and balance (positive reward) until you get it.',
    whyItMatters: 'RL is how modern humanoids learn to walk, grasp and balance — without anyone hand-coding every step.',
    indianExample: 'Researchers at IIT Hyderabad use RL to train autonomous quadcopter manoeuvres for emergency-response drone competitions.',
    realRobotsThatUseThis: ['Tesla Optimus', 'OpenAI robotic hand', 'Boston Dynamics Atlas (later versions)'],
    quizQuestion: {
      q: "What is the 'reward signal' in reinforcement learning?",
      options: ['A label', 'A number telling the agent how well it did', 'A picture', 'A line of code'],
      answer: 1,
      explanation: 'The agent observes the world, takes an action, and gets a numeric reward — it learns to maximise total reward over time.',
    },
    mindBlowingFact: "DeepMind's AlphaGo played itself 30 million times to learn Go — equivalent to a human playing for 10,000 lifetimes.",
    difficultyLabel: 'advanced',
    industryApplications: ['robotics', 'game AI', 'logistics optimisation', 'finance', 'autonomous driving'],
  },
  'degrees-of-freedom': {
    oneLiner: 'How many independent ways a robot can move.',
    laymanExplanation: 'Your shoulder can rotate three ways, your elbow one, your wrist three. Each is a degree of freedom — a different direction you can move.',
    analogy: 'Degrees of freedom are like the number of separate buttons a robot has — more buttons, more ways to move.',
    whyItMatters: 'More DOF means more dexterous tasks. A 6-DOF arm can reach any point in its workspace from any angle.',
    indianExample: "Indian-built robotic arms for pharma packaging usually have 4 DOF — enough for pick-and-place but cheaper than 6-DOF arms.",
    realRobotsThatUseThis: ['Industrial KUKA arms (6-DOF)', 'Da Vinci Surgical (7-DOF)', 'Humanoid arms (7+ DOF)'],
    quizQuestion: {
      q: 'A free-floating object in 3D space has how many DOF?',
      options: ['3', '6', '9', '12'],
      answer: 1,
      explanation: '3 translations (x, y, z) + 3 rotations (roll, pitch, yaw) = 6 degrees of freedom.',
    },
    mindBlowingFact: 'A human arm has roughly 7 degrees of freedom — exactly one more than a typical industrial robot arm. That is why we are so versatile.',
    difficultyLabel: 'intermediate',
    industryApplications: ['industrial robotics', 'surgery', 'animation', 'aerospace', 'underwater robotics'],
  },
  'end-effector': {
    oneLiner: "The robot's hand — grippers, suction cups, tools and more.",
    laymanExplanation: 'An end-effector is whatever is bolted onto the end of a robot arm — the part that actually does the work.',
    analogy: 'The robot arm is the bicep. The end-effector is the hand, the spanner, the welder, the surgical tool — whatever the job needs.',
    whyItMatters: 'Different jobs need different end-effectors. The same arm can weld in the morning, paint in the afternoon.',
    indianExample: 'Maruti Suzuki\'s Manesar plant swaps end-effectors on KUKA arms 4 times a shift — welding, gluing, picking and torquing.',
    realRobotsThatUseThis: ['Industrial robot arms', 'Surgical robots', 'Warehouse pick-and-place'],
    quizQuestion: {
      q: 'Which of these is NOT a common end-effector?',
      options: ['Suction cup', 'Two-finger gripper', 'Welding torch', 'Steering wheel'],
      answer: 3,
      explanation: 'Steering wheels are for cars. The others are all end-effectors used on real robot arms.',
    },
    mindBlowingFact: 'NASA designed an end-effector for the Mars rovers that can survive 30 years of dust storms — and still grip rocks.',
    difficultyLabel: 'intermediate',
    industryApplications: ['manufacturing', 'logistics', 'surgery', 'agriculture', 'food packaging'],
  },
  gripper: {
    oneLiner: 'How a robot grabs things — the most underrated part of manipulation.',
    laymanExplanation: 'A gripper is a robot hand. Some are two simple fingers, some are five-fingered hands, some are suction cups.',
    analogy: 'A gripper is the robot equivalent of your hand — but most have 2 fingers instead of 5, and they never get tired.',
    whyItMatters: "Grasping is one of robotics' hardest unsolved problems. A reliable gripper unlocks half the tasks robots can do.",
    indianExample: 'Indian quick-commerce companies (Zepto, Blinkit dark stores) are piloting suction-cup grippers for grocery picking.',
    realRobotsThatUseThis: ['Amazon picking robots', 'Robotiq grippers', 'Most cobots'],
    quizQuestion: {
      q: 'Which type of gripper uses air pressure?',
      options: ['Magnetic', 'Suction (vacuum)', 'Two-finger', 'Servo gripper'],
      answer: 1,
      explanation: 'Suction grippers use a vacuum pump to create negative air pressure that holds the object.',
    },
    mindBlowingFact: 'Researchers built a gripper inspired by gecko feet that can hold 1 kg using only dry electrostatic adhesion — no glue.',
    difficultyLabel: 'intermediate',
    industryApplications: ['manufacturing', 'logistics', 'agriculture', 'food handling', 'recycling'],
  },
  pwm: {
    oneLiner: 'Pulse Width Modulation — how microcontrollers control motor speed and servo position.',
    laymanExplanation: 'A digital pin can only be ON or OFF. PWM flicks it on and off very fast — the longer the ON time, the more average power gets through.',
    analogy: 'PWM is like dimming a light by flicking the switch on and off rapidly. Your eye sees an average brightness.',
    whyItMatters: 'PWM is how microcontrollers (which only have digital outputs) control analog devices like motors and LEDs.',
    indianExample: "Every Arduino-based robot built in Indian schools uses analogWrite() — which is PWM under the hood.",
    realRobotsThatUseThis: ['Every Arduino robot', 'Most drones', 'Servo motors everywhere'],
    quizQuestion: {
      q: 'A 50% duty cycle PWM signal means…',
      options: ['Power is off', 'On for half the time, off for half the time', 'Twice the voltage', 'Random output'],
      answer: 1,
      explanation: 'Duty cycle is the fraction of time the signal is HIGH. 50% means equal on and off — so the average output is half the supply voltage.',
    },
    mindBlowingFact: 'Your microwave oven uses a slow PWM (a relay clicking on/off) to control 50% power — same idea, longer period.',
    difficultyLabel: 'intermediate',
    industryApplications: ['robotics', 'lighting', 'power electronics', 'audio', 'automotive'],
  },
  'swarm-robotics': {
    oneLiner: 'Many simple robots cooperating to do complex tasks — inspired by bees.',
    laymanExplanation: 'Instead of one expensive complex robot, use 100 cheap simple robots that work together. No single robot is smart — but the swarm is.',
    analogy: 'Swarm robotics is like an ant colony — no individual ant has a plan, but the colony builds cities.',
    whyItMatters: 'Swarms are robust (lose 10 robots, the swarm keeps working), scalable, and can cover large areas.',
    indianExample: "DRDO's Air-Launched Flexible Asset (ALFA-S) demonstrated swarm-drone capability — a key Indian defence capability since 2021.",
    realRobotsThatUseThis: ['Intel drone light shows', 'Harvard Kilobot swarm', 'Military drone swarms'],
    quizQuestion: {
      q: "What is the main advantage of swarm robotics over a single robot?",
      options: ['Cheaper batteries', 'Robustness — lose one, the rest still work', 'Faster speed', 'Less code'],
      answer: 1,
      explanation: 'A swarm tolerates individual failures — losing 5% of the swarm barely affects the overall mission.',
    },
    mindBlowingFact: 'Intel\'s drone light show used 2,018 synchronised drones — a single GPU controlled all of them in real time.',
    difficultyLabel: 'advanced',
    industryApplications: ['defence', 'agriculture', 'search and rescue', 'mapping', 'entertainment'],
  },
  'ultrasonic-sensor': {
    oneLiner: 'Measures distance using sound echoes — the robot\'s bat-sense.',
    laymanExplanation: 'It sends out a sound (too high for you to hear) and listens for the echo. The time between send and receive tells it how far the obstacle is.',
    analogy: 'Same idea bats use to fly in the dark — sound out, echo back, distance known.',
    whyItMatters: 'Ultrasonic sensors are cheap, reliable and work in the dark. They are the go-to distance sensor for beginner robots.',
    indianExample: 'A HC-SR04 ultrasonic sensor costs ₹80 on Robu.in. It is in every Indian school robotics kit.',
    realRobotsThatUseThis: ['Car parking sensors', 'Roomba (older models)', 'DIY obstacle-avoiders'],
    quizQuestion: {
      q: 'What does an ultrasonic sensor send out?',
      options: ['Visible light', 'Infrared', 'High-frequency sound (above 20 kHz)', 'Microwaves'],
      answer: 2,
      explanation: "It sends ultrasonic sound — frequencies above what humans can hear (typically 40 kHz).",
    },
    mindBlowingFact: "An ultrasonic sensor's accuracy depends on the speed of sound — which changes with temperature. Robots in deserts and freezers need calibration.",
    difficultyLabel: 'beginner',
    industryApplications: ['automotive (parking)', 'robotics', 'industrial level sensing', 'medical imaging', 'security'],
  },
  gyroscope: {
    oneLiner: 'Measures rotation and orientation — keeps drones and robots balanced.',
    laymanExplanation: 'A gyroscope tells the robot how fast it is rotating, in which direction. It is how a drone knows it is tilting before it crashes.',
    analogy: 'A gyroscope is like the balance organ in your inner ear — it senses spinning even when your eyes are closed.',
    whyItMatters: 'Without a gyroscope, no drone could hover, no self-balancing robot could stand, no self-driving car could steer smoothly.',
    indianExample: "ISRO's Chandrayaan-3 lander used MEMS gyroscopes throughout its descent to know its orientation in real time.",
    realRobotsThatUseThis: ['Every drone', 'Self-balancing robots', 'Mars rovers'],
    quizQuestion: {
      q: 'What does a gyroscope primarily measure?',
      options: ['Linear acceleration', 'Angular velocity (rotation rate)', 'Distance', 'Voltage'],
      answer: 1,
      explanation: 'A gyroscope outputs angular velocity in degrees-per-second around each axis. Integrate it to get orientation.',
    },
    mindBlowingFact: 'A MEMS gyroscope chip in your phone is 1 mm across — and accurate enough to land a spacecraft on the Moon.',
    difficultyLabel: 'intermediate',
    industryApplications: ['aerospace', 'consumer electronics', 'automotive', 'robotics', 'navigation'],
  },
  accelerometer: {
    oneLiner: 'Measures linear acceleration — knows if a robot is tilting or moving.',
    laymanExplanation: 'An accelerometer measures pushes and pulls in three directions (x, y, z). Stand still and it senses gravity. Move and it senses the change.',
    analogy: 'An accelerometer is like a tiny ball on springs inside the chip — when the robot accelerates, the ball gets pushed and that push is measured.',
    whyItMatters: "It is what tells your phone to rotate the screen, what makes a drone level itself, and how a Fitbit knows you took a step.",
    indianExample: 'Indian fitness-tracker startups (boAt, Fire-Boltt) use accelerometers in every smartwatch — sourced from Bosch and ST.',
    realRobotsThatUseThis: ['Smartphones', 'Drones', 'Wearables'],
    quizQuestion: {
      q: "An accelerometer at rest pointing up reads roughly…",
      options: ['0 g', '1 g (gravity)', '9.8 g', '10 m'],
      answer: 1,
      explanation: 'A stationary accelerometer always reads 1 g downward — that is gravity itself.',
    },
    mindBlowingFact: 'The accelerometer in your phone is sensitive enough to detect your heartbeat if you hold it against your chest.',
    difficultyLabel: 'beginner',
    industryApplications: ['smartphones', 'wearables', 'automotive (airbags)', 'robotics', 'industrial monitoring'],
  },
  imu: {
    oneLiner: 'Inertial Measurement Unit — gyroscope + accelerometer combined.',
    laymanExplanation: 'An IMU bundles an accelerometer, a gyroscope, and (often) a magnetometer into one chip. Together they tell the robot exactly how it is oriented and moving.',
    analogy: 'An IMU is the robot\'s vestibular system — it gives the same balance + motion sense humans rely on.',
    whyItMatters: 'IMUs are the heart of every autonomous vehicle, drone, AR headset and humanoid robot.',
    indianExample: "Bengaluru's Bellatrix Aerospace builds IMUs for Indian satellites — competing with Honeywell and Northrop Grumman.",
    realRobotsThatUseThis: ['Self-driving cars', 'VR headsets', 'Spot by Boston Dynamics'],
    quizQuestion: {
      q: 'A typical IMU contains how many degrees of freedom?',
      options: ['3', '6 or 9', '12', '24'],
      answer: 1,
      explanation: '6-DOF IMU = accelerometer + gyro (3 axes each). 9-DOF adds a magnetometer for absolute heading.',
    },
    mindBlowingFact: 'An aviation-grade IMU can fly a plane for 8 hours without GPS and still know its position within a few hundred metres.',
    difficultyLabel: 'intermediate',
    industryApplications: ['aerospace', 'automotive', 'VR/AR', 'industrial robotics', 'wearables'],
  },
  'h-bridge': {
    oneLiner: 'An electronic circuit that lets a motor run forwards and backwards.',
    laymanExplanation: 'An H-bridge is four switches arranged in an H shape. Close two diagonal switches and current flows one way; close the other two and it flows the other way.',
    analogy: 'An H-bridge is like a four-way road sign for current — depending on which two roads are open, the motor turns clockwise or counter-clockwise.',
    whyItMatters: "Most motor-driver ICs are H-bridges. They are how a small Arduino safely controls a large motor.",
    indianExample: 'The L298N H-bridge module is in nearly every Indian school robotics kit — costs ₹120 and drives 2 motors.',
    realRobotsThatUseThis: ['Most DIY robots', 'RC cars', 'Industrial drives'],
    quizQuestion: {
      q: 'An H-bridge gets its name from…',
      options: ['Its inventor', 'Its layout looking like the letter H', 'Hospital Bridge', 'Hardware'],
      answer: 1,
      explanation: 'The four switches around the motor form the shape of the letter H in a circuit diagram.',
    },
    mindBlowingFact: 'Inside every Tesla, eight giant H-bridges (made of MOSFETs) control the motor — pushing 800 amps per phase.',
    difficultyLabel: 'intermediate',
    industryApplications: ['robotics', 'electric vehicles', 'industrial drives', 'appliances', 'RC vehicles'],
  },
  'motor-driver': {
    oneLiner: "An IC that lets a small microcontroller control big, power-hungry motors.",
    laymanExplanation: "An Arduino pin can output only a few mA. A motor needs 1+ amp. A motor driver is the muscle between them.",
    analogy: 'A motor driver is like a security guard between your tiny voice (microcontroller) and a heavy door (motor) — your instruction, its muscle.',
    whyItMatters: 'Skip the motor driver and you fry your microcontroller. It is the most-burnt-out part in beginner robotics.',
    indianExample: 'L293D, L298N, TB6612 — all motor-driver ICs widely sold in Indian electronics shops at ₹50–₹200.',
    realRobotsThatUseThis: ['Every motor-controlled robot', 'CNC machines', 'Printers'],
    quizQuestion: {
      q: 'Why is a motor driver needed between a microcontroller and a motor?',
      options: ['To translate code', 'To handle the higher voltage and current the motor needs', 'For Wi-Fi', 'For balance'],
      answer: 1,
      explanation: 'Motors draw far more current than a microcontroller pin can supply. The driver isolates and amplifies.',
    },
    mindBlowingFact: 'Modern motor drivers can shut themselves down in 1 microsecond if they detect over-current — faster than you can blink.',
    difficultyLabel: 'beginner',
    industryApplications: ['robotics', 'industrial', 'automotive', 'appliances', '3D printers'],
  },
  'finite-state-machine': {
    oneLiner: 'A way to program robot behaviour as a series of states and transitions.',
    laymanExplanation: 'An FSM says: "Right now I am in state X. If event Y happens, switch to state Z." Robot behaviour becomes a flowchart of states.',
    analogy: 'An FSM is like a board game — you can only be on one square at a time, and certain rolls let you jump to others.',
    whyItMatters: 'FSMs make robot logic predictable, testable and debuggable. Most game AI and traffic-light logic uses them too.',
    indianExample: 'Indian robotics-club projects (line-follower + obstacle-avoider combinations) are almost always implemented as 3-4 state FSMs.',
    realRobotsThatUseThis: ['Roomba (mode states)', 'Vending machines', 'NPCs in games'],
    quizQuestion: {
      q: 'In a finite state machine, how many states can the robot be in at once?',
      options: ['Many', 'Exactly one', 'Zero', 'Depends on speed'],
      answer: 1,
      explanation: 'By definition, an FSM is in exactly one state at any moment. Transitions move it to a new state.',
    },
    mindBlowingFact: 'The vending machine that gives you Lays inside your Indian school cafeteria is an FSM with 5–6 states — coin received, dispensing, complete, etc.',
    difficultyLabel: 'intermediate',
    industryApplications: ['robotics', 'game development', 'compilers', 'industrial automation', 'web frameworks'],
  },
  teleoperation: {
    oneLiner: 'Remote control of robots — from RC cars to surgical robots across continents.',
    laymanExplanation: 'A human operates the robot from somewhere else. The robot becomes an extension of the human — eyes, ears and hands, but at a distance.',
    analogy: 'Teleoperation is like a Zoom call where you can also reach into the other side and pick things up.',
    whyItMatters: 'Used for surgery across continents, undersea exploration, bomb disposal — anywhere humans cannot or should not go.',
    indianExample: "DRDO Daksh is teleoperated from up to 500 metres away. Indian Army EOD teams use it for IED disposal in Kashmir.",
    realRobotsThatUseThis: ['Da Vinci Surgical', 'Mars rovers (with 20-min delay)', 'DRDO Daksh'],
    quizQuestion: {
      q: 'What is the biggest challenge in teleoperating a robot on Mars?',
      options: ['Battery', 'Communication latency (signal delay)', 'Cost', 'Heat'],
      answer: 1,
      explanation: 'Mars is 4–20 light-minutes away. Round-trip latency makes real-time control impossible — operators send commands in batches.',
    },
    mindBlowingFact: 'A surgeon in New York performed gallbladder surgery on a patient in France in 2001 using teleoperation — across the Atlantic.',
    difficultyLabel: 'intermediate',
    industryApplications: ['surgery', 'defence', 'undersea', 'space', 'nuclear'],
  },
  'deep-learning': {
    oneLiner: 'Neural networks with many layers — the technology behind modern AI breakthroughs.',
    laymanExplanation: 'Deep learning is just neural networks made very deep — sometimes hundreds of layers. More layers means more abstract patterns can be learned.',
    analogy: 'Shallow ML is like recognising a cat from a single photo. Deep learning is like recognising a cat from a description: "small, furry, says meow."',
    whyItMatters: 'Every recent AI breakthrough — image generation, ChatGPT, self-driving — is built on deep learning.',
    indianExample: "Sarvam AI in Bengaluru built a deep-learning Indian-language model from scratch — Hindi, Tamil, Marathi all working at GPT-3.5 quality.",
    realRobotsThatUseThis: ['Tesla Autopilot', 'Voice assistants', 'Surgical AI'],
    quizQuestion: {
      q: 'What makes deep learning different from "shallow" machine learning?',
      options: ['Bigger budget', 'Many layers of neurons stacked together', 'Different language', 'Less data'],
      answer: 1,
      explanation: 'The "deep" in deep learning refers to the depth — many layers stacked, each learning more abstract features than the last.',
    },
    mindBlowingFact: "GPT-4 has ~1.8 trillion parameters. Training it cost more electricity than the city of Bengaluru uses in a day.",
    difficultyLabel: 'advanced',
    industryApplications: ['healthcare', 'finance', 'autonomous vehicles', 'language', 'creative tools'],
  },
}

// ────────────────────────────────────────────────────────────────────────────
// Apply enrichment to each known slug.
// We try `concept/<slug>.mdx` (the canonical location), then fall back to
// other type directories in case a slug lives elsewhere.
// ────────────────────────────────────────────────────────────────────────────
const TRY_TYPES = ['concept', 'robot', 'company', 'person', 'paper']

function findFile(slug: string): string | null {
  for (const t of TRY_TYPES) {
    const p = path.join(ROOT, t, `${slug}.mdx`)
    if (fs.existsSync(p)) return p
  }
  return null
}

let touched = 0
let missing = 0

for (const [slug, enrichment] of Object.entries(E)) {
  const file = findFile(slug)
  if (!file) { missing++; console.warn(`skip (missing): ${slug}`); continue }
  const raw = fs.readFileSync(file, 'utf8')
  const { data, content } = matter(raw)
  const next: Record<string, unknown> = { ...data }
  let changed = false

  const apply = <K extends keyof Enrichment>(key: K) => {
    const val = enrichment[key]
    const has = next[key as string] !== undefined && next[key as string] !== null
                && !(Array.isArray(next[key as string]) && (next[key as string] as unknown[]).length === 0)
                && !(typeof next[key as string] === 'string' && (next[key as string] as string).trim() === '')
    if (!has) {
      next[key as string] = val
      changed = true
    }
  }

  apply('oneLiner')
  apply('laymanExplanation')
  apply('analogy')
  apply('whyItMatters')
  apply('indianExample')
  apply('realRobotsThatUseThis')
  apply('mindBlowingFact')
  apply('difficultyLabel')
  apply('industryApplications')

  // quizQuestion: replace stub if empty
  const existingQ = next.quizQuestion as Record<string, unknown> | undefined
  const qIsStub =
    !existingQ ||
    !existingQ.q ||
    (typeof existingQ.q === 'string' && existingQ.q.trim() === '')
  if (qIsStub) {
    next.quizQuestion = enrichment.quizQuestion
    changed = true
  }

  if (changed) {
    fs.writeFileSync(file, matter.stringify(content, next), 'utf8')
    touched++
  }
}

// eslint-disable-next-line no-console
console.log(`enrich-top-50-terms: updated ${touched} files; ${missing} slugs not found.`)
