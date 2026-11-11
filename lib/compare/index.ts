// lib/compare/index.ts — the side-by-side comparisons hub.
//
// Comparison queries ("X vs Y") are decision queries: the reader has two
// options and wants to know which. The blog owns "X vs Y" per the canonical
// map; this hub collects every comparison on the site in one place so the
// format is discoverable, and holds the data for the structured comparison
// pages under /compare/<slug>.

export type Verdict = 'a' | 'b' | 'c' | 'tie';

/** `c` is present only in three-way comparisons; a row of a two-way comparison never sets it. */
export type CompareRow = { aspect: string; a: string; b: string; c?: string; verdict?: Verdict };

export type Comparison = {
  slug: string;
  title: string;
  a: string;
  b: string;
  /** Optional third option. When set, every row carries `c` and `chooseC` is rendered. */
  c?: string;
  question: string;
  /** Meta description, ≤155 chars. Falls back to a generated one when absent. */
  description?: string;
  summary: string;
  oneLineAnswer: string;
  rows: CompareRow[];
  chooseA: string[];
  chooseB: string[];
  chooseC?: string[];
  related: { href: string; label: string }[];
  sources: { name: string; url: string }[];
  updated: string;
};

export const COMPARISONS: Comparison[] = [
  {
    slug: 'lidar-vs-camera-slam',
    title: 'Lidar SLAM vs camera (visual) SLAM',
    a: 'Lidar SLAM',
    b: 'Visual SLAM',
    question: 'Should my robot map the world with a laser or a camera?',
    description:
      'Lidar vs visual SLAM on 12 aspects: lighting, cost, weight, compute, loop closure, scale, glass, open-source stacks. When to choose each, with sources.',
    summary:
      'Both build a map while tracking the robot inside it. Lidar measures distance directly and works in the dark; a camera is cheaper, lighter and sees texture and objects, but has to infer distance and fails in low light or on blank walls.',
    oneLineAnswer:
      'Pick lidar when you need reliable geometry (indoor navigation, warehouses, anything that must not bump into things); pick a camera when weight, cost or power rule lidar out, or when you also need to recognise what you see. Serious robots fuse both.',
    rows: [
      { aspect: 'What the sensor measures', a: 'Distance to the nearest surface along each laser beam — direct range', b: 'Brightness per pixel — depth has to be inferred from parallax, stereo or a learned model', verdict: 'a' },
      { aspect: 'Lighting', a: 'Works in total darkness; dazzled by direct sun on some units', b: 'Needs light; struggles with glare, darkness and fast exposure changes', verdict: 'a' },
      { aspect: 'Featureless spaces (long corridors, white walls)', a: 'Corridors are ambiguous for 2D lidar, but walls still give range', b: 'Few visual features to track; drift and tracking loss are common', verdict: 'a' },
      { aspect: 'Glass and mirrors', a: 'Lasers pass through or reflect off glass — classic lidar failure', b: 'Also confused by reflections, but texture behind glass can still be tracked', verdict: 'tie' },
      { aspect: 'Dynamic scenes (people walking past)', a: 'Moving blobs corrupt scan matching unless filtered', b: 'Moving objects corrupt feature tracking unless masked', verdict: 'tie' },
      { aspect: 'Semantic information (what is that?)', a: 'A point cloud has shape but no labels', b: 'Images carry colour, text, object identity — recognise a door, a charger, a person', verdict: 'b' },
      { aspect: 'Cost', a: '2D units from ~$100 (robot-vacuum class) to several thousand for 3D', b: 'A usable camera from ~$20; stereo or RGB-D from ~$150', verdict: 'b' },
      { aspect: 'Size, weight, power', a: 'Spinning 2D units ~150–300 g; 3D units heavier and power-hungry', b: 'Grams, milliwatts — fits on a drone or a toy', verdict: 'b' },
      { aspect: 'Compute', a: 'Scan matching is cheap; 2D SLAM runs on a Raspberry Pi', b: 'Feature extraction and bundle adjustment are heavier; real-time needs a decent CPU or GPU', verdict: 'a' },
      { aspect: 'Loop closure (recognising a place you have been)', a: 'Possible from geometry, but similar rooms look alike to a laser', b: 'Strong: place recognition from appearance is what cameras are good at', verdict: 'b' },
      { aspect: 'Scale', a: 'Metric by construction — the map is in metres', b: 'Monocular SLAM has no absolute scale without an IMU, stereo or depth sensor', verdict: 'a' },
      { aspect: 'Mature open-source stacks', a: 'SLAM Toolbox, Cartographer, GMapping (2D); LIO-SAM, FAST-LIO (3D)', b: 'ORB-SLAM3, RTAB-Map (RGB-D), VINS-Fusion, OpenVINS', verdict: 'tie' },
    ],
    chooseA: [
      'Indoor mobile robots that must navigate reliably: warehouses, hospitals, offices.',
      'Anything that operates at night or in windowless rooms.',
      'You want a metric 2D map you can hand to Nav2 today.',
      'Compute is small (a Pi or a Jetson Nano) and the budget allows a ~$100+ 2D lidar.',
    ],
    chooseB: [
      'Weight or power is critical: drones, small wheeled robots, wearables.',
      'You also need to recognise objects, read signs or find a specific thing.',
      'Budget is tens of dollars, not hundreds.',
      'You can add an IMU (for scale and robustness) — visual-inertial SLAM is far stronger than a bare camera.',
    ],
    related: [
      { href: '/atlas/concept/slam', label: 'SLAM explained' },
      { href: '/atlas/concept/lidar', label: 'Lidar explained' },
      { href: '/atlas/concept/visual-odometry', label: 'Visual odometry' },
      { href: '/atlas/concept/sensor-fusion', label: 'Sensor fusion' },
      { href: '/visualizer/fusion', label: 'Try it: Kalman filter sensor-fusion simulator' },
    ],
    sources: [
      { name: 'Cadena et al., "Past, Present, and Future of SLAM" (IEEE T-RO, 2016)', url: 'https://ieeexplore.ieee.org/document/7747236' },
      { name: 'SLAM Toolbox (ROS 2) — repository and docs', url: 'https://github.com/SteveMacenski/slam_toolbox' },
      { name: 'ORB-SLAM3 — Campos et al., IEEE T-RO 2021', url: 'https://ieeexplore.ieee.org/document/9440682' },
      { name: 'Wikipedia: Simultaneous localization and mapping', url: 'https://en.wikipedia.org/wiki/Simultaneous_localization_and_mapping' },
    ],
    updated: '2026-11-09',
  },
  {
    slug: 'arduino-vs-esp32-vs-raspberry-pi',
    title: 'Arduino vs ESP32 vs Raspberry Pi for robots',
    a: 'Arduino Uno R4',
    b: 'ESP32',
    c: 'Raspberry Pi 5',
    question: 'Which board should be the brain of my robot?',
    description:
      'Arduino Uno R4 vs ESP32 vs Raspberry Pi 5 on 12 aspects: speed, RAM, GPIO voltage, real-time, power, price, ROS 2 support, best first board. With sources.',
    summary:
      'These are three different kinds of computer. The Uno R4 is a 48 MHz microcontroller that runs one program, bare-metal, with 5 V pins — the most forgiving board to learn on. The ESP32 is a 240 MHz dual-core microcontroller with Wi-Fi and Bluetooth built in, for a few dollars more. The Raspberry Pi 5 is a Linux computer with up to 16 GB of RAM: it runs ROS 2 and vision models but is not a real-time controller.',
    oneLineAnswer:
      'Start on an Arduino Uno if you have never flashed a board; move to an ESP32 once your robot needs to talk to a phone, a server or another robot; add a Raspberry Pi (or a Jetson) only when you need a camera, a map or ROS 2 — and keep a microcontroller underneath it driving the motors.',
    rows: [
      { aspect: 'What it is', a: 'Microcontroller board: Renesas RA4M1, Arm Cortex-M4 at 48 MHz', b: 'Microcontroller SoC: dual-core Xtensa LX6 at up to 240 MHz', c: 'Single-board computer: quad-core Arm Cortex-A76 at 2.4 GHz', verdict: 'tie' },
      { aspect: 'Memory', a: '32 KB SRAM, 256 KB flash — enough for motor logic, not for images', b: '520 KB SRAM, 4 MB flash on a typical DevKitC — room for a web server and FreeRTOS tasks', c: '1–16 GB LPDDR4X, storage on microSD or NVMe — runs a full OS', verdict: 'c' },
      { aspect: 'Connectivity', a: 'None on the Minima (the Uno R4 WiFi adds a radio); UART, I²C, SPI and CAN on board', b: 'Wi-Fi 802.11 b/g/n and Bluetooth 4.2 (BR/EDR + LE) on the chip', c: 'Gigabit Ethernet, dual-band Wi-Fi, Bluetooth 5, USB 3, PCIe', verdict: 'c' },
      { aspect: 'GPIO voltage', a: '5 V logic — drives most hobby sensors and motor drivers directly', b: '3.3 V logic — 5 V sensors need a level shifter or a divider', c: '3.3 V logic on the 40-pin header; a wrong wire can kill the board', verdict: 'a' },
      { aspect: 'Analog inputs', a: '6 inputs, up to 14-bit, plus a 12-bit DAC', b: 'Up to 18 ADC channels at 12-bit (two are unusable while Wi-Fi is on)', c: 'None — add an external ADC chip for any analog sensor', verdict: 'a' },
      { aspect: 'Real-time behaviour', a: 'Bare metal: one loop, microsecond-predictable timing — ideal for PID and PWM', b: 'ESP-IDF runs FreeRTOS: predictable tasks, but the Wi-Fi stack competes for one core', c: 'Linux: scheduling jitter of milliseconds; not for closing a motor loop', verdict: 'a' },
      { aspect: 'Power', a: 'Tens of milliamps at 5 V; runs for days from a battery pack; VIN 6–24 V', b: 'Hundreds of mA when the radio transmits; a ULP co-processor runs while the cores sleep, so battery projects are possible', c: 'Peak about 12 W; the official 5 V 5 A (25 W) supply is recommended — a serious battery budget', verdict: 'a' },
      { aspect: 'Price (official store, late 2026)', a: 'Uno R4 Minima $20 (store-usa.arduino.cc)', b: 'ESP32-DevKitC about $10; bare modules less', c: 'Pi 5 from $45 (1 GB) to $145 (16 GB) after the Dec 2025 price change; add a PSU, card and cooler', verdict: 'b' },
      { aspect: 'Can it run ROS 2?', a: 'No. micro-ROS lists only the Portenta H7 among Arduino boards; the Uno has too little RAM', b: 'Yes, as a micro-ROS client over UART or Wi-Fi UDP — it publishes topics to a ROS 2 agent on a bigger computer', c: 'Yes, natively: Ubuntu 24.04 arm64 is a Tier 1 ROS 2 Jazzy platform with binary packages', verdict: 'c' },
      { aspect: 'Typical robot role', a: 'Motor control, encoders, line-following, obstacle avoidance — the reflexes', b: 'Connected sensors, telemetry, phone-controlled robots, the bridge between a Pi and the motors', c: 'Vision, SLAM, Nav2, speech, the ROS 2 graph — the planning brain', verdict: 'tie' },
      { aspect: 'Programming', a: 'Arduino IDE, C/C++; the largest beginner library ecosystem in hobby electronics', b: 'Arduino IDE, ESP-IDF (C), MicroPython; more setup, more options', c: 'Any language — Python first; a full desktop if you plug in a monitor', verdict: 'tie' },
      { aspect: 'Best first board for a beginner', a: 'Yes. 5 V tolerance, instant feedback, and every tutorial on the internet was written for it', b: 'Second board. Worth it the moment a project needs a network', c: 'Not as a first robot controller — it is a computer, and you still need a microcontroller for the motors', verdict: 'a' },
    ],
    chooseA: [
      'It is your first robot and you want to blink an LED, read a sensor and spin a motor within an hour.',
      'The robot has no need to talk to anything — a line-follower, a sumo bot, a servo arm.',
      'You are driving 5 V sensors or modules and do not want to think about level shifting.',
      'Timing matters more than throughput: PWM, encoder counting, a PID loop.',
    ],
    chooseB: [
      'The robot needs Wi-Fi or Bluetooth: phone control, telemetry, a web dashboard, OTA updates.',
      'You want micro-ROS so a microcontroller can appear as a node in a ROS 2 graph.',
      'Budget is the tightest constraint — a whole dev board for the price of a sensor.',
      'You are ready for 3.3 V logic and a slightly fussier toolchain.',
    ],
    chooseC: [
      'The robot needs a camera, a lidar map, Nav2 or any neural network.',
      'You want to learn ROS 2 on real hardware without a laptop strapped to the chassis.',
      'The project is a Linux project (SSH, Python, Docker) that happens to have wheels.',
      'You accept a bigger battery, a cooler, and a microcontroller underneath for the motors.',
    ],
    related: [
      { href: '/atlas/concept/microcontroller', label: 'Microcontroller explained' },
      { href: '/atlas/concept/single-board-computer', label: 'Single-board computer' },
      { href: '/atlas/concept/arduino', label: 'Arduino' },
      { href: '/atlas/concept/esp32-robotics', label: 'ESP32 in robotics' },
      { href: '/atlas/concept/raspberry-pi-robotics', label: 'Raspberry Pi in robotics' },
      { href: '/atlas/concept/micro-ros', label: 'micro-ROS' },
      { href: '/atlas/concept/real-time-computing', label: 'Real-time computing' },
      { href: '/blog/arduino-vs-esp32-vs-raspberry-pi-for-robots', label: 'Long read: choosing a board for your first robot' },
    ],
    sources: [
      { name: 'Arduino — UNO R4 Minima documentation and tech specs', url: 'https://docs.arduino.cc/hardware/uno-r4-minima/' },
      { name: 'Arduino Store (USA) — UNO R4 Minima', url: 'https://store-usa.arduino.cc/products/uno-r4-minima' },
      { name: 'Espressif — ESP32 series datasheet', url: 'https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf' },
      { name: 'Raspberry Pi — Introducing Raspberry Pi 5', url: 'https://www.raspberrypi.com/news/introducing-raspberry-pi-5/' },
      { name: 'CNX Software — Raspberry Pi 5 1 GB launched, Dec 2025 price list', url: 'https://www.cnx-software.com/2025-12-01/raspberry-pi-5-1gb-launched-for-45-most-other-pi-4-5-models-get-a-price-increase' },
      { name: 'micro-ROS — Supported hardware', url: 'https://micro.ros.org/docs/overview/hardware' },
      { name: 'REP 2000 — ROS 2 releases and target platforms', url: 'https://reps.openrobotics.org/rep-2000/' },
    ],
    updated: '2026-11-09',
  },
  {
    slug: 'spot-vs-unitree-go2-vs-anymal',
    title: 'Spot vs Unitree Go2 vs ANYmal',
    a: 'Boston Dynamics Spot',
    b: 'Unitree Go2',
    c: 'ANYbotics ANYmal',
    question: 'Three famous robot dogs — which one is actually for you?',
    description:
      'Boston Dynamics Spot vs Unitree Go2 vs ANYbotics ANYmal on 12 aspects: price, weight, payload, runtime, speed, IP rating, SDK, autonomy, who each is for.',
    summary:
      'They look alike and are built for completely different buyers. Spot is an enterprise inspection and research platform with a mature SDK and a five-figure price. The Go2 is a consumer-and-developer quadruped that starts under $2,000 and ships with a lidar. ANYmal is a sealed, IP67 industrial inspector — the X variant is certified for explosive atmospheres — sold as an autonomous inspection service rather than a robot you program.',
    oneLineAnswer:
      'Buy a Go2 to learn legged robotics or to build on a quadruped without a grant; buy Spot when you need a proven platform with a deep API and a support organisation behind it; buy ANYmal when the job is routine inspection of an industrial plant and the robot has to survive it.',
    rows: [
      { aspect: 'Price', a: '$74,500 for the Explorer kit at the June 2020 US launch; now quote-only', b: 'Air $1,600 · Pro $2,800 · X $4,500 · Edu on request (excl. tax and freight)', c: 'Not published — sold through sales as a robot-plus-software contract', verdict: 'b' },
      { aspect: 'Weight', a: '33.8 kg with battery (5.2 kg battery)', b: 'About 15 kg with battery', c: '50 kg; 55.7 kg with the inspection payload', verdict: 'b' },
      { aspect: 'Payload', a: 'Up to 20.4 kg; 850 × 240 × 270 mm mounting area with T-slot rails and two DB25 power ports', b: '7–8 kg standard, 10–12 kg maximum depending on variant', c: '10 kg nominal; 15 kg with reduced speed and runtime', verdict: 'a' },
      { aspect: 'Runtime', a: 'About 90 min average (564 Wh); 60 min recharge; autonomous docking', b: '1–2 h on the 8,000 mAh pack; 2–4 h on the Edu 15,000 mAh pack', c: '90–120 min; up to 4 km range; autonomous docking and resume', verdict: 'b' },
      { aspect: 'Top speed', a: '1.6 m/s', b: '2.5 m/s (Air), 3.5 (Pro), 3.7 (X/Edu); about 5 m/s in lab conditions', c: '1.3 m/s maximum, 0.75 m/s recommended', verdict: 'b' },
      { aspect: 'Terrain', a: '±30° slopes, 300 mm steps; self-rights after a fall', b: 'Stairs and rough ground; maker does not publish step or slope limits', c: '±30° slopes, 45° stairs, 250 mm steps, 300 mm gaps, 600 mm narrow passages', verdict: 'c' },
      { aspect: 'Ingress protection', a: 'IP54, −20 °C to 55 °C', b: 'Not published', c: 'IP67, specified 0–40 °C (typical −10 to 50 °C)', verdict: 'c' },
      { aspect: 'Hazardous areas', a: 'Not certified for explosive atmospheres', b: 'Not certified', c: 'ANYmal X is ATEX / IECEx certified for Zone 1 — the first Ex-proof legged robot', verdict: 'c' },
      { aspect: 'Onboard sensing', a: 'Stereo cameras giving a 360° view to 4 m with collision avoidance; lidar and PTZ cameras are add-on payloads', b: '4D lidar (360° × 96°) and a 720p 120° front camera standard on every variant', c: '16-channel lidar, depth cameras, 20× zoom inspection camera, thermal camera, ultrasonic microphone', verdict: 'c' },
      { aspect: 'SDK and openness', a: 'Spot SDK: Python client libraries over a gRPC API, documented at dev.bostondynamics.com; community ROS 2 driver', b: 'unitree_sdk2 (C++/Python) and unitree_ros2 (BSD-3) on GitHub; what each variant may access differs — check the spec table before buying', c: 'gRPC ANYmal API for missions and data; on-robot ROS C++ plugins for payloads; Ubuntu 20.04 onboard', verdict: 'tie' },
      { aspect: 'Autonomy out of the box', a: 'Autonomous docking and recharging, dynamic replanning around new obstacles, self-righting; mission software as add-on', b: 'Obstacle avoidance, an “Advanced AI mode” and graphical programming on every variant; serious autonomy is something you build', c: 'Full inspection autonomy: waypoint missions, Mission Editor, rule-based re-planning from inspection results, CAD/BIM import', verdict: 'c' },
      { aspect: 'Who it is for', a: 'Enterprises and universities: manufacturing, energy, construction, public safety, research labs', b: 'Developers, students, hobbyists and labs — the quadruped you can actually afford', c: 'Industrial operators: oil & gas, chemicals, power, mining, rail — inspection as a service', verdict: 'tie' },
    ],
    chooseA: [
      'You need a platform that has already shipped to 1,500+ customers, with a support organisation behind it.',
      'Payload matters: an arm, a PTZ camera, a gas sensor and a compute box at the same time.',
      'Your team wants a documented, versioned API in Python and the robot will be programmed, not just driven.',
      'The budget is a grant or a capex line, not a credit card.',
    ],
    chooseB: [
      'You want to learn or research legged locomotion without spending five figures.',
      'A lidar on the robot from day one matters more than weatherproofing.',
      'You are happy to write the autonomy yourself (ROS 2, reinforcement learning, your own planner).',
      'The robot lives indoors or in good weather — the IP rating is not published.',
    ],
    chooseC: [
      'The job is routine inspection of a plant — gauges, thermal hot-spots, leaks — on a schedule.',
      'The robot must be sealed (IP67) and, for ANYmal X, certified for Zone 1 explosive atmospheres.',
      'You want to buy an outcome (inspection data in your systems) rather than a robot to program.',
      'Stairs, grating and narrow industrial walkways are the terrain.',
    ],
    related: [
      { href: '/atlas/concept/quadruped-robot', label: 'Quadruped robots explained' },
      { href: '/atlas/concept/quadruped-locomotion', label: 'Quadruped locomotion' },
      { href: '/atlas/concept/inspection-robot', label: 'Inspection robots' },
      { href: '/atlas/concept/ingress-protection-rating', label: 'IP ratings explained' },
      { href: '/atlas/concept/gait', label: 'Gait' },
      { href: '/robots/spot', label: 'Spot — robot profile' },
    ],
    sources: [
      { name: 'Boston Dynamics — Spot product page and specifications', url: 'https://www.bostondynamics.com/products/spot' },
      { name: 'The Robot Report — Spot commercial availability (Explorer kit, $74,500)', url: 'https://www.therobotreport.com/spot-commercial-availability-a-milestone-for-quadrupeds/' },
      { name: 'Unitree — Go2 product page and spec table', url: 'https://www.unitree.com/go2' },
      { name: 'Unitree — unitree_ros2 repository (BSD-3-Clause)', url: 'https://github.com/unitreerobotics/unitree_ros2' },
      { name: 'ANYbotics — ANYmal technical specifications (PDF)', url: 'https://www.anybotics.com/anymal-technical-specifications.pdf' },
      { name: 'ANYbotics — ANYmal X, the first Ex-proof legged robot', url: 'https://www.anybotics.com/anymal-x-the-worlds-first-ex-proof-legged-robot/' },
    ],
    updated: '2026-11-09',
  },
];

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}

/** Comparison-shaped blog posts, so the hub shows every "X vs Y" on the site. */
export const BLOG_COMPARISONS: { href: string; title: string }[] = [
  { href: '/blog/arduino-vs-esp32-vs-raspberry-pi-for-robots', title: 'Arduino vs ESP32 vs Raspberry Pi for robots' },
  { href: '/blog/motors-for-robots-dc-servo-stepper', title: 'DC motor vs servo vs stepper' },
  { href: '/blog/robotics-vs-automation-vs-ai', title: 'Robotics vs automation vs AI' },
  { href: '/blog/ai-vs-traditional-robot-programming', title: 'AI vs traditional robot programming' },
];
