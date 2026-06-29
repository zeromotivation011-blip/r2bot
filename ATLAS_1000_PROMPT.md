# ATLAS 1000 — Complete Reimagining + Topic Expansion
> Claude Code Build Prompt · Full Rebuild
> Run: cd ~/Desktop/robot && claude --dangerously-skip-permissions

---

## CONTEXT

R2BOT's Atlas is a robotics encyclopaedia currently at 265 topics across 8 buckets.
The goal is to:
1. Expand to 1000 topics across 20 buckets covering ALL of robotics
2. Completely reimagine the Atlas UX — from a dry glossary to an immersive learning journey
3. Make every topic page feel like a Kurzgesagt explainer meets Wikipedia — visual, connected, progressive

Read the existing code first:
- `app/atlas/AtlasHomeClient.tsx` (home page)
- `app/atlas/[type]/[slug]/page.tsx` (detail page)
- `lib/atlas.ts` (types + MDX loader)
- `content/atlas/` (existing MDX files)

---

## PART 1: TOPIC TAXONOMY — 1000 TOPICS ACROSS 20 BUCKETS

Here are the 20 buckets and their topics. Generate MDX files for ALL new topics.
Existing 265 topics stay as-is. Generate only the missing ones.

### BUCKET 1: Foundations (50 topics)
What robotics is built on — physics, math, basic electricity
Topics to add: scalar-vs-vector, newton-laws-robotics, torque-explained, friction-in-robots,
centre-of-gravity, moment-of-inertia, angular-velocity, linear-velocity, acceleration-robotics,
energy-in-robots, power-consumption, efficiency-machines, simple-machines, levers-robotics,
pulleys-robotics, gears-explained, gear-ratio, mechanical-advantage, springs-robotics,
damping-explained, resonance-vibration, material-strength, stress-and-strain, elasticity,
plasticity, hardness-materials, weight-vs-mass, friction-coefficient, static-vs-kinetic,
bernoulli-robotics, fluid-mechanics-robots, buoyancy-underwater-robots, heat-dissipation,
thermal-expansion, magnetism-basics, electromagnetic-induction, capacitance-basics,
resistance-ohms-law, current-voltage-power, series-parallel-circuits, kirchhoffs-laws,
transistors-basics, diodes-explained, integrated-circuits, microprocessor-vs-microcontroller,
clock-speed-processors, memory-types-robots, boolean-logic, binary-numbers, binary-arithmetic

### BUCKET 2: Electronics (60 topics)
Circuit design, components, power systems for robots
Topics to add: breadboard-basics, soldering-basics, pcb-design, voltage-regulators,
motor-drivers, h-bridge, pwm-explained, adc-dac-conversion, i2c-protocol, spi-protocol,
uart-protocol, can-bus-robotics, rs485-protocol, ethernet-robotics, usb-in-robots,
power-management-robots, battery-types-robots, lithium-ion-basics, battery-management-system,
charging-circuits, supercapacitors-robots, fuel-cells-robots, solar-panels-robots,
energy-harvesting-robots, emc-electromagnetic, oscilloscopes, multimeter-basics,
logic-analyzers, signal-generators, function-generators, operational-amplifiers,
comparators-electronics, multiplexers, demultiplexers, shift-registers, counters-electronics,
flip-flops, latches-electronics, decoders-electronics, encoders-electronics, dac-basics,
adc-basics, sample-and-hold, filters-electronics, low-pass-filter, high-pass-filter,
band-pass-filter, noise-reduction-electronics, grounding-electronics, esd-protection,
circuit-protection, fuses-circuit-breakers, relays-explained, optocouplers,
hall-effect-sensors, current-sensors, voltage-sensors, temperature-sensors-electronics,
proximity-sensors-basics, reed-switches

### BUCKET 3: Sensors (expand to 70 topics — already has ~20)
New topics: accelerometer-explained, gyroscope-explained, imu-explained,
magnetometer-compass, barometer-altitude, gps-explained, rtk-gps, differential-gps,
encoder-absolute, encoder-incremental, resolver-sensor, potentiometer-sensor,
strain-gauge, load-cell, force-torque-sensor, tactile-sensor, slip-sensor,
temperature-sensor-types, infrared-sensor, ultrasonic-sensor-deep, microphone-robots,
sound-localization, whisker-sensor, vision-sensor-types, event-camera, depth-camera,
structured-light, time-of-flight-sensor, radar-robotics, sonar-robotics, lidar-types,
solid-state-lidar, spinning-lidar, flash-lidar, gas-sensor-robots, chemical-sensor,
ph-sensor, humidity-sensor, light-sensor-lux, color-sensor, spectroscopy-robots,
current-sensor-robot, voltage-sensor-robot, contact-sensor, limit-switch,
bumper-sensor, cliff-sensor, rain-sensor, wind-sensor, vibration-sensor,
shock-sensor, tilt-sensor, capacitive-sensor, inductive-sensor, magnetic-encoder,
optical-encoder, resolver-explained, synchro-sensor, lvdt-sensor, rvdt-sensor,
sensor-fusion-basics, kalman-filter-sensors, complementary-filter, madgwick-filter

### BUCKET 4: Actuators (expand to 60 topics — already has ~15)
New topics: dc-motor-types, brushed-vs-brushless, bldc-motor, servo-motor-types,
servo-motor-pwm, continuous-rotation-servo, digital-servo, high-torque-servo,
stepper-motor-types, bipolar-stepper, unipolar-stepper, microstepping,
linear-actuator, ball-screw, lead-screw, rack-and-pinion, cable-driven-actuator,
pneumatic-actuator, hydraulic-actuator, shape-memory-alloy, piezoelectric-actuator,
dielectric-elastomer, electroactive-polymer, artificial-muscle, voice-coil-actuator,
solenoid-actuator, magnetic-actuator, gear-motor, worm-gear-motor, planetary-gearbox,
harmonic-drive, cycloidal-drive, direct-drive-motor, torque-motor, back-emf,
motor-constants, stall-torque, no-load-speed, efficiency-curves-motor, thermal-limits,
motor-sizing, backdrivability, compliance-actuators, series-elastic-actuator,
variable-stiffness-actuator, soft-actuator-types, fluidic-soft-actuator,
tendon-driven-actuator, brake-types-robots, clutch-types-robots, transmission-types,
friction-gear, belt-drive, chain-drive, coupling-types, flexible-coupling

### BUCKET 5: Control Systems (expand to 70 topics — already has ~20)
New topics: open-loop-control, closed-loop-control, feedback-control, feedforward-control,
pid-tuning-methods, ziegler-nichols, auto-tuning-pid, cascade-control, ratio-control,
model-predictive-control, adaptive-control, robust-control, optimal-control,
linear-quadratic-regulator, h-infinity-control, sliding-mode-control, fuzzy-logic-control,
neural-network-control, reinforcement-learning-control, state-space-representation,
transfer-functions, bode-plot, nyquist-plot, root-locus, frequency-response,
stability-analysis, lyapunov-stability, phase-margin, gain-margin, bandwidth-control,
rise-time, settling-time, overshoot, steady-state-error, integral-windup, dead-zone-control,
saturating-control, anti-windup, smith-predictor, model-reference-adaptive, gain-scheduling,
event-triggered-control, discrete-time-control, z-transform, sampling-theorem,
digital-control-design, real-time-computing, rtos-basics, interrupt-handling,
control-loop-timing, control-hardware, dsp-for-robots, fpga-control, plc-robotics

### BUCKET 6: Arms & Manipulation (expand to 70 topics — already has ~15)
New topics: dof-degrees-of-freedom, serial-manipulator, parallel-manipulator, delta-robot,
stewart-platform, scara-robot, cartesian-robot, cylindrical-robot, spherical-robot,
workspace-analysis, reachability, dexterity-manipulation, forward-kinematics-deep,
inverse-kinematics-deep, jacobian-matrix, singularities-robotics, redundant-manipulator,
null-space-control, operational-space-control, impedance-control, admittance-control,
hybrid-force-position, stiffness-control, joint-torque-control, gravity-compensation,
friction-compensation, trajectory-planning-arms, minimum-jerk-trajectory, polynomial-trajectory,
via-points, cartesian-path-planning, tool-center-point, end-effector-types, gripper-types,
parallel-gripper, underactuated-gripper, soft-gripper, magnetic-gripper, vacuum-gripper,
bernoulli-gripper, electrostatic-gripper, suction-cup-physics, pinch-grasp, power-grasp,
precision-grasp, in-hand-manipulation, regrasping, compliant-manipulation, peg-in-hole,
assembly-robotics, bin-picking, deformable-object-manipulation, cloth-manipulation,
cable-manipulation, dual-arm-robot, collaborative-robot-cobot

### BUCKET 7: Mobile Robots (expand to 70 topics — already has ~15)
New topics: differential-drive-deep, ackermann-steering-deep, mecanum-wheel-deep,
omni-wheel-deep, skid-steer-robot, legged-locomotion, biped-walking, quadruped-gait,
hexapod-locomotion, gait-planning, balance-control, zmp-zero-moment-point, capturability,
whole-body-control, passive-dynamic-walking, raibert-controller, boston-dynamics-methods,
wheeled-legged-robot, jumping-robots, climbing-robots, wall-climbing-mechanisms,
underwater-propulsion, thruster-types, buoyancy-control, uuv-design, surface-robot,
amphibious-robot, pipe-inspection-robot, disaster-response-robot, search-rescue-robot,
agricultural-robot-locomotion, ground-clearance, terrain-classification, terrain-adaptation,
suspension-systems-robots, shock-absorption-mobile, traction-control, slip-estimation,
odometry-deep, dead-reckoning, imu-odometry, visual-odometry, lidar-odometry,
wheel-odometry-error, mobile-base-design, center-of-mass-mobile, tipping-prevention,
mobile-robot-sizing, battery-life-optimization, charging-strategies, wireless-charging-robots

### BUCKET 8: Navigation & SLAM (50 topics)
NEW BUCKET — Path planning, mapping, localization
Topics: slam-explained, slam-types, feature-based-slam, direct-slam, dense-slam,
graph-slam, pose-graph-optimization, loop-closure, map-representation, occupancy-grid,
point-cloud-map, topological-map, semantic-map, 3d-map, voxel-map, octree-map,
lidar-slam, visual-slam, mono-slam, stereo-slam, rgbd-slam, orb-slam, cartographer,
gmapping-explained, hector-slam, rtab-map, global-localization, localization-explained,
particle-filter, monte-carlo-localization, amcl-explained, ekf-localization, ukf-localization,
pose-estimation, place-recognition, relocalization, kidnapped-robot, path-planning-explained,
dijkstra-algorithm, a-star-algorithm, d-star-algorithm, rrt-explained, rrt-star,
prm-probabilistic-roadmap, potential-field, dynamic-window-approach, teb-planner,
global-vs-local-planner, costmap-explained, inflation-layer, obstacle-avoidance-deep,
dynamic-obstacles, velocity-obstacle

### BUCKET 9: Computer Vision (60 topics)
NEW BUCKET — Visual perception for robots
Topics: image-basics, pixel-explained, color-spaces, rgb-hsv-conversion, grayscale-image,
image-filtering, convolution-explained, gaussian-blur, sobel-edge, canny-edge,
hough-transform, feature-detection, sift-explained, surf-explained, orb-features,
feature-matching, homography, stereo-vision, disparity-map, depth-from-stereo,
epipolar-geometry, camera-calibration, lens-distortion, camera-matrix, projection-matrix,
perspective-transform, image-segmentation, thresholding, watershed-algorithm,
contour-detection, connected-components, optical-flow, lucas-kanade, horn-schunck,
background-subtraction, object-tracking, kalman-tracking, correlation-filter,
object-detection-explained, sliding-window, selective-search, region-proposal,
bounding-box-regression, non-max-suppression, anchor-boxes, yolo-explained,
rcnn-explained, ssd-explained, image-classification-explained, transfer-learning-vision,
semantic-segmentation, instance-segmentation, panoptic-segmentation, depth-estimation,
monocular-depth, point-cloud-processing, icp-algorithm, normal-estimation,
surface-reconstruction, 3d-object-detection, pose-estimation-vision

### BUCKET 10: AI & Machine Learning (70 topics)
Expand from existing AI bucket + add more
New topics: ai-vs-ml-vs-dl, supervised-learning, unsupervised-learning, reinforcement-learning-deep,
regression-explained, classification-explained, clustering-explained, neural-network-deep,
activation-functions, backpropagation-explained, gradient-descent, stochastic-gradient-descent,
adam-optimizer, loss-functions, overfitting-underfitting, regularization, dropout-explained,
batch-normalization, cnn-explained, rnn-explained, lstm-explained, transformer-explained,
attention-mechanism, bert-explained, gpt-explained, diffusion-models, generative-adversarial,
variational-autoencoder, graph-neural-network, geometric-deep-learning, model-based-rl,
model-free-rl, q-learning, dqn-explained, policy-gradient, proximal-policy-optimization,
actor-critic, multi-agent-rl, imitation-learning, learning-from-demonstration, inverse-rl,
sim-to-real, domain-randomization, meta-learning, few-shot-learning, continual-learning,
federated-learning, edge-ai, tinyml, model-quantization, model-pruning, knowledge-distillation,
neural-architecture-search, hyperparameter-tuning, cross-validation, confusion-matrix,
precision-recall, f1-score, roc-curve, data-augmentation, synthetic-data, roboflow,
annotation-tools, active-learning

### BUCKET 11: Programming & Software (50 topics)
NEW BUCKET — Code, frameworks, tools for robotics
Topics: python-for-robotics, cpp-for-robotics, ros2-explained, ros2-nodes, ros2-topics,
ros2-services, ros2-actions, ros2-parameters, ros2-launch, ros2-lifecycle, ros2-bags,
ros2-tf2, ros2-urdf, ros2-moveit2, ros2-nav2, ros2-gazebo, gazebo-simulation,
ignition-gazebo, pybullet-simulation, mujoco-simulation, webots-explained, v-rep-coppeliasim,
arduino-explained, raspberry-pi-robotics, nvidia-jetson, esp32-robotics, stm32-robotics,
micro-ros, microros-explained, docker-robotics, git-robotics-workflow, ci-cd-robotics,
unit-testing-robotics, simulation-testing, hardware-in-the-loop, software-in-the-loop,
real-time-os-rtos, freertos-robotics, linux-robotics, embedded-linux, yocto-project,
middleware-robotics, communication-protocols, grpc-robotics, websockets-robots,
mqtt-robotics, rest-api-robots, graphql-robots, database-robots, logging-robotics

### BUCKET 12: Human-Robot Interaction (40 topics)
NEW BUCKET — How humans and robots work together
Topics: hri-explained, social-robotics, robot-companions, emotional-robots, robot-empathy,
robot-personality, robot-expression, robot-voice, text-to-speech-robots, speech-recognition-robots,
natural-language-processing-robots, conversational-ai-robots, chatbot-vs-robot,
gesture-recognition, body-language-robots, eye-contact-robots, proxemics-robots,
personal-space-robots, robot-legibility, robot-predictability, trust-in-robots,
robot-transparency, explainable-ai-robots, shared-autonomy, human-on-the-loop,
teleoperation-explained, haptic-feedback, force-feedback, exoskeleton-control,
brain-computer-interface, eeg-robotics, emg-control, eye-tracking-robots,
augmented-reality-robots, mixed-reality-robots, robot-teaching-by-demonstration,
kinesthetic-teaching, lfd-learning-from-demonstration, cobots-safety, iso-10218

### BUCKET 13: Robot Types (50 topics)
NEW BUCKET — Categories and famous examples of robots
Topics: industrial-robot-types, articulated-robot, scara-type, delta-type, gantry-robot,
parallel-kinematic-machine, mobile-robot-types, autonomous-mobile-robot, guided-vehicle-agv,
autonomous-mobile-robot-amr, agv-vs-amr, warehouse-robot, delivery-robot, last-mile-robot,
service-robot, social-robot, educational-robot, toy-robot, medical-robot, surgical-robot,
rehabilitation-robot, prosthetic-robot, exoskeleton-types, military-robot, bomb-disposal-robot,
drone-types, fixed-wing-uav, multirotor, vtol-drone, underwater-robot, rov-explained,
auv-explained, space-robot, mars-rovers, lunar-robot, space-station-robot, satellite-servicing,
agricultural-robot-types, fruit-picking-robot, weeding-robot, spraying-drone, milking-robot,
construction-robot, inspection-robot, cleaning-robot, security-robot, entertainment-robot,
soft-robot-types, microrobot, nanorobot, swarm-robot

### BUCKET 14: Famous Robots & Companies (40 topics)
NEW BUCKET — Real robots, real companies, real people
Topics: spot-boston-dynamics, atlas-robot-bd, stretch-robot-bd, optimus-tesla-robot,
figure-humanoid, agility-digit, unitree-robots, boston-dynamics-history,
abb-robotics, fanuc-robots, kuka-history, yaskawa-robots, universal-robots,
rethink-robotics, fetch-robotics, locus-robotics, 6-river-systems,
irobot-roomba, amazon-robotics, boston-dynamics-acquisition, softbank-pepper,
honda-asimo, toyota-t-hr3, sony-aibo, boston-dynamics-spot-uses,
da-vinci-surgical-system, intuitive-surgical, medtronic-robots, stryker-mako,
nasa-perseverance, nasa-ingenuity, nasa-opportunity, iss-canadarm, robonaut,
shadow-robot-hand, festo-bionic, hanson-sophia, engineered-arts-ameca,
nao-robot, pepper-robot, pioneer-robots

### BUCKET 15: Mechanical Design (50 topics)
NEW BUCKET — How robot bodies are designed and built
Topics: cad-for-robots, solidworks-basics, fusion360-basics, onshape-robotics,
3d-printing-robots, fdm-printing, sla-printing, material-selection, pla-vs-abs-vs-petg,
carbon-fiber-robotics, aluminum-extrusion, steel-in-robots, titanium-robotics,
design-for-manufacturing, design-for-assembly, tolerances-fits, fasteners-robots,
bolts-nuts-screws, threaded-inserts, press-fit-joints, snap-fit-design, welding-robots,
laser-cutting, cnc-machining, waterjet-cutting, injection-molding-robots,
linkage-mechanisms, four-bar-linkage, crank-slider, cam-mechanisms, ratchet-pawl,
differential-mechanism, epicyclic-gear, cable-routing, wire-management,
bearing-types, rolling-bearing, plain-bearing, linear-bearing, ball-bearing,
bushing-explained, seal-types, lubrication-robotics, vibration-isolation,
structural-analysis, finite-element-analysis, topology-optimization, weight-reduction,
modularity-design, plug-and-play-hardware, hot-swap-components

### BUCKET 16: Applications (50 topics)
NEW BUCKET — Robotics solving real-world problems
Topics: healthcare-robotics-deep, surgery-robotics-deep, rehabilitation-robotics-deep,
elderly-care-robots, mental-health-robots, drug-dispensing-robot, lab-automation,
agriculture-robotics-deep, precision-agriculture, vertical-farming-robots,
greenhouse-automation, livestock-monitoring, crop-monitoring-drone, food-processing-robots,
manufacturing-robotics-deep, automotive-manufacturing, electronics-manufacturing,
aerospace-manufacturing, semiconductor-robots, quality-control-robots, welding-robot,
painting-robot, assembly-line-robots, logistics-robotics, warehouse-automation,
sortation-systems, goods-to-person, last-mile-delivery, autonomous-truck,
construction-robotics, bricklaying-robot, 3d-printing-construction, demolition-robots,
mining-robots, oil-gas-robots, nuclear-robots, offshore-robots, environmental-robots,
ocean-cleanup-robots, pipeline-inspection, bridge-inspection, facade-cleaning-robot,
retail-robots, hotel-robots, restaurant-robots, airport-robots, space-applications-robots,
satellite-assembly, planetary-exploration, asteroid-mining

### BUCKET 17: Soft Robotics (30 topics)
NEW BUCKET — The emerging world of compliant, flexible robots
Topics: soft-robotics-explained, soft-vs-rigid-robots, bio-inspired-robots,
soft-actuator-physics, pneumatic-soft-actuator, hydraulic-soft-actuator,
dielectric-elastomer-actuator, ionic-polymer-metal, shape-memory-polymer,
granular-jamming, soft-gripper-design, fiber-reinforced-actuator,
soft-robot-fabrication, silicone-molding, multi-material-printing, soft-sensor,
stretchable-electronics, embedded-pneumatics, soft-robot-control,
model-free-soft-control, machine-learning-soft-robots,
crawling-soft-robot, swimming-soft-robot, snake-soft-robot,
wearable-soft-robot, soft-exosuit, rehabilitation-soft-robot,
medical-soft-robot, swallowable-robot, capsule-endoscopy-robot

### BUCKET 18: Swarm Robotics (25 topics)
NEW BUCKET — Many simple robots, emergent complexity
Topics: swarm-robotics-explained, swarm-intelligence, stigmergy, pheromone-algorithms,
ant-colony-optimization, particle-swarm-optimization, boid-algorithm, flocking-behaviour,
collective-decision-making, quorum-sensing-robots, task-allocation-swarm,
self-organization, emergence-robotics, scalability-swarms, fault-tolerance-swarms,
robot-communication-swarm, local-vs-global-info, swarm-mapping, swarm-construction,
swarm-search-rescue, aerial-swarm, ground-swarm, heterogeneous-swarm,
miniaturized-robots, kilobot-explained

### BUCKET 19: Ethics, Safety & Society (35 topics)
Expand from existing Ethics bucket
New topics: robot-safety-standards, iso-10218-explained, iso-ts-15066,
robot-risk-assessment, safety-functions, emergency-stop, speed-force-limiting,
functional-safety, iec-61508, machinery-directive, ce-marking-robots,
robot-insurance, liability-robots, autonomous-weapons, lethal-autonomous-weapons,
robot-rights, legal-personhood-robots, robots-and-jobs, automation-displacement,
future-of-work-robots, reskilling-upskilling, universal-basic-income-robots,
ai-bias-robotics, fairness-robotics, privacy-surveillance-robots, robot-in-public,
regulations-autonomous-vehicles, drone-regulations-india, drone-regulations-global,
data-privacy-robots, cybersecurity-robots, robot-hacking, adversarial-attacks,
environmental-impact-robots, robot-ewaste

### BUCKET 20: Future Technologies (25 topics)
NEW BUCKET — Where robotics is heading
Topics: general-purpose-robot, humanoid-future, robot-consciousness, agi-robotics,
whole-body-loco-manipulation, foundation-models-robotics, large-language-model-robots,
multimodal-ai-robots, world-model-robots, robot-internet, cloud-robotics,
5g-robotics, quantum-computing-robots, neuromorphic-computing, memristor-robots,
dna-computing-robots, molecular-robots, nanorobotics-future, biorobotics,
cyborg-technology, brain-computer-interface-future, human-enhancement,
robot-economy, robot-as-a-service, robotics-in-india-2030

---

## PART 2: NEW MDX FRONTMATTER SCHEMA

Every topic (new and existing) should have this complete frontmatter.
Update the AtlasFrontmatter type in `lib/atlas.ts`:

```typescript
export interface AtlasFrontmatter {
  // ── IDENTITY ──────────────────────────────────────────────────
  title: string                    // Display name: "PID Controller"
  bucket: string                   // One of 20 bucket IDs
  slug: string                     // URL slug: "pid-controller"
  difficultyLevel: number          // 1–5
  tags: string[]                   // Cross-cutting themes
  estimatedReadTime: number        // Minutes

  // ── THE HOOK ──────────────────────────────────────────────────
  tagline: string                  // One sentence. Bold. Top of page.
                                   // "The math that keeps drones from crashing."
  hookLine: string                 // Used in cards. Max 12 words.
  mindBlowingFact: string          // 1 jaw-dropping sentence

  // ── EXPLANATIONS ──────────────────────────────────────────────
  laymanExplanation: string        // 3–5 sentences. Zero jargon. 12-year-old can read.
  analogy: string                  // "Think of it like X..."
  deeperExplanation: string        // 2–3 paragraphs, technical. For curious readers.
  indianExample: string            // Specific India-relevant example

  // ── VISUAL CONTENT ────────────────────────────────────────────
  conceptImage?: string            // Hero image URL or /images/atlas/{slug}.svg
  diagramImage?: string            // Diagram/schematic image URL
  realWorldImage?: string          // Photo of real robot using this concept
  imageCaption?: string            // Caption for the hero image
  youtubeId?: string               // Best explainer video on YouTube
  youtubeSuggestions?: string[]    // 2–3 alternative video IDs
  youtubeTitle?: string            // Title of the YouTube video

  // ── CONNECTIONS ───────────────────────────────────────────────
  prerequisiteTerms: string[]      // Must understand these first (slugs)
  unlocksTerms: string[]           // Understanding this unlocks these (slugs)
  relatedConcepts: string[]        // Same-level related concepts (slugs)
  contradictsConcepts?: string[]   // Common misconceptions / opposing ideas

  // ── REAL WORLD ────────────────────────────────────────────────
  realWorldProducts: string[]      // "Boston Dynamics Spot", "iRobot Roomba"
  companies: string[]              // Companies known for this: "ABB", "KUKA"
  indianCompanies?: string[]       // Indian companies/startups using this
  usedIn: string[]                 // "surgical robots", "warehouse AMRs"

  // ── LEARNING ──────────────────────────────────────────────────
  keyTakeaways: string[]           // 3–5 bullet points to remember
  commonMistakes?: string[]        // What learners get wrong
  proTip?: string                  // One insider insight
  formulaLatex?: string            // Mathematical formula if applicable
  codeSnippet?: string             // Python/ROS2 code example

  // ── GAMIFICATION ─────────────────────────────────────────────
  xpValue: number                  // Default 10. Rare topics worth 25+.
  quizQuestion?: string            // One quick-check question
  quizOptions?: string[]           // Four options
  quizCorrect?: number             // Index of correct option (0-3)

  // ── READING PATHS ────────────────────────────────────────────
  readingPaths?: string[]          // Named paths this topic belongs to
                                   // e.g. "beginner-robotics", "computer-vision-track"

  // ── META ──────────────────────────────────────────────────────
  lastUpdated: string              // ISO date
  isNew?: boolean                  // Badge for recently added topics
  isFeatured?: boolean             // Show in featured/spotlight
}
```

---

## PART 3: CONTENT GENERATION SCRIPT

Create `scripts/generate-atlas-1000.ts`:

This script uses the Anthropic API to generate MDX content for all new topics.
Run it with: `npx tsx scripts/generate-atlas-1000.ts`

```typescript
// scripts/generate-atlas-1000.ts
import Anthropic from '@anthropic-ai/sdk'
import fs from 'node:fs'
import path from 'node:path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// All new topics to generate - import from a topics list
import { NEW_TOPICS } from './atlas-topics-list'

async function generateTopic(topic: {
  slug: string
  title: string
  bucket: string
  difficulty: number
}) {
  const prompt = `You are writing content for R2BOT, India's robotics education platform.
Generate MDX frontmatter for the robotics concept: "${topic.title}"

Rules:
- laymanExplanation: 3-5 sentences, ZERO jargon, a 12-year-old in India can understand
- analogy: Must use an Indian context (chai, cricket, dabbawala, Bollywood, auto-rickshaw, etc.)
- indianExample: Specific real Indian company, institution, or application using this
- tagline: Max 12 words. Punchy. Like a movie tagline.
- mindBlowingFact: One jaw-dropping stat or surprising truth
- deeperExplanation: 2-3 paragraphs for curious readers, can use technical terms
- keyTakeaways: Exactly 3 bullet points
- prerequisiteTerms: 1-3 slug names of concepts to learn first
- unlocksTerms: 2-4 slug names this concept unlocks
- relatedConcepts: 2-3 similar difficulty concepts
- realWorldProducts: 2-3 specific real products using this concept
- quizQuestion + quizOptions + quizCorrect: One simple multiple-choice question
- estimatedReadTime: 2-5 minutes
- xpValue: 10 for common topics, 15 for intermediate, 25 for advanced/rare

Return ONLY valid YAML frontmatter (between --- delimiters), no prose.`

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''
  
  // Write MDX file
  const mdxContent = `${content}

## Overview

${topic.title} is a fundamental concept in robotics. Read the explanation above to understand the basics, then explore the connected concepts below.

## How It Works

[Detailed explanation will be expanded]

## See It In Action

[Real-world demonstrations and examples]
`

  const filePath = path.join(
    process.cwd(),
    'content/atlas',
    topic.bucket,
    `${topic.slug}.mdx`
  )
  
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, mdxContent)
  console.log(`✅ Generated: ${topic.slug}`)
}

// Run with rate limiting - 5 topics at a time
async function main() {
  const batchSize = 5
  for (let i = 0; i < NEW_TOPICS.length; i += batchSize) {
    const batch = NEW_TOPICS.slice(i, i + batchSize)
    await Promise.all(batch.map(generateTopic))
    console.log(`Batch ${Math.floor(i/batchSize)+1} done. ${i+batchSize}/${NEW_TOPICS.length}`)
    await new Promise(r => setTimeout(r, 2000)) // Rate limit pause
  }
}

main()
```

Also create `scripts/atlas-topics-list.ts` with all 735 new topics as an exported array.

---

## PART 4: ATLAS UX COMPLETE REDESIGN

### 4A: ATLAS HOME PAGE REDESIGN (`app/atlas/AtlasHomeClient.tsx`)

Rebuild completely. New layout:

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER BAND                                                │
│  [🔭 Atlas — The Robotics Encyclopaedia]                    │
│  "1,000 concepts. From motors to Mars rovers."             │
│  [XP Bar: 340/500 to Engineer ⚡]  [Streak: 🔥 7 days]      │
│                                                             │
│  [🔍 Search concepts...]  [🎲 Surprise Me]  [📚 My Path]   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  YOUR DASHBOARD (if logged in / localStorage data)         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ 🔄 Continue  │ │ ⏰ Due Review│ │ 🏆 Mastered  │        │
│  │ PID Control  │ │ 3 concepts   │ │ 42 concepts  │        │
│  │ [Resume →]   │ │ [Review →]   │ │ [View all →] │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  READING PATHS (curated journeys)                           │
│  "Not sure where to start? Follow a path."                 │
│                                                             │
│  [🤖 Robot Basics — 8 concepts] →→→→→→→→→→→→→ 40%         │
│  [👁️ Computer Vision — 12 concepts] →→→→→→→ 0%            │
│  [🦾 Build Your First Arm — 10 concepts] → 20%            │
│  [🚗 Self-Driving 101 — 15 concepts] →→→ 0%               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  EXPLORE BY BUCKET                                          │
│  20 visual bucket cards in a responsive grid               │
│                                                             │
│  [🔋 Electronics  60]  [📡 Sensors  70]  [⚡ Actuators  60]│
│  [🎮 Control  70]      [🦾 Arms  70]     [🚗 Mobile  70]  │
│  [🗺️ Navigation  50]   [👁️ Vision  60]   [🧠 AI/ML  70]  │
│  [💻 Software  50]     [🤝 HRI  40]      [🤖 Robots  50]  │
│  [⚙️ Mechanics  50]    [🌍 Apps  50]     [🦑 Soft  30]    │
│  [🐝 Swarm  25]        [⚖️ Ethics  35]   [🔮 Future  25]  │
│  [📐 Foundations  50]  [🏭 Famous  40]                     │
│                                                             │
│  Each card: emoji + name + count + mastery bar             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  FEATURED THIS WEEK                                         │
│  3 spotlight concept cards (curated, rotated weekly)       │
│  Full-width, with image, tagline, CTA                      │
└─────────────────────────────────────────────────────────────┘
```

**Bucket Card Component:**
```tsx
function BucketCard({ bucket, count, mastered, icon, color }) {
  const pct = Math.round((mastered / count) * 100)
  return (
    <Link href={`/atlas?bucket=${bucket.id}`}>
      <div className="rounded-2xl border border-gray-200 p-5 hover:shadow-md 
                      transition-all hover:scale-[1.02] cursor-pointer bg-white">
        <div className="text-3xl mb-2">{icon}</div>
        <div className="font-bold text-gray-900">{bucket.name}</div>
        <div className="text-sm text-gray-500 mb-3">{count} concepts</div>
        {/* Mastery progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full">
          <div 
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-1">{mastered}/{count} mastered</div>
      </div>
    </Link>
  )
}
```

**Reading Paths Component:**
```tsx
const READING_PATHS = [
  {
    id: 'robot-basics',
    title: '🤖 Robot Basics',
    description: 'Perfect first path. 8 concepts, ~45 minutes.',
    concepts: ['what-is-a-robot', 'sensors-overview', 'actuators-overview', 
                'control-basics', 'pid-controller', 'wheels-locomotion',
                'programming-robots', 'first-robot-project'],
    color: '#6366f1',
    level: 'Beginner'
  },
  {
    id: 'computer-vision',
    title: '👁️ See Like a Robot',
    description: 'How robots understand what they see. 12 concepts.',
    concepts: ['camera-explained', 'image-basics', 'feature-detection', 
                'object-detection-explained', 'yolo-explained', 'optical-flow',
                'depth-from-stereo', 'slam-explained', 'visual-slam', 'orb-slam',
                'semantic-segmentation', 'pose-estimation-vision'],
    color: '#0891b2',
    level: 'Intermediate'
  },
  {
    id: 'build-robot-arm',
    title: '🦾 Build a Robot Arm',
    description: 'From motors to manipulation. 10 concepts.',
    concepts: ['servo-motor-types', 'degrees-of-freedom', 'forward-kinematics-deep',
                'inverse-kinematics-deep', 'jacobian-matrix', 'pid-controller',
                'gripper-types', 'trajectory-planning-arms', 'ros2-moveit2', 'assembly-robotics'],
    color: '#16a34a',
    level: 'Intermediate'
  },
  {
    id: 'self-driving-101',
    title: '🚗 Self-Driving 101',
    description: 'How autonomous cars work. 15 concepts.',
    concepts: ['lidar-types', 'camera-calibration', 'sensor-fusion-basics',
                'object-detection-explained', 'slam-explained', 'path-planning-explained',
                'a-star-algorithm', 'pid-controller', 'model-predictive-control',
                'ackermann-steering-deep', 'vehicle-dynamics', 'lane-detection',
                'traffic-sign-recognition', 'behavior-planning', 'safety-autonomous'],
    color: '#dc2626',
    level: 'Advanced'
  },
  {
    id: 'ai-for-robots',
    title: '🧠 AI for Robots',
    description: 'Machine learning meets robotics. 12 concepts.',
    concepts: ['neural-network-deep', 'cnn-explained', 'reinforcement-learning-deep',
                'q-learning', 'proximal-policy-optimization', 'imitation-learning',
                'sim-to-real', 'domain-randomization', 'foundation-models-robotics',
                'large-language-model-robots', 'multimodal-ai-robots', 'world-model-robots'],
    color: '#7c3aed',
    level: 'Advanced'
  },
]
```

---

### 4B: TOPIC DETAIL PAGE REDESIGN (`app/atlas/[type]/[slug]/page.tsx`)

This is the most important page. Every topic should feel like a premium article.

**Full Page Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  BREADCRUMB + META                                          │
│  Atlas > Sensors > Ultrasonic Sensor                       │
│  ⭐ Difficulty 2/5  ·  ⏱️ 4 min read  ·  💎 10 XP         │
│  [🔖 Bookmark]  [✅ Mark Mastered]  [📤 Share]             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  THE HOOK SECTION (above the fold, always)                  │
│                                                             │
│  # Ultrasonic Sensor                                        │
│  ### "How robots hear distance, like a bat in a cave."     │
│                                                             │
│  [HERO IMAGE — full width, 400px tall, rounded]            │
│  [Caption: "An HC-SR04 ultrasonic sensor..."]              │
│                                                             │
│  💡 Mind-blowing: Bats invented this 52 million years ago. │
│  Robots learned it in 1970.                                │
│                                                             │
│  [▶ Watch: Ultrasonic sensors explained in 3 minutes]      │
│  [YouTube embed — lazy loaded, above fold, aspect-video]   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  THE SIMPLE EXPLANATION (always open)                       │
│                                                             │
│  Imagine you're blindfolded in a room. You clap your hands │
│  and listen for the echo. The faster the echo comes back,  │
│  the closer the wall. Ultrasonic sensors work exactly this │
│  way — but with sound waves humans can't hear.             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💡 Think of it like...                              │   │
│  │ A bat uses sound to "see" in the dark. Your phone   │   │
│  │ turns off screen when near your ear. Same idea.     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🇮🇳 In India...                                      │   │
│  │ The parking sensors in your Maruti Suzuki or Tata   │   │
│  │ Nexon that beep when you're too close? Ultrasonic.  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  KEY TAKEAWAYS (collapsible, open by default)               │
│  ✅ Sends sound at 40kHz (humans hear up to 20kHz)          │
│  ✅ Measures distance by timing the echo's return           │
│  ✅ Range: 2cm to 400cm. Accurate to ±3mm                  │
│  ✅ Cheap (₹50–₹200), used in nearly every beginner robot   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DEEP DIVE (collapsed — "Want the full technical story?")   │
│                                                             │
│  [Technical explanation — 2-3 paragraphs]                  │
│  [Diagram image if available]                              │
│  [Formula if applicable]                                   │
│  [Code snippet: Python/Arduino example]                    │
│  [Common mistakes: "Don't point two sensors at each other"]│
│  [Pro tip: "Use NewPing library for Arduino — much easier"]│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  REAL WORLD (always visible)                                │
│  Where you've already seen this today:                     │
│                                                             │
│  🚗 Parking sensors — every car sold in India since 2015   │
│  📱 Phone proximity sensor — screen off during calls       │
│  🤖 iRobot Roomba — knows when it's about to fall off sofa │
│  🏭 ABB industrial robots — avoid collision with workers   │
│                                                             │
│  Used by: [ABB] [KUKA] [Arduino community] [iRobot]       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CONCEPT MAP (collapsible — "See how this connects")        │
│                                                             │
│  Must know first:        This unlocks:                     │
│  → Sound waves           → Sensor fusion                  │
│  → Arduino basics        → SLAM                           │
│                          → Object avoidance               │
│                                                             │
│  Related concepts:                                         │
│  → Infrared sensor  → LiDAR  → Time-of-flight             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  QUICK CHALLENGE (always visible)                           │
│                                                             │
│  🎯 Test your understanding                                │
│                                                             │
│  An ultrasonic sensor sends a pulse and gets an echo       │
│  after 5.8ms. How far is the object? (Speed of sound       │
│  = 343 m/s)                                               │
│                                                             │
│  ○ 50cm  ● 99.5cm  ○ 2m  ○ 5.8cm                         │
│                                                             │
│  [Check Answer]  → [Correct! +10 XP 🎉]                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  STICKY BOTTOM: WHAT'S NEXT                                 │
│                                                             │
│  🚀 Up next:                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────┐ │
│  │ 📡 Infrared      │  │ 🔊 Sensor Fusion  │  │ 🎲 Surprise│
│  │ Sensor           │  │ (unlocked!)       │  │ me!      │ │
│  │ Similar level    │  │ You're ready      │  │          │ │
│  └──────────────────┘  └──────────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Implementation — New Concept Detail Page:**

```tsx
// app/atlas/[type]/[slug]/AtlasConceptClient.tsx
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AtlasFrontmatter } from '@/lib/atlas'
import { addXP, markConceptMastered, getConceptMasteryCount } from '@/lib/atlas-xp'

interface Props {
  frontmatter: AtlasFrontmatter
  body: string
  allNodes: AtlasNode[]
}

export function AtlasConceptClient({ frontmatter, body, allNodes }: Props) {
  const [deepDiveOpen, setDeepDiveOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [quizAnswered, setQuizAnswered] = useState<number | null>(null)
  const [mastered, setMastered] = useState(false)
  const [xpAdded, setXpAdded] = useState(false)

  // Get prerequisite and unlock nodes from allNodes
  const prereqs = allNodes.filter(n => frontmatter.prerequisiteTerms?.includes(n.slug))
  const unlocks = allNodes.filter(n => frontmatter.unlocksTerms?.includes(n.slug))
  const related = allNodes.filter(n => frontmatter.relatedConcepts?.includes(n.slug))

  // Next topic recommendations
  const nextTopics = [...unlocks.slice(0, 2), ...related.slice(0, 1)]

  function handleMarkMastered() {
    markConceptMastered(frontmatter.slug)
    addXP(frontmatter.xpValue || 10)
    setMastered(true)
    setXpAdded(true)
    // Confetti animation
    setTimeout(() => setXpAdded(false), 3000)
  }

  function handleQuizAnswer(idx: number) {
    if (quizAnswered !== null) return
    setQuizAnswered(idx)
    if (idx === frontmatter.quizCorrect) {
      addXP(5) // Bonus for correct answer
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-32">

      {/* Breadcrumb + Meta */}
      <div className="flex flex-wrap items-center gap-2 py-4 text-sm text-gray-500">
        <Link href="/atlas">Atlas</Link>
        <span>›</span>
        <Link href={`/atlas?bucket=${frontmatter.bucket}`}>{frontmatter.bucket}</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">{frontmatter.title}</span>
        <div className="ml-auto flex gap-3">
          {'⭐'.repeat(frontmatter.difficultyLevel)}
          <span>· {frontmatter.estimatedReadTime} min</span>
          <span>· 💎 {frontmatter.xpValue || 10} XP</span>
        </div>
      </div>

      {/* THE HOOK */}
      <section className="mb-8">
        <h1 className="text-4xl font-black text-gray-900 mb-2">{frontmatter.title}</h1>
        {frontmatter.tagline && (
          <p className="text-xl text-gray-600 italic mb-6">"{frontmatter.tagline}"</p>
        )}
        
        {/* Hero Image */}
        {frontmatter.conceptImage && (
          <div className="rounded-2xl overflow-hidden mb-4">
            <Image 
              src={frontmatter.conceptImage}
              alt={frontmatter.title}
              width={800} height={400}
              className="w-full object-cover"
            />
            {frontmatter.imageCaption && (
              <p className="text-xs text-center text-gray-400 mt-1 px-2">
                {frontmatter.imageCaption}
              </p>
            )}
          </div>
        )}

        {/* Mind-Blowing Fact */}
        {frontmatter.mindBlowingFact && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <span className="text-amber-600 font-bold">😲 Mind-blowing: </span>
            {frontmatter.mindBlowingFact}
          </div>
        )}

        {/* YouTube Embed */}
        {frontmatter.youtubeId && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">
              📹 {frontmatter.youtubeTitle || `Watch: ${frontmatter.title} explained`}
            </p>
            <iframe
              src={`https://www.youtube.com/embed/${frontmatter.youtubeId}?modestbranding=1`}
              className="w-full rounded-xl aspect-video"
              loading="lazy"
              allowFullScreen
            />
          </div>
        )}
      </section>

      {/* SIMPLE EXPLANATION */}
      <section className="mb-6">
        <p className="text-lg text-gray-800 leading-relaxed mb-4">
          {frontmatter.laymanExplanation}
        </p>

        {/* Analogy Card */}
        {frontmatter.analogy && (
          <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-xl p-4 mb-4">
            <span className="font-bold text-blue-700">💡 Think of it like... </span>
            <span className="text-blue-800">{frontmatter.analogy}</span>
          </div>
        )}

        {/* India Example */}
        {frontmatter.indianExample && (
          <div className="bg-green-50 border-l-4 border-green-400 rounded-r-xl p-4">
            <span className="font-bold text-green-700">🇮🇳 In India... </span>
            <span className="text-green-800">{frontmatter.indianExample}</span>
          </div>
        )}
      </section>

      {/* KEY TAKEAWAYS */}
      {frontmatter.keyTakeaways?.length > 0 && (
        <section className="bg-gray-50 rounded-2xl p-5 mb-6">
          <h3 className="font-bold text-gray-900 mb-3">✅ Key Takeaways</h3>
          <ul className="space-y-2">
            {frontmatter.keyTakeaways.map((t, i) => (
              <li key={i} className="flex gap-2 text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* DEEP DIVE (collapsed) */}
      <section className="border border-gray-200 rounded-2xl mb-6 overflow-hidden">
        <button
          onClick={() => setDeepDiveOpen(!deepDiveOpen)}
          className="w-full p-4 flex justify-between items-center text-left hover:bg-gray-50"
        >
          <span className="font-bold">🔬 Deep Dive — Full Technical Story</span>
          <span className="text-gray-400">{deepDiveOpen ? '▲' : '▼'}</span>
        </button>
        {deepDiveOpen && (
          <div className="p-4 pt-0 border-t border-gray-100">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
              {frontmatter.deeperExplanation}
            </p>
            {frontmatter.diagramImage && (
              <Image src={frontmatter.diagramImage} alt="Diagram" width={700} height={400}
                className="rounded-xl mb-4" />
            )}
            {frontmatter.formulaLatex && (
              <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-sm mb-4">
                {frontmatter.formulaLatex}
              </div>
            )}
            {frontmatter.codeSnippet && (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-sm overflow-x-auto mb-4">
                <code>{frontmatter.codeSnippet}</code>
              </pre>
            )}
            {frontmatter.commonMistakes?.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4 mb-4">
                <h4 className="font-bold text-red-700 mb-2">⚠️ Common Mistakes</h4>
                <ul className="space-y-1">
                  {frontmatter.commonMistakes.map((m, i) => (
                    <li key={i} className="text-red-700 text-sm">• {m}</li>
                  ))}
                </ul>
              </div>
            )}
            {frontmatter.proTip && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <span className="font-bold text-purple-700">💜 Pro Tip: </span>
                <span className="text-purple-800">{frontmatter.proTip}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* REAL WORLD */}
      {(frontmatter.realWorldProducts?.length > 0 || frontmatter.usedIn?.length > 0) && (
        <section className="mb-6">
          <h3 className="font-bold text-gray-900 mb-3">
            🌍 Where you've already seen this today
          </h3>
          {frontmatter.usedIn?.map((use, i) => (
            <div key={i} className="flex gap-3 items-start mb-2 text-gray-700">
              <span>🔹</span>
              <span>{use}</span>
            </div>
          ))}
          {frontmatter.realWorldProducts?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {frontmatter.realWorldProducts.map((p, i) => (
                <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                  {p}
                </span>
              ))}
            </div>
          )}
          {frontmatter.indianCompanies?.length > 0 && (
            <div className="mt-3">
              <span className="text-sm font-medium text-gray-600">🇮🇳 Indian companies: </span>
              {frontmatter.indianCompanies.join(', ')}
            </div>
          )}
        </section>
      )}

      {/* CONCEPT MAP */}
      <section className="border border-gray-200 rounded-2xl mb-6 overflow-hidden">
        <button
          onClick={() => setMapOpen(!mapOpen)}
          className="w-full p-4 flex justify-between items-center text-left hover:bg-gray-50"
        >
          <span className="font-bold">🗺️ How This Connects to Other Concepts</span>
          <span className="text-gray-400">{mapOpen ? '▲' : '▼'}</span>
        </button>
        {mapOpen && (
          <div className="p-4 pt-0 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-bold text-gray-500 mb-2">MUST KNOW FIRST</h4>
              {prereqs.length === 0
                ? <p className="text-sm text-gray-400">Good starting point — no prerequisites!</p>
                : prereqs.map(n => (
                  <Link key={n.slug} href={`/atlas/${n.type}/${n.slug}`}
                    className="block text-sm text-blue-600 hover:underline mb-1">
                    → {n.title}
                  </Link>
                ))
              }
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-500 mb-2">THIS UNLOCKS</h4>
              {unlocks.map(n => (
                <Link key={n.slug} href={`/atlas/${n.type}/${n.slug}`}
                  className="block text-sm text-green-600 hover:underline mb-1">
                  → {n.title}
                </Link>
              ))}
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-500 mb-2">RELATED</h4>
              {related.map(n => (
                <Link key={n.slug} href={`/atlas/${n.type}/${n.slug}`}
                  className="block text-sm text-purple-600 hover:underline mb-1">
                  ≈ {n.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* QUICK CHALLENGE */}
      {frontmatter.quizQuestion && (
        <section className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-6">
          <h3 className="font-bold text-indigo-900 mb-3">🎯 Quick Challenge</h3>
          <p className="text-gray-800 mb-4">{frontmatter.quizQuestion}</p>
          <div className="space-y-2">
            {frontmatter.quizOptions?.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleQuizAnswer(i)}
                disabled={quizAnswered !== null}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                  quizAnswered === null
                    ? 'border-gray-200 bg-white hover:border-indigo-400'
                    : i === frontmatter.quizCorrect
                    ? 'border-green-400 bg-green-50 text-green-800'
                    : i === quizAnswered
                    ? 'border-red-400 bg-red-50 text-red-800'
                    : 'border-gray-100 bg-gray-50 text-gray-400'
                }`}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </button>
            ))}
          </div>
          {quizAnswered !== null && (
            <div className={`mt-3 text-sm font-medium ${
              quizAnswered === frontmatter.quizCorrect ? 'text-green-600' : 'text-red-600'
            }`}>
              {quizAnswered === frontmatter.quizCorrect
                ? '✅ Correct! +5 XP bonus'
                : `❌ The answer is: ${frontmatter.quizOptions?.[frontmatter.quizCorrect ?? 0]}`}
            </div>
          )}
        </section>
      )}

      {/* MARK MASTERED */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={handleMarkMastered}
          disabled={mastered}
          className={`flex-1 py-3 rounded-xl font-bold transition-all ${
            mastered
              ? 'bg-green-100 text-green-700 cursor-default'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {mastered ? '✅ Mastered!' : `✓ Mark as Mastered (+${frontmatter.xpValue || 10} XP)`}
        </button>
        <button
          onClick={() => {
            const text = `I just learned about ${frontmatter.title} on R2BOT! 🤖 r2bot.in/atlas`
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
          }}
          className="px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50"
        >
          📤
        </button>
      </div>

      {/* STICKY NEXT TOPICS BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 
                      px-4 py-3 flex gap-3 overflow-x-auto z-50 shadow-lg">
        <span className="text-sm font-bold text-gray-500 shrink-0 self-center">Up next:</span>
        {nextTopics.map(n => (
          <Link
            key={n.slug}
            href={`/atlas/${n.type}/${n.slug}`}
            className="shrink-0 bg-gray-50 hover:bg-indigo-50 border border-gray-200 
                       hover:border-indigo-300 rounded-xl px-3 py-2 text-sm"
          >
            <div className="font-medium text-gray-900">{n.title}</div>
            <div className="text-xs text-gray-400">{n.bucket}</div>
          </Link>
        ))}
        <Link
          href="/atlas"
          className="shrink-0 bg-indigo-500 text-white rounded-xl px-3 py-2 text-sm 
                     font-medium hover:bg-indigo-600"
        >
          🎲 Surprise me
        </Link>
      </div>

    </div>
  )
}
```

---

### 4C: SEARCH UX REDESIGN

Create `components/atlas/AtlasSearch.tsx` — a command-palette style search:

```
When user clicks search box:
- Full-screen overlay appears
- Large search input at top
- Below: recent concepts (from localStorage)
- Below: "Popular right now" — top 5 featured concepts
- As user types: live results with title + tagline + bucket badge
- Keyboard navigation: ↑↓ to select, Enter to open
- ESC to close
- Also understands intent: "how do robots see?" → shows Computer Vision concepts
```

Key features:
- Fuse.js for fuzzy search (npm install fuse.js)
- Search across: title, tagline, laymanExplanation, tags, indianExample
- Filter by bucket (chips at top of results)
- Filter by difficulty (1–5 dots)
- Keyboard shortcut: Cmd+K or / to open

---

### 4D: READING PATHS PAGE

Create `app/atlas/paths/page.tsx` and `app/atlas/paths/[pathId]/page.tsx`:

The path page shows:
- Path hero with icon, title, description, level badge, estimated time
- Linear progress through concepts (like a course)
- Each concept shown as a step: locked / current / completed
- "Continue Path" button always visible
- Completion certificate when all concepts mastered

---

## PART 5: SUPPORTING INFRASTRUCTURE

### 5A: lib/atlas-xp.ts (create if not exists)
```typescript
const XP_KEY = 'atlas_xp'
const MASTERED_KEY = 'atlas_mastered'
const VISITED_KEY = 'atlas_visited'

export function getAtlasXP(): number
export function addXP(amount: number): number
export function getAtlasLevel(): { name: string; current: number; nextAt: number; emoji: string }
export function getMasteredSlugs(): string[]
export function markConceptMastered(slug: string): void
export function isConceptMastered(slug: string): boolean
export function getVisitedSlugs(): string[]
export function markConceptVisited(slug: string): void
export function getConceptMasteryCount(slug: string): number

// Levels: 0=Apprentice🔧 100=Builder🤖 500=Engineer⚡ 1500=Maestro🏆 5000=Legend👑
```

### 5B: Update lib/atlas.ts
- Add all new AtlasFrontmatter fields (from Part 2)
- Keep all existing functions
- Add `getAllAtlasNodes()` function returning flat array of all concepts

### 5C: Update getAllAtlasNodes to include bucket metadata
Return bucket name, color, icon for each node so cards can render without extra lookups.

---

## EXECUTION ORDER

1. **Update type definitions** — `lib/atlas.ts` new AtlasFrontmatter + `lib/atlas-xp.ts`
2. **Create topics list file** — `scripts/atlas-topics-list.ts` with all 735 new topic objects
3. **Run generation script** — `npx tsx scripts/generate-atlas-1000.ts` (will take 20–30 min)
4. **Install fuse.js** — `npm install fuse.js`
5. **Build AtlasSearch component** — command palette style
6. **Rebuild Atlas home** — AtlasHomeClient.tsx with bucket cards + paths + dashboard
7. **Rebuild concept detail page** — AtlasConceptClient.tsx (the big one)
8. **Build Reading Paths pages** — /atlas/paths + /atlas/paths/[pathId]
9. **Wire XP + mastery** — ensure localStorage state flows correctly
10. **Add page transitions** — Framer Motion fade between concepts
11. **npm run build** — verify zero TypeScript errors
12. **vercel deploy** — push to production

---

## IMPORTANT NOTES

- All new MDX files go in `content/atlas/{bucket}/{slug}.mdx`
- Existing 265 topics: do NOT modify their slugs (will break URLs)
- New topics: use kebab-case slugs matching exactly the names in Part 1
- Images: For Phase 1, use placeholder from `https://placehold.co/800x400?text={title}` 
  or Unsplash: `https://source.unsplash.com/800x400/?{keyword}`
- The generation script should check if file already exists before overwriting
- Run `npx tsx scripts/generate-atlas-1000.ts --dry-run` first to validate topic list
- Content quality check: after generation, manually review 10 random topics

=======================================================================
END OF ATLAS 1000 PROMPT
=======================================================================
```
