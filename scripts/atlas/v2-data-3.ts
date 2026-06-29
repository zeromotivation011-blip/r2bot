// Batch 3: power-electronics, robot-types, ros2-ecosystem, safety-standards, materials
import type { TermV2 } from './v2-types';

export const TERMS_BATCH_3: TermV2[] = [
  // ===== Power & Electronics =====
  {
    slug: 'jetson-nano',
    title: 'NVIDIA Jetson Nano in Robotics — Complete Guide | R2BOT',
    description:
      "The Jetson Nano is a $99 GPU-equipped single-board computer made for robotics AI workloads — perfect entry point for vision and deep learning.",
    bucket: 'power-electronics',
    category: 'hardware',
    difficulty: 'intermediate',
    tags: ['jetson-nano', 'gpu', 'edge-ai', 'sbc', 'nvidia'],
    relatedTerms: ['jetson-orin', 'raspberry-pi-robotics', 'single-board-computer', 'edge-ai'],
    youtubeSearchQuery: 'NVIDIA Jetson Nano robotics tutorial',
    definition:
      "The NVIDIA Jetson Nano is a small, low-cost single-board computer with an integrated Maxwell-class GPU. Designed for robotics AI workloads, it runs deep-learning inference at the edge while staying under 10 W of power consumption.",
    howItWorks:
      "The Nano combines a quad-core ARM Cortex-A57 CPU, a 128-core Maxwell GPU, and 4 GB shared memory. It runs Ubuntu (NVIDIA JetPack) with full CUDA, cuDNN, and TensorRT support — meaning you can run YOLOv8, MobileNet, and other CNNs at 10–30 FPS. GPIO, I²C, SPI, and CSI camera ports make it easy to wire sensors and motors. ROS2 runs natively. The Nano slots between a Raspberry Pi (cheaper, CPU-only) and a Jetson Orin (faster, far more expensive).",
    realWorld:
      "Thousands of Indian robotics students build their first vision-enabled robots on the Jetson Nano. Niqo Robotics' early agritech prototypes used Nanos. Hobbyist drone autopilots (e.g., NVIDIA Carter) shipped on Nano. Defence and security startups in Bengaluru use Nanos for edge inference in surveillance robots.",
    whyItMatters:
      "Without GPU acceleration, real-time vision is impossible. The Jetson Nano lowered the cost of edge-AI from thousands to hundreds of dollars, opening robotics-AI to colleges and startups. Every robotics-AI portfolio should include at least one Nano project.",
    tryItYourself:
      "Buy a Jetson Nano Developer Kit (~₹12,000 in India). Flash JetPack, install YOLOv8, and run it on a USB camera feed. You'll see real-time object detection at 15+ FPS — your first edge-AI robot brain.",
    quiz: [
      {
        q: 'The Jetson Nano includes which key hardware accelerator?',
        options: ['FPGA', 'Maxwell-class GPU', 'TPU', 'Quantum chip'],
        answer: 1,
        explain: 'A 128-core Maxwell GPU is the Nano\'s key differentiator vs the Raspberry Pi.',
      },
      {
        q: 'Typical Jetson Nano power consumption is:',
        options: ['100 W', '5–10 W', '500 W', '1 W'],
        answer: 1,
        explain: 'The Nano runs in a 5W or 10W mode — designed for embedded robotics.',
      },
      {
        q: 'A typical Nano use case is:',
        options: ['Server hosting', 'Real-time on-robot object detection', 'Heavy 3D rendering', 'Bitcoin mining'],
        answer: 1,
        explain: 'CNN inference on camera feeds is the Nano\'s sweet spot.',
      },
    ],
  },
  {
    slug: 'jetson-orin',
    title: 'NVIDIA Jetson Orin in Robotics — Complete Guide | R2BOT',
    description:
      "The Jetson Orin family delivers up to 275 TOPS of AI compute on a robot-friendly module. Powers humanoid robots, autonomous vehicles, and advanced AMRs.",
    bucket: 'power-electronics',
    category: 'hardware',
    difficulty: 'advanced',
    tags: ['jetson-orin', 'gpu', 'edge-ai', 'sbc', 'nvidia', 'humanoid'],
    relatedTerms: ['jetson-nano', 'single-board-computer', 'edge-ai', 'foundation-model-robotics'],
    youtubeSearchQuery: 'NVIDIA Jetson Orin robotics tutorial',
    definition:
      "The NVIDIA Jetson Orin family (Orin Nano, Orin NX, AGX Orin) delivers 40–275 TOPS of AI compute on small, robot-ready modules. It is the engine of modern humanoid robots, autonomous vehicles, and high-end AMRs.",
    howItWorks:
      "AGX Orin combines a 12-core ARM CPU, a 2048-core Ampere GPU with 64 tensor cores, two NVDLA AI accelerators, and 32–64 GB LPDDR5. It runs Ubuntu + JetPack with CUDA, cuDNN, TensorRT, and DeepStream. Power scales from 15 W to 60 W. Real-time perception pipelines — multi-camera object detection, depth estimation, transformer policies — run on it without GPU offload.",
    realWorld:
      "Figure 02 humanoid uses Orin modules for vision and language. Boston Dynamics Spot's enhanced sensing payload uses Orin NX. Indian autonomous-vehicle teams (Flux Auto, Swaayatt Robots) standardise on AGX Orin. The Bharatiya Antariksh Station's planned robotic arm uses Orin-class compute.",
    whyItMatters:
      "Modern robotic AI — multi-camera fusion, large language models, foundation policies — demands 100+ TOPS on the robot. Orin makes that practical. Senior robotics-AI engineers in India are increasingly expected to optimise inference on Orin.",
    tryItYourself:
      "Get an Orin Nano Dev Kit (₹40,000+). Install NVIDIA Isaac ROS. Run their visual-SLAM and multi-camera object-detection demos — watch them hit real-time FPS that the Nano cannot match.",
    quiz: [
      {
        q: 'AGX Orin delivers up to:',
        options: ['1 TOPS', '275 TOPS of AI compute', '10 TOPS', '1000 TFLOPS'],
        answer: 1,
        explain: 'AGX Orin tops out at 275 TOPS sparse INT8 — a giant leap over the Nano.',
      },
      {
        q: 'Orin modules are commonly used in:',
        options: ['Smartwatches', 'Modern humanoids and autonomous vehicles', 'Microwave ovens', 'Office printers'],
        answer: 1,
        explain: 'Orin\'s compute density makes it the brain of modern advanced robots.',
      },
      {
        q: 'Compared with Jetson Nano, Orin is:',
        options: ['Slower', 'Far more powerful but also more power-hungry', 'Cheaper', 'Smaller'],
        answer: 1,
        explain: 'Orin offers 30–80× the compute of Nano, at higher power and cost.',
      },
    ],
  },
  {
    slug: 'stm32',
    title: 'STM32 in Robotics — Complete Guide | R2BOT',
    description:
      "STM32 ARM Cortex microcontrollers are the workhorse MCU for serious robotics — motor control, sensor sampling, real-time loops at high frequency.",
    bucket: 'power-electronics',
    category: 'hardware',
    difficulty: 'intermediate',
    tags: ['stm32', 'microcontroller', 'arm', 'embedded', 'real-time'],
    relatedTerms: ['microcontroller', 'embedded-systems', 'arduino-control', 'esp32-robotics', 'real-time-computing'],
    youtubeSearchQuery: 'STM32 robotics tutorial',
    definition:
      "STM32 is STMicroelectronics' family of ARM Cortex-M microcontrollers used in countless robots, drones, and industrial controllers. STM32 chips offer high clock speeds, rich peripherals, and floating-point hardware — far beyond what an Arduino Uno offers.",
    howItWorks:
      "STM32 chips run ARM Cortex-M0 through M7 cores at 24–550 MHz. They include hardware peripherals (timers, ADCs, DACs, CAN, USB, Ethernet) and DMA controllers that move data between peripherals and memory without CPU involvement. Tools include the STM32CubeIDE, HAL/LL libraries, and PlatformIO. Higher-end parts (STM32H7) include double-precision FPU and 800 KB of RAM — enough for serious motor-control algorithms and sensor fusion.",
    realWorld:
      "BLDC ESC controllers like VESC are based on STM32. PX4 flight controllers (Pixhawk) use STM32H7. Industrial robot end-effectors, surgical-robot subsystems, and Indian drone autopilots (Garuda Aerospace, IIT Madras eYantra) all rely on STM32.",
    whyItMatters:
      "When Arduino is too slow and Raspberry Pi has too much OS overhead, STM32 is the answer. Embedded-robotics careers in India regularly hire engineers fluent in STM32 — drone autopilots, motor drivers, robotic arms all run on it.",
    tryItYourself:
      "Buy an STM32 'Blue Pill' (STM32F103, ~₹250 on Robu.in). Install PlatformIO in VS Code. Blink an LED at 1 MHz using a hardware timer — something Arduino cannot do without bit-banging. Then implement an interrupt-driven PWM motor controller.",
    quiz: [
      {
        q: 'STM32 uses which CPU architecture?',
        options: ['x86', 'ARM Cortex-M', 'PowerPC', 'RISC-V'],
        answer: 1,
        explain: 'STM32 is built around ARM Cortex-M0/M3/M4/M7 cores.',
      },
      {
        q: 'Compared with Arduino Uno, STM32 generally has:',
        options: ['Lower clock speed', 'Higher clock speed, more peripherals, and DMA', 'No GPIO', 'Higher cost only'],
        answer: 1,
        explain: 'STM32 typically runs at 72–550 MHz with rich peripherals and DMA — much more capable than 16 MHz Uno.',
      },
      {
        q: 'Pixhawk flight controllers run on:',
        options: ['Atmel AVR', 'STM32H7', 'Intel x86', 'IBM mainframe'],
        answer: 1,
        explain: 'Modern Pixhawk autopilots use STM32H7 series MCUs for their core flight logic.',
      },
    ],
  },
  {
    slug: 'battery-management-system',
    title: 'Battery Management System (BMS) in Robotics — Complete Guide | R2BOT',
    description:
      "A BMS monitors and protects multi-cell battery packs — measuring voltage, current, temperature, and cutting off on faults. Mandatory for safe robot operation.",
    bucket: 'power-electronics',
    category: 'hardware',
    difficulty: 'intermediate',
    tags: ['bms', 'battery', 'safety', 'lithium', 'protection'],
    relatedTerms: ['lipo-battery', 'voltage-regulator', 'robot-safety', 'lithium-ion-battery'],
    youtubeSearchQuery: 'battery management system BMS robotics tutorial',
    definition:
      "A Battery Management System (BMS) is an electronic system that monitors, balances, and protects a multi-cell battery pack. It tracks the voltage and temperature of each cell, computes state-of-charge, and disconnects the load on any fault — preventing fires and pack damage.",
    howItWorks:
      "A BMS reads per-cell voltages (typically 3.0–4.2 V for Li-ion), pack current, and per-cell temperatures. Microcontrollers run safety logic: if any cell hits 4.25 V, disconnect charging; if any cell hits 2.7 V, disconnect load; if temperature exceeds 60 °C, shut down. Active or passive balancing equalises cells across the pack. State-of-charge (SoC) is estimated via coulomb counting or Kalman filtering. Communication to the host robot is via CAN or UART.",
    realWorld:
      "Every electric vehicle, every drone, every robot with Li-ion batteries has a BMS. Ola Electric and Ather's scooters have sophisticated BMS designs. Indian BMS startups like ION Energy build embedded BMS chips and software for the EV market. Tesla famously rolled its own BMS as a competitive moat.",
    whyItMatters:
      "A bad BMS is the #1 cause of lithium fires — including the well-publicised India-EV fires of 2022. Robotics engineers working on any battery-powered platform must understand BMS basics. India's EV and drone industries are aggressively hiring BMS firmware and hardware engineers.",
    tryItYourself:
      "Buy a 3S 12V BMS module (~₹200 on Robu.in) and three 18650 cells. Wire them up, charge through the BMS, and measure how it stops charging at exactly 12.6 V. Then short the load and feel the BMS click off — overcurrent protection in action.",
    quiz: [
      {
        q: 'A BMS primarily protects against:',
        options: ['Sun damage', 'Over/under voltage, over current, and over temperature', 'Wi-Fi loss', 'Software bugs'],
        answer: 1,
        explain: 'BMS is the electrical safety layer for multi-cell lithium packs.',
      },
      {
        q: 'Cell balancing in a BMS:',
        options: ['Charges all cells to the same voltage', 'Increases pack voltage', 'Decreases pack voltage', 'Has no effect'],
        answer: 0,
        explain: 'Balancing keeps all cells at the same voltage — critical for pack longevity and safety.',
      },
      {
        q: 'A BMS fault commonly seen in EV/drone fires is:',
        options: ['Too much battery capacity', 'Failure to disconnect on thermal runaway', 'Too low pack voltage', 'Excess balancing'],
        answer: 1,
        explain: 'When thermal-runaway detection fails, cells can ignite — the leading cause of lithium fires.',
      },
    ],
  },
  {
    slug: 'field-oriented-control',
    title: 'Field-Oriented Control (FOC) in Robotics — Complete Guide | R2BOT',
    description:
      "FOC is the dominant control technique for BLDC motors — turning a 3-phase motor into a smooth, torque-controllable actuator. Used in every EV, drone ESC, and modern robot joint.",
    bucket: 'power-electronics',
    category: 'control',
    difficulty: 'advanced',
    tags: ['foc', 'bldc', 'motor-control', 'torque', 'inverter'],
    relatedTerms: ['brushless-motor', 'motor-driver', 'pwm', 'h-bridge'],
    youtubeSearchQuery: 'field oriented control BLDC tutorial',
    definition:
      "Field-Oriented Control (FOC), also called vector control, is a technique that transforms 3-phase motor currents into two perpendicular axes — direct (d) and quadrature (q). By controlling these axes independently, FOC delivers smooth torque, high efficiency, and instant response from BLDC and PMSM motors.",
    howItWorks:
      "FOC uses the Clarke and Park transforms to convert measured phase currents (a, b, c) into rotor-frame components (d, q). The d-axis aligns with the rotor magnetic field; the q-axis is perpendicular. Torque is proportional to q-current, so torque control becomes a simple PI loop on q. Two PI controllers regulate d and q currents; their outputs go through inverse Park + space-vector PWM to generate the inverter switching pattern. Rotor angle for the transforms comes from Hall sensors, encoders, or sensorless back-EMF estimation.",
    realWorld:
      "Tesla's drive inverters use FOC. Every quadcopter ESC uses FOC. Universal Robots cobots use FOC at every joint. VESC, the open-source motor controller from Benjamin Vedder, is built around FOC. Indian EV startups (Ola Electric, Ather, Bounce) all hire FOC firmware engineers.",
    whyItMatters:
      "Without FOC, BLDC motors deliver jerky torque and waste energy. With FOC, they become precision instruments. FOC is one of the most valuable specialised skills in modern robotics and EV engineering — Indian electric two-wheeler and drone companies are critically short of FOC engineers.",
    tryItYourself:
      "Clone the SimpleFOC library (Arduino-compatible). Wire a small gimbal motor, magnetic encoder, and BTS7960 driver. Run the FOC torque-control example and feel how a tiny commanded torque produces smooth rotation — your first FOC experience.",
    quiz: [
      {
        q: 'FOC controls a 3-phase motor by transforming into:',
        options: ['Two perpendicular axes (d and q)', 'Six axes', 'A single axis', 'No transformation'],
        answer: 0,
        explain: 'Clarke + Park transform the 3-phase currents into the rotor-frame d (direct) and q (quadrature) axes.',
      },
      {
        q: 'In FOC, motor torque is proportional to:',
        options: ['d-axis current', 'q-axis current', 'phase voltage only', 'rotor resistance'],
        answer: 1,
        explain: 'q-axis current produces torque; d-axis controls flux (used for field-weakening at high speed).',
      },
      {
        q: 'FOC is the standard control method for:',
        options: ['Brushed DC motors', 'BLDC and PMSM motors', 'Stepper motors only', 'Hydraulic motors'],
        answer: 1,
        explain: 'FOC dominates BLDC/PMSM control in EVs, drones, robotics, and industry.',
      },
    ],
  },
  // ===== Robot Types =====
  {
    slug: 'rehabilitation-robot',
    title: 'Rehabilitation Robots — Complete Guide | R2BOT',
    description:
      'Rehabilitation robots help patients regain motor function after stroke, spinal-cord injury, or amputation. Growing rapidly across Indian hospitals.',
    bucket: 'robot-types',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['rehabilitation', 'medical', 'exoskeleton', 'stroke', 'therapy'],
    relatedTerms: ['surgical-robot', 'exoskeleton', 'prosthetic-limb', 'medical-robotics'],
    youtubeSearchQuery: 'rehabilitation robot stroke therapy',
    definition:
      "Rehabilitation robots are devices that physically assist or guide patients through therapeutic exercises — for stroke recovery, spinal-cord injury rehab, or post-surgery mobilisation. By delivering repeatable, high-volume, precisely measured movements, they accelerate recovery beyond what manual therapy alone can achieve.",
    howItWorks:
      "Most rehab robots are admittance-controlled exoskeletons or end-effector machines. They strap onto the patient's arm or leg and either move it passively, assist active motion, or resist motion as the patient regains strength. Sensors record joint angles, forces, and EMG signals; software adapts difficulty in real time. Common platforms include the Lokomat (gait trainer), Armeo (upper-limb), and Indian-made HMI Tech's rehab arms.",
    realWorld:
      "AIIMS Delhi, Apollo Hospitals, and Manipal Hospital all use rehabilitation robots in stroke rehabilitation. Bengaluru-based BeAble Health builds an Indian-priced upper-limb rehab robot. NIMHANS pioneered VR + rehab-robot trials in 2024.",
    whyItMatters:
      "India suffers an estimated 1.8 million strokes per year — and most patients lack access to intensive therapy. Affordable rehabilitation robots are a major Indian innovation opportunity, with multiple national startups and increasing government funding.",
    tryItYourself:
      "Watch the 'Hocoma Lokomat' YouTube demo to see a full robotic gait-training session. Then read BeAble Health's case studies for Indian-context affordable rehab — a stark contrast in pricing and patient access.",
    quiz: [
      {
        q: 'Rehabilitation robots primarily help patients with:',
        options: ['Image editing', 'Motor recovery after stroke or injury', 'Tax filing', 'Cooking'],
        answer: 1,
        explain: 'They deliver repeatable, measured therapy for stroke, SCI, and post-surgery recovery.',
      },
      {
        q: 'A common rehabilitation-robot control mode is:',
        options: ['Pure position control without feedback', 'Admittance / assist-as-needed', 'Open-loop torque', 'Random motion'],
        answer: 1,
        explain: 'Admittance / assist-as-needed adapts to patient effort — fundamental to safe rehab.',
      },
      {
        q: 'An Indian company building rehab robots is:',
        options: ['BeAble Health', 'Ola Cabs', 'Reliance Jio', 'Maruti Suzuki'],
        answer: 0,
        explain: 'BeAble Health in Bengaluru is one of several Indian rehabilitation-robot startups.',
      },
    ],
  },
  {
    slug: 'last-mile-delivery',
    title: 'Last-Mile Delivery Robots — Complete Guide | R2BOT',
    description:
      "Last-mile delivery robots deliver food, groceries, and packages from a local hub to your door. Pilots in Indian metro cities since 2023.",
    bucket: 'robot-types',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['delivery', 'amr', 'sidewalk', 'urban', 'last-mile'],
    relatedTerms: ['autonomous-mobile-robot', 'delivery-robot', 'autonomous-vehicle', 'social-navigation'],
    youtubeSearchQuery: 'last mile delivery robot tutorial',
    definition:
      "Last-mile delivery robots autonomously transport food, parcels, or groceries from a nearby hub or restaurant to the customer's address. They run on sidewalks, footpaths, or roads at low speeds and use sensors plus AI to navigate around pedestrians and obstacles.",
    howItWorks:
      "A typical sidewalk-delivery robot has six small wheels for stability over kerbs, a sealed cargo compartment, multiple cameras and LIDARs, GPS+IMU for global localisation, and 4G connectivity. ROS2-based stacks fuse sensors for SLAM, detect pedestrians and obstacles, plan smooth paths, and unlock the lid only when the customer enters a PIN via app. Drones (DJI, Skyfly) and tracked outdoor bots cover the same function in different settings.",
    realWorld:
      "Swiggy and Zomato have piloted delivery robots in Hyderabad and Bengaluru since 2023. Starship Technologies operates 2000+ robots in US/EU campuses. Amazon Scout, Nuro, and Serve Robotics also serve this market. Indian startup Botverse builds sidewalk robots.",
    whyItMatters:
      "Last-mile is the most expensive part of e-commerce. Robots promise to dramatically reduce that cost while creating new robotics jobs in India. The Indian last-mile-robotics market is forecast to exceed ₹5,000 Cr by 2030.",
    tryItYourself:
      "Watch the 'Starship Technologies' YouTube channel for live delivery footage. Then read about how robots handle Indian conditions — monsoons, stray animals, narrow footpaths — in the IIIT-Hyderabad robotics blog.",
    quiz: [
      {
        q: 'Last-mile delivery robots typically operate at:',
        options: ['Highway speeds (100+ km/h)', 'Low speeds (under 10 km/h) on footpaths/sidewalks', 'Underwater', 'In space'],
        answer: 1,
        explain: 'Speed is kept low for safety around pedestrians; many run at 3–6 km/h.',
      },
      {
        q: 'A common sensor on sidewalk delivery robots is:',
        options: ['Geiger counter', 'Multi-camera + LIDAR + GPS+IMU', 'Microwave radar only', 'No sensors'],
        answer: 1,
        explain: 'Robust outdoor pedestrian-rich environments demand multi-sensor perception.',
      },
      {
        q: 'Which company has piloted delivery robots in India?',
        options: ['Swiggy', 'Adobe Photoshop', 'Spotify', 'Netflix'],
        answer: 0,
        explain: 'Swiggy has piloted sidewalk delivery robots in Hyderabad and Bengaluru.',
      },
    ],
  },
  {
    slug: 'cleaning-robot',
    title: 'Cleaning Robots — Complete Guide | R2BOT',
    description:
      'Cleaning robots autonomously sweep, mop, scrub, or vacuum floors at home and in commercial spaces. The largest category of consumer robotics by units sold.',
    bucket: 'robot-types',
    category: 'applications',
    difficulty: 'beginner',
    tags: ['cleaning', 'consumer', 'roomba', 'commercial', 'amr'],
    relatedTerms: ['autonomous-mobile-robot', 'service-robot', 'slam', 'differential-drive'],
    youtubeSearchQuery: 'cleaning robot how it works',
    definition:
      "Cleaning robots autonomously sweep, mop, scrub, or vacuum surfaces without a human operator. The category ranges from $200 home robot vacuums (Roomba, Roborock) to $40,000 industrial floor scrubbers (Avidbots Neo, Brain Corp BrainOS platforms).",
    howItWorks:
      "Modern cleaning robots use LIDAR or vSLAM to map their environment, dock-detection for self-charging, and a wet/dry cleaning module sized for the floor type. Commercial scrubbers detect spills, avoid customers in malls, and automatically refill water and empty waste. Software platforms like BrainOS run on hundreds of different cleaning robot OEMs as a shared brain.",
    realWorld:
      "Roomba sold 40M+ units. Roborock Q-Revo is the dominant home vacuum in India under ₹50K. Bengaluru International Airport, T3 Delhi, and Hyderabad Airport all use Avidbots Neo. SmartIR Robotics (Hyderabad) builds Indian industrial cleaning robots.",
    whyItMatters:
      "Cleaning is the single largest commercial robotics category by units deployed. As Indian malls, airports, and hospitals grow, demand for cleaning robots is exploding. Job opportunities at OEMs and integrators are growing fast.",
    tryItYourself:
      "If you own a Roomba/Roborock/Eufy, open the app and look at the live SLAM map — that's the same SLAM concept used in million-dollar AMRs, applied to your living room.",
    quiz: [
      {
        q: 'A modern home robot vacuum typically uses which mapping tech?',
        options: ['GPS', 'LIDAR or visual SLAM', 'Radio direction finding', 'A compass only'],
        answer: 1,
        explain: 'High-end home vacuums use LIDAR; cheaper ones use vSLAM via top-mounted cameras.',
      },
      {
        q: 'Avidbots Neo is a:',
        options: ['Phone', 'Commercial floor-scrubbing robot used in Indian airports', 'Smart watch', 'TV brand'],
        answer: 1,
        explain: 'Avidbots Neo is widely deployed in Indian airport terminals for floor cleaning.',
      },
      {
        q: 'Roomba\'s key innovation when launched in 2002 was:',
        options: ['Being the most expensive robot', 'First mass-market autonomous home cleaning robot', 'Doing taxes', 'Cooking food'],
        answer: 1,
        explain: 'Roomba defined the home-robot vacuum category — selling 40M+ units since.',
      },
    ],
  },
  {
    slug: 'construction-robot',
    title: 'Construction Robots — Complete Guide | R2BOT',
    description:
      'Construction robots automate bricklaying, 3D printing, surveying, and demolition. India\'s booming infrastructure makes this a growth sector.',
    bucket: 'robot-types',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['construction', 'bricklaying', '3d-printing', 'site', 'industrial'],
    relatedTerms: ['industrial-robot', 'autonomous-vehicle', 'amr', 'additive-manufacturing'],
    youtubeSearchQuery: 'construction robot bricklayer 3D print house',
    definition:
      "Construction robots automate physically demanding or repetitive site tasks — bricklaying, 3D concrete printing, rebar tying, demolition, surveying. By taking on dangerous and labour-intensive work they improve safety, speed, and quality in building projects.",
    howItWorks:
      "Examples vary by task. SAM (Construction Robotics) lays bricks at 3000/day, fed by a human operator who manages mortar. Concrete 3D printers (ICON, Mighty Buildings, IIT Madras's TVASTA) extrude wall layers from a robotic gantry. Boston Dynamics Spot is used on construction sites to laser-scan progress autonomously. Demolition robots like Brokk wield large hydraulic hammers in environments unsafe for humans.",
    realWorld:
      "L&T Construction has piloted Spot on Indian construction sites. TVASTA Manufacturing Solutions (IIT Madras spinoff) 3D-printed India's first concrete-printed house. Brokk demolition robots are used in nuclear-decommissioning and Indian metro projects.",
    whyItMatters:
      "India's infrastructure boom — Smart Cities, 5,000+ km of new highways, hundreds of metro projects — creates massive demand for construction automation. Robotics + construction is one of the fastest-growing Indian sectors.",
    tryItYourself:
      "Watch TVASTA's '3D-printed Madras house' video on YouTube. Then read the SAM (Semi-Automated Mason) datasheet to compare two very different approaches to construction robotics.",
    quiz: [
      {
        q: 'A famous Indian construction-robotics company spun out of IIT Madras is:',
        options: ['TVASTA Manufacturing Solutions', 'Maruti Suzuki', 'Tata Motors', 'Reliance Industries'],
        answer: 0,
        explain: "TVASTA 3D-prints concrete structures and was founded by IIT Madras alumni.",
      },
      {
        q: 'On a construction site Boston Dynamics Spot is most often used for:',
        options: ['Cooking food', 'Autonomous progress laser-scanning and inspection', 'Painting cars', 'Cutting hair'],
        answer: 1,
        explain: 'Spot patrols sites with laser scanners to generate daily progress reports.',
      },
      {
        q: 'SAM (Semi-Automated Mason) can lay bricks at roughly:',
        options: ['10/day', '3000/day', '0 bricks/day', '50/day'],
        answer: 1,
        explain: 'SAM lays ~3000 bricks/day — far faster than a human mason but operated alongside one.',
      },
    ],
  },
  {
    slug: 'firefighting-robot',
    title: 'Firefighting Robots — Complete Guide | R2BOT',
    description:
      "Firefighting robots enter burning buildings, fight chemical fires, and protect human firefighters. Increasingly used by Indian fire services.",
    bucket: 'robot-types',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['firefighting', 'rescue', 'thermal', 'industrial', 'defence'],
    relatedTerms: ['search-and-rescue-robotics', 'thermal-camera', 'autonomous-mobile-robot', 'teleoperation'],
    youtubeSearchQuery: 'firefighting robot tutorial',
    definition:
      "Firefighting robots are remote-controlled or semi-autonomous mobile platforms equipped with hoses, foam cannons, and thermal cameras to fight fires in environments unsafe for humans — chemical plants, tunnels, refineries, multi-storey buildings.",
    howItWorks:
      "Most firefighting robots are tracked or 4-wheel-drive platforms with diesel or electric motors, water-cannon turrets capable of 2000+ L/min, thermal cameras to see through smoke, and gas-detection sensors. They are typically teleoperated via radio or fibre-optic tether from a safe distance. Higher-end models add autonomous obstacle avoidance and target tracking.",
    realWorld:
      "Mumbai Fire Brigade and Delhi Fire Service have deployed Indian-made firefighting robots since 2020. Thermite RS3 (a US firefighting robot) was used in the Notre-Dame fire response. ARI (Action Research and Robotics India) builds tracked firefighting platforms.",
    whyItMatters:
      "Firefighting is one of the deadliest professions globally. Firefighting robots literally save firefighter lives by entering structures too dangerous for humans. India's growing chemical and industrial sectors are pushing demand.",
    tryItYourself:
      "Watch the 'Mumbai Fire Robot' news segment on YouTube to see Indian use in action. Then read the Thermite RS3 datasheet — note the 2500 L/min flow and 300 m operating range.",
    quiz: [
      {
        q: 'Firefighting robots are most useful in:',
        options: ['Open beach fires', 'Chemical-plant or high-toxicity fires unsafe for humans', 'Small candle fires', 'Birthday parties'],
        answer: 1,
        explain: 'Their sweet spot is dangerous, toxic, or structurally unstable fires.',
      },
      {
        q: 'A typical firefighting robot uses which sensor to see through smoke?',
        options: ['Visible camera only', 'Thermal camera', 'Microphone', 'GPS only'],
        answer: 1,
        explain: 'Thermal cameras see heat through smoke and darkness — essential for fire situational awareness.',
      },
      {
        q: 'Indian cities deploying firefighting robots include:',
        options: ['Mumbai and Delhi', 'Mars and Moon only', 'None', 'Atlantis'],
        answer: 0,
        explain: 'Mumbai Fire Brigade and Delhi Fire Service have used firefighting robots since 2020.',
      },
    ],
  },
  // ===== ROS2 Ecosystem =====
  {
    slug: 'ros2-humble',
    title: 'ROS2 Humble — Complete Guide | R2BOT',
    description:
      'ROS2 Humble Hawksbill is a long-term-support release running on Ubuntu 22.04. The current default in nearly every production robotics deployment.',
    bucket: 'ros2-ecosystem',
    category: 'control',
    difficulty: 'intermediate',
    tags: ['ros2', 'humble', 'distro', 'lts', 'ubuntu'],
    relatedTerms: ['ros2', 'ros2-nodes', 'ros2-launch', 'ros2-jazzy'],
    youtubeSearchQuery: 'ROS2 Humble installation tutorial',
    definition:
      "ROS2 Humble Hawksbill is the long-term-support (LTS) release of ROS2, first released in May 2022 and supported until May 2027. It runs on Ubuntu 22.04 and is the most widely deployed ROS2 distribution in production today.",
    howItWorks:
      "Each ROS2 distro is a versioned snapshot of the entire stack — rclcpp/rclpy, DDS bindings, common packages, and tooling — released alongside a specific Ubuntu version. Humble shipped major improvements to lifecycle nodes, security (SROS2), and the launch system. The LTS designation means bug fixes and binary releases continue for five years — perfect for fleet deployments where you cannot upgrade casually.",
    realWorld:
      "Most Nav2, MoveIt2, and Isaac ROS releases target Humble first. Boston Dynamics' ROS2 SDK is Humble-based. Indian academic robotics programmes (IIT Bombay, IIT Madras, IIIT Hyderabad) standardise on Humble for their courses.",
    whyItMatters:
      "Choosing the right ROS2 distro is one of the first decisions for any robotics project. Humble's LTS status makes it the safe choice for production. Knowing the differences between Humble, Iron, and Jazzy is standard ROS2 interview material.",
    tryItYourself:
      "Install ROS2 Humble on Ubuntu 22.04 (or in Docker if you're on Mac/Windows): follow the official `apt install ros-humble-desktop` guide. Run the talker/listener demo — your first ROS2 nodes communicating live.",
    quiz: [
      {
        q: 'ROS2 Humble runs on which Ubuntu version?',
        options: ['Ubuntu 22.04', 'Ubuntu 18.04', 'Ubuntu 24.04', 'Ubuntu 14.04'],
        answer: 0,
        explain: 'Humble targets Ubuntu 22.04 (Jammy).',
      },
      {
        q: 'Humble is supported until:',
        options: ['Forever', 'May 2027', 'Yesterday', 'Until 2030'],
        answer: 1,
        explain: 'As an LTS release, Humble has 5 years of support from May 2022.',
      },
      {
        q: 'A typical reason to choose Humble over a non-LTS distro:',
        options: ['It has fewer features', 'It is the latest experimental release', '5-year support window for production stability', 'It has no documentation'],
        answer: 2,
        explain: 'LTS = stability and predictable maintenance — ideal for fleet deployments.',
      },
    ],
  },
  {
    slug: 'nav2-stack',
    title: 'Nav2 (ROS2 Navigation Stack) — Complete Guide | R2BOT',
    description:
      'Nav2 is the ROS2 navigation stack for mobile robots — planners, controllers, behaviour trees, recovery. Used in thousands of production AMRs worldwide.',
    bucket: 'ros2-ecosystem',
    category: 'control',
    difficulty: 'advanced',
    tags: ['nav2', 'navigation', 'ros2', 'amr', 'autonomy'],
    relatedTerms: ['ros2', 'amcl', 'costmap', 'behavior-trees', 'path-planning'],
    youtubeSearchQuery: 'ROS2 Nav2 navigation stack tutorial',
    definition:
      "Nav2 is the official ROS2 navigation stack — a collection of packages that together let a mobile robot autonomously move from point A to point B safely. It includes planners, controllers, costmaps, behaviour trees, localisation, and recovery behaviours.",
    howItWorks:
      "Nav2 is structured as a set of ROS2 servers wired together by a top-level behaviour tree. The Planner Server runs a global planner (Smac, NavFn) over a costmap; the Controller Server runs a local planner (DWB, MPPI, Regulated Pure Pursuit); the Behaviour Server runs recovery actions when stuck; the BT Navigator orchestrates everything as a behaviour tree. Costmap layers provide static maps, dynamic obstacles, inflation, and voxels. AMCL provides localisation.",
    realWorld:
      "Almost every Nav2-based mobile robot starts with the TurtleBot3 demo. GreyOrange Butler, ROBOTIS, Clearpath Husky, hospital delivery robots, and Indian warehouse robots all build on Nav2. Foxconn's smart factories use Nav2 in dozens of AMR designs.",
    whyItMatters:
      "Without Nav2 you would write a complete navigation stack from scratch — months of work. Nav2 fluency is non-negotiable for any AMR or service-robot engineering role in India. It is the most-asked-about stack in ROS2 interviews.",
    tryItYourself:
      "Launch the `nav2_bringup tb3_simulation_launch.py` demo in Gazebo + RViz2. Use RViz's '2D Pose Estimate' and '2D Goal Pose' tools to drive a TurtleBot3 across the simulated map. Then change a costmap parameter live and watch the behaviour change.",
    quiz: [
      {
        q: 'Nav2 orchestrates its components with:',
        options: ['Shell scripts', 'A behaviour tree (BT Navigator)', 'A spreadsheet', 'Email'],
        answer: 1,
        explain: 'Nav2 uses BT.CPP behaviour trees to orchestrate planning, control, and recovery.',
      },
      {
        q: 'Which is NOT a typical Nav2 component?',
        options: ['Planner Server', 'Controller Server', 'Behaviour Server', 'Photo Editor Server'],
        answer: 3,
        explain: 'Planner, Controller, and Behaviour are core Nav2 servers — photo editing is not.',
      },
      {
        q: 'A common local planner used in Nav2 is:',
        options: ['MPPI or DWB', 'Excel', 'Microsoft Word', 'Photoshop'],
        answer: 0,
        explain: 'DWB (Dynamic Window Approach) and MPPI are popular local planners in Nav2.',
      },
    ],
  },
  {
    slug: 'moveit2-stack',
    title: 'MoveIt2 (ROS2 Motion Planning) — Complete Guide | R2BOT',
    description:
      'MoveIt2 is the ROS2 motion-planning framework for robotic arms — kinematics, planning, collision avoidance, and execution. Used in industry and research.',
    bucket: 'ros2-ecosystem',
    category: 'control',
    difficulty: 'advanced',
    tags: ['moveit2', 'motion-planning', 'ros2', 'arm', 'manipulation'],
    relatedTerms: ['ros2', 'rrt', 'inverse-kinematics', 'forward-kinematics', 'robot-arm'],
    youtubeSearchQuery: 'ROS2 MoveIt2 manipulation tutorial',
    definition:
      "MoveIt2 is the ROS2 motion-planning framework for robotic arms. It computes collision-free joint trajectories from a goal pose, handles inverse kinematics, plans around obstacles, and executes the result on real or simulated robots. It is the backbone of nearly every ROS2 manipulation project.",
    howItWorks:
      "MoveIt2 reads the robot URDF and SRDF (semantic description) to understand kinematics and self-collisions. The MoveGroup interface accepts goals (pose or joint state) and computes a plan using sampling-based planners (OMPL: RRT, RRT*, PRM) or trajectory-optimisation planners (CHOMP, STOMP, TrajOpt). A planning scene tracks the world's obstacles. Once a plan is found, it is sent through `ros2_control` to the robot's joint controllers for execution.",
    realWorld:
      "Universal Robots, Franka Emika, Kinova, ABB YuMi, and Yaskawa all ship MoveIt2 configurations. Research labs at IIT Madras and IISc build manipulation experiments on MoveIt2. Indian medical-robotics startups use it for surgical-arm trajectory planning.",
    whyItMatters:
      "Writing a motion planner from scratch is a PhD thesis. MoveIt2 lets engineers focus on application logic instead. Mastery of MoveIt2 — setup assistant, planning groups, planning pipelines, hardware integration — is mandatory for ROS2 manipulation roles.",
    tryItYourself:
      "Install MoveIt2 and run the official `panda_arm` demo in Gazebo + RViz2. Drag the interactive marker to set a goal and click Plan & Execute. Then try blocking the path with a virtual obstacle and re-plan — collision avoidance in action.",
    quiz: [
      {
        q: 'MoveIt2 plans:',
        options: ['Network routes only', 'Collision-free trajectories for robot arms', 'Recipes', 'Cricket strategies'],
        answer: 1,
        explain: "MoveIt2's core job is generating safe joint trajectories from goal poses.",
      },
      {
        q: 'OMPL inside MoveIt2 provides:',
        options: ['Database queries', 'A library of sampling-based motion planners', 'GPS navigation', 'Audio mixing'],
        answer: 1,
        explain: 'OMPL (Open Motion Planning Library) gives MoveIt2 RRT, PRM, KPIECE, and more.',
      },
      {
        q: 'Before planning, MoveIt2 reads the robot description from:',
        options: ['URDF + SRDF', 'A YouTube video', 'A spreadsheet', 'Nothing'],
        answer: 0,
        explain: 'URDF describes physical structure; SRDF adds semantic info like planning groups.',
      },
    ],
  },
  {
    slug: 'rviz2',
    title: 'RViz2 — Complete Guide | R2BOT',
    description:
      "RViz2 is the ROS2 3D visualisation tool. It shows your robot, sensor data, planned paths, and tf frames in real time — the daily window into your robot.",
    bucket: 'ros2-ecosystem',
    category: 'control',
    difficulty: 'beginner',
    tags: ['rviz2', 'visualisation', 'ros2', 'debug', '3d'],
    relatedTerms: ['ros2', 'ros2-tf', 'ros2-urdf', 'nav2-stack', 'moveit2-stack'],
    youtubeSearchQuery: 'ROS2 RViz2 tutorial',
    definition:
      "RViz2 is the official 3D visualisation tool for ROS2. It subscribes to ROS2 topics and renders the robot model, sensor readings, planned paths, tf transforms, costmaps, and any other custom display in real time. It is the daily debug window for every ROS2 engineer.",
    howItWorks:
      "RViz2 is a Qt application that connects to ROS2 over DDS. You add `Display` plugins — Robot Model, TF, LaserScan, PointCloud2, Path, Marker, Map — and configure their topics and colours. Custom panels and plugins let you build interactive control GUIs. Saved RViz config files let teams share standard visualisation layouts. RViz2 also publishes goal poses and initial poses via interactive tools, integrating directly with Nav2.",
    realWorld:
      "Every ROS2 demo video you have ever seen — TurtleBot driving, robotic arm planning, Nav2 path overlay — is RViz2. Indian robotics labs use it for daily debugging. Every Nav2 and MoveIt2 tutorial relies on RViz2.",
    whyItMatters:
      "Debugging a robot without RViz2 is like flying blind. Mastering RViz2 — adding displays, tuning, building custom plugins — is a daily ROS2 skill. Many production deployments add custom RViz2 panels for operators.",
    tryItYourself:
      "Launch any ROS2 demo with simulated sensors. Run `rviz2`. Add a LaserScan display pointing at `/scan` and a RobotModel display. Drive the robot via teleop and watch the lasers and robot move in real time.",
    quiz: [
      {
        q: 'RViz2 is best described as:',
        options: ['A robot motor driver', 'A 3D ROS2 visualisation tool', 'A C++ compiler', 'A camera lens'],
        answer: 1,
        explain: 'RViz2 visualises robot models, sensors, transforms, and plans in 3D.',
      },
      {
        q: 'You add data to RViz2 by:',
        options: ['Recompiling ROS2', 'Adding Display plugins subscribed to topics', 'Editing the kernel', 'Restarting Wi-Fi'],
        answer: 1,
        explain: 'Displays subscribe to topics — LaserScan, PointCloud2, RobotModel, etc.',
      },
      {
        q: 'RViz2 commonly integrates with which Nav2 feature?',
        options: ['Sending 2D Goal Pose and Initial Pose', 'Booking a flight', 'Reading email', 'Storing data'],
        answer: 0,
        explain: "RViz2's '2D Pose Estimate' and '2D Goal Pose' tools publish to AMCL and Nav2.",
      },
    ],
  },
  {
    slug: 'rosbag2',
    title: 'ROS2 Bags (rosbag2) — Complete Guide | R2BOT',
    description:
      "rosbag2 records and replays ROS2 topics for offline analysis and regression testing. The black-box recorder of every modern robot.",
    bucket: 'ros2-ecosystem',
    category: 'control',
    difficulty: 'intermediate',
    tags: ['rosbag2', 'ros2', 'logging', 'debug', 'replay'],
    relatedTerms: ['ros2', 'ros2-topics', 'ros2-nodes', 'ci-cd-robotics', 'foxglove'],
    youtubeSearchQuery: 'ROS2 rosbag2 record replay tutorial',
    definition:
      "rosbag2 is the ROS2 tool to record any set of topics into a single time-stamped file (a 'bag') and later replay them as if the live robot were running. It is the standard way to capture data for offline analysis, regression tests, and CI pipelines.",
    howItWorks:
      "From the command line, `ros2 bag record /scan /cmd_vel /tf` writes all messages on the listed topics into a MCAP or SQLite-backed bag with nanosecond timestamps. `ros2 bag play` reads the bag and republishes the messages with the original timing — your subscribers cannot tell whether they are reading from a live robot or a replayed bag. Bags can be sliced, filtered, and converted with `ros2 bag` subcommands.",
    realWorld:
      "Every Nav2 release runs regression tests on stored bag files. Boston Dynamics customers record bag files when robots misbehave and ship them to support. Indian autonomous-vehicle teams (Swaayatt, Flux Auto) record terabytes of bag data daily for training and replay.",
    whyItMatters:
      "Without bag recordings, robotics debugging is nearly impossible. Capturing what the robot saw at the moment of failure — and replaying it offline — is the foundation of modern robotics engineering practice.",
    tryItYourself:
      "Record a bag while you drive a TurtleBot3 in Gazebo. Stop the simulator. Run `ros2 bag play <bag>` while RViz2 is open. The robot appears to move in RViz exactly as it did before — pure replay magic.",
    quiz: [
      {
        q: 'A rosbag2 file captures:',
        options: ['Just text logs', 'Time-stamped ROS2 topic messages for replay', 'Network traffic only', 'Bash commands'],
        answer: 1,
        explain: 'Bags store the actual messages with timestamps so they can be re-published later.',
      },
      {
        q: 'The default modern storage format for rosbag2 is:',
        options: ['SQLite or MCAP', 'JPEG', 'PDF', 'WAV'],
        answer: 0,
        explain: 'SQLite is the legacy default; MCAP is now the preferred Foxglove-compatible format.',
      },
      {
        q: 'Bag files are essential for:',
        options: ['Cosmetic skin colour', 'Regression testing and offline robot debugging', 'Cooking food', 'Charging phones'],
        answer: 1,
        explain: 'Bags = repeatable test data; you can re-run the same scenario on every code change.',
      },
    ],
  },
  // ===== Safety & Standards =====
  {
    slug: 'iso-ts-15066',
    title: 'ISO/TS 15066 — Cobot Safety Standard Guide | R2BOT',
    description:
      'ISO/TS 15066 defines safe collaborative-robot operation, including biomechanical force/pressure limits humans can tolerate during contact.',
    bucket: 'safety-standards',
    category: 'applications',
    difficulty: 'advanced',
    tags: ['cobot', 'iso', 'safety', 'force-limit', 'collaborative'],
    relatedTerms: ['iso-10218', 'collaborative-robot-safety', 'cobot', 'robot-safety'],
    youtubeSearchQuery: 'ISO TS 15066 cobot safety standard',
    definition:
      "ISO/TS 15066 is an international technical specification that extends ISO 10218 to detail safe operation of collaborative robots (cobots). Crucially, it defines biomechanical force and pressure thresholds humans can tolerate without injury — the empirical basis for safe cobot design.",
    howItWorks:
      "ISO/TS 15066 lays out four collaborative-operation modes (safety-monitored stop, hand-guiding, speed-and-separation monitoring, power-and-force limiting). For power-and-force limiting it specifies force (N) and pressure (N/cm²) limits per body region — face, neck, torso, arms — for both transient and quasi-static contact. Cobot manufacturers and integrators must demonstrate, via risk assessment and instrumented dummies (the Kolling-instrumented dummy is standard), that contact stays below those thresholds.",
    realWorld:
      "Universal Robots, ABB YuMi, FANUC CRX, and Doosan all certify their cobots against ISO/TS 15066. Indian system integrators (Addverb, Difacto) must perform 15066 risk assessments before deploying cobots in factories.",
    whyItMatters:
      "Without ISO/TS 15066, cobot deployments would be legally and ethically risky. It is the document every robotics-safety engineer must know. Indian factories deploying cobots increasingly require integrators to deliver a 15066-compliant report.",
    tryItYourself:
      "Download the ISO/TS 15066 standard (around US$200) and read the body-region force tables — you'll be surprised at how low the face/neck limits are. Then watch any UR cobot safety-stop demo and you'll understand why those gentle stops are mandatory.",
    quiz: [
      {
        q: 'ISO/TS 15066 governs:',
        options: ['Industrial robot fencing only', 'Safe cobot operation, including force/pressure limits on humans', 'GPS satellite navigation', 'Soundproofing'],
        answer: 1,
        explain: '15066 is the cobot-specific spec extending ISO 10218 with biomechanical limits.',
      },
      {
        q: 'Number of collaborative-operation modes defined by ISO/TS 15066:',
        options: ['One', 'Four', 'Twenty', 'Zero'],
        answer: 1,
        explain: 'Safety-monitored stop, hand-guiding, speed-and-separation, and power-and-force limiting.',
      },
      {
        q: 'Power-and-force limiting requires the cobot to:',
        options: ['Move faster on contact', 'Stay below body-region biomechanical limits during contact', 'Light up red lights only', 'Play music'],
        answer: 1,
        explain: 'The cobot must keep contact force/pressure under the per-body-region limits.',
      },
    ],
  },
  {
    slug: 'risk-assessment',
    title: 'Robot Risk Assessment — Complete Guide | R2BOT',
    description:
      "Risk assessment systematically identifies hazards in a robot system and the controls needed to reduce risk to acceptable levels. Mandatory under CE and ISO.",
    bucket: 'safety-standards',
    category: 'applications',
    difficulty: 'advanced',
    tags: ['risk-assessment', 'safety', 'iso-12100', 'hazard', 'mitigation'],
    relatedTerms: ['iso-10218', 'iso-ts-15066', 'robot-safety', 'functional-safety', 'ce-marking'],
    youtubeSearchQuery: 'robot risk assessment ISO 12100 tutorial',
    definition:
      "Risk assessment is the systematic process of identifying hazards posed by a machine (including a robot), estimating the risk of each, and selecting controls until residual risk is acceptable. It is required by ISO 12100 and underpins both CE marking and ISO 10218 compliance.",
    howItWorks:
      "The standard process: define machine limits (use, time, space, operators) → identify hazards (mechanical, electrical, thermal, ergonomic) → estimate risk (severity × probability × exposure) → evaluate (is it acceptable?) → apply controls following the hierarchy (inherent safe design → safeguarding → information/PPE). Document everything in a Technical File. Repeat for every machine variant and modification.",
    realWorld:
      "Every industrial-robot integrator in India follows this process — KUKA, FANUC, GreyOrange — even for in-house deployments. Indian robotics startups exporting to the EU must produce a CE Technical File including the risk assessment. Many Indian conferences (IRC, AIE) run dedicated safety-engineering sessions.",
    whyItMatters:
      "A bad risk assessment results in injuries, lawsuits, and product recalls. Knowing how to perform risk assessment is one of the highest-impact safety skills in robotics — and increasingly required by Indian factory inspectorates.",
    tryItYourself:
      "Pick a simple robot (e.g., a hobby cobot). Open ISO 12100 (or its Indian equivalent BIS IS 16809). Walk through the hazard checklist — pinch points, sharp edges, electrical, thermal — and list five controls you would apply. That is risk assessment in miniature.",
    quiz: [
      {
        q: 'The standard process governing general machine safety risk assessment is:',
        options: ['ISO 9001', 'ISO 12100', 'ISO 27001', 'ISO 14001'],
        answer: 1,
        explain: 'ISO 12100 is the master safety-of-machinery standard for risk assessment.',
      },
      {
        q: 'Risk severity is multiplied with which factor to estimate risk?',
        options: ['Robot colour', 'Probability and exposure (often)', 'Wi-Fi speed', 'Battery brand'],
        answer: 1,
        explain: 'Common formulations: Severity × Probability × Exposure (or Severity × Frequency × Avoidance).',
      },
      {
        q: 'Hierarchy of controls preference order is:',
        options: ['PPE → safeguarding → inherent safe design', 'Inherent safe design → safeguarding → information/PPE', 'Marketing → engineering', 'Procurement → finance'],
        answer: 1,
        explain: 'Designing the hazard out is preferred; PPE/information is a last resort.',
      },
    ],
  },
  {
    slug: 'light-curtain',
    title: 'Light Curtain in Robotics Safety — Complete Guide | R2BOT',
    description:
      'A light curtain is an array of safety-rated optical beams. Crossing them stops the robot instantly — a standard machine-safety device on industrial cells.',
    bucket: 'safety-standards',
    category: 'applications',
    difficulty: 'beginner',
    tags: ['light-curtain', 'safety', 'optical', 'guard', 'industrial'],
    relatedTerms: ['robot-safety', 'iso-10218', 'safety-scanner', 'two-hand-control'],
    youtubeSearchQuery: 'safety light curtain industrial robot',
    definition:
      "A light curtain is a safety device consisting of a transmitter and receiver projecting an array of invisible infrared beams across an opening. Breaking any beam triggers an immediate safe-state stop of the robot or machinery. Light curtains replace physical guarding when operators need frequent access.",
    howItWorks:
      "Each beam is monitored by a safety-rated controller using cross-checked redundant electronics. The system supports muting (temporarily ignoring crossings during specific phases), blanking (ignoring certain beams), and resolution settings (12 mm to 70 mm typical, finger to body detection). Categories range from PL c to PL e per ISO 13849.",
    realWorld:
      "Maruti Suzuki body-welding cells use light curtains where operators load and unload parts. SICK, Banner, and Pilz are major brands; Indian system integrators sell these widely for press shops and palletising cells.",
    whyItMatters:
      "Light curtains keep production fast and operators safe. Without them, every access point would need physical doors. Knowing how to select, install, and validate light curtains is essential for industrial-automation engineers.",
    tryItYourself:
      "Watch any 'light curtain installation' video on YouTube. Note the alignment LEDs and the cross-checking response time (typically <20 ms). Then look up your local SICK distributor — there is one in most Indian industrial cities.",
    quiz: [
      {
        q: 'A light curtain detects a person by:',
        options: ['Body weight', 'Breaking infrared beams between transmitter and receiver', 'Wi-Fi signal', 'GPS signal'],
        answer: 1,
        explain: 'Multiple infrared beams form the curtain; interruption triggers a safe stop.',
      },
      {
        q: 'Typical light-curtain response time is:',
        options: ['1 second', 'Under 20 ms', '30 seconds', '5 minutes'],
        answer: 1,
        explain: 'Safety-rated curtains respond in milliseconds — much faster than human reaction.',
      },
      {
        q: 'Light curtains replace:',
        options: ['Wi-Fi routers', 'Physical guarding where operator access is frequent', 'Floor mats', 'GPS antennas'],
        answer: 1,
        explain: 'They allow open access while still enforcing a safety boundary.',
      },
    ],
  },
  {
    slug: 'safety-scanner',
    title: 'Safety Laser Scanner — Complete Guide | R2BOT',
    description:
      'A safety laser scanner is a safety-rated 2D LIDAR that defines virtual safety zones. Standard on AGVs, AMRs, and many industrial cells.',
    bucket: 'safety-standards',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['safety-scanner', 'lidar', 'amr', 'safety', 'sick'],
    relatedTerms: ['light-curtain', 'lidar', 'robot-safety', 'autonomous-mobile-robot'],
    youtubeSearchQuery: 'SICK safety laser scanner AGV tutorial',
    definition:
      "A safety laser scanner is a 2D LIDAR certified for functional safety. It scans a horizontal plane and triggers a safe stop when objects enter user-defined virtual safety zones. It is the standard safety sensor on AGVs and AMRs worldwide.",
    howItWorks:
      "The scanner spins a rotating mirror that pulses infrared laser at 10–30 Hz, measuring distance to anything in its plane (typically 270° field, 4–20 m range). Operators define configurable zones — protective fields that trigger safe stop, warning fields that slow the robot. Multiple field-sets can be switched dynamically based on speed or task. The scanner is certified to Performance Level d or e (ISO 13849) and SIL 2/3 (IEC 61508).",
    realWorld:
      "Every GreyOrange Butler, every Locus Robotics bot, and every modern industrial AGV uses a SICK microScan3 or Hokuyo UAM scanner. Indian system integrators routinely include these in AMR builds. Hospital delivery robots use them to slow near humans.",
    whyItMatters:
      "Safety scanners are the difference between a legal, deployable AMR and one that cannot pass any factory acceptance test. Engineers building or integrating mobile robots in India must understand their selection, mounting, and certification.",
    tryItYourself:
      "Visit SICK's online scanner-configuration tool (free). Define a protective field and warning field on a virtual AMR layout. Simulate a person walking in — feel the click of the safe stop. That is exactly what happens in a real warehouse.",
    quiz: [
      {
        q: 'A safety laser scanner differs from a regular LIDAR by:',
        options: ['Being certified to functional-safety standards (PL d / e)', 'Being cheaper', 'Working only at night', 'Having no laser'],
        answer: 0,
        explain: 'The safety rating + redundant hardware + diagnostics is the key differentiator.',
      },
      {
        q: 'Typical horizontal field of view of a safety scanner:',
        options: ['10°', '~270°', '5°', '0°'],
        answer: 1,
        explain: 'Around 270° is common; specific models cover up to 275°.',
      },
      {
        q: 'A protective field on a safety scanner triggers:',
        options: ['A song', 'A safe stop of the AMR', 'A photograph', 'Cloud backup'],
        answer: 1,
        explain: 'Entering the protective field commands the AMR to a certified safe state.',
      },
    ],
  },
  {
    slug: 'ce-marking',
    title: 'CE Marking for Robots — Complete Guide | R2BOT',
    description:
      'CE marking is required to sell most robots and machinery into the European Union. The mark certifies conformity with all applicable EU directives.',
    bucket: 'safety-standards',
    category: 'applications',
    difficulty: 'advanced',
    tags: ['ce', 'compliance', 'eu', 'export', 'machinery-directive'],
    relatedTerms: ['ce-marking-robots', 'iso-10218', 'risk-assessment', 'functional-safety'],
    youtubeSearchQuery: 'CE marking robots EU compliance',
    definition:
      "CE marking is the manufacturer's declaration that a product complies with all applicable EU directives. For robots this primarily means the Machinery Directive (or new Machinery Regulation 2023/1230), EMC, Low-Voltage, and possibly RoHS. Without CE marking, robots cannot legally be sold or used in the EU.",
    howItWorks:
      "To CE-mark a robot, the manufacturer must follow these steps: identify applicable directives → apply harmonised standards (ISO 10218 for robot, ISO 13849 for safety, EN 61000-6 for EMC) → carry out a risk assessment → compile a Technical File → produce a Declaration of Conformity → affix the CE mark and instructions. For higher-risk machinery, a notified body may be involved.",
    realWorld:
      "Every UR, KUKA, ABB, and Fanuc robot sold in the EU is CE-marked. Indian companies exporting to Europe (GreyOrange, Asimov Robotics, HMI Tech) must produce full CE Technical Files for every product variant.",
    whyItMatters:
      "CE marking is the entry ticket to the EU robotics market. Knowing the process turns Indian robotics startups into global players. Senior engineering roles increasingly require CE-compliance experience.",
    tryItYourself:
      "Read the EU's official 'Blue Guide' to the implementation of EU product rules (free PDF). Then pick a single robotic product and write out which directives and harmonised standards apply to it — your first mini CE study.",
    quiz: [
      {
        q: 'CE marking is required to sell robots into:',
        options: ['The Indian Ocean only', 'The European Union', 'Antarctica', 'Outer space'],
        answer: 1,
        explain: 'CE = Conformité Européenne — the EU\'s mandatory product mark.',
      },
      {
        q: 'For robots, the primary directive that applies is:',
        options: ['Tax law', 'Machinery Directive (or new Machinery Regulation)', 'Cybersecurity law', 'Food safety'],
        answer: 1,
        explain: 'The Machinery Directive (2006/42/EC) and its replacement Regulation 2023/1230 are central.',
      },
      {
        q: 'A CE technical file typically includes:',
        options: ['Risk assessment, declarations, and standards used', 'Just a sticker', 'A photograph', 'A song'],
        answer: 0,
        explain: 'The technical file documents the compliance process and is held for years for audit.',
      },
    ],
  },
];
