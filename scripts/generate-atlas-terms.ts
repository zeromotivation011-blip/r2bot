// scripts/generate-atlas-terms.ts
// Generates new Atlas concept terms as MDX files. Skips slugs that already exist.
// Run: npx tsx scripts/generate-atlas-terms.ts
//
// Each term gets:
//  - YAML frontmatter (title, summary, category, tags, seeAlso, lastReviewed)
//  - 300+ word body (definition / how it works / real-world example / why it matters)

import fs from 'node:fs';
import path from 'node:path';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'atlas', 'concept');

type Cat =
  | 'sensors'
  | 'actuators'
  | 'control'
  | 'programming'
  | 'mechanical'
  | 'ai-and-perception'
  | 'hardware'
  | 'robot-types'
  | 'safety'
  | 'india';

// Category → Atlas category enum (lib/atlas.ts)
const CATEGORY_TO_ATLAS: Record<Cat, string> = {
  sensors: 'sensors',
  actuators: 'actuators',
  control: 'control',
  programming: 'control',
  mechanical: 'fundamentals',
  'ai-and-perception': 'ai-and-perception',
  hardware: 'hardware',
  'robot-types': 'robot-types',
  safety: 'applications',
  india: 'applications',
};

type TermSpec = {
  slug: string;
  title: string;
  summary: string;
  category: Cat;
  tags: string[];
  seeAlso: string[];
  definition: string;
  howItWorks: string;
  realWorld: string;
  whyItMatters: string;
};

const TERMS: TermSpec[] = [
  // ===== Sensors =====
  {
    slug: 'gyroscope',
    title: 'Gyroscope in Robotics — Complete Guide',
    summary:
      'A gyroscope measures angular velocity around an axis. In robotics, gyroscopes enable balance, orientation, and motion estimation — central to drones, humanoids, and self-driving cars.',
    category: 'sensors',
    tags: ['imu', 'orientation', 'balance', 'sensor-fusion'],
    seeAlso: ['imu', 'accelerometer', 'sensor-fusion', 'humanoid-robot'],
    definition:
      "A gyroscope is a sensor that measures how fast an object is rotating around an axis — its angular velocity. In modern robotics it's a MEMS (micro-electro-mechanical systems) chip a few millimetres square, but the principle goes back to spinning mechanical tops used for navigation on early ships and aircraft.",
    howItWorks:
      "MEMS gyroscopes use a vibrating proof mass. When the device rotates, the Coriolis effect pushes the mass sideways. Tiny capacitive electrodes detect this deflection and convert it to a voltage proportional to rotation rate. The chip outputs degrees-per-second (or radians-per-second) across three axes — roll, pitch, and yaw. Robotics computers integrate the angular velocity over time to estimate orientation, though raw integration drifts, so gyros are nearly always fused with an accelerometer and sometimes a magnetometer.",
    realWorld:
      'Your smartphone uses a gyroscope to detect when you tilt the screen. A DJI quadcopter uses three gyros to stabilise its flight; if one fails mid-air, the drone tumbles. Boston Dynamics Atlas uses high-end gyros at over 1 kHz to remain balanced during parkour.',
    whyItMatters:
      "Without gyros, robots cannot know which way is up. Every walking robot, every drone, every autonomous car relies on gyros for moment-to-moment orientation. For a robotics learner in India, understanding gyroscopes opens the door to building self-balancing robots, drone autopilots, and IMU sensor fusion — all extremely common interview topics.",
  },
  {
    slug: 'accelerometer',
    title: 'Accelerometer in Robotics — Complete Guide',
    summary:
      'An accelerometer measures linear acceleration along an axis. In robotics, accelerometers detect motion, tilt, vibration, and gravity — essential for IMU-based pose estimation.',
    category: 'sensors',
    tags: ['imu', 'motion', 'tilt', 'sensor-fusion'],
    seeAlso: ['imu', 'gyroscope', 'sensor-fusion', 'humanoid-robot'],
    definition:
      'An accelerometer measures linear acceleration — the rate at which an object speeds up or slows down — along one or more axes. Modern MEMS accelerometers are tiny silicon chips that sit alongside gyroscopes inside almost every smartphone, drone, and robot.',
    howItWorks:
      'Inside the chip, a small proof mass is suspended on flexible springs. When the device accelerates, inertia keeps the mass behind, deflecting the springs by a measurable amount. Capacitive plates around the mass convert that deflection into a voltage signal. At rest, the accelerometer reads gravity (≈9.8 m/s²) on whichever axis points down — which is why an accelerometer can also be used to detect tilt and orientation when the robot is stationary.',
    realWorld:
      "When you flip your phone to landscape mode, the accelerometer detects the rotation in real time. A Roomba uses accelerometers to detect when it has been picked up. Cars trigger airbags using accelerometers that detect crash-level deceleration in under 5 ms.",
    whyItMatters:
      "Accelerometers paired with gyroscopes form an IMU — the heart of any motion-aware robot. Whether you're building a self-balancing robot, a drone, a wearable, or even a step counter for an Indian healthcare app, accelerometers are foundational hardware every robotics engineer must understand.",
  },
  {
    slug: 'imu-sensor',
    title: 'IMU Sensor in Robotics — Complete Guide',
    summary:
      'An IMU (Inertial Measurement Unit) combines accelerometer, gyroscope, and often a magnetometer to estimate orientation and motion in 3D space.',
    category: 'sensors',
    tags: ['imu', 'sensor-fusion', 'orientation'],
    seeAlso: ['imu', 'gyroscope', 'accelerometer', 'sensor-fusion'],
    definition:
      'An IMU (Inertial Measurement Unit) is a compact sensor module that combines an accelerometer, a gyroscope, and often a magnetometer into a single chip. It outputs raw inertial data that — when fused — gives a robot its real-time 3D orientation and motion.',
    howItWorks:
      "The accelerometer measures linear acceleration on three axes, the gyroscope measures angular velocity on three axes, and the magnetometer measures the Earth's magnetic field for heading. A sensor-fusion algorithm — typically an Extended Kalman Filter or Madgwick filter — combines these signals to reject noise and bias drift. The result is a clean quaternion or Euler-angle estimate of the robot's attitude.",
    realWorld:
      "DJI drones, Tesla Autopilot, every modern smartphone, and ISRO's Vyommitra all carry IMUs. In a Webots simulation or a Raspberry Pi project, the MPU-6050 (₹150 on Robu.in) is the most common starter IMU for Indian students.",
    whyItMatters:
      'IMUs are the most cost-effective way to give a robot proprioception — a sense of its own motion. Mastery of IMU fusion is a recurring interview topic at Indian robotics companies including GreyOrange and Ideaforge.',
  },
  {
    slug: 'depth-camera',
    title: 'Depth Camera in Robotics — Complete Guide',
    summary:
      'A depth camera captures the distance to objects in addition to colour. Robotics applications include obstacle avoidance, 3D mapping, and human-pose estimation.',
    category: 'sensors',
    tags: ['perception', 'rgbd', '3d-vision'],
    seeAlso: ['camera-vision', 'depth-sensor', 'lidar', 'computer-vision'],
    definition:
      'A depth camera is an imaging device that captures not only the colour of a scene, but also the distance from the camera to every visible point. The output is usually a colour image plus an aligned depth map — together called an RGB-D frame.',
    howItWorks:
      'Depth cameras work via one of three main techniques. Structured-light cameras (e.g., original Kinect) project an invisible infrared dot pattern and measure deformation. Time-of-flight (ToF) cameras emit modulated infrared light and measure the round-trip time to each pixel. Stereo depth cameras (e.g., Intel RealSense D435) use two lenses and triangulate disparity, much like human eyes.',
    realWorld:
      "Apple's Face ID uses a structured-light depth camera. Boston Dynamics Spot uses five Intel RealSense depth cameras for terrain perception. Warehouse robots at Flipkart use depth cameras to detect shelf-pod alignment.",
    whyItMatters:
      "Depth cameras let robots understand the 3D shape of their environment cheaply. For most mobile robotics tasks (pick-and-place, indoor navigation), a depth camera is the most cost-effective sensor — far cheaper than LIDAR. Every modern manipulation robot uses one.",
  },
  {
    slug: 'force-sensor',
    title: 'Force Sensor in Robotics — Complete Guide',
    summary:
      'Force sensors measure pushing, pulling, or twisting forces. In robotics they enable safe contact, delicate manipulation, and force-controlled assembly.',
    category: 'sensors',
    tags: ['haptics', 'manipulation', 'compliance'],
    seeAlso: ['force-torque-sensor', 'tactile-sensor', 'gripper', 'cobot'],
    definition:
      'A force sensor measures the magnitude (and sometimes the direction) of force applied to it. In robotics, force sensors range from cheap strain gauges to expensive 6-axis force-torque sensors used at the wrist of robotic arms.',
    howItWorks:
      "Most force sensors are built from strain gauges — tiny resistive elements bonded to a flexible structure. When force deforms the structure, the gauge's electrical resistance changes proportionally. A Wheatstone-bridge circuit converts the resistance shift into a voltage, which is digitised and reported. Six-axis sensors stack multiple strain elements to read forces and torques on every axis.",
    realWorld:
      'Universal Robots cobots use built-in force sensing at every joint, so they stop instantly on contact with a human. da Vinci surgical robots use wrist-mounted force sensors to give the surgeon haptic feedback. Even a basic ₹500 load cell on Robu.in lets students build a digital weighing scale.',
    whyItMatters:
      'Without force sensing, a robot is essentially blind to contact. Force-controlled manipulation is the difference between a robot that crushes a paneer cube and one that picks it up. Every modern collaborative robot, surgical robot, and humanoid uses force sensing somewhere.',
  },

  // ===== Actuators =====
  {
    slug: 'solenoid',
    title: 'Solenoid in Robotics — Complete Guide',
    summary:
      'A solenoid is a linear actuator that converts electrical current into linear motion using a magnetic coil. Robots use solenoids for valves, latches, and quick-action push/pull tasks.',
    category: 'actuators',
    tags: ['linear-actuator', 'electromagnet', 'valve'],
    seeAlso: ['linear-actuator', 'pneumatic-actuator', 'servo-motor'],
    definition:
      'A solenoid is a coil of wire wrapped around a movable iron plunger. When you pass current through the coil, the resulting magnetic field pulls the plunger inward — turning electrical energy into a quick, short, linear motion.',
    howItWorks:
      "When current flows through the coil, it creates a magnetic field along the axis of the coil. A ferromagnetic plunger inside the coil is attracted into the field, moving by a few millimetres against a spring. When the current stops, the spring returns the plunger to its rest position. A diode is normally placed across the coil to clamp the back-EMF generated when the current shuts off.",
    realWorld:
      'Your washing machine uses solenoid valves to control water inflow. Pinball machines flip their flippers using solenoids. In robotics, solenoid grippers can latch onto magnetic parts, and solenoid valves control pneumatic and hydraulic actuators.',
    whyItMatters:
      "Solenoids are the simplest, cheapest, fastest linear actuators available — perfect for binary 'on/off' tasks. For a beginner robotics builder in India, a 12V solenoid valve and a 5V relay are everything you need to build an automated plant-watering robot.",
  },
  {
    slug: 'brushless-motor',
    title: 'Brushless DC Motor (BLDC) in Robotics — Complete Guide',
    summary:
      'A BLDC motor uses electronic commutation instead of mechanical brushes. BLDC motors are highly efficient, durable, and dominate drones, e-scooters, and modern robotics.',
    category: 'actuators',
    tags: ['bldc', 'motor', 'esc'],
    seeAlso: ['dc-motor', 'servo-motor', 'motor-driver', 'pwm'],
    definition:
      'A Brushless DC motor (BLDC) is an electric motor that replaces the carbon brushes of a traditional DC motor with electronic commutation. This makes it more efficient, longer-lasting, and able to deliver more torque per gram of weight.',
    howItWorks:
      'A BLDC motor has permanent magnets on the rotor and three-phase windings on the stator. An Electronic Speed Controller (ESC) measures the rotor position using either Hall-effect sensors or back-EMF, then energises the stator coils in the correct sequence to generate continuous torque. Because there are no brushes, there is no friction, no sparking, and no wear — the motor can spin at high RPM almost indefinitely.',
    realWorld:
      "Every quadcopter uses four BLDC motors driven by ESCs. Tesla's electric vehicles run on BLDC drives. Drones from Ideaforge (Bengaluru) and e-scooters from Ola Electric all use BLDC motors built or sourced from India.",
    whyItMatters:
      "If you want to build any flying robot, racing drone, or modern e-vehicle, BLDC motors are the only option. Understanding ESC tuning, FOC (Field-Oriented Control), and BLDC physics is essential for serious robotics careers — especially in India's booming drone and EV sectors.",
  },

  // ===== Control =====
  {
    slug: 'feedback-loop',
    title: 'Feedback Loop in Robotics — Complete Guide',
    summary:
      "A feedback loop continuously measures a robot's output and adjusts its input to reach a desired target. It is the most fundamental control concept in all of robotics.",
    category: 'control',
    tags: ['control', 'pid', 'closed-loop'],
    seeAlso: ['pid-controller', 'closed-loop-control', 'feedback', 'state-machine'],
    definition:
      "A feedback loop is a control structure where the system measures its own output, compares it with a target (the setpoint), computes the error, and feeds that error back into the input to drive the output toward the target. It's the backbone of every stable robotic system.",
    howItWorks:
      'The loop has four parts: a sensor that measures the actual output, a comparator that subtracts measured from desired to compute error, a controller (often PID) that converts error into a command, and an actuator that applies the command. The cycle repeats continuously — typically hundreds to thousands of times per second — until the error is near zero.',
    realWorld:
      "A cruise-control system in a car is a feedback loop — measure speed, compare to setpoint, adjust throttle. A robotic arm holding position uses feedback at each joint. A Roomba's wall-following is a feedback loop based on side-sensor distance.",
    whyItMatters:
      "Open-loop systems blow up under disturbance; feedback loops self-correct. Mastering feedback is the difference between a robotics hobbyist and an engineer. Every PID tuner, ROS2 control node, and DRDO Daksh stabiliser is a feedback loop in disguise.",
  },
  {
    slug: 'feedforward-control',
    title: 'Feedforward Control in Robotics — Complete Guide',
    summary:
      'Feedforward control predicts the disturbance or load on a robot and pre-compensates for it, instead of waiting to react. Used with feedback for high-performance motion.',
    category: 'control',
    tags: ['control', 'feedforward', 'motion'],
    seeAlso: ['feedback-loop', 'pid-controller', 'model-predictive-control'],
    definition:
      "Feedforward control is a strategy where the controller adds an a-priori command based on a model of the system's expected behaviour — so the robot doesn't have to wait for an error before acting. It is the natural complement to feedback.",
    howItWorks:
      'A feedforward term is calculated from a known model — for example, the gravity torque on each joint of a robotic arm. The controller adds this term to the feedback-driven correction. The combined command moves the actuator more accurately because most of the load is already cancelled before any error appears.',
    realWorld:
      'When Boston Dynamics Atlas lifts a heavy box, a feedforward term anticipates the load and pre-energises the relevant joint motors. Cruise control adds feedforward when it detects an incline. Industrial paint robots compensate for spray-nozzle inertia with feedforward.',
    whyItMatters:
      "Feedforward dramatically improves tracking accuracy and reduces lag. It's a recurring topic in robotics interviews — and the secret behind why high-end robots feel so much smoother than DIY ones.",
  },
  {
    slug: 'bang-bang-control',
    title: 'Bang-Bang Control in Robotics — Complete Guide',
    summary:
      'Bang-bang (on/off) control switches the actuator between two extremes — fully on or fully off — based on whether the output is above or below the setpoint.',
    category: 'control',
    tags: ['control', 'on-off', 'hysteresis'],
    seeAlso: ['pid-controller', 'feedback-loop', 'closed-loop-control'],
    definition:
      "Bang-bang control is the simplest closed-loop control law: if the measured value is below the setpoint, the actuator is fully on; otherwise it is fully off. It is also called on-off control, two-position control, or hysteresis control.",
    howItWorks:
      "The controller compares the measured value to the setpoint. If error is positive, the actuator turns fully on; if error is negative, it turns fully off. To avoid rapid chattering near the setpoint, a hysteresis band is used — the actuator only switches when the error crosses outside a small dead zone around the setpoint.",
    realWorld:
      "Your home refrigerator is a bang-bang controller. So is most household heating. In robotics, a simple line-following robot toggles its motors fully left or fully right based on which IR sensor sees the line.",
    whyItMatters:
      "Bang-bang control is cheap, simple, and good enough for many tasks — perfect for first robotics projects. Indian students often start with bang-bang in their Arduino line-follower before moving to PID.",
  },
  {
    slug: 'fuzzy-logic',
    title: 'Fuzzy Logic in Robotics — Complete Guide',
    summary:
      "Fuzzy logic replaces strict true/false rules with degrees of truth. In robotics it enables natural-language control rules — useful when precise mathematical models aren't available.",
    category: 'control',
    tags: ['ai', 'fuzzy', 'control'],
    seeAlso: ['adaptive-control', 'pid-controller', 'state-machine'],
    definition:
      "Fuzzy logic is a form of many-valued logic where variables can take any value between 0 (false) and 1 (true). In robotics, it lets engineers write controllers in human-friendly rules like 'if distance is close and speed is fast, brake hard.'",
    howItWorks:
      "A fuzzy controller has three stages. First, fuzzification converts numeric inputs (e.g., distance = 1.2 m) into linguistic categories (near, medium, far) with overlapping membership functions. Next, a rule base of if-then rules evaluates the inputs. Finally, defuzzification converts the rule outputs back into a single numeric command.",
    realWorld:
      "Modern washing machines use fuzzy logic to decide cycle length based on load weight and dirt level. Camera autofocus uses it. Many Indian autonomous-rickshaw research projects use fuzzy logic to handle messy traffic conditions.",
    whyItMatters:
      "Fuzzy logic is invaluable when classical control models fail — for example, in highly non-linear or human-driven environments. It is a great bridge between symbolic AI and continuous control, and a common exam topic in Indian engineering curricula.",
  },
  {
    slug: 'adaptive-control',
    title: 'Adaptive Control in Robotics — Complete Guide',
    summary:
      'Adaptive control automatically adjusts its parameters as the robot operates — handling changing payloads, friction, or environments without manual re-tuning.',
    category: 'control',
    tags: ['control', 'adaptive', 'learning'],
    seeAlso: ['feedback-loop', 'pid-controller', 'model-predictive-control'],
    definition:
      "Adaptive control is a class of controllers that update their own gains or model parameters in real time, in response to changes in the system being controlled. Where classical PID requires a human to retune when conditions change, adaptive control retunes itself.",
    howItWorks:
      "An adaptive controller couples a standard control law (e.g., PID or LQR) with a parameter-adjustment mechanism. The adjustment mechanism observes the tracking error and modifies the controller gains using a known update rule — for instance, the MIT rule or Model Reference Adaptive Control (MRAC). Over time, the gains converge to values appropriate for the current operating condition.",
    realWorld:
      "Aircraft autopilots use adaptive control to handle fuel burn-off changing aircraft weight. Robotic arms picking up unknown payloads use adaptive control to retune in real time. Tesla Autopilot's lane-keeping uses an adaptive component to handle different road surfaces.",
    whyItMatters:
      "Adaptive control is essential whenever conditions vary unpredictably. For real-world Indian robotics — where dust, humidity, and load vary daily — adaptive control is more practical than re-tuning PID gains every morning.",
  },
  {
    slug: 'model-predictive-control',
    title: 'Model Predictive Control (MPC) in Robotics — Complete Guide',
    summary:
      'MPC predicts future robot behaviour over a horizon and solves an optimisation problem to choose the best control input — used in self-driving cars and quadrupeds.',
    category: 'control',
    tags: ['mpc', 'optimization', 'control'],
    seeAlso: ['feedforward-control', 'feedback-loop', 'pid-controller'],
    definition:
      'Model Predictive Control (MPC) is an advanced control strategy that uses a model of the robot to predict its future states across a short time window, then solves an optimisation problem at every step to pick the control input that minimises a cost (such as tracking error plus energy).',
    howItWorks:
      "At each control step, MPC: (1) predicts the trajectory of the robot for the next N steps using a dynamics model, (2) formulates an objective function (e.g., minimise position error + penalise large control efforts) plus constraints (e.g., max joint torque), (3) numerically solves this constrained optimisation, (4) applies only the first control input of the optimal sequence, then re-plans on the next step. This rolling-horizon approach is robust to disturbances.",
    realWorld:
      "Boston Dynamics Atlas uses MPC at 1 kHz to plan whole-body motions during parkour. Tesla Autopilot uses MPC for lane keeping. Quadrupeds like ANYmal and Unitree B2 use MPC to walk over rough terrain.",
    whyItMatters:
      "MPC handles constraints elegantly — something PID cannot. It is the dominant control method for high-performance modern robots. Any senior robotics role in India increasingly expects familiarity with MPC.",
  },
  {
    slug: 'cascade-control',
    title: 'Cascade Control in Robotics — Complete Guide',
    summary:
      'Cascade control uses two nested feedback loops — an inner fast loop for the actuator and an outer slow loop for the high-level goal — to deliver fast, stable response.',
    category: 'control',
    tags: ['control', 'cascade', 'nested-loops'],
    seeAlso: ['feedback-loop', 'pid-controller', 'closed-loop-control'],
    definition:
      "Cascade control is a control architecture with two nested feedback loops. The inner loop runs fast and regulates a primary variable (such as motor current or velocity); the outer loop runs slower and sets the setpoint for the inner loop based on a higher-level goal (such as position).",
    howItWorks:
      "The outer controller compares the desired output (e.g., joint position) with the measured output and produces a setpoint for the inner controller (e.g., desired velocity). The inner controller then closes the loop on velocity using current feedback. The inner loop is typically 5–10× faster than the outer, so disturbances are rejected quickly before they propagate.",
    realWorld:
      "Industrial robot arms almost universally use cascade control — current loop at 20 kHz, velocity loop at 2 kHz, position loop at 200 Hz. Pressure-controlled hydraulic systems use cascade with pressure-inside-flow loops.",
    whyItMatters:
      "Cascade control delivers faster response and better disturbance rejection than a single-loop PID, especially when the actuator dynamics are slow. Understanding cascade is essential before working on real motion-control systems.",
  },
  {
    slug: 'arduino-control',
    title: 'Arduino-Based Robot Control — Complete Guide',
    summary:
      'Arduino boards are the most common microcontroller platform for beginner robotics. They handle sensors, motor control, and PID with just a few lines of code.',
    category: 'control',
    tags: ['arduino', 'microcontroller', 'embedded'],
    seeAlso: ['microcontroller', 'pid-controller', 'pwm', 'motor-driver'],
    definition:
      "Arduino is an open-source electronics platform built around easy-to-use ATmega and ESP-based microcontrollers. In robotics, an Arduino board acts as the brain — reading sensors, running control logic, and driving actuators.",
    howItWorks:
      "An Arduino executes a `setup()` function once at boot and then loops the `loop()` function continuously. Within `loop()`, the program reads analog and digital pins (sensors), computes control commands (e.g., PID error correction), and writes outputs to PWM and digital pins (motors, LEDs, relays). The Arduino IDE compiles C++ code and uploads it over USB to the board.",
    realWorld:
      "Indian school robotics teams almost always start with Arduino Uno (₹400 on Robu.in). Line-follower, obstacle-avoidance, and balancing robots are all classic Arduino projects. NASA-affiliated school programmes worldwide use Arduino because it's cheap and accessible.",
    whyItMatters:
      "Arduino is the universal entry point to embedded robotics. Every Indian engineering college teaches Arduino in lab sessions. Mastering Arduino unlocks the path to ESP32, STM32, and finally ROS2-grade microcontrollers like the Teensy 4.1.",
  },

  // ===== Programming =====
  {
    slug: 'ros2-topics',
    title: 'ROS2 Topics — Complete Guide for Robotics',
    summary:
      'ROS2 topics are typed, asynchronous message buses that let robot nodes publish and subscribe data — like sensor readings or control commands — anywhere in the network.',
    category: 'programming',
    tags: ['ros2', 'pub-sub', 'middleware'],
    seeAlso: ['ros2', 'ros2-nodes', 'ros2-services'],
    definition:
      "A ROS2 topic is a named, typed channel for asynchronous many-to-many communication. Nodes publish messages to a topic; other nodes subscribe to the topic to receive them. Topics are the most common pattern in ROS2 — sensor data, control commands, and odometry all flow over topics.",
    howItWorks:
      "Under the hood, ROS2 topics ride on DDS (Data Distribution Service). When a publisher and subscriber match on a topic name and message type, DDS sets up a low-level pub/sub channel. Publishers and subscribers can come and go independently — no central broker is required. Topic communication can be configured for Quality-of-Service (reliability, history, durability).",
    realWorld:
      "A robot's LIDAR node publishes `/scan` messages. A SLAM node subscribes to `/scan` and publishes `/map`. A teleop joystick publishes `/cmd_vel`, and a motor controller subscribes to it. Run `ros2 topic list` and you see every channel live.",
    whyItMatters:
      "Topics decouple components — a fundamental ROS2 design pattern. Mastery of topics, message types, and QoS settings is non-negotiable for any robotics engineer working with ROS2.",
  },
  {
    slug: 'ros2-nodes',
    title: 'ROS2 Nodes — Complete Guide for Robotics',
    summary:
      'A ROS2 node is a single-process unit of computation that publishes and subscribes to topics, services, and actions. Nodes are the building blocks of every ROS2 robot.',
    category: 'programming',
    tags: ['ros2', 'node', 'middleware'],
    seeAlso: ['ros2', 'ros2-topics', 'ros2-services', 'ros2-actions'],
    definition:
      "A ROS2 node is a process — a single program — that performs one focused task in a robot. Examples: read a camera, run a navigation stack, control a motor. A real robot typically runs 20–100 nodes simultaneously, each communicating over topics, services, and actions.",
    howItWorks:
      "When a node starts, it registers itself with the ROS2 graph by name. It can then create publishers, subscribers, service clients/servers, and action clients/servers. Nodes can be implemented in C++ (`rclcpp`) or Python (`rclpy`). They can be run individually with `ros2 run`, or composed into a single process for efficiency.",
    realWorld:
      'A typical Spot deployment runs a `lidar_driver` node, a `state_estimator` node, a `nav2_planner` node, and a `motor_controller` node — all talking to each other over topics. Indian companies like GreyOrange follow the same pattern in their warehouse robots.',
    whyItMatters:
      "Thinking in terms of small, single-purpose nodes is the ROS2 design philosophy. It makes systems modular, testable, and language-agnostic. Every ROS2 interview asks about node design.",
  },
  {
    slug: 'ros2-services',
    title: 'ROS2 Services — Complete Guide for Robotics',
    summary:
      'ROS2 services are synchronous request/response calls between nodes — used for short, infrequent commands like calibration or mode changes.',
    category: 'programming',
    tags: ['ros2', 'service', 'rpc'],
    seeAlso: ['ros2', 'ros2-nodes', 'ros2-topics', 'ros2-actions'],
    definition:
      "A ROS2 service is a synchronous remote procedure call between nodes. A client sends a request with typed data; the server processes it and returns a response. Unlike topics, services are 1-to-1 and wait for an answer.",
    howItWorks:
      "Each service has a name and a service type (defining request/response fields). The server node advertises the service; clients call it. The call blocks (or awaits, in async clients) until a response is received or the timeout fires. Internally, services also run on DDS but use a request/response pattern.",
    realWorld:
      "A robot might expose `/save_map` as a service so an operator can save the current SLAM map. `/set_parameters` is a built-in service every ROS2 node provides. Calibration, mode switches, and teleop arming commonly use services.",
    whyItMatters:
      "Services are perfect for short, infrequent commands where you need a yes/no answer. Misusing topics for what should be a service is a common ROS2 anti-pattern.",
  },
  {
    slug: 'ros2-actions',
    title: 'ROS2 Actions — Complete Guide for Robotics',
    summary:
      'ROS2 actions handle long-running, cancellable tasks like navigation or arm trajectory execution — with progress feedback during the goal.',
    category: 'programming',
    tags: ['ros2', 'action', 'long-running'],
    seeAlso: ['ros2', 'ros2-nodes', 'ros2-services'],
    definition:
      "A ROS2 action is a goal-oriented communication pattern for long-running tasks. A client sends a goal, the server accepts it, sends periodic feedback, and finally returns a result. The client can cancel at any time.",
    howItWorks:
      "An action has three sub-types: goal, feedback, and result. Under the hood, an action is built from several services and a topic — but `rclcpp_action` and `rclpy_action` give you a clean API. Common actions are `NavigateToPose` (move base) and `FollowJointTrajectory` (arm motion).",
    realWorld:
      "Nav2 uses `NavigateToPose` as its action. MoveIt2 uses `FollowJointTrajectory` for arm planning. A delivery robot might expose `Deliver(parcel_id)` as a custom action with feedback like 'percent complete'.",
    whyItMatters:
      "Actions are essential whenever a task is long, cancellable, or needs progress reporting. Building well-designed actions is the mark of a senior ROS2 engineer.",
  },
  {
    slug: 'python-robotics',
    title: 'Python for Robotics — Complete Guide',
    summary:
      'Python is the most popular language for robotics prototyping, ROS2 development, AI integration, and rapid scripting. Used widely in research and industry.',
    category: 'programming',
    tags: ['python', 'ros2', 'scripting'],
    seeAlso: ['ros2', 'embedded-system', 'reinforcement-learning'],
    definition:
      "Python is a high-level, dynamically typed language that has become the de-facto language for robotics research, AI integration, and high-level robot scripting. ROS2 first-class support for Python through `rclpy` makes it ubiquitous in modern robotics.",
    howItWorks:
      "Python interprets code at runtime, with extensive standard library and a huge ecosystem (NumPy, OpenCV, PyTorch, SciPy). In robotics, Python is used for ROS2 nodes, motion planning scripts, computer-vision pipelines, data analysis, and machine learning. Python's GIL limits raw multithreading, but `asyncio` and `multiprocessing` are commonly used in robotics applications.",
    realWorld:
      "Most academic robotics papers ship Python implementations. Boston Dynamics Spot's official SDK is Python-first. Indian startups like Hala Mobility (Hyderabad) write substantial portions of their stack in Python.",
    whyItMatters:
      "If you want to get hired as a robotics engineer in 2026, Python is the minimum bar. Combine it with ROS2 and basic C++ and you cover 90% of all robotics jobs in India.",
  },
  {
    slug: 'c-plus-plus-robotics',
    title: 'C++ for Robotics — Complete Guide',
    summary:
      "C++ is the language for performance-critical robotics — drivers, real-time control, and ROS2 nodes that can't afford Python's overhead. Used in 100% of production robotics.",
    category: 'programming',
    tags: ['cpp', 'ros2', 'embedded'],
    seeAlso: ['ros2', 'embedded-system', 'real-time-computing'],
    definition:
      "C++ is a statically typed, compiled language with manual memory management and zero-cost abstractions. It is the language of high-performance robotics — used wherever timing, latency, or memory matter.",
    howItWorks:
      "C++ compiles to native machine code, runs without an interpreter, and lets the programmer control memory and CPU resources precisely. In robotics, C++ powers ROS2's `rclcpp` library, motion-control loops on microcontrollers, simulation engines like Gazebo, and SLAM libraries like Cartographer.",
    realWorld:
      "Boston Dynamics, ABB, KUKA, Universal Robots, ISRO, GreyOrange — virtually every serious robotics company writes its core stack in C++. ROS2's official Nav2 navigation stack is C++. So is MoveIt2.",
    whyItMatters:
      "Python is a great first language, but mid-senior robotics roles in India will test your C++. Knowledge of move semantics, smart pointers, and real-time constraints separates a hobbyist from a robotics engineer.",
  },
  {
    slug: 'behavior-trees',
    title: 'Behaviour Trees in Robotics — Complete Guide',
    summary:
      "Behaviour trees are a hierarchical decision-making structure that lets robots compose complex behaviour from reusable building blocks. Replacing state machines in modern robotics.",
    category: 'programming',
    tags: ['behavior-tree', 'decision', 'ai'],
    seeAlso: ['state-machine', 'ros2', 'motion-planning'],
    definition:
      "A behaviour tree (BT) is a hierarchical tree of decision nodes that controls what a robot should do moment to moment. Originally invented for video-game AI, BTs are now standard in modern robotics — including Nav2 and MoveIt2.",
    howItWorks:
      'A BT is composed of control-flow nodes (Sequence, Selector, Parallel) and leaf nodes (Action, Condition). On each tick, the root ticks its children, and so on, evaluating until a SUCCESS, FAILURE, or RUNNING result returns. Sequences fail on first FAILURE; Selectors succeed on first SUCCESS. This composability lets engineers build complex behaviour from a few reusable primitives.',
    realWorld:
      "Nav2's bt_navigator runs the entire navigation stack as a behaviour tree. Many warehouse robots use BTs to switch between picking, transporting, charging, and recovering from failures.",
    whyItMatters:
      "Behaviour trees are far more readable and maintainable than nested if-else logic or large state machines. Any robotics engineer working on Nav2 today is expected to know BTs.",
  },
  {
    slug: 'finite-state-machine',
    title: 'Finite State Machine in Robotics — Complete Guide',
    summary:
      "A finite state machine (FSM) models a robot as a set of states and transitions. It's a classic, easy-to-debug way to structure behaviour.",
    category: 'programming',
    tags: ['fsm', 'state-machine', 'behavior'],
    seeAlso: ['state-machine', 'behavior-trees', 'ros2'],
    definition:
      "A finite state machine is a model where the robot is always in exactly one state from a finite set, and transitions between states are triggered by inputs or events. FSMs are easy to draw, easy to debug, and remain widely used in robotics.",
    howItWorks:
      "Each state has on-entry, during, and on-exit code. Transitions specify the source state, the trigger condition, and the destination state. At each control tick, the FSM evaluates whether the current state's transitions can fire, and if so updates accordingly. FSMs can be implemented as switch statements, transition tables, or via libraries like SMACH.",
    realWorld:
      "A robot vacuum's behaviour — Idle → Cleaning → Returning → Charging — is a classic FSM. Industrial robots use FSMs for safety modes (Normal, Estop, Manual, Auto).",
    whyItMatters:
      "FSMs remain the easiest way to model finite, well-bounded behaviour. Knowing when to choose an FSM versus a behaviour tree is an architectural skill expected in robotics engineering.",
  },
  {
    slug: 'robot-programming-basics',
    title: 'Robot Programming Basics — Complete Beginner Guide',
    summary:
      "A beginner's overview of how to program a robot — pseudocode, control loops, sensors, actuators, debugging — for students new to robotics in India.",
    category: 'programming',
    tags: ['beginner', 'tutorial', 'arduino', 'python'],
    seeAlso: ['arduino-control', 'microcontroller', 'python-robotics'],
    definition:
      "Robot programming is the act of writing software that reads sensors, decides what to do, and commands actuators. Whether you're using Scratch on a microbit or C++ on a humanoid, every robot program shares the same loop: sense → think → act.",
    howItWorks:
      "Every robot runs a main loop that, at each iteration, reads sensors, computes a decision (usually through a controller or planner), and writes actuator commands. Beginners typically start with simple loops on Arduino — `while(true) { read_sensor(); decide(); write_motor(); }` — and graduate to event-driven systems, then ROS2.",
    realWorld:
      "Indian school robotics teams writing their first line-follower learn this loop. Engineering students build their first PID-controlled balancing robot on Arduino. Final-year projects move to ROS2 + Python.",
    whyItMatters:
      "Robot programming is the gateway skill — once it clicks, every harder topic (kinematics, perception, AI) becomes accessible. Start small, iterate fast, and build something that moves.",
  },
  {
    slug: 'embedded-systems',
    title: 'Embedded Systems in Robotics — Complete Guide',
    summary:
      'Embedded systems are tiny, dedicated computers inside robots that run real-time code — motors, sensors, safety logic. Foundation of all hardware-rich robotics.',
    category: 'programming',
    tags: ['embedded', 'microcontroller', 'real-time'],
    seeAlso: ['embedded-system', 'microcontroller', 'real-time-computing', 'arduino-control'],
    definition:
      "An embedded system is a small, dedicated computer that sits inside a larger device — like a robot — and runs purpose-built software. Embedded systems are typically resource-constrained (slow CPU, small RAM, no OS or a tiny RTOS) but must be highly reliable and fast.",
    howItWorks:
      "Embedded code is usually written in C or C++, compiled with toolchains like ARM GCC or PlatformIO, and flashed onto microcontrollers such as STM32, ESP32, or Teensy. The code runs in either a bare-metal loop or under a real-time OS like FreeRTOS, FreeBSD-RTOS, or Zephyr.",
    realWorld:
      "Your microwave, washing machine, car ABS, and DJI drone all contain embedded systems. In robotics, embedded systems handle low-level motor control, sensor sampling, safety stops, and the bridge to the high-level computer (often Raspberry Pi or NVIDIA Jetson).",
    whyItMatters:
      "Knowing embedded firmware is a major differentiator for robotics engineers. Indian hardware-rich robotics startups (Ideaforge, Skylark Drones, GreyOrange) explicitly hire for embedded skills.",
  },

  // ===== Mechanical =====
  {
    slug: 'wheels-vs-tracks',
    title: 'Wheels vs Tracks for Robots — Complete Guide',
    summary:
      "When to use wheels, tracks, or legs on a mobile robot. Trade-offs in speed, terrain handling, energy efficiency, and cost.",
    category: 'mechanical',
    tags: ['locomotion', 'mobile-robot', 'chassis'],
    seeAlso: ['mobile-robot', 'differential-drive', 'chassis'],
    definition:
      "Wheels and tracks are the two most common locomotion methods for mobile robots. Wheels are simpler, faster, and more efficient on smooth ground; tracks distribute weight, climb obstacles, and grip rough terrain.",
    howItWorks:
      "Wheels rely on point contact with the ground, which works perfectly on flat surfaces but struggles in sand, mud, or steps. Tracks have many small contact patches that distribute load over a larger area, allowing the robot to cross loose surfaces and small obstacles. Tracks have higher friction (good for grip, bad for energy).",
    realWorld:
      "A Roomba uses two large wheels — perfect for indoor floors. A Mars rover uses six independently driven wheels with rocker-bogie suspension. The DRDO Daksh bomb-disposal robot uses tracks for stair-climbing and uneven outdoor terrain.",
    whyItMatters:
      "Choosing the right locomotion is one of the first design decisions every robotics team makes. Wrong choice and the robot can't move; right choice and the rest of the design becomes simpler.",
  },
  {
    slug: 'differential-drive',
    title: 'Differential Drive in Robotics — Complete Guide',
    summary:
      "Differential drive uses two independently driven wheels and a passive caster to steer a mobile robot. Simple, cheap, and the foundation of most beginner robotics.",
    category: 'mechanical',
    tags: ['locomotion', 'drive', 'mobile-robot'],
    seeAlso: ['mobile-robot', 'wheels-vs-tracks', 'odometry'],
    definition:
      "Differential drive is a mobile-robot locomotion scheme where two wheels on either side of the chassis are driven independently. By varying the relative speed of the two wheels, the robot moves forward, turns in place, or arcs along a curved path. A passive caster wheel keeps the chassis level.",
    howItWorks:
      "If both wheels turn at the same speed, the robot moves straight. If only the right wheel turns, the robot rotates around the stationary left wheel. If wheels turn in opposite directions at the same speed, the robot spins in place. The forward kinematics give linear velocity v = (v_left + v_right)/2 and angular velocity ω = (v_right − v_left) / wheelbase.",
    realWorld:
      "Roomba, Pepper, GreyOrange Butler, and the typical Arduino line-follower all use differential drive. It is the default locomotion for educational robotics in India.",
    whyItMatters:
      "Differential drive is simple enough for first-time builders but powerful enough to teach kinematics, odometry, and PID. Almost every robotics curriculum starts here.",
  },
  {
    slug: 'holonomic-drive',
    title: 'Holonomic Drive in Robotics — Complete Guide',
    summary:
      "Holonomic drives allow a robot to translate in any direction without first rotating. Used in omniwheel robots, mecanum platforms, and warehouse AMRs.",
    category: 'mechanical',
    tags: ['locomotion', 'omniwheel', 'mecanum'],
    seeAlso: ['mobile-robot', 'differential-drive', 'wheels-vs-tracks'],
    definition:
      "A holonomic drive can move in any direction in its plane without first turning to face that direction. Holonomic robots use omniwheels (with rollers on the outside) or mecanum wheels (rollers at 45°) to achieve omnidirectional motion.",
    howItWorks:
      "Each wheel has small passive rollers around its circumference. The robot's controller commands the wheel speeds independently. By picking the right combination of speeds, the robot's resulting velocity vector can point in any direction (and include rotation). Mecanum wheels are arranged with rollers at 45°, giving four wheels independent control over x, y, and yaw motion.",
    realWorld:
      "Many warehouse AMRs use mecanum wheels because they can sidle in tight aisles. Robotics competition platforms (FRC, RoboCup small-size league) often use omniwheel chassis for fast, agile motion.",
    whyItMatters:
      "Holonomic drives are more complex and expensive than differential drives but offer maneuverability that's impossible otherwise. Whenever a robot needs to manoeuvre in confined spaces, holonomic is the answer.",
  },
  {
    slug: 'parallel-robot',
    title: 'Parallel Robot — Complete Guide',
    summary:
      "A parallel robot connects its end-effector to the base through multiple parallel kinematic chains. Examples include the Stewart platform, delta robot, and many industrial pick-and-place arms.",
    category: 'mechanical',
    tags: ['parallel-robot', 'delta', 'stewart-platform'],
    seeAlso: ['robot-arm', 'degrees-of-freedom', 'inverse-kinematics'],
    definition:
      "A parallel robot is a closed-kinematic-chain robot — its moving platform is connected to a fixed base through multiple independent legs, all working in parallel. This is the opposite of a serial robot, where joints are stacked one after another.",
    howItWorks:
      'Because each leg shares the load with the others, parallel robots are extremely stiff, fast, and accurate — but their workspace is smaller than serial arms. Common designs: the Stewart platform (6 legs, 6 DOF, used in flight simulators and machine tools), and the delta robot (3 parallel legs ending in a triangular platform, used for super-fast pick-and-place).',
    realWorld:
      'Pharmaceutical factories use delta robots to pick pills at 200 picks/minute. Flight simulators use Stewart platforms to mimic aircraft motion. Machine-tool spindles increasingly use parallel kinematics for precision milling.',
    whyItMatters:
      "Parallel robots solve the niche of fast, accurate, small-workspace operations that serial arms can't handle. Delta robots are a frequent interview topic for manufacturing robotics roles.",
  },

  // ===== AI & Perception =====
  {
    slug: 'a-star-algorithm',
    title: 'A* (A-Star) Pathfinding in Robotics — Complete Guide',
    summary:
      'A* finds the shortest path between two points on a grid or graph. It is the most-used pathfinding algorithm in robotics — from Roomba to delivery robots.',
    category: 'ai-and-perception',
    tags: ['pathfinding', 'search', 'algorithm'],
    seeAlso: ['path-planning', 'motion-planning', 'occupancy-grid'],
    definition:
      "A* (pronounced 'A-star') is a graph search algorithm that finds the shortest path between two nodes by combining the actual cost so far (g) with a heuristic estimate to the goal (h). Its evaluation function is f(n) = g(n) + h(n).",
    howItWorks:
      "A* maintains an open set of nodes to expand and a closed set of nodes already evaluated. At each step, it picks the open node with the lowest f score, evaluates its neighbours, updates their costs, and continues until the goal is reached. With an admissible heuristic (e.g., Euclidean distance), A* is guaranteed to find the shortest path.",
    realWorld:
      "A Roomba uses A* (or a variant) to plan a path around your room. Google Maps uses A* variants for routing. Most warehouse robots, including GreyOrange Butlers, run A* on a grid representation of the warehouse floor.",
    whyItMatters:
      "A* is the canonical robotics algorithm taught in every robotics course — from school programs to IIT classes. Understanding A* is the gateway to D*, RRT, and modern motion planners.",
  },
  {
    slug: 'neural-networks-robotics',
    title: 'Neural Networks for Robotics — Complete Guide',
    summary:
      "How robots use neural networks for perception, control, and decision-making — from object detection to end-to-end driving policies.",
    category: 'ai-and-perception',
    tags: ['neural-network', 'deep-learning', 'ai'],
    seeAlso: ['neural-network', 'deep-learning', 'computer-vision'],
    definition:
      'Neural networks are computational models inspired by biological neurons that learn from data. In robotics, they are used for perception (detecting objects), prediction (forecasting other agents), and control (mapping sensor input directly to motor commands).',
    howItWorks:
      "A neural network is a stack of layers, each performing a weighted sum followed by a non-linearity. Weights are learned by gradient descent on labelled or self-supervised data. In robotics, common architectures include CNNs for vision, transformers for sequence modelling, and policy networks for reinforcement learning. Real-time inference typically runs on GPUs (e.g., NVIDIA Jetson) or specialised accelerators.",
    realWorld:
      "Tesla Autopilot uses a single 'HydraNet' neural network for vision. Boston Dynamics Atlas uses neural networks for object detection. Indian agritech robots use CNNs to spot diseased crops in real time.",
    whyItMatters:
      "Neural networks have transformed robotics in the last decade. From sim-to-real transfer to vision-language models for manipulation, neural networks are now central to almost every research advance.",
  },
  {
    slug: 'reinforcement-learning-robotics',
    title: 'Reinforcement Learning for Robotics — Complete Guide',
    summary:
      "Reinforcement learning teaches robots to do things by trial and error, optimising rewards. Used for locomotion, grasping, and end-to-end manipulation.",
    category: 'ai-and-perception',
    tags: ['rl', 'reinforcement-learning', 'control'],
    seeAlso: ['reinforcement-learning', 'sim-to-real', 'neural-network'],
    definition:
      "Reinforcement learning (RL) is a machine learning paradigm where an agent learns to take actions that maximise cumulative reward through interaction with an environment. In robotics, RL has emerged as a powerful tool for learning skills that are hard to engineer by hand.",
    howItWorks:
      "An RL agent observes a state, chooses an action via a policy, and receives a reward and next state. Through many trials (often in simulation), it updates its policy to maximise expected reward. Modern robotics RL uses algorithms like PPO, SAC, and DQN, paired with high-fidelity simulators (Isaac Gym, MuJoCo) and sim-to-real transfer.",
    realWorld:
      "ETH Zürich's ANYmal quadruped learned to walk over rough terrain entirely via RL in simulation. OpenAI's robot hand learned to manipulate a Rubik's cube using RL. NVIDIA Isaac Lab is the leading toolkit for RL-based robot training.",
    whyItMatters:
      "RL is the most active research frontier in robotics today. Indian robotics labs at IIT Bombay, IIT Madras, and IISc all run RL projects. Understanding RL opens doors to research and frontier industry roles.",
  },
  {
    slug: 'feature-extraction',
    title: 'Feature Extraction in Robotics Vision — Complete Guide',
    summary:
      "Feature extraction reduces raw sensor data — especially images — into compact, useful descriptors. Foundation of SLAM, object detection, and place recognition.",
    category: 'ai-and-perception',
    tags: ['vision', 'features', 'descriptors'],
    seeAlso: ['computer-vision', 'object-detection', 'slam'],
    definition:
      "Feature extraction transforms raw sensor data into compact descriptors that capture the essence of what's being observed — typically corners, edges, or learned embeddings. Without feature extraction, robots would have to process every pixel from scratch every frame.",
    howItWorks:
      "Classical feature extractors like SIFT, SURF, ORB, and FAST detect interest points in an image and produce a fixed-length descriptor for each — invariant to scale, rotation, and (somewhat) illumination. Modern deep-learning features are produced by convolutional networks (e.g., ResNet features) or self-supervised transformers (e.g., DINO).",
    realWorld:
      "Visual SLAM systems like ORB-SLAM rely entirely on ORB features. Visual place recognition for autonomous vehicles uses learned features. Boston Dynamics Spot's localisation uses both classical and learned features.",
    whyItMatters:
      "Feature extraction underpins every perception system. Choosing the right features (classical vs learned, dense vs sparse) is a fundamental design trade-off that every robotics engineer faces.",
  },

  // ===== Hardware (Power & Electronics) =====
  {
    slug: 'lipo-battery',
    title: 'LiPo Battery in Robotics — Complete Guide',
    summary:
      "Lithium polymer (LiPo) batteries deliver high energy density and high discharge rates — the standard for drones, racing robots, and high-performance mobile robots.",
    category: 'hardware',
    tags: ['battery', 'lipo', 'power'],
    seeAlso: ['battery-power-systems', 'motor-driver', 'brushless-motor'],
    definition:
      "A lithium polymer (LiPo) battery is a rechargeable battery that uses a polymer electrolyte instead of a liquid one. LiPo batteries offer high energy density, high peak discharge rates, and the ability to be made in flat, custom shapes — making them ideal for drones and mobile robotics.",
    howItWorks:
      "A LiPo cell has a nominal voltage of 3.7 V (4.2 V fully charged, 3.0 V minimum safe discharge). Multiple cells in series form a battery pack — common configurations are 3S (11.1 V), 4S (14.8 V), and 6S (22.2 V). A capacity rating in mAh and a discharge rating in 'C' (e.g., 30C means it can deliver 30× its capacity in current) determine power output.",
    realWorld:
      "Every DJI drone, every racing quadcopter, most modern hobby robots, and many warehouse AMRs use LiPo batteries. They're available at every Indian robotics shop — Robu.in, RoboKart — starting from ₹400.",
    whyItMatters:
      "LiPo batteries enable the high power-to-weight performance modern robots need. They also need care — improper charging or puncture causes fires. Understanding LiPo handling is essential safety knowledge.",
  },
  {
    slug: 'motor-driver',
    title: 'Motor Driver in Robotics — Complete Guide',
    summary:
      "A motor driver is an electronic circuit that lets a low-power microcontroller control a high-power motor. The bridge between brain (Arduino) and muscle (motor).",
    category: 'hardware',
    tags: ['motor', 'driver', 'h-bridge', 'pwm'],
    seeAlso: ['h-bridge', 'pwm', 'dc-motor', 'brushless-motor'],
    definition:
      "A motor driver (sometimes called motor controller) is an electronic circuit that takes low-power control signals from a microcontroller (e.g., 5 V PWM from Arduino) and switches a much higher-power supply to drive a motor.",
    howItWorks:
      "Most DC-motor drivers use an H-bridge of four power transistors (MOSFETs or BJTs). Closing diagonal pairs of transistors lets current flow through the motor in either direction. The microcontroller sends a PWM signal that the driver translates into motor voltage, controlling both direction (which diagonal is active) and speed (PWM duty cycle).",
    realWorld:
      "L298N (the classic ₹120 driver from Robu.in) is the standard for beginner Arduino projects. TB6612FNG is more efficient. For BLDC motors, dedicated ESCs (Electronic Speed Controllers) act as motor drivers. Every robot's motors are connected to a motor driver.",
    whyItMatters:
      "Without motor drivers, microcontrollers literally cannot move motors. Choosing the right motor driver — matched to current, voltage, and motor type — is one of the most common entry-level mistakes.",
  },
  {
    slug: 'h-bridge',
    title: 'H-Bridge Circuit in Robotics — Complete Guide',
    summary:
      "An H-bridge is a circuit of four transistors that lets a DC motor spin in either direction. It is the heart of nearly every DC motor driver.",
    category: 'hardware',
    tags: ['h-bridge', 'motor-driver', 'circuit'],
    seeAlso: ['motor-driver', 'dc-motor', 'pwm'],
    definition:
      "An H-bridge is an electronic circuit with four switching elements arranged in the shape of the letter 'H', with a motor connected horizontally across the middle. Closing one pair of opposing switches drives current through the motor one way; closing the other pair reverses it.",
    howItWorks:
      "The four switches are usually MOSFETs or BJTs. To spin the motor forward, the controller turns on the top-left and bottom-right switches. To reverse, it turns on the top-right and bottom-left. PWM applied to the switches controls speed. Care must be taken not to turn on both switches on the same side simultaneously — that creates a short circuit known as 'shoot-through'.",
    realWorld:
      "Every L298N, TB6612, and DRV8833 chip contains an H-bridge. Some advanced robots use discrete MOSFET-based H-bridges for higher current. Even Tesla's electric car drivetrains contain massive H-bridges.",
    whyItMatters:
      "Understanding H-bridges demystifies how a microcontroller can reverse a motor's direction without changing the wiring. It is a foundational electronics concept for any hardware-focused roboticist.",
  },
  {
    slug: 'pwm-signal',
    title: 'PWM Signal in Robotics — Complete Guide',
    summary:
      "Pulse-Width Modulation (PWM) is the standard technique for controlling motor speed, LED brightness, and servo position. Found in every microcontroller and every robot.",
    category: 'hardware',
    tags: ['pwm', 'signal', 'control'],
    seeAlso: ['pwm', 'motor-driver', 'servo-motor', 'arduino-control'],
    definition:
      "Pulse-Width Modulation (PWM) is a method of encoding a continuous value (like a motor power level) into a digital signal by rapidly switching it on and off. The fraction of time the signal is 'on' — called the duty cycle — represents the encoded value.",
    howItWorks:
      "A PWM signal has two parameters: frequency (cycles per second) and duty cycle (% of each cycle the signal is HIGH). At 50% duty cycle, the average voltage is half the supply. A motor connected via PWM through a driver runs at half its top speed. Frequencies range from 1 kHz to 50 kHz depending on application — too low causes audible whine, too high stresses the driver.",
    realWorld:
      "Every Arduino pin marked with a tilde (~) supports PWM. RC servos use a 50 Hz PWM where pulse width 1–2 ms maps to position 0–180°. ESCs for drones use 50–500 Hz PWM (now increasingly DShot digital signals).",
    whyItMatters:
      "PWM is the universal interface between digital controllers and analog actuators. You cannot build a robot that moves without using PWM somewhere.",
  },
  {
    slug: 'voltage-regulator',
    title: 'Voltage Regulator in Robotics — Complete Guide',
    summary:
      "Voltage regulators step a battery's variable voltage down (or up) to a fixed, clean voltage for sensors and microcontrollers. Without them, electronics burn out.",
    category: 'hardware',
    tags: ['power', 'regulator', 'buck-boost'],
    seeAlso: ['lipo-battery', 'battery-power-systems', 'microcontroller'],
    definition:
      "A voltage regulator is an electronic device that maintains a constant output voltage regardless of input-voltage fluctuations or load changes. In robotics, regulators take a battery's varying voltage and produce stable rails for microcontrollers (5 V, 3.3 V) and sensors.",
    howItWorks:
      "Two main types: linear regulators (e.g., LM7805) drop excess voltage as heat — simple, but inefficient. Switching regulators (buck, boost, buck-boost) use rapid switching and inductors to convert voltage with 80–95% efficiency. A buck converter steps down; a boost steps up; a buck-boost can do either.",
    realWorld:
      "Every robot has at least one switching regulator on its power distribution board. A 3S LiPo (11.1 V) typically powers a buck converter that outputs 5 V to the Arduino. Drones have several regulators for different rails.",
    whyItMatters:
      "Power design is one of the most overlooked aspects of robotics — and one of the most common reasons projects fail. Understanding regulators is critical to building reliable hardware.",
  },
  {
    slug: 'raspberry-pi-robotics',
    title: 'Raspberry Pi for Robotics — Complete Guide',
    summary:
      "The Raspberry Pi is the most popular single-board computer for robotics. Runs Linux, ROS2, OpenCV, and PyTorch — perfect for the brain of mobile robots.",
    category: 'hardware',
    tags: ['raspberry-pi', 'sbc', 'linux'],
    seeAlso: ['single-board-computer', 'embedded-system', 'ros2', 'python-robotics'],
    definition:
      "The Raspberry Pi is a credit-card-sized single-board computer running full Linux. Originally designed for education, it has become the standard 'brain' for thousands of robotics projects — students, hobbyists, and commercial products alike.",
    howItWorks:
      "A Raspberry Pi 5 has a quad-core ARM CPU, 4–8 GB RAM, USB ports, GPIO pins, Ethernet, Wi-Fi, and supports a camera module. Robotics builders run ROS2 on it, attach sensors via I2C/SPI/UART, and write code in Python or C++. For real-time motor control, the Pi is usually paired with an Arduino or microcontroller.",
    realWorld:
      "Boston Dynamics Spot's payload deck supports Raspberry Pis. Most Indian robotics startups prototype on Raspberry Pi before moving to NVIDIA Jetson. Educational robots like the GoPiGo are built around Pi.",
    whyItMatters:
      "If you want to do real ROS2 on a portable robot, Raspberry Pi is the cheapest entry point (₹4,000–₹6,000 on Robu.in). Every Indian robotics engineering student should own one.",
  },
  {
    slug: 'esp32-robotics',
    title: 'ESP32 for Robotics — Complete Guide',
    summary:
      "The ESP32 is a Wi-Fi/Bluetooth-enabled microcontroller. Cheap, powerful, and perfect for IoT-connected robots and wireless robot control.",
    category: 'hardware',
    tags: ['esp32', 'microcontroller', 'wifi'],
    seeAlso: ['microcontroller', 'embedded-system', 'arduino-control'],
    definition:
      "The ESP32 is a dual-core 32-bit microcontroller from Espressif Systems with built-in Wi-Fi and Bluetooth. It costs ₹250–₹400 in India and has rapidly become the go-to MCU for wireless robotics.",
    howItWorks:
      "The ESP32 has two Tensilica Xtensa LX6 cores at 240 MHz, 520 KB SRAM, 30+ GPIO pins, ADC, DAC, PWM, I2C, SPI, UART. It can act as a Wi-Fi station, access point, or Bluetooth host. Programming is via Arduino IDE, PlatformIO, or the official ESP-IDF framework.",
    realWorld:
      "ESP32-based robots can be controlled from a phone over Wi-Fi. Cheap drones, security cameras, smart-home devices, and even some Indian IoT startups (Kaynes, Innoflo) build products around the ESP32.",
    whyItMatters:
      "If you want to build a wireless, internet-connected robot for under ₹1,000, ESP32 is the answer. It's also the gateway to industrial-grade IoT robotics.",
  },

  // ===== Robot Types =====
  {
    slug: 'autonomous-mobile-robot',
    title: 'Autonomous Mobile Robot (AMR) — Complete Guide',
    summary:
      "An AMR navigates an environment on its own, without fixed paths or human steering. The dominant class of warehouse and service robots in 2026.",
    category: 'robot-types',
    tags: ['amr', 'mobile-robot', 'warehouse'],
    seeAlso: ['mobile-robot', 'differential-drive', 'slam', 'path-planning'],
    definition:
      "An Autonomous Mobile Robot (AMR) is a wheeled or tracked robot that can navigate its environment without external guides (unlike older AGVs that follow fixed paths). AMRs sense, map, and decide independently — using SLAM, sensors, and onboard planners.",
    howItWorks:
      "An AMR is equipped with LIDAR, depth cameras, IMU, and wheel encoders. Software stack typically includes a SLAM module for mapping, a localisation module to know where it is, a global planner (e.g., A*) for routing, and a local planner (e.g., DWA or TEB) for obstacle avoidance. Fleet manager software coordinates many AMRs in a warehouse.",
    realWorld:
      "GreyOrange Butler (India), Locus Robotics, Fetch, MiR (Mobile Industrial Robots), and Amazon's drive units are all AMRs. AMRs dominate modern e-commerce warehouses.",
    whyItMatters:
      "AMRs are now the #1 growth segment in robotics globally. Every major logistics company in India is buying, building, or piloting AMRs. Skills in AMR development are in high demand.",
  },

  // ===== Safety =====
  {
    slug: 'iso-10218',
    title: 'ISO 10218 — Industrial Robot Safety Standard',
    summary:
      "ISO 10218 is the international standard for industrial robot safety. It governs robot design (Part 1) and integration into a workplace (Part 2). Mandatory for European factories.",
    category: 'safety',
    tags: ['safety', 'iso', 'standards'],
    seeAlso: ['robot-safety', 'collaborative-robot-safety', 'functional-safety'],
    definition:
      "ISO 10218 is the international standard 'Robots and robotic devices — Safety requirements for industrial robots.' Part 1 covers requirements for the robot manufacturer; Part 2 covers requirements for the system integrator and end user.",
    howItWorks:
      "Part 1 mandates inherently safe design — emergency stops, safety-rated control systems, mode switches between manual and automatic, and protective stops. Part 2 specifies risk assessment, perimeter fencing or proximity scanners, training, and operating procedures. Compliance is typically demonstrated through CE marking in Europe.",
    realWorld:
      "Every KUKA, FANUC, and ABB industrial robot sold in Europe must meet ISO 10218. Indian factories importing robots typically follow the same standards to satisfy export customers.",
    whyItMatters:
      "Without ISO 10218 compliance, an industrial robot is illegal to sell in many markets. Safety-engineering skills (and an understanding of ISO 10218) are essential for robotics integrators.",
  },
  {
    slug: 'robot-safety',
    title: 'Robot Safety in Industrial and Service Robotics',
    summary:
      "Robot safety covers the engineering and procedural measures that prevent injury during robot operation. Includes E-stops, safety scanners, risk assessments, and operator training.",
    category: 'safety',
    tags: ['safety', 'industrial', 'integration'],
    seeAlso: ['iso-10218', 'collaborative-robot-safety', 'functional-safety'],
    definition:
      "Robot safety is the discipline of designing, integrating, and operating robots in a way that prevents harm to humans, equipment, and the environment. It combines engineering controls (cages, sensors), administrative controls (training, procedures), and inherent safe design.",
    howItWorks:
      "A typical industrial robot cell includes: a perimeter fence with interlocked gates, light curtains or laser scanners that stop the robot if a human enters, hard-wired emergency stops, two-handed control switches for manual mode, and a safety PLC that handles all critical inputs and outputs.",
    realWorld:
      "In a Maruti Suzuki body shop, every welding robot is inside a cage with multiple E-stops, redundant safety PLCs, and laser scanners. Indian standards (BIS) increasingly align with ISO 10218.",
    whyItMatters:
      "A single robot accident can shut down a plant for weeks and end careers. Robot safety is not optional — it is the foundation of every commercial robotics deployment.",
  },
  {
    slug: 'end-effector-safety',
    title: 'End-Effector Safety in Robotics',
    summary:
      "The end-effector — gripper, tool, or weld torch — is often the highest-risk component on a robot. End-effector safety covers grippers, tool changers, and exposed parts.",
    category: 'safety',
    tags: ['safety', 'gripper', 'end-effector'],
    seeAlso: ['gripper', 'end-effector', 'iso-10218'],
    definition:
      "End-effector safety covers the design and integration of grippers, welding torches, paint nozzles, and other end-of-arm tooling so they do not cause injury or damage. Risks include sharp edges, pinch points, and dropped payloads.",
    howItWorks:
      "Safe end-effectors use rounded, smooth, low-energy contact surfaces. Force-limited grippers stop closing on contact. Vacuum grippers vent quickly to release payload safely if power fails. Tool changers use mechanical interlocks that prevent the tool from falling off if pneumatic pressure is lost.",
    realWorld:
      "Universal Robots' built-in end-effector force monitoring limits gripper closing force to 150 N. Industrial paint robots use spark-proof, explosion-proof torches. Surgical robot end-effectors are sterilisable.",
    whyItMatters:
      "End-effectors interact directly with the payload and the world — making them the highest-impact safety surface on any robot. Designing them well is critical to safe operation.",
  },
  {
    slug: 'collaborative-robot-safety',
    title: 'Collaborative Robot (Cobot) Safety — Complete Guide',
    summary:
      "Cobots work alongside humans without cages. Safety relies on force limiting, speed monitoring, and ISO/TS 15066 compliance.",
    category: 'safety',
    tags: ['cobot', 'safety', 'iso-15066'],
    seeAlso: ['cobot', 'collaborative-robot', 'iso-10218'],
    definition:
      "Cobot safety is the set of design and operational principles that allow a collaborative robot to share workspace with humans safely. Governed primarily by ISO/TS 15066, which specifies four collaboration modes: safety-monitored stop, hand guiding, speed and separation monitoring, and power and force limiting.",
    howItWorks:
      "A cobot detects contact through current sensing or torque sensing at each joint. On unintended contact, it stops within milliseconds before causing harm. Speed-and-separation monitoring uses external scanners to slow the robot as a human approaches. Cobots are typically limited to 1.5 m/s and have rounded, low-mass arms.",
    realWorld:
      "Universal Robots UR5 and UR10 are the world's most-deployed cobots. ABB YuMi and FANUC CRX are popular alternatives. They operate without cages in thousands of small Indian factories.",
    whyItMatters:
      "Cobots dramatically lower the cost of robotic automation by removing the need for safety enclosures. But proper risk assessment and safety configuration is essential — improperly set-up cobots can still injure.",
  },
  {
    slug: 'functional-safety',
    title: 'Functional Safety in Robotics — Complete Guide',
    summary:
      "Functional safety ensures a robot's safety-related electronics fail in a safe state. Governed by ISO 13849, IEC 62061, and IEC 61508.",
    category: 'safety',
    tags: ['functional-safety', 'standards', 'plc'],
    seeAlso: ['robot-safety', 'iso-10218'],
    definition:
      "Functional safety is the assurance that a system's safety-related electronics, software, and sensors will function correctly when needed — and fail in a safe state when they do fail. In robotics, it covers safety-rated PLCs, safety relays, and safety-rated motor drives.",
    howItWorks:
      "Functional safety is engineered through redundancy (two channels of measurement and control), diagnostics (continuous self-test), and certified components. Designers assign a Performance Level (PL) per ISO 13849 or a Safety Integrity Level (SIL) per IEC 61508 based on the risk being mitigated. Certified safety PLCs (Siemens F-PLC, Rockwell GuardLogix) implement the safety logic.",
    realWorld:
      "Every certified industrial robot cell has a Performance Level d (PL d) or higher safety circuit. Cobots use safety-rated soft-axis limits to enforce workspace boundaries.",
    whyItMatters:
      "Functional safety is the legal and engineering bedrock of industrial automation. Without it, no robot can be deployed in a regulated factory.",
  },
  {
    slug: 'ce-marking-robots',
    title: 'CE Marking for Robots — Complete Guide',
    summary:
      "CE marking is the European Union conformity mark that allows a robot or robotic product to be sold in the EU. Mandatory for industrial and consumer robotics exports.",
    category: 'safety',
    tags: ['ce', 'compliance', 'export'],
    seeAlso: ['iso-10218', 'robot-safety', 'functional-safety'],
    definition:
      "CE marking is the European Union's conformity mark, which manufacturers apply to indicate that a product meets all relevant EU directives — including the Machinery Directive (2006/42/EC), the EMC Directive, the Low Voltage Directive, and (now) the Machinery Regulation 2023/1230.",
    howItWorks:
      "To CE-mark a robot, the manufacturer must perform a risk assessment, apply relevant harmonised standards (ISO 10218, ISO 13849, etc.), compile a technical file, and (for higher-risk machinery) involve a notified body. The result is a Declaration of Conformity and the CE mark on the product.",
    realWorld:
      "Every robot sold in the EU — Universal Robots, KUKA, ABB, FANUC, GreyOrange's European deployments — carries a CE mark. Indian robotics exporters increasingly target CE marking to access EU markets.",
    whyItMatters:
      "CE marking is the gateway to a major export market. For Indian robotics startups, achieving CE compliance is a multi-month engineering project that unlocks Europe-wide sales.",
  },

  // ===== India =====
  {
    slug: 'make-in-india-robotics',
    title: 'Make in India for Robotics — Complete Guide',
    summary:
      "How the Make in India policy supports the Indian robotics industry — tax breaks, PLI schemes, and domestic manufacturing of robots.",
    category: 'india',
    tags: ['policy', 'india', 'manufacturing'],
    seeAlso: ['india-robot-density', 'national-robotics-mission', 'isro-robotics'],
    definition:
      'Make in India is a 2014 Government of India initiative to encourage domestic manufacturing, foreign direct investment, and skill development across 25 sectors — including robotics, electronics, and automotive — through tax incentives, PLI (Production-Linked Incentive) schemes, and policy reforms.',
    howItWorks:
      "Robotics qualifies under multiple Make in India tracks: the PLI for electronics (₹40,000+ Cr), the PLI for white goods, and the Atmanirbhar Bharat capital-goods scheme. Companies setting up robot manufacturing in India can claim tax holidays, subsidised land, and capital subsidies. Defence robotics also benefits from Make in India through the iDEX programme.",
    realWorld:
      "Companies like Addverb Technologies (Noida), Asimov Robotics (Kochi), and Systemantics (Bengaluru) have all grown under Make in India. Foreign players like ABB and KUKA have expanded India manufacturing.",
    whyItMatters:
      "Make in India is the principal economic policy driving the growth of India's domestic robotics industry. Anyone working in Indian robotics needs to understand it.",
  },
  {
    slug: 'isro-robotics',
    title: 'ISRO Robotics — India\'s Space Robotics Programme',
    summary:
      "How the Indian Space Research Organisation (ISRO) builds space robots — Pragyan rover, Vyommitra humanoid, the Gaganyaan mission, and on-orbit servicing.",
    category: 'india',
    tags: ['isro', 'space', 'humanoid'],
    seeAlso: ['space-robotics', 'humanoid-robot', 'national-robotics-mission'],
    definition:
      "ISRO Robotics refers to the Indian Space Research Organisation's portfolio of robotic systems built for space missions — including planetary rovers, space humanoids, on-orbit servicing prototypes, and increasingly Lunar and Martian exploration.",
    howItWorks:
      "ISRO designs and builds robotics in-house at facilities like the U.R. Rao Satellite Centre and the Vikram Sarabhai Space Centre. Notable projects: Pragyan (Chandrayaan-2 and Chandrayaan-3 lunar rovers), Vyommitra (the humanoid for Gaganyaan), and the upcoming space-station-servicing robot for the Bharatiya Antariksh Station.",
    realWorld:
      "Pragyan landed on the Moon's south pole in 2023 as part of Chandrayaan-3 — India's first successful lunar surface mission. Vyommitra is being prepared for uncrewed Gaganyaan flights.",
    whyItMatters:
      "ISRO is the most respected science organisation in India and a major employer for space-robotics engineers. ISRO robotics roles are highly competitive and prestigious.",
  },
  {
    slug: 'iit-robotics-research',
    title: 'IIT Robotics Research — Indian Institutes of Technology',
    summary:
      "An overview of robotics research labs at India's leading engineering institutes — IIT Bombay, IIT Madras, IIT Delhi, IIT Kanpur, IISc.",
    category: 'india',
    tags: ['iit', 'research', 'academia'],
    seeAlso: ['national-robotics-mission', 'isro-robotics'],
    definition:
      "The IITs and IISc host the leading robotics research labs in India, working on humanoid locomotion, surgical robotics, agricultural robots, drones, and AI-driven manipulation. These labs train the country's senior robotics engineers and researchers.",
    howItWorks:
      "Each IIT has multiple robotics-focused labs — typically housed under Mechanical, Electrical, or Computer Science departments. Notable groups: IIT Bombay's CDEEP-supported robotics lab, IIT Madras's RBCDSAI for cognitive systems, IIT Delhi's drone research, IIT Kanpur's autonomous-systems lab, IISc Bengaluru's RBCDSAI and CPDM.",
    realWorld:
      "IIT Madras's autonomous boats and surgical-arm research, IIT Bombay's medical-robotics startup Astrocube, and IISc's high-DOF humanoid leg research are all globally cited.",
    whyItMatters:
      "For students aspiring to research careers, MS, or PhD in robotics, IIT labs are the natural home in India. Their alumni populate startups like GreyOrange, Niqo Robotics, and Ideaforge.",
  },
  {
    slug: 'greyorange',
    title: 'GreyOrange — India\'s Flagship Robotics Unicorn',
    summary:
      "GreyOrange is India's most successful robotics company — building warehouse AMR fleets (the Butler) used by Flipkart, Amazon, and global retailers.",
    category: 'india',
    tags: ['greyorange', 'india', 'amr'],
    seeAlso: ['autonomous-mobile-robot', 'warehouse-robotics', 'national-robotics-mission'],
    definition:
      "GreyOrange is an Indian robotics and software company founded in 2011 by Samay Kohli and Akash Gupta. Headquartered in Gurgaon, GreyOrange builds autonomous mobile robots (AMRs), warehouse software (GreyMatter platform), and integrated solutions for e-commerce, retail, and 3PL logistics.",
    howItWorks:
      "GreyOrange's flagship product is the Butler — an AMR that lifts shelf pods up to 1,000 kg and delivers them to human pickers. The Butler navigates via QR codes on the floor and is orchestrated by GreyMatter, a real-time warehouse management AI. GreyOrange also offers sortation and palletising systems.",
    realWorld:
      "Flipkart's Pune warehouse uses 600+ GreyOrange Butlers. Customers include Walmart, H&M, Active Ants, and DHL. GreyOrange achieved unicorn status with a $1B+ valuation in 2021.",
    whyItMatters:
      "GreyOrange proves that India can build globally competitive robotics businesses. It is a top employer for robotics engineers and a frequent case study for Indian robotics policy.",
  },
  {
    slug: 'systemantics',
    title: 'Systemantics — India\'s Industrial Robotics Pioneer',
    summary:
      "Systemantics is a Bengaluru-based Indian industrial-robotics company building affordable SCARA, articulated, and cartesian robots for Indian factories.",
    category: 'india',
    tags: ['systemantics', 'india', 'industrial-robot'],
    seeAlso: ['industrial-robot', 'cobot', 'make-in-india-robotics'],
    definition:
      "Systemantics is an Indian industrial-robotics company founded in 2008 in Bengaluru. Its mission is to build cost-effective, locally designed industrial robots for Indian factories — challenging the dominance of imported KUKA, FANUC, and ABB robots.",
    howItWorks:
      "Systemantics designs and builds 4-axis SCARA, 6-axis articulated, and parallel-kinematic robots in India. Its industrial robots are sold to electronics, automotive, and packaging industries. Systemantics has also developed its own controller and proprietary motion-planning software.",
    realWorld:
      "Systemantics robots are deployed in Indian automotive Tier-1 suppliers, electronics manufacturers, and pharmaceutical-packaging lines. The company has raised funding from CIIE and has won multiple Indian innovation awards.",
    whyItMatters:
      "Systemantics is one of very few Indian companies building industrial robots end-to-end. Their existence demonstrates that India can compete with imported industrial-robotics — a strategic priority under Make in India.",
  },
  {
    slug: 'india-robot-density',
    title: 'India Robot Density — Complete Analysis',
    summary:
      "India's industrial robot density is 4 robots per 10,000 workers — vs South Korea's 1,012. This gap is India's biggest robotics opportunity.",
    category: 'india',
    tags: ['robot-density', 'ifr', 'india'],
    seeAlso: ['industrial-robot', 'manufacturing-automation', 'make-in-india-robotics'],
    definition:
      "Robot density measures the number of operational industrial robots per 10,000 manufacturing workers in a country. The International Federation of Robotics (IFR) publishes this figure annually in its World Robotics Report. India's robot density is among the lowest of major manufacturing economies.",
    howItWorks:
      "Density is calculated by dividing the operational industrial robot stock by the number of people employed in manufacturing, then multiplying by 10,000. South Korea leads (1,012 robots per 10,000 workers in 2024), followed by Singapore (730), Germany (415), Japan (397), and China (470). India sits at roughly 4–5.",
    realWorld:
      "India has approximately 25,000 operational industrial robots in 2024. South Korea — with one-twentieth the population — has over 350,000. The gap explains why Indian manufacturing has not yet captured the automation productivity boost.",
    whyItMatters:
      "Closing this gap is a national priority. The Indian government's National Robotics Mission targets 50 robots per 10,000 workers by 2030. For roboticists in India, this is the biggest market opportunity of the next decade.",
  },
  {
    slug: 'niti-aayog-robotics',
    title: 'NITI Aayog and Indian Robotics Policy',
    summary:
      "NITI Aayog is the Government of India's policy think tank — its reports and recommendations shape India's robotics, AI, and electronics-manufacturing strategy.",
    category: 'india',
    tags: ['niti-aayog', 'policy', 'india'],
    seeAlso: ['national-robotics-mission', 'make-in-india-robotics', 'india-robot-density'],
    definition:
      "NITI Aayog (National Institution for Transforming India) is the Government of India's central policy think tank, established in 2015. It shapes Indian policy on robotics, AI, electronics manufacturing, defence indigenisation, and the Atmanirbhar Bharat initiative.",
    howItWorks:
      "NITI Aayog publishes strategy papers, draft regulations, and roadmaps — including the National Strategy for AI (2018), the National Robotics Strategy draft (2023), and the National Mission on Indigenous Manufacturing of Capital Goods. These documents shape PLI schemes, Atal Tinkering Labs, and the National Robotics Mission.",
    realWorld:
      "NITI Aayog's AI strategy seeded multiple AI/robotics-focused CoEs (Centres of Excellence). Atal Tinkering Labs in 10,000+ schools have introduced hundreds of thousands of Indian students to robotics.",
    whyItMatters:
      "Understanding NITI Aayog's priorities helps roboticists in India anticipate funding, education programmes, and policy levers. It's where the country's robotics future is being designed.",
  },
  {
    slug: 'national-robotics-mission',
    title: 'India\'s National Robotics Mission — Complete Guide',
    summary:
      "The National Robotics Mission is India's flagship policy programme to grow domestic robotics — funding, manufacturing incentives, R&D, and education.",
    category: 'india',
    tags: ['nrm', 'policy', 'india'],
    seeAlso: ['niti-aayog-robotics', 'make-in-india-robotics', 'india-robot-density'],
    definition:
      "The National Robotics Mission (NRM) is the Government of India's flagship policy initiative — launched in 2025 — to grow the Indian robotics industry. Its goals span domestic manufacturing, R&D, talent pipelines, defence indigenisation, and increasing robot density from 4 to 50 per 10,000 workers by 2030.",
    howItWorks:
      "NRM provides PLI incentives for domestic robot manufacturing, funds Centres of Excellence at IITs and IISc, supports robotics startups via SIDBI and iDEX, integrates robotics into school curricula via Atal Tinkering Labs, and creates demand by encouraging public-sector and SME automation.",
    realWorld:
      "Early NRM beneficiaries include Addverb, Asimov Robotics, GreyOrange, and academic CoEs at IIT Madras and IISc. The Mission is co-ordinated by the Department of Science & Technology and NITI Aayog.",
    whyItMatters:
      "If you are a robotics student or founder in India, the NRM is the policy framework you will work within for the rest of the decade. Understanding it is essential to navigating Indian robotics careers and grants.",
  },
];

function frontmatterFor(t: TermSpec): string {
  const today = new Date().toISOString().slice(0, 10);
  const see = t.seeAlso.length ? t.seeAlso.map((s) => `  - ${s}`).join('\n') : '';
  const tags = t.tags.length ? t.tags.map((s) => `  - ${s}`).join('\n') : '';
  return `---
title: "${escapeQuote(t.title)}"
summary: "${escapeQuote(t.summary)}"
category: ${CATEGORY_TO_ATLAS[t.category]}
lastReviewed: ${today}
tags:
${tags}
seeAlso:
${see}
---`;
}

function bodyFor(t: TermSpec): string {
  return `# ${stripTitleSuffix(t.title)}

## What is it?

${t.definition}

## How it works

${t.howItWorks}

## Real-world example

${t.realWorld}

## Why it matters for robotics

${t.whyItMatters}

## See also

${t.seeAlso.map((s) => `- [${humanize(s)}](/atlas/concept/${s})`).join('\n')}
`;
}

function stripTitleSuffix(title: string): string {
  return title.replace(/\s*[—–-]\s*Complete (Beginner |Guide).*$/i, '').replace(/\s*[—–-]\s*Complete Guide.*$/i, '');
}

function humanize(slug: string): string {
  return slug.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join(' ');
}

function escapeQuote(s: string): string {
  return s.replace(/"/g, '\\"');
}

async function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  let created = 0;
  let skipped = 0;
  for (const t of TERMS) {
    const target = path.join(CONTENT_DIR, `${t.slug}.mdx`);
    if (fs.existsSync(target)) {
      console.log(`skip  ${t.slug} (exists)`);
      skipped++;
      continue;
    }
    const mdx = `${frontmatterFor(t)}\n\n${bodyFor(t)}`;
    fs.writeFileSync(target, mdx, 'utf8');
    console.log(`write ${t.slug}`);
    created++;
  }
  console.log(`\nAtlas generation complete: ${created} created, ${skipped} skipped (already existed).`);
  console.log(`Total terms in registry: ${TERMS.length}`);
}

main();
