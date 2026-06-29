// Batch 1: sensors, actuators, control-systems, programming-software
import type { TermV2 } from './v2-types';

export const TERMS_BATCH_1: TermV2[] = [
  {
    slug: 'tof-sensor',
    title: 'Time-of-Flight Sensor in Robotics — Complete Guide | R2BOT',
    description:
      'Time-of-Flight (ToF) sensors measure distance by timing reflected light pulses. Used in depth cameras, gesture sensing, and drone obstacle avoidance.',
    bucket: 'sensors',
    category: 'sensors',
    difficulty: 'intermediate',
    tags: ['tof', 'distance', 'depth', 'sensor', 'lidar-cousin', 'optical'],
    relatedTerms: ['lidar', 'depth-camera', 'ultrasonic-sensor', 'infrared-sensor', 'sensor-fusion'],
    suggestedLessons: ['spark/sensors-explained'],
    youtubeSearchQuery: 'time of flight sensor robotics explained',
    definition:
      'A Time-of-Flight (ToF) sensor measures how long an emitted light pulse takes to bounce off an object and return. From that travel time, the sensor computes distance with millimetre-to-centimetre precision. Unlike ultrasonic sensors, ToF works at the speed of light, giving readings hundreds of times per second.',
    howItWorks:
      'A ToF sensor emits an invisible infrared or laser pulse and starts a high-speed timer. Photons reflect off whatever they hit and return to a sensitive detector on the chip; the timer stops. Distance equals the round-trip time multiplied by the speed of light, divided by two. Modern ToF chips like the VL53L0X use a tiny SPAD (single-photon avalanche diode) array and on-chip phase-difference processing — so the host microcontroller just reads a clean distance value over I²C. Some ToF modules output a full depth image per frame, similar to LIDAR but on a single chip.',
    realWorld:
      "Your iPhone's Face ID uses a ToF depth camera to map your face in 3D. DJI drones use ToF sensors to sense obstacles below them during landing. Industrial robots use ToF to detect humans entering a workspace and trigger a safety stop in under 20 ms.",
    whyItMatters:
      "ToF sensors are the cheap bridge between simple ultrasonic and full LIDAR — under ₹500 on Robu.in for a VL53L0X module that gives 2 m range. For Indian robotics students, ToF unlocks projects that would otherwise need a costly LIDAR: drone landing, gesture control, smart parking, queue counters.",
    tryItYourself:
      'Buy a VL53L0X breakout board and hook it to an Arduino. With 10 lines of code you can print live distance to the serial monitor — try it on your hand, a wall, a glass surface (which it surprisingly handles well).',
    quiz: [
      {
        q: 'What does a Time-of-Flight sensor primarily measure?',
        options: ['Sound travel time', 'Light travel time', 'Magnetic field strength', 'Temperature change'],
        answer: 1,
        explain: 'ToF sensors emit a light pulse and time the reflected return — speed of light × time / 2 gives the distance.',
      },
      {
        q: 'Which everyday device commonly uses a ToF sensor?',
        options: ['Microwave oven', 'iPhone Face ID', 'Electric kettle', 'Ceiling fan'],
        answer: 1,
        explain: "Apple's Face ID uses a small ToF camera that builds a 3D depth map of your face.",
      },
      {
        q: 'Compared with ultrasonic, ToF is mainly:',
        options: ['Slower', 'Faster and uses light instead of sound', 'Cheaper but lower range', 'Only works underwater'],
        answer: 1,
        explain: 'ToF uses light (much faster than sound) and is unaffected by airflow or soft surfaces that confuse ultrasonic.',
      },
    ],
  },
  {
    slug: 'optical-flow-sensor',
    title: 'Optical Flow Sensor in Robotics — Complete Guide | R2BOT',
    description:
      'Optical flow sensors estimate motion by tracking how pixels shift between frames. Used by drones, mice, and self-balancing robots to hold position.',
    bucket: 'sensors',
    category: 'sensors',
    difficulty: 'intermediate',
    tags: ['optical-flow', 'vision', 'motion', 'drone', 'velocity'],
    relatedTerms: ['camera-vision', 'imu', 'visual-odometry', 'sensor-fusion', 'slam'],
    youtubeSearchQuery: 'optical flow sensor drone explained',
    definition:
      'An optical flow sensor measures how the world moves across a camera between successive frames. By tracking the apparent shift of pixels, it estimates velocity in two axes without needing GPS. The same principle is used in every modern computer mouse — translated to fly-above-the-floor at thousands of feet for drones.',
    howItWorks:
      'A small image sensor captures frames at 100–4000 Hz. A built-in DSP compares each frame with the previous one and finds the average pixel shift using block-matching or Lucas–Kanade flow. Combined with the camera height (from a ToF or barometer), the sensor outputs metres-per-second velocity over a serial bus. The PX4FLOW module pairs a CMOS camera, sonar altimeter, and gyroscope; it spits out clean XY velocity at 250 Hz — exactly what a drone autopilot needs.',
    realWorld:
      'DJI Mini and Mavic drones use optical-flow downward-facing cameras to hold position indoors where GPS is unavailable. Roomba J7 uses optical flow to detect when it has been picked up. Every modern computer mouse is an optical-flow sensor with a tiny CMOS imager that tracks the surface beneath it.',
    whyItMatters:
      "Optical flow gives a robot a sense of motion using just a camera — no expensive IMUs, no GPS. For Indian drone startups (Ideaforge, Garuda) and indoor delivery robots, optical-flow is a cost-saving must. It is also one of the easiest CV topics for students to implement and visualise.",
    tryItYourself:
      'Open `/visualizer` on R2BOT, scroll to the optical-flow demo, and drag the mouse — watch the live arrows showing pixel velocity. Then read about Lucas–Kanade and try writing it yourself in OpenCV (10 lines of Python).',
    quiz: [
      {
        q: 'Optical flow estimates:',
        options: ['Battery state of charge', 'Pixel-level motion between camera frames', 'Surface temperature', 'Wireless signal strength'],
        answer: 1,
        explain: 'Optical flow tracks how pixels shift between frames to infer the camera (or world) motion.',
      },
      {
        q: 'A common everyday device that uses optical flow is the:',
        options: ['Microwave oven', 'Computer mouse', 'Refrigerator', 'Headphone'],
        answer: 1,
        explain: 'Modern computer mice are tiny optical-flow imaging systems sampling the surface they ride over.',
      },
      {
        q: 'For a drone, optical flow is most useful when:',
        options: ['Flying through clouds', 'GPS is weak or unavailable indoors', 'The drone is sleeping', 'Battery is full'],
        answer: 1,
        explain: 'Indoors and in urban canyons, GPS is unreliable — optical flow holds position visually.',
      },
    ],
  },
  {
    slug: 'gps-module',
    title: 'GPS Module in Robotics — Complete Guide | R2BOT',
    description:
      'A GPS module gives a robot its global position via satellites. Used in drones, autonomous cars, delivery bots, and agricultural robots worldwide.',
    bucket: 'sensors',
    category: 'sensors',
    difficulty: 'beginner',
    tags: ['gps', 'gnss', 'localisation', 'satellite', 'positioning'],
    relatedTerms: ['gps-gnss', 'imu', 'sensor-fusion', 'slam', 'localisation'],
    youtubeSearchQuery: 'GPS module robotics tutorial',
    definition:
      "A GPS module is a small electronic board that listens to signals from GPS, GLONASS, Galileo, and BeiDou satellites and computes its own position on Earth — latitude, longitude, altitude, and time. The cheapest modules (NEO-6M, NEO-M8N) cost under ₹500 and give a robot a global sense of where it is.",
    howItWorks:
      "Each satellite continuously broadcasts a precise time-stamped signal. The receiver picks up signals from at least four satellites, measures the tiny travel-time differences, and uses trilateration to solve for its 3D position and clock offset. A typical NEO-M8N outputs a fresh position 10 times per second, with 2–3 metre accuracy. RTK-grade GPS uses correction signals from a base station to push that accuracy below 2 cm.",
    realWorld:
      "Every food-delivery scooter app, every Ola/Uber ride, every Ideaforge surveillance drone uses GPS. ISRO's Pragyan rover used a GPS-like inertial+visual fix during the Chandrayaan-3 mission (no actual GPS exists at the Moon yet). Indian agricultural robots use RTK-GPS for centimetre-accurate field traversal.",
    whyItMatters:
      "GPS is the easiest way to give a robot a sense of global location — but it is the slow, low-accuracy backbone. Senior robotics roles in India almost always require you to know how to fuse GPS with IMU and odometry to produce a clean pose estimate.",
    tryItYourself:
      'Connect a NEO-6M to an Arduino via UART. Read the NMEA sentences in the serial monitor — your live latitude and longitude will scroll by. Plot the data in Google Earth to see your robot or yourself trace its path.',
    quiz: [
      {
        q: 'What does a GPS module need at minimum to compute its position?',
        options: ['Wi-Fi router', 'Signal from 4+ satellites', 'GSM tower', 'Internet connection'],
        answer: 1,
        explain: 'GPS works with no internet — it needs line-of-sight signals from at least four satellites to trilaterate.',
      },
      {
        q: 'Typical accuracy of a consumer NEO-M8N GPS is around:',
        options: ['1 mm', '2–3 metres', '500 metres', '5 kilometres'],
        answer: 1,
        explain: 'Consumer GPS is around 2–3 m accurate; RTK-corrected GPS can reach centimetre precision.',
      },
      {
        q: 'What does RTK in RTK-GPS stand for?',
        options: ['Real-Time Kinematics', 'Robot Tool Kit', 'Radio Trigger Key', 'Random-Time Kinetic'],
        answer: 0,
        explain: 'Real-Time Kinematic positioning uses base-station corrections to push accuracy below 2 cm.',
      },
    ],
  },
  {
    slug: 'thermal-camera',
    title: 'Thermal Camera in Robotics — Complete Guide | R2BOT',
    description:
      'Thermal cameras image infrared heat instead of visible light. Used in search-and-rescue robots, predictive maintenance, and India\'s fever-screening robots.',
    bucket: 'sensors',
    category: 'sensors',
    difficulty: 'intermediate',
    tags: ['thermal', 'ir', 'imaging', 'maintenance', 'sar'],
    relatedTerms: ['camera-vision', 'depth-camera', 'object-detection', 'search-and-rescue-robotics'],
    youtubeSearchQuery: 'thermal camera robotics tutorial',
    definition:
      "A thermal camera images the infrared heat radiated by every object instead of the visible light most cameras see. Hot regions glow brightly even in pitch dark, through smoke or thin walls. In robotics, thermal cameras let robots 'see' people, hot machinery, and fires that normal cameras cannot.",
    howItWorks:
      "A thermal sensor (a bolometer array) measures the temperature of each pixel by detecting long-wave infrared radiation. Pixels are tiny resistors whose resistance changes with the heat they absorb. A read-out circuit converts every pixel into a temperature reading, and a colour-mapped image is rendered (cool = blue, hot = red). Resolution is much lower than visible-light cameras — a $200 FLIR Lepton gives 160×120 pixels at 9 Hz — but for human or hotspot detection that is more than enough.",
    realWorld:
      "During COVID, Indian airports and offices used robots fitted with FLIR thermal cameras to screen passengers for fever in seconds. Power-grid inspection drones use thermal cameras to find overheating transformers. Search-and-rescue teams use thermal-equipped drones to find people in earthquake rubble at night.",
    whyItMatters:
      "Thermal cameras open up perception that visible cameras cannot match: night-vision, smoke-penetration, fire detection, electrical-fault detection. Industries in India (power, oil & gas, agriculture, defence) have growing demand for thermal-equipped robots.",
    tryItYourself:
      'A FLIR Lepton 3.5 breakout pairs with a Raspberry Pi over SPI. Read the official tutorial, capture a few frames of your laptop and your face, then overlay them onto a normal camera image to compare.',
    quiz: [
      {
        q: 'A thermal camera detects:',
        options: ['Visible light only', 'Infrared radiation emitted by objects', 'Ultrasound', 'Magnetism'],
        answer: 1,
        explain: 'Thermal cameras detect long-wave infrared emitted as heat — letting them see through darkness and smoke.',
      },
      {
        q: 'A typical FLIR Lepton has resolution around:',
        options: ['4K (3840×2160)', '160×120 px', '8 megapixels', '1 px'],
        answer: 1,
        explain: 'Microbolometer thermal sensors are low-res by visible-camera standards — 160×120 is common.',
      },
      {
        q: 'Which is NOT a typical use of thermal cameras in robotics?',
        options: ['Detecting overheating motors', 'Reading printed text on a sign', 'Finding humans in dark/smoke', 'Detecting overheated power lines'],
        answer: 1,
        explain: 'Thermal cameras have too low resolution and no colour-text contrast for OCR — use visible cameras for that.',
      },
    ],
  },
  {
    slug: 'radar-sensor',
    title: 'Radar Sensor in Robotics — Complete Guide | R2BOT',
    description:
      'Radar sensors use radio waves to measure distance and velocity even in rain, fog, or dust. Standard on autonomous cars, ADAS, and outdoor robots.',
    bucket: 'sensors',
    category: 'sensors',
    difficulty: 'intermediate',
    tags: ['radar', 'doppler', 'mmwave', 'autonomous-driving', 'adas'],
    relatedTerms: ['lidar', 'ultrasonic-sensor', 'autonomous-vehicle', 'sensor-fusion'],
    youtubeSearchQuery: 'mmWave radar robotics car explained',
    definition:
      "A radar sensor emits radio waves and measures the reflections to detect objects, their distance, and their relative velocity. Unlike LIDAR, radar penetrates rain, fog, and dust — making it a workhorse for outdoor and automotive robotics where weather is unpredictable.",
    howItWorks:
      "Modern automotive radars (77 GHz mmWave) emit a frequency-modulated continuous wave. When the wave returns from an object, the difference between transmitted and received frequency encodes range. The Doppler shift in the return wave encodes velocity. Antenna arrays add angular resolution, so the radar returns a 3D point cloud (range, velocity, angle) at 10–30 Hz. Chips like the Texas Instruments AWR1843 are now small enough to fit in any robot.",
    realWorld:
      "Every Tesla, Toyota, and Maruti car with adaptive cruise has at least one radar. Indian agricultural startups use mmWave radar to detect crop rows under dust. Highway-tolling 'Fastag' booths use radar to detect vehicles approaching at speed.",
    whyItMatters:
      "Radar's all-weather capability makes it the most reliable sensor for outdoor robotics. Autonomous-vehicle teams in India (Ola Electric, Mahindra, Flux Auto) all hire engineers with radar-fusion experience.",
    tryItYourself:
      'Buy an HB100 or RCWL-0516 microwave radar module (under ₹300). Wire it to Arduino, point at a passing pedestrian, and read the Doppler frequency — it changes audibly as people walk past.',
    quiz: [
      {
        q: 'What gives radar an advantage over LIDAR in heavy rain?',
        options: ['It is louder', 'Radio waves penetrate water droplets better than light', 'It is cheaper to run', 'Radar uses no power'],
        answer: 1,
        explain: 'Long-wavelength radio waves scatter much less in rain, fog, and dust than visible or near-IR light.',
      },
      {
        q: 'What does the Doppler shift tell a radar?',
        options: ['Target colour', 'Relative velocity of the target', 'Target temperature', 'Target shape'],
        answer: 1,
        explain: 'Frequency shift between transmit and receive encodes the target velocity along the radar line-of-sight.',
      },
      {
        q: 'Automotive mmWave radar typically operates around:',
        options: ['1 kHz', '77 GHz', '5 GHz Wi-Fi', '50 Hz mains'],
        answer: 1,
        explain: '77 GHz is the dominant ADAS radar band globally; 79 GHz is also seeing adoption.',
      },
    ],
  },
  {
    slug: 'hall-effect-sensor',
    title: 'Hall-Effect Sensor in Robotics — Complete Guide | R2BOT',
    description:
      'Hall-effect sensors detect magnetic fields. In robotics they sense motor position, count wheel rotations, and detect open/closed states.',
    bucket: 'sensors',
    category: 'sensors',
    difficulty: 'beginner',
    tags: ['hall-effect', 'magnetic', 'encoder', 'motor', 'rotation'],
    relatedTerms: ['encoder', 'brushless-motor', 'dc-motor', 'magnetic-encoder'],
    youtubeSearchQuery: 'hall effect sensor robotics explained',
    definition:
      "A Hall-effect sensor outputs a voltage proportional to the strength of the magnetic field around it. By placing a small magnet on a rotating shaft, you can detect every rotation — a classic way to count wheel turns, sense BLDC motor position, or detect closed doors and latches.",
    howItWorks:
      "Inside the chip, a thin semiconductor sheet carries a current. When a magnetic field crosses the sheet, the Lorentz force pushes electrons sideways, creating a tiny voltage across the sheet — the Hall voltage. Digital Hall sensors flip their output between HIGH and LOW as the field crosses a threshold (perfect for counting). Analog Hall sensors output a continuous voltage proportional to the field — used for precise BLDC rotor-angle sensing.",
    realWorld:
      "Every brushless motor in a drone or e-scooter has three Hall sensors arranged around its stator to detect the magnet rotor position. Reed-replacement door sensors in homes are Hall-based. Bicycle speedometers use one to count wheel rotations.",
    whyItMatters:
      "Hall sensors are cheap, contactless, and immune to dust — perfect for outdoor and industrial robots. Understanding Hall-based commutation is mandatory for anyone working on BLDC drives, ESCs, or e-mobility hardware in India.",
    tryItYourself:
      'Wire a 49E linear Hall sensor or A3144 digital Hall to an Arduino. Wave a small fridge magnet near it — read the analog or digital pin and watch the value snap. Now mount the magnet on a spinning fan blade and count RPM.',
    quiz: [
      {
        q: 'A Hall-effect sensor primarily responds to:',
        options: ['Light', 'Magnetic field', 'Sound', 'Temperature'],
        answer: 1,
        explain: 'The Hall voltage is generated by current carriers being deflected by a magnetic field.',
      },
      {
        q: 'A brushless DC motor typically uses how many Hall sensors?',
        options: ['One', 'Three', 'Ten', 'None'],
        answer: 1,
        explain: 'Three Hall sensors detect the rotor position needed to electronically commutate a 3-phase BLDC.',
      },
      {
        q: 'Which is a typical use of a Hall sensor in everyday products?',
        options: ['Smartphone touch screen', 'Microwave heating control', 'Laptop lid-open detection', 'Headphone volume'],
        answer: 2,
        explain: 'Laptops use a Hall sensor near the screen to detect when the lid magnet is in close range.',
      },
    ],
  },
  // ===== Actuators =====
  {
    slug: 'piezoelectric-actuator',
    title: 'Piezoelectric Actuator in Robotics — Complete Guide | R2BOT',
    description:
      'Piezoelectric actuators convert voltage into nanometre-precise motion. Used in microscope stages, precision optics, and high-frequency haptic feedback.',
    bucket: 'actuators',
    category: 'actuators',
    difficulty: 'advanced',
    tags: ['piezo', 'actuator', 'nano', 'precision', 'haptics'],
    relatedTerms: ['linear-actuator', 'servo-motor', 'haptic-feedback', 'shape-memory-alloy'],
    youtubeSearchQuery: 'piezoelectric actuator robotics explained',
    definition:
      "A piezoelectric actuator uses materials that physically deform when an electric voltage is applied. The deformation is tiny — nanometres to micrometres — but extremely fast and precise. In robotics, piezo actuators power instruments where smoothness and resolution beat brute-force speed.",
    howItWorks:
      "Piezoelectric ceramics (PZT) contain dipoles that align when polarised. When voltage is applied across the ceramic, the dipoles shift slightly, expanding or contracting the material. Stacking many thin layers amplifies the displacement to tens of micrometres. Driving voltages are 100–1000 V, requiring dedicated amplifiers. Inchworm and ultrasonic motor designs combine piezo flex with clamp-and-release stages to walk over centimetres of travel while keeping nano-scale precision.",
    realWorld:
      "Atomic-force microscopes use piezo stages to scan samples with sub-nanometre precision. iPhone camera autofocus uses piezo voice-coil-like actuators. Modern surgical robots use piezo motors for fine-instrument positioning. Inkjet printer heads fire droplets using piezo bursts.",
    whyItMatters:
      "Whenever a robot needs nanometre or micrometre precision — semiconductor fab, biotech pipetting, optical alignment — piezo actuators are the default. Indian semiconductor and biotech-instrumentation startups regularly hire engineers with piezo-driver experience.",
    tryItYourself:
      'Pull apart an old quartz wristwatch — the tiny disc inside is a piezo crystal vibrating at 32,768 Hz. Power it with a 3 V coin cell through a signal generator and feel the vibration with your fingertip.',
    quiz: [
      {
        q: 'A piezoelectric actuator converts:',
        options: ['Light into motion', 'Voltage into mechanical deformation', 'Heat into rotation', 'Sound into electricity only'],
        answer: 1,
        explain: 'Applied voltage causes the piezo ceramic dipoles to shift, deforming the material.',
      },
      {
        q: 'Typical raw stroke of a single piezo stack is:',
        options: ['1 metre', '10 micrometres', '5 centimetres', '500 metres'],
        answer: 1,
        explain: 'Even stacked, piezo travel is small (tens of µm) — but the precision is unmatched.',
      },
      {
        q: 'Piezo actuators are best for tasks that need:',
        options: ['Heavy lifting', 'Nanometre-precision positioning', 'Long-range translation', 'Underwater swimming'],
        answer: 1,
        explain: 'They shine in nanometre and sub-micrometre positioning at high bandwidth.',
      },
    ],
  },
  {
    slug: 'harmonic-drive',
    title: 'Harmonic Drive in Robotics — Complete Guide | R2BOT',
    description:
      'Harmonic drive gears deliver huge reduction with near-zero backlash in a compact package. Standard in robotic arms, surgical robots, and humanoids.',
    bucket: 'actuators',
    category: 'actuators',
    difficulty: 'intermediate',
    tags: ['harmonic-drive', 'gear', 'reduction', 'arm', 'backlash'],
    relatedTerms: ['planetary-gearbox', 'servo-motor', 'robot-arm', 'humanoid-robot'],
    youtubeSearchQuery: 'harmonic drive gear robot arm explained',
    definition:
      "A harmonic drive (strain-wave gear) is a special gearing that achieves 30:1 to 320:1 reduction in a single stage with almost zero backlash. It is the gold standard inside every joint of a precision robotic arm, humanoid, or surgical robot.",
    howItWorks:
      "The drive has three parts: a rigid outer ring gear, a flexible toothed cup (flexspline), and an elliptical wave-generator inside. As the wave-generator rotates, it deforms the flexspline into an oval, meshing only two teeth at a time with the outer ring. Because the flexspline has two fewer teeth than the outer ring, one full rotation of the wave-generator advances the flexspline by just two teeth — giving the massive reduction. No backlash and high stiffness make it ideal for precise robot motion.",
    realWorld:
      "Universal Robots cobots, Yaskawa industrial arms, Boston Dynamics Atlas joints, and da Vinci surgical robots all use harmonic drives. Indian academic robot labs (IIT Bombay, IISc) regularly source harmonic drives from Japan's Harmonic Drive Systems Inc.",
    whyItMatters:
      "Harmonic drives are the difference between a wobbly DIY arm and a research-grade manipulator. They are pricey (₹50,000+ per joint) but unmatched for precision. Mid-senior robotics roles often ask candidates to compare harmonic vs planetary vs cycloidal gearboxes.",
    tryItYourself:
      'Open `/visualizer` and load the harmonic-drive demo — you can see the flexspline deform and count teeth to verify the reduction ratio yourself. Then read the IEEE paper "Harmonic Drive Gear Mechanism" for the maths.',
    quiz: [
      {
        q: 'A harmonic drive achieves high reduction by:',
        options: ['Stacking many planetary stages', 'Elliptical deformation of a flexible toothed cup', 'Using magnetic forces only', 'Friction wheels'],
        answer: 1,
        explain: 'A rotating elliptical wave-generator deforms the flexspline so only a few teeth engage, giving huge reduction in one stage.',
      },
      {
        q: 'The main advantage of harmonic drives over planetary gearboxes is:',
        options: ['Cheaper price', 'Near-zero backlash', 'Greater weight', 'Higher noise'],
        answer: 1,
        explain: 'Near-zero backlash and high stiffness are the harmonic drive\'s defining advantages.',
      },
      {
        q: 'Which robot would most likely use harmonic drives in every joint?',
        options: ['A toy line-follower', 'Universal Robots UR5 cobot', 'A Roomba vacuum', 'A simple drone'],
        answer: 1,
        explain: 'Precision industrial arms like the UR5 use harmonic drives in every joint for repeatability.',
      },
    ],
  },
  {
    slug: 'ball-screw',
    title: 'Ball Screw in Robotics — Complete Guide | R2BOT',
    description:
      'Ball screws convert rotary motion into linear motion with very low friction. The backbone of CNC machines, linear robots, and 3D printers.',
    bucket: 'actuators',
    category: 'actuators',
    difficulty: 'intermediate',
    tags: ['ball-screw', 'linear-motion', 'cnc', 'precision', 'gantry'],
    relatedTerms: ['linear-actuator', 'rack-and-pinion', 'lead-screw', 'cnc-milling'],
    youtubeSearchQuery: 'ball screw linear motion robotics explained',
    definition:
      "A ball screw is a precision threaded shaft with a matching nut filled with recirculating ball bearings. When the shaft turns, the nut moves linearly along it with very low friction — the standard way to convert motor rotation into accurate linear motion in robotics.",
    howItWorks:
      "Inside the nut, dozens of small steel balls roll between the screw and nut threads. Because the contact is rolling instead of sliding, friction is tiny (around 90% efficiency vs 30–50% for a traditional lead screw). The balls recirculate through a return tube as the nut moves. Coupling a stepper or servo motor to the ball-screw shaft lets a controller command precise positions and speeds — typical pitches are 5 mm or 10 mm per revolution.",
    realWorld:
      "Every CNC mill, every laser cutter, every Cartesian 3D printer, and every linear-X gantry uses ball screws. SCARA pick-and-place machines for electronics assembly use them for vertical Z motion. Even semiconductor wafer steppers use ultra-precision ball screws for nanometre positioning.",
    whyItMatters:
      "Ball screws are the most efficient way to translate motor torque into long-stroke linear motion. Indian additive-manufacturing and CNC retrofitting markets need engineers who understand ball-screw selection, preloading, and lifecycle.",
    tryItYourself:
      'A SFU1605 ball screw kit costs around ₹1,500 on Robu.in. Couple it to a NEMA 17 stepper, drive it with an Arduino + A4988 driver, and watch a linear slide move with 0.01 mm precision — the same kit anchors thousands of DIY CNC builds.',
    quiz: [
      {
        q: 'A ball screw differs from a lead screw because it:',
        options: ['Uses recirculating ball bearings between threads', 'Is square instead of round', 'Has no threads', 'Runs in oil bath only'],
        answer: 0,
        explain: 'Recirculating balls turn sliding friction into rolling friction — far more efficient.',
      },
      {
        q: 'Typical efficiency of a ball screw is:',
        options: ['10%', '50%', '90%+', '5%'],
        answer: 2,
        explain: 'Ball screws achieve around 90% efficiency, vs 30–50% for conventional lead screws.',
      },
      {
        q: 'Which machine commonly uses ball screws?',
        options: ['Coffee maker', 'CNC mill', 'Microwave oven', 'Floor fan'],
        answer: 1,
        explain: 'CNC machines, 3D printers, laser cutters, and linear gantries all rely on ball screws.',
      },
    ],
  },
  {
    slug: 'vacuum-gripper',
    title: 'Vacuum Gripper in Robotics — Complete Guide | R2BOT',
    description:
      'Vacuum grippers pick up flat, smooth, or porous objects using suction. The dominant gripper in warehouse picking, packaging, and electronics assembly.',
    bucket: 'actuators',
    category: 'actuators',
    difficulty: 'beginner',
    tags: ['vacuum', 'gripper', 'suction', 'picking', 'end-effector'],
    relatedTerms: ['gripper', 'end-effector', 'warehouse-robotics', 'soft-gripper'],
    youtubeSearchQuery: 'vacuum gripper warehouse robot explained',
    definition:
      "A vacuum gripper picks up an object by creating a region of low pressure between a suction cup and the object's surface. Atmospheric pressure pushes the object firmly against the cup until the vacuum is released. Cheap, fast, and gentle — perfect for items that have at least one flat, sealable surface.",
    howItWorks:
      "A small vacuum pump or compressed-air Venturi ejector pulls air out of a chamber connected to one or more silicone suction cups. As pressure drops below 70–90% of atmospheric, the cup grips firmly. Vacuum sensors in the line confirm a good seal before the robot lifts. Releasing is instant: a quick blow of air, or simply opening a valve, ends suction. Cups come in flat, bellows, and oval shapes for different objects.",
    realWorld:
      "Amazon Robotics' Sparrow uses an array of vacuum cups to pick varied warehouse items. Foxconn uses vacuum grippers for iPhone glass placement. Indian printing and packaging lines use them constantly to pick up paper, boxes, and PCBs.",
    whyItMatters:
      "Vacuum gripping is the single most economically important gripper technology in robotics today — the majority of warehouse picks rely on it. Knowledge of vacuum tech (pumps, ejectors, leak compensation) is essential for warehouse-automation engineers.",
    tryItYourself:
      'Buy a 12 V mini vacuum pump kit (under ₹600 on Robu.in). Attach a silicone cup, plug into a small reservoir, and try picking up phones, books, and water bottles. Notice how it fails on textured surfaces — that\'s the real-world limitation.',
    quiz: [
      {
        q: 'A vacuum gripper holds an object using:',
        options: ['Magnetic attraction', 'Atmospheric pressure pushing against a low-pressure region', 'Strong glue', 'A robotic finger'],
        answer: 1,
        explain: 'It is not the vacuum that holds — it is the surrounding atmospheric pressure pressing the object onto the cup.',
      },
      {
        q: 'Which surface is hardest for a vacuum gripper?',
        options: ['Glass', 'Cardboard box top', 'Porous foam', 'Smooth metal'],
        answer: 2,
        explain: 'Porous or rough surfaces leak air, breaking the seal needed for suction.',
      },
      {
        q: 'A Venturi ejector creates vacuum using:',
        options: ['A battery', 'Compressed air flow', 'Heating element', 'Spinning blades'],
        answer: 1,
        explain: 'Compressed air passing through a constriction lowers pressure (Bernoulli), generating vacuum at the side port.',
      },
    ],
  },
  {
    slug: 'planetary-gearbox',
    title: 'Planetary Gearbox in Robotics — Complete Guide | R2BOT',
    description:
      'Planetary gearboxes deliver high torque and compact size for robot motors. Standard in cobots, drones, and consumer robotics.',
    bucket: 'actuators',
    category: 'actuators',
    difficulty: 'intermediate',
    tags: ['planetary', 'gearbox', 'reduction', 'torque', 'motor'],
    relatedTerms: ['harmonic-drive', 'dc-motor', 'brushless-motor', 'servo-motor'],
    youtubeSearchQuery: 'planetary gearbox robotics explained',
    definition:
      "A planetary gearbox uses a sun gear, multiple planet gears, and an outer ring gear to transmit torque with high reduction in a compact, coaxial package. Robots love planetary gearboxes because they deliver high torque from a small motor without the mass or cost of a harmonic drive.",
    howItWorks:
      "The central sun gear is driven by the motor. It meshes with three or more planet gears that orbit it; the planets in turn mesh with the inner teeth of a fixed outer ring. The planets are mounted on a carrier that becomes the output shaft. Because torque is shared across all planets, the gearbox handles big loads with even smaller teeth than a parallel-shaft gear. Reduction ratios of 3:1 to 100:1 are common in a single stage; multiple stages can be cascaded.",
    realWorld:
      "Every DJI drone motor has a small planetary reduction. Boston Dynamics Spot's leg actuators include planetary stages. The motors inside Universal Robots cobots combine planetary gearboxes with harmonic drives. Even Tesla Model 3's motor uses planetary reduction for the wheels.",
    whyItMatters:
      "Planetary gearboxes are the workhorse reduction technology — cheaper than harmonic, smaller than parallel. Indian robotics startups source them from Maxon, Faulhaber, and increasingly Indian players like Bonfiglioli India. Selecting the right reduction is one of the most common robotics design tasks.",
    tryItYourself:
      'Buy a 12V Pololu metal-gearmotor with 30:1 planetary reduction (~₹1,000). Compare its torque against a raw motor without the gearbox — drive a small chassis and feel the difference when you grab the wheel by hand.',
    quiz: [
      {
        q: 'A planetary gearbox has these three core gear types:',
        options: ['Sun, planet, ring', 'Triangle, square, circle', 'Cog, sprocket, wheel', 'Bevel, helical, worm'],
        answer: 0,
        explain: 'Sun gear (input), planets (orbit the sun), and outer ring — the planet carrier is the output.',
      },
      {
        q: 'Why is a planetary gearbox compact for its torque?',
        options: ['It is hollow', 'Load is shared across multiple planet gears', 'It uses magnets only', 'No reason'],
        answer: 1,
        explain: 'Sharing torque across 3+ planet gears means each tooth carries less load — enabling smaller, lighter designs.',
      },
      {
        q: 'A typical single-stage planetary reduction is:',
        options: ['0.5:1', '3:1 to 100:1', '1000:1', '1:1 only'],
        answer: 1,
        explain: 'Standard single-stage planetary stages range from about 3:1 up to 100:1; multi-stage gives more.',
      },
    ],
  },
  // ===== Control Systems =====
  {
    slug: 'kalman-filter',
    title: 'Kalman Filter in Robotics — Complete Guide | R2BOT',
    description:
      "The Kalman filter optimally fuses noisy sensor data to estimate a robot's true state. Foundation of GPS+IMU fusion, SLAM, and tracking.",
    bucket: 'control-systems',
    category: 'control',
    difficulty: 'advanced',
    tags: ['kalman', 'filter', 'estimation', 'sensor-fusion', 'state'],
    relatedTerms: ['sensor-fusion', 'extended-kalman-filter', 'particle-filter', 'imu', 'gps-module'],
    youtubeSearchQuery: 'kalman filter robotics tutorial',
    definition:
      "The Kalman filter is a mathematical algorithm that combines noisy measurements with a model of how a system evolves to produce the optimal estimate of the system's true state. In robotics, it fuses GPS, IMU, encoders, and other sensors to give one clean position and velocity.",
    howItWorks:
      "At each step the filter does two things. **Predict**: it uses a motion model (e.g., constant velocity) to advance its belief forward in time, growing the uncertainty. **Update**: when a new sensor reading arrives, it computes how much to trust the reading vs the prediction (the Kalman gain) and pulls the estimate toward the measurement. The math optimally minimises mean-squared error if the system is linear and noise is Gaussian. Implementations come in under 50 lines of Python — but tuning the process and measurement covariance matrices is its own art.",
    realWorld:
      "Apollo 11's onboard computer used a Kalman filter to navigate to the Moon. Every modern drone autopilot (PX4, ArduPilot) uses one. Tesla Autopilot fuses radar, camera, and IMU with Kalman-family filters. Indian Mars Orbiter Mission used Kalman filters for its trajectory estimation.",
    whyItMatters:
      "If you want to do serious robotics — drones, autonomous cars, mobile robots — you must understand Kalman filtering. It comes up in every senior robotics interview in India. The Kalman filter is also a gateway to modern state-estimation methods like the EKF, UKF, and factor graphs.",
    tryItYourself:
      'Open `/visualizer` and load the Kalman demo: you can play with measurement noise, process noise, and watch the filter converge. Then implement a 1D position-velocity Kalman filter in Python (20 lines) on a noisy random-walk simulation.',
    quiz: [
      {
        q: 'A Kalman filter combines:',
        options: ['Two cameras only', 'A motion model with noisy measurements', 'Two batteries in parallel', 'No data at all'],
        answer: 1,
        explain: 'It fuses a predictive model with noisy sensor readings using an optimal weighting (Kalman gain).',
      },
      {
        q: 'The Kalman gain controls:',
        options: ['Sensor brightness', 'How much to trust the new measurement vs the prediction', 'Power consumption', 'Motor speed'],
        answer: 1,
        explain: 'High gain → trust the measurement more; low gain → trust the model prediction more.',
      },
      {
        q: 'Standard Kalman filtering assumes:',
        options: ['Nonlinear dynamics', 'Linear dynamics and Gaussian noise', 'Discrete-only states', 'Pure deterministic systems'],
        answer: 1,
        explain: 'The classic KF is optimal under linear dynamics and Gaussian noise — for nonlinear cases use the EKF or UKF.',
      },
    ],
  },
  {
    slug: 'extended-kalman-filter',
    title: 'Extended Kalman Filter in Robotics — Complete Guide | R2BOT',
    description:
      'The Extended Kalman Filter (EKF) handles nonlinear motion and sensor models by local linearisation. The default state estimator in drones and robots.',
    bucket: 'control-systems',
    category: 'control',
    difficulty: 'advanced',
    tags: ['ekf', 'kalman', 'nonlinear', 'state-estimation', 'sensor-fusion'],
    relatedTerms: ['kalman-filter', 'particle-filter', 'sensor-fusion', 'slam', 'visual-slam'],
    youtubeSearchQuery: 'extended kalman filter robotics tutorial',
    definition:
      "The Extended Kalman Filter (EKF) is the most-used variant of the Kalman filter in real robotics. It handles nonlinear motion models and sensor models by computing Jacobians (linear approximations) at the current estimate. Almost every drone and mobile robot in production uses an EKF.",
    howItWorks:
      "Like the standard KF, the EKF predicts and updates. But instead of multiplying with constant matrices, it computes the Jacobian of the nonlinear motion function and measurement function at the current state estimate. These Jacobians then play the role of F and H matrices in the standard KF equations. Linearisation introduces error — the EKF is no longer mathematically optimal — but for most practical robotics problems the approximation is good enough.",
    realWorld:
      "PX4 and ArduPilot drone autopilots use multi-state EKFs to fuse IMU, GPS, magnetometer, barometer, and airspeed. ORB-SLAM uses EKF-like updates. Tesla's earlier Autopilot stack relied on EKFs for sensor fusion. Indian drone startups like Garuda Aerospace tune EKFs as part of every product release.",
    whyItMatters:
      "If you ever work on a real drone or mobile robot, you will encounter EKF tuning. It is the single most common state-estimation tool deployed today. Interview questions about EKF Jacobians, divergence, and tuning are standard for senior robotics roles.",
    tryItYourself:
      'Read the PX4 ECL/EKF2 source code on GitHub — it is the production-quality EKF used in thousands of drones. Then implement a simple 2D EKF for differential-drive odometry in Python.',
    quiz: [
      {
        q: 'The EKF differs from the standard Kalman filter by:',
        options: ['Using neural networks', 'Linearising nonlinear models around the current estimate', 'Using only one sensor', 'Running on GPUs only'],
        answer: 1,
        explain: 'The EKF takes Jacobians (first-order Taylor expansion) of nonlinear functions to apply Kalman-style updates.',
      },
      {
        q: 'A common drawback of EKFs is:',
        options: ['They cannot run in real time', 'Linearisation error can cause divergence in highly nonlinear cases', 'They need a quantum computer', 'They cannot use sensors'],
        answer: 1,
        explain: 'Strong nonlinearities can make the EKF estimate drift or diverge — use UKF or particle filter then.',
      },
      {
        q: 'Which is a production drone autopilot using EKF?',
        options: ['Microsoft Word', 'PX4', 'Spotify', 'Photoshop'],
        answer: 1,
        explain: 'PX4 (and ArduPilot) ships with a multi-state EKF as the primary state estimator.',
      },
    ],
  },
  {
    slug: 'particle-filter',
    title: 'Particle Filter in Robotics — Complete Guide | R2BOT',
    description:
      'Particle filters represent uncertainty with thousands of weighted samples — perfect for nonlinear, multi-modal robot localisation problems like AMCL.',
    bucket: 'control-systems',
    category: 'control',
    difficulty: 'advanced',
    tags: ['particle-filter', 'monte-carlo', 'localisation', 'amcl', 'estimation'],
    relatedTerms: ['kalman-filter', 'extended-kalman-filter', 'amcl', 'slam', 'sensor-fusion'],
    youtubeSearchQuery: 'particle filter monte carlo localization robotics',
    definition:
      "A particle filter (Monte Carlo localisation) represents a robot's belief about its pose as a cloud of thousands of weighted samples (particles). Each particle is a hypothesis about where the robot might be; their weights encode how likely each one is given recent measurements.",
    howItWorks:
      "At each step the filter does three things. **Predict**: every particle is moved according to the motion command plus random noise — making the cloud spread. **Weigh**: every particle's weight is updated by how well its predicted sensor readings match the actual readings. **Resample**: particles with low weight are discarded and high-weight ones are duplicated, focusing the cloud on the most likely locations. Over time, the cloud collapses to the true robot pose.",
    realWorld:
      "ROS2's AMCL package (Adaptive Monte Carlo Localisation) is a particle filter used in thousands of warehouse robots. Roomba uses a particle filter to recover localisation after being picked up. Self-driving cars often run particle filters in parallel with Kalman-family filters as a backup.",
    whyItMatters:
      "Particle filters handle situations where Kalman and EKF fail: highly nonlinear maps, kidnapped-robot recovery, and ambiguous corridors. They are computationally heavier but rock-solid in the messy real world. Every senior robotics engineer should be able to explain and tune one.",
    tryItYourself:
      'Open Nav2 docs and run the AMCL tutorial in Gazebo. Pick the robot up mid-simulation (the "kidnapped robot" test) and watch the particle cloud explode and re-converge — a visceral demonstration of why particle filters matter.',
    quiz: [
      {
        q: 'A particle filter represents belief as:',
        options: ['One Gaussian', 'Many weighted sample hypotheses', 'A single number', 'A neural network only'],
        answer: 1,
        explain: 'Thousands of weighted particles approximate any (possibly multi-modal) probability distribution.',
      },
      {
        q: 'The "resample" step in a particle filter:',
        options: ['Adds new sensors', 'Duplicates high-weight particles and drops low-weight ones', 'Increases battery', 'Reduces dimension'],
        answer: 1,
        explain: 'Resampling concentrates compute on the most likely hypotheses and is the key step that keeps the filter sharp.',
      },
      {
        q: 'Particle filters beat EKFs at:',
        options: ['Battery life', 'Multi-modal and highly nonlinear distributions', 'Single-Gaussian small problems', 'Memory usage'],
        answer: 1,
        explain: 'When the belief is multi-modal (kidnapped robot, symmetric corridors), particle filters keep all hypotheses alive.',
      },
    ],
  },
  {
    slug: 'impedance-control',
    title: 'Impedance Control in Robotics — Complete Guide | R2BOT',
    description:
      'Impedance control makes a robot behave like a programmable spring-damper — essential for safe contact, manipulation, and human-robot interaction.',
    bucket: 'control-systems',
    category: 'control',
    difficulty: 'advanced',
    tags: ['impedance', 'compliance', 'contact', 'cobot', 'force-control'],
    relatedTerms: ['force-control', 'cobot', 'collaborative-robot-safety', 'feedback-loop'],
    youtubeSearchQuery: 'impedance control robotics tutorial',
    definition:
      "Impedance control programs a robot's joints to respond to external forces like a virtual spring-damper system. Push the robot and it pushes back gently; release it and it returns to position. It is the control technique that makes cobots safe to touch and surgical robots feel natural.",
    howItWorks:
      "Instead of commanding a position and resisting any disturbance (stiff position control), impedance control sets a desired mechanical impedance — virtual stiffness, damping, and inertia — between the robot's tool and the world. The controller measures actual deflection and joint torque, then commands motor currents so the robot's apparent dynamics match the desired spring-damper model. This requires torque-controllable actuators or accurate joint-torque sensors.",
    realWorld:
      "Universal Robots cobots use joint-level impedance control to stop on contact. Franka Emika Panda's torque-sensing joints make impedance control its default mode. Surgical robots use impedance control to let the surgeon feel tissue resistance. Indian academic groups at IIT Madras and IISc develop impedance-controlled prosthetics.",
    whyItMatters:
      "Without impedance control, a robot is either rigid (and dangerous in contact) or floppy (and useless for precision). Programmable compliance is the foundation of safe human-robot interaction and dexterous manipulation — both major hiring areas globally.",
    tryItYourself:
      'On a 7-DOF manipulator simulator (e.g., the Franka Panda in Gazebo), enable impedance mode and "drag" the robot end-effector. Adjust the stiffness K and damping D and feel how the robot behaves — it really does respond like a programmable spring.',
    quiz: [
      {
        q: 'Impedance control makes the robot behave like a:',
        options: ['Rigid wall', 'Programmable spring-damper system', 'Pure light source', 'Audio amplifier'],
        answer: 1,
        explain: 'The control law shapes apparent stiffness, damping, and inertia between the tool and the environment.',
      },
      {
        q: 'Impedance control is essential for which scenario?',
        options: ['Painting a flat wall in air', 'Inserting a peg into a hole with uncertain alignment', 'Charging a battery', 'Running a calculation'],
        answer: 1,
        explain: 'Compliant tasks where contact is expected — peg-in-hole, grinding, surgery — need impedance control.',
      },
      {
        q: 'Implementing impedance control usually requires:',
        options: ['No actuators', 'Joint torque control or torque sensing', 'A microwave oven', 'Compressed air only'],
        answer: 1,
        explain: 'You must be able to command motor torques (or sense them accurately) to shape impedance behaviour.',
      },
    ],
  },
  {
    slug: 'lqr-controller',
    title: 'LQR Controller in Robotics — Complete Guide | R2BOT',
    description:
      'The Linear Quadratic Regulator (LQR) computes optimal feedback gains for linear systems. Used for inverted pendulums, drones, and gimbal stabilisation.',
    bucket: 'control-systems',
    category: 'control',
    difficulty: 'advanced',
    tags: ['lqr', 'optimal-control', 'state-space', 'gain', 'stabilisation'],
    relatedTerms: ['model-predictive-control', 'pid-controller', 'state-space-control', 'feedback-loop'],
    youtubeSearchQuery: 'LQR linear quadratic regulator robotics',
    definition:
      "The Linear Quadratic Regulator (LQR) is an optimal control technique that computes the best feedback gains to balance state error against control effort. Given a linear system and a quadratic cost function, LQR solves a Riccati equation and gives you the optimal full-state feedback matrix.",
    howItWorks:
      "You start with a linear state-space model dx/dt = Ax + Bu. You pick two weighting matrices: Q penalises state error and R penalises control effort. The solution to the algebraic Riccati equation gives a matrix P from which the optimal gain K = R⁻¹BᵀP. The controller is then u = −Kx — every state variable is fed back with the right weight to minimise the cost. Tuning Q and R is the practical art: bigger Q means tighter tracking, bigger R means lower control effort.",
    realWorld:
      "Boston Dynamics Atlas and Spot use LQR-family controllers for whole-body balance. Quadcopter autopilots often use LQR for attitude stabilisation. Camera gimbal stabilisation (DJI, Insta360) uses LQR or LQR+MPC. ISRO uses LQR-derived controllers for satellite attitude control.",
    whyItMatters:
      "LQR is the gateway from PID to modern multivariable optimal control. Any robotics graduate programme and many senior roles ask about LQR design. Mastering LQR — its assumptions, limitations, and tuning — opens the door to MPC, robust control, and model-based RL.",
    tryItYourself:
      'Simulate an inverted pendulum in Python using SciPy. Compute the LQR gain using `scipy.linalg.solve_continuous_are`. Plot the pendulum stabilising with Q = diag(10,1,10,1), then try doubling each weight and watch how the response changes.',
    quiz: [
      {
        q: 'LQR finds the optimal feedback gain that minimises:',
        options: ['Time to charge a battery', 'A quadratic cost on state error and control effort', 'Camera brightness', 'Wi-Fi latency'],
        answer: 1,
        explain: 'LQR minimises ∫(xᵀQx + uᵀRu)dt — a quadratic cost trading tracking against effort.',
      },
      {
        q: 'LQR assumes the system is:',
        options: ['Highly nonlinear', 'Linear with Gaussian disturbances (for LQG)', 'Stochastic only', 'Quantum mechanical'],
        answer: 1,
        explain: 'LQR is designed around linear state-space dynamics; LQG adds Gaussian-noise estimation.',
      },
      {
        q: 'Increasing the matrix Q in LQR generally:',
        options: ['Cools the motor', 'Penalises state error more — tighter tracking, higher control effort', 'Lowers battery use', 'Has no effect'],
        answer: 1,
        explain: 'Larger Q values tell LQR you care more about tracking error than about control effort.',
      },
    ],
  },
  {
    slug: 'sliding-mode-control',
    title: 'Sliding Mode Control in Robotics — Complete Guide | R2BOT',
    description:
      'Sliding mode control drives a robot onto a chosen "sliding surface" with strong disturbance rejection. Robust but prone to chattering.',
    bucket: 'control-systems',
    category: 'control',
    difficulty: 'advanced',
    tags: ['sliding-mode', 'robust-control', 'nonlinear', 'disturbance'],
    relatedTerms: ['robust-control', 'feedback-loop', 'pid-controller', 'model-predictive-control'],
    youtubeSearchQuery: 'sliding mode control robotics tutorial',
    definition:
      "Sliding mode control is a robust nonlinear control technique that forces the system state onto a designer-chosen surface in state space, then keeps it sliding along that surface to the target. It is famously robust to large disturbances and unmodelled dynamics.",
    howItWorks:
      "First you design a sliding surface — a function s(x) that equals zero exactly when the system has the desired behaviour. Then you design a control law that drives s(x) toward zero in finite time, typically using a switching term sign(s) multiplied by a gain. Once s = 0, the system slides along the surface to the goal. The switching term gives the controller's strong robustness to disturbances but also causes 'chattering' — high-frequency oscillation around the surface — which must be mitigated with boundary layers or super-twisting algorithms.",
    realWorld:
      "Sliding-mode controllers stabilise nuclear-reactor control rods, electric-motor drives, and hydraulic manipulators. Quadcopters subject to wind gusts use sliding-mode attitude control. Tesla Model S Plaid's motor inverters use sliding-mode-derived schemes for high-bandwidth torque control.",
    whyItMatters:
      "When you cannot accurately model the system or expect heavy disturbances, sliding-mode is one of the most robust control techniques available. It is a standard topic in PhD-level robotics curricula and appears regularly in defence and aerospace robotics careers in India (DRDO, ISRO, BrahMos).",
    tryItYourself:
      'Simulate a 2nd-order system in Simulink or Python with a sliding-mode controller. Add a step disturbance and compare the response to a PID controller — feel the trade-off between robustness and chattering.',
    quiz: [
      {
        q: 'Sliding-mode control drives the system to behave along a:',
        options: ['Random path', 'Designer-chosen sliding surface in state space', 'Wi-Fi signal', 'GPS track'],
        answer: 1,
        explain: 'The designer picks s(x) and the controller forces s → 0, then keeps the system on it.',
      },
      {
        q: 'A known problem with classical sliding-mode controllers is:',
        options: ['No robustness', 'High-frequency chattering due to the switching term', 'High latency', 'High energy density'],
        answer: 1,
        explain: 'Chattering is the price of robust switching control — modern variants like super-twisting reduce it.',
      },
      {
        q: 'Sliding-mode control is most attractive when:',
        options: ['You have a perfect model', 'You expect large disturbances or unmodelled dynamics', 'There are no actuators', 'There is no feedback'],
        answer: 1,
        explain: 'Its main appeal is robustness to disturbances and modelling uncertainty.',
      },
    ],
  },
  // ===== Programming / Software =====
  {
    slug: 'ros2-parameters',
    title: 'ROS2 Parameters — Complete Guide | R2BOT',
    description:
      'ROS2 parameters let you configure nodes at runtime without recompiling. The standard way to tune gains, sensor settings, and behaviour live.',
    bucket: 'programming-software',
    category: 'control',
    difficulty: 'intermediate',
    tags: ['ros2', 'parameters', 'config', 'tuning', 'node'],
    relatedTerms: ['ros2', 'ros2-nodes', 'ros2-launch', 'ros2-services'],
    youtubeSearchQuery: 'ROS2 parameters tutorial',
    definition:
      "ROS2 parameters are typed, named configuration values that a ROS2 node exposes at runtime. Other tools can read and modify them without recompiling the node. They are the standard way to expose tunable knobs — PID gains, frame IDs, frequencies, thresholds — to operators and other software.",
    howItWorks:
      "Each node declares parameters with a default value, a type (bool, int, float, string, array), and an optional descriptor (range, read-only). The parameter daemon stores them and exposes them via a service-like API. You can list them with `ros2 param list`, get them with `ros2 param get`, and set them with `ros2 param set` — even while the node is running. Nodes can register callbacks that fire whenever a parameter changes, so runtime retuning is straightforward.",
    realWorld:
      "Every Nav2 navigation parameter — costmap inflation radius, planner tolerance, max velocity — is a ROS2 parameter. Camera drivers expose exposure and gain as parameters. ros2_control hardware drivers expose joint limits and PID gains.",
    whyItMatters:
      "ROS2 parameters separate code from configuration, making robots tunable in production without recompiling. They are a daily tool for every ROS2 engineer. Knowing how to declare, validate, and dynamically update parameters is a baseline interview expectation.",
    tryItYourself:
      "Write a simple talker node that publishes a string at a frequency configured via a parameter. Run it, then change the frequency live with `ros2 param set /talker pub_rate 5.0` and watch the output rate change.",
    quiz: [
      {
        q: 'A ROS2 parameter is best described as:',
        options: ['A compiled constant', "A node's runtime configuration value", 'A topic message', 'A USB cable'],
        answer: 1,
        explain: 'Parameters live in a running node and can be read/written via ROS2 tooling without recompiling.',
      },
      {
        q: 'You change a running parameter with:',
        options: ['ros2 topic echo', 'ros2 param set', 'ros2 launch', 'ros2 bag record'],
        answer: 1,
        explain: '`ros2 param set <node> <param> <value>` updates a parameter and triggers any registered callbacks.',
      },
      {
        q: 'A great use of parameters is:',
        options: ['Streaming high-rate sensor data', 'Tuning PID gains live', 'Sending camera images', 'Running C++ tests'],
        answer: 1,
        explain: 'Tuning controllers, thresholds, frame IDs — anything you might change at deploy time — is the right job for parameters.',
      },
    ],
  },
  {
    slug: 'ros2-launch',
    title: 'ROS2 Launch — Complete Guide | R2BOT',
    description:
      'ROS2 launch files start, configure, and monitor multiple nodes from a single command. The backbone of every real ROS2 deployment.',
    bucket: 'programming-software',
    category: 'control',
    difficulty: 'intermediate',
    tags: ['ros2', 'launch', 'python', 'orchestration', 'startup'],
    relatedTerms: ['ros2', 'ros2-nodes', 'ros2-parameters', 'ros2-composition'],
    youtubeSearchQuery: 'ROS2 launch file tutorial',
    definition:
      "A ROS2 launch file describes which nodes to start, with which parameters, in which order, and what to do when they exit. Real robots run dozens of nodes — drivers, planners, controllers, recorders — and launch files orchestrate them with one command.",
    howItWorks:
      "Launch files are written in Python (ROS2 supports XML and YAML too). You compose a `LaunchDescription` containing `Node()` actions, `IncludeLaunchDescription()` (to compose other launch files), `ExecuteProcess()` (to run shell commands), and event handlers (`OnProcessExit`, `OnShutdown`). The `ros2 launch` command runs the file, expands all variables, starts every action in the requested order, and tracks lifecycles. Arguments allow the same launch file to be reused across robots and environments.",
    realWorld:
      "Nav2 and MoveIt2 ship dozens of launch files for different robot setups. Spot, TurtleBot, GreyOrange's Butler stack — every real ROS2 robot has a top-level launch file that boots the entire system. CI pipelines use launch files to start sim-test environments.",
    whyItMatters:
      "If ROS2 nodes are the bricks of a robot, launch files are the blueprints that turn the bricks into a house. Writing clean, parametric launch files is one of the most-tested skills in ROS2 interviews.",
    tryItYourself:
      'Write a Python launch file that starts (1) a TurtleSim node and (2) a teleop_twist_keyboard node. Run with `ros2 launch your_pkg my_demo.launch.py` and drive the turtle around — your first multi-node orchestration.',
    quiz: [
      {
        q: 'ROS2 launch files are most commonly written in:',
        options: ['JSON', 'Python', 'Rust', 'Lua'],
        answer: 1,
        explain: 'Python is the default, with XML and YAML supported. Python gives full programmatic flexibility.',
      },
      {
        q: 'You start a launch file from the terminal with:',
        options: ['ros2 run', 'ros2 launch', 'ros2 topic', 'ros2 doctor'],
        answer: 1,
        explain: '`ros2 launch <package> <file>` is the standard way to run a launch description.',
      },
      {
        q: 'A great use of launch files is to:',
        options: ['Compile C++ code', 'Start multiple nodes with their parameters in one command', 'Edit videos', 'Run a database migration'],
        answer: 1,
        explain: 'Launch files orchestrate complex multi-node setups so an operator only runs one command.',
      },
    ],
  },
  {
    slug: 'ros2-tf',
    title: 'ROS2 TF (tf2) — Complete Guide | R2BOT',
    description:
      "tf2 in ROS2 tracks every coordinate frame on a robot and lets nodes transform points and poses between them. The geometry backbone of robotics.",
    bucket: 'programming-software',
    category: 'control',
    difficulty: 'intermediate',
    tags: ['ros2', 'tf2', 'transform', 'frames', 'geometry'],
    relatedTerms: ['ros2', 'ros2-urdf', 'kinematics', 'forward-kinematics', 'localisation'],
    youtubeSearchQuery: 'ROS2 tf2 transforms tutorial',
    definition:
      "tf2 (transform library version 2) is the ROS2 system for managing coordinate frames over time. Every part of a robot — the base, each joint, each sensor — has its own frame, and tf2 lets any node ask, 'where is point X in the world frame right now?' tf2 answers using broadcast transforms from all over the robot.",
    howItWorks:
      "Each rigid component publishes its pose relative to its parent on a tf topic. tf2 maintains a global tree where every node has exactly one parent, except the root (typically `map`). A query like 'point in base_link frame, expressed in map frame at time t' walks the tree and chains transformations using interpolation in time. Static transforms (like sensor mounting) are published once. Dynamic transforms (like joint rotations or robot pose) are published continuously.",
    realWorld:
      "On a Spot robot, tf tracks `map → odom → base_link → leg_<id>_hip → ...` for every leg link. Every camera publishes its frame so you can project pixels back into world coordinates. Nav2 path planners rely entirely on tf to know where the robot and goals are.",
    whyItMatters:
      "Coordinate frames are where 90% of robotics bugs happen. Mastering tf2 — broadcasters, listeners, static vs dynamic, time-interpolation — is non-negotiable. Every ROS2 interview will probe your tf knowledge.",
    tryItYourself:
      "In a TurtleSim setup, launch the 'tf2 turtle demo' that has turtle1 chase turtle2. Visualise the transforms in RViz2, change which turtle is the parent frame, and watch the tree update live.",
    quiz: [
      {
        q: 'tf2 tracks:',
        options: ['Battery state of charge', 'Coordinate frame transforms over time', 'Audio streams', 'Topic latency only'],
        answer: 1,
        explain: 'tf2 maintains a tree of frames and their poses, queryable across time.',
      },
      {
        q: 'Every node in a tf2 tree has:',
        options: ['Multiple parents', 'Exactly one parent (except the root)', 'No relationships', 'A separate tree of its own'],
        answer: 1,
        explain: 'tf trees are strict — one parent per frame — which keeps lookups unambiguous.',
      },
      {
        q: 'A static transform is best used for:',
        options: ['Robot wheel rotation', 'Camera mounted rigidly on the chassis', 'Hour of the day', 'Battery voltage'],
        answer: 1,
        explain: 'Static transforms are for fixed offsets (mounting positions) that never change at runtime.',
      },
    ],
  },
  {
    slug: 'ros2-urdf',
    title: 'ROS2 URDF — Complete Guide | R2BOT',
    description:
      "URDF (Unified Robot Description Format) describes a robot's links, joints, and visuals as XML. The standard way to model robots in ROS2 + Gazebo.",
    bucket: 'programming-software',
    category: 'control',
    difficulty: 'intermediate',
    tags: ['urdf', 'ros2', 'xml', 'simulation', 'description'],
    relatedTerms: ['ros2', 'ros2-tf', 'gazebo-simulation', 'kinematics', 'forward-kinematics'],
    youtubeSearchQuery: 'ROS2 URDF robot description tutorial',
    definition:
      "URDF (Unified Robot Description Format) is an XML format that describes a robot's physical structure — its links (rigid parts), joints (how they connect and move), masses, visuals, and collision shapes. It is the standard input for ROS2 visualisation, simulation, and motion planning.",
    howItWorks:
      "A URDF file lists `<link>` elements (each with inertial, visual, and collision children) and `<joint>` elements (each with parent, child, type — fixed, revolute, prismatic, etc. — and limits). Robot State Publisher reads the URDF and `joint_states` topic, then publishes a tf tree describing exactly where every link is in space. The same URDF feeds Gazebo for physics, RViz2 for visualisation, MoveIt2 for motion planning, and Webots/Isaac Sim for advanced simulation. Modern projects use Xacro (XML macro) to compose URDFs from parametric building blocks.",
    realWorld:
      "Every ROS2-compatible robot ships a URDF: TurtleBot4, Spot, Universal Robots UR5, Franka Panda. Indian academic robots (the IIT Madras swimming robot, IISc humanoid leg) all have URDFs. Even tutorials on R2BOT's Academy include URDFs you can load in the Visualizer.",
    whyItMatters:
      "Without a URDF, your robot cannot be simulated, visualised, or motion-planned in ROS2. Reading and writing URDF is a daily skill. Knowing how to debug `<inertial>` blocks (zero mass, wrong CoG) is essential — most simulation problems trace back to bad URDF.",
    tryItYourself:
      'Write a minimal URDF with one base link and one wheel joint. Load it with `ros2 launch urdf_tutorial display.launch.py model:=my_robot.urdf`, open RViz2, and move the wheel slider to see it spin live. Then expand to a full differential-drive robot.',
    quiz: [
      {
        q: 'URDF is written in which format?',
        options: ['Binary protobuf', 'XML', 'Markdown', 'YAML only'],
        answer: 1,
        explain: 'URDF is XML — typically generated from Xacro macros for parametric robot descriptions.',
      },
      {
        q: 'Which is NOT a typical URDF element?',
        options: ['<link>', '<joint>', '<sensor>', '<sql>'],
        answer: 3,
        explain: 'URDF has links and joints; sensors can be added but `<sql>` is not part of the schema.',
      },
      {
        q: 'A URDF feeds which of the following tools?',
        options: ['Photoshop', 'RViz2, Gazebo, MoveIt2', 'Excel', 'GarageBand'],
        answer: 1,
        explain: 'URDF is the shared description used across the entire ROS2 simulation and planning stack.',
      },
    ],
  },
  {
    slug: 'docker-robotics',
    title: 'Docker for Robotics — Complete Guide | R2BOT',
    description:
      'Docker containerises ROS2 stacks for reproducible robot deployment. Used by GreyOrange, Boston Dynamics, and every modern robotics team.',
    bucket: 'programming-software',
    category: 'control',
    difficulty: 'intermediate',
    tags: ['docker', 'container', 'devops', 'ros2', 'deployment'],
    relatedTerms: ['ros2', 'ci-cd-robotics', 'gazebo-simulation', 'sim-to-real'],
    youtubeSearchQuery: 'docker ROS2 robotics tutorial',
    definition:
      "Docker is a container technology that packages an application — your ROS2 stack, drivers, dependencies — into a self-contained image. The image runs identically on your laptop, your CI server, and the robot's onboard computer. In robotics it is the standard way to ship and deploy.",
    howItWorks:
      "You write a `Dockerfile` that starts from a base image (e.g., `ros:humble`), installs your dependencies, copies your code, and sets entry-point commands. `docker build` produces an image, `docker run` runs a container from that image with isolated filesystem and processes but shared kernel. ROS2's official images, multi-stage builds, and docker-compose make it routine to spin up a full sim+robot+test stack with one command. Devices like cameras and lidars pass through with `--device` flags.",
    realWorld:
      "GreyOrange ships Butler firmware updates as Docker images. PX4 SITL (software-in-the-loop) drone simulation runs in Docker. Most Indian robotics startups use Docker for both their CI and their on-robot deployment. Cloud robotics platforms (AWS RoboMaker, Husarnet) are built on Docker.",
    whyItMatters:
      "Without containerisation, 'it works on my laptop' becomes 'it crashes on the robot.' Modern robotics hires assume Docker fluency — building images, debugging container networking, and using docker-compose. Senior robotics engineers in India routinely architect multi-stage Docker pipelines for their teams.",
    tryItYourself:
      'Clone a ROS2 demo repo. Write a Dockerfile starting from `ros:humble` that copies your workspace, runs `colcon build`, and sources the install. Build with `docker build -t my-ros2-app .` and run interactively to launch your nodes — full ROS2 stack in 30 lines.',
    quiz: [
      {
        q: 'Docker primarily provides:',
        options: ['Full virtual machines', 'Lightweight, reproducible application containers', 'Free GPUs', 'A new programming language'],
        answer: 1,
        explain: 'Containers share the host kernel but isolate filesystem and processes — much lighter than full VMs.',
      },
      {
        q: 'A Dockerfile is:',
        options: ['A spreadsheet', 'A script of build instructions for an image', 'An audio recording', 'A 3D model'],
        answer: 1,
        explain: 'It is a layered instruction list — each command becomes a cached layer in the resulting image.',
      },
      {
        q: 'For ROS2 on a robot, Docker most helps with:',
        options: ['Painting the chassis', 'Reproducible dependencies and consistent deployment', 'Making the robot heavier', 'Removing the OS'],
        answer: 1,
        explain: 'Same image on dev, CI, and robot — the standard cure for "works on my laptop".',
      },
    ],
  },
];
