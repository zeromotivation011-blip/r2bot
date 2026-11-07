// Quick Lessons: one page per R2BOT YouTube Short topic, grouped into 5 quick courses.
// Each lesson: embedded Short(s), animated demo, plain-English explanation,
// "with it / without it", 1 quiz question, and links into the Atlas.

export type DemoKind = 'echo' | 'feedback' | 'gears' | 'tilt' | 'loop'

export interface ShortLesson {
  slug: string
  title: string
  course: string
  ids: string[] // YouTube Short IDs (first is primary)
  summary: string
  what: string[]
  withIt: string
  without: string
  limit: string
  demo: DemoKind
  loop?: [string, string, string] // sense / think / act labels (for demo 'loop')
  quiz: { q: string; options: [string, string, string]; answer: 0 | 1 | 2; why: string }
  atlas: { label: string; href: string }[]
  next?: string // related lesson slug
}

export interface ShortCourse { slug: string; title: string; blurb: string; icon: string }

export const SHORT_COURSES: ShortCourse[] = [
  { slug: 'senses', title: 'How Robots Sense', blurb: 'Sound, sight, hearing and balance sensing.', icon: '👁️' },
  { slug: 'motion', title: 'Motors and Mechanics', blurb: 'Gears, servos, arms and precise repeating.', icon: '⚙️' },
  { slug: 'control', title: 'Control and Balance', blurb: 'Feedback, staying upright, following a line.', icon: '🎛️' },
  { slug: 'hands', title: 'Hands and Touch', blurb: 'Gentle grips, prosthetics and surgical robots.', icon: '🖐️' },
  { slug: 'work', title: 'Robots at Work', blurb: 'Vacuums, warehouses and the stairs problem.', icon: '🏭' },
]

export const SHORTS: ShortLesson[] = [
  {
    slug: 'ultrasonic-sensor', title: 'Ultrasonic Sensor: How Robots Measure Distance With Sound', course: 'senses',
    ids: ['wGC41VivXBw', 'co0tT68HQlo'],
    summary: 'A robot sends out a burst of sound you cannot hear, waits for the echo, and turns the waiting time into distance.',
    what: [
      'An ultrasonic sensor sends a very short burst of high-pitched sound, far above what people can hear. The sound hits an object and bounces back. The sensor measures how long that round trip took.',
      'Sound travels at about 343 metres per second in room-temperature air. Distance equals speed times time, divided by two, because the sound went there and back.',
    ],
    withIt: 'A small robot can stop before a wall, keep a steady gap behind a person, or park itself, for just a few dollars of hardware.',
    without: 'The robot would only learn about a wall by crashing into it. Bumpers help, but they react after the hit.',
    limit: 'Soft materials like curtains absorb sound, and sloped surfaces bounce it away, so the echo can be weak or missing.',
    demo: 'echo',
    quiz: { q: 'Why does the robot divide the echo time by two?', options: ['Sound travels slower on the way back', 'The sound went to the object and back', 'The sensor has two speakers'], answer: 1, why: 'The measured time covers the trip there and the trip back, but distance only needs one way.' },
    atlas: [{ label: 'Ultrasonic sensor', href: '/atlas/concept/ultrasonic-sensor' }, { label: 'Lidar vs ultrasonic: path planning', href: '/atlas/concept/path-planning' }],
    next: 'computer-vision',
  },
  {
    slug: 'computer-vision', title: 'Computer Vision: How Robots Recognise What They See', course: 'senses',
    ids: ['fOAbg-PVjJ8', '3IXba6dOQnY'],
    summary: 'A camera gives a robot a grid of numbers. Software finds edges, shapes and finally objects in those numbers.',
    what: [
      'To a robot, a photo is just a big grid of brightness and colour numbers. Computer vision looks for patterns in that grid: edges first, then shapes, then whole objects such as a cup or a person.',
      'Modern systems learn these patterns from many labelled example images instead of hand-written rules.',
    ],
    withIt: 'A robot can sort parcels, spot a ripe fruit, read a sign or find the cup it needs to pick up, without a fixed position for everything.',
    without: 'The robot must be told exactly where everything is. Move the cup two centimetres and it misses.',
    limit: 'Bad lighting, glare or an unusual angle can fool a vision system that worked fine in the lab.',
    demo: 'loop', loop: ['Camera captures pixels', 'Model finds the object', 'Arm moves to it'],
    quiz: { q: 'What does a camera first give the robot?', options: ['A list of object names', 'A grid of numbers', 'A 3D map'], answer: 1, why: 'Pixels are numbers. Recognition is the software work that comes after.' },
    atlas: [{ label: 'Computer vision', href: '/atlas/concept/computer-vision' }, { label: 'Object detection', href: '/atlas/concept/object-detection' }],
    next: 'wake-word',
  },
  {
    slug: 'wake-word', title: 'How a Smart Speaker Hears Its Wake Word', course: 'senses',
    ids: ['bL-uKYP7ReM'],
    summary: 'A tiny always-on model listens for one sound pattern. Only after it matches does the bigger system wake up.',
    what: [
      'A smart speaker does not run its full assistant all the time. A very small model, using little power, listens only for the pattern of its wake word.',
      'When that small model is confident it heard the pattern, it wakes the larger speech system that understands the rest of your sentence.',
    ],
    withIt: 'The device can stay on all day on little power and respond hands-free.',
    without: 'It would need a button press, or it would have to run the heavy speech model constantly, which drains power.',
    limit: 'It sometimes wakes on similar-sounding words, or misses the wake word in a noisy room.',
    demo: 'loop', loop: ['Small model listens', 'Pattern matches wake word', 'Full assistant wakes up'],
    quiz: { q: 'Why use a very small model for the wake word?', options: ['It can run all day on little power', 'It understands full sentences', 'It needs no microphone'], answer: 0, why: 'Always-on listening has to be cheap. The heavy model only runs after the small one triggers.' },
    atlas: [{ label: 'Speech recognition', href: '/atlas/concept/speech-recognition' }],
    next: 'gyroscope-imu',
  },
  {
    slug: 'gyroscope-imu', title: 'Gyroscope and IMU: How a Robot Feels Tilt and Balances', course: 'senses',
    ids: ['URfcYDXy-CY', '8NtyoSIGkYo'],
    summary: 'An IMU combines a gyroscope and an accelerometer so a robot can tell how it is tilted and how fast it is turning.',
    what: [
      'A gyroscope measures how fast something rotates. An accelerometer measures acceleration, including the pull of gravity, which tells you which way is down.',
      'Together they form an IMU. Mixing both readings (sensor fusion) gives a steady estimate of tilt that is better than either sensor alone.',
    ],
    withIt: 'A balancing robot, drone or phone knows its angle many times per second and can correct before it falls.',
    without: 'The robot is blind to tilt. It only finds out it is falling when it hits the ground.',
    limit: 'A gyroscope slowly drifts over time, and an accelerometer is noisy when the robot is moving. That is why we fuse them.',
    demo: 'tilt',
    quiz: { q: 'What is the main problem with using a gyroscope alone?', options: ['It drifts over time', 'It cannot sense rotation', 'It only works outdoors'], answer: 0, why: 'Small errors add up as the gyro adds up rotation, so the angle slowly wanders.' },
    atlas: [{ label: 'Gyroscope', href: '/atlas/concept/gyroscope' }, { label: 'IMU', href: '/atlas/concept/imu' }, { label: 'Kalman filter', href: '/atlas/concept/kalman-filter' }],
    next: 'gears',
  },
  {
    slug: 'gears', title: 'Gears Explained: How a Tiny Motor Gets Strong', course: 'motion',
    ids: ['vV2Rkl7lvqg', 'k-sstz1nN04'],
    summary: 'Gears trade speed for turning force. A small fast motor plus a gear reduction becomes a slow, strong joint.',
    what: [
      'A small motor spins fast but with little turning force (torque). A gear reduction connects a small gear on the motor to a bigger gear on the output.',
      'With a 10 to 1 reduction, the output turns about ten times slower and, ignoring losses, with about ten times the torque. Real gearboxes lose some of it as friction.',
    ],
    withIt: 'A palm-sized motor can lift a robot arm, drive a wheel up a slope or hold a joint steady.',
    without: 'The motor alone spins quickly but stalls under load, so the arm would not lift its own weight.',
    limit: 'More reduction means slower motion, and gears add backlash (a little play) and friction.',
    demo: 'gears',
    quiz: { q: 'A motor spins at 3000 rpm through a 10:1 reduction. About how fast is the output?', options: ['30000 rpm', '300 rpm', '3000 rpm'], answer: 1, why: 'A reduction divides speed. 3000 divided by 10 is 300 rpm, with more torque in return.' },
    atlas: [{ label: 'Gear ratio', href: '/atlas/concept/gear-ratio' }, { label: 'Torque', href: '/atlas/concept/torque' }, { label: 'Planetary gearbox', href: '/atlas/concept/planetary-gearbox' }],
    next: 'servo-motor',
  },
  {
    slug: 'servo-motor', title: 'Servo Motor Explained: How a Robot Arm Stops at an Angle', course: 'motion',
    ids: ['fu8Y2N4_LeI', 'blVSEHl01bQ'],
    summary: 'A servo is a motor with a position sensor and a control loop. You ask for an angle and it keeps correcting until it gets there.',
    what: [
      'A plain motor just spins when powered. A servo adds a sensor that reports its angle and a small controller that compares the angle with the target.',
      'If the shaft is short of the target the controller drives it forward. If it overshoots, it pulls back. This repeats very quickly until the error is nearly zero.',
    ],
    withIt: 'You can say "go to 90 degrees" and the joint goes there and holds, even if something pushes on it.',
    without: 'A plain motor has no idea where it is. You could only guess angles by timing, and any push or heavy load would ruin it.',
    limit: 'Too strong a correction makes it shake or overshoot. Tuning the controller matters.',
    demo: 'feedback',
    quiz: { q: 'What does a servo have that a plain motor lacks?', options: ['A position sensor and control loop', 'More magnets', 'A larger battery'], answer: 0, why: 'The sensor plus loop is what lets it hold a commanded angle.' },
    atlas: [{ label: 'Servo motor', href: '/atlas/concept/servo-motor' }, { label: 'PID controller', href: '/atlas/concept/pid-controller' }, { label: 'Encoder', href: '/atlas/concept/encoder' }],
    next: 'robot-arm-six-motors',
  },
  {
    slug: 'robot-arm-six-motors', title: 'How a Robot Arm Picks Up a Cup (6 Motors, Explained Simply)', course: 'motion',
    ids: ['3GP1b9zaNMk'],
    summary: 'Six joints let a gripper reach any point and turn to any angle. Software works out how much each joint must move.',
    what: [
      'To place a gripper anywhere in 3D space you need three numbers for position. To also point it the right way you need three more for orientation. That is why many arms have six joints.',
      'The controller solves the reverse problem, called inverse kinematics: given where the hand should be, what angle should each joint take?',
    ],
    withIt: 'The arm can reach around a cup and grip it from the side or from above, the way a person would.',
    without: 'With fewer joints the hand can reach a point but not always at the right angle, so some objects cannot be grasped.',
    limit: 'Some arm poses are singular, meaning the arm loses a direction of motion, and planning has to avoid them.',
    demo: 'loop', loop: ['Camera finds the cup', 'Inverse kinematics picks joint angles', 'Six motors move and grip'],
    quiz: { q: 'Why do many arms have six joints?', options: ['Three for position, three for orientation', 'Six is cheaper to build', 'Two per axis for strength'], answer: 0, why: 'Reaching a point and facing the right way are six separate numbers.' },
    atlas: [{ label: 'Inverse kinematics', href: '/atlas/concept/inverse-kinematics' }, { label: 'Gripper', href: '/atlas/concept/gripper' }, { label: 'Grasp planning', href: '/atlas/concept/grasp-planning' }],
    next: 'repeatability',
  },
  {
    slug: 'repeatability', title: 'Why Are Robots So Good at Repeating?', course: 'motion',
    ids: ['66ULIR7Z7w4'],
    summary: 'A robot stores a position as numbers and checks sensors every cycle, so it returns to the same spot again and again without getting tired.',
    what: [
      'People drift when tired or distracted. A robot saves a target as exact joint angles and uses sensors to correct small errors in every motion.',
      'Industrial arms are specified for repeatability, often a fraction of a millimetre, which is why they are used for welding, assembly and testing.',
    ],
    withIt: 'A factory can make the thousandth part identical to the first one.',
    without: 'Quality would vary from person to person and hour to hour, and fine work like placing tiny chips would be hard.',
    limit: 'Repeatable is not the same as accurate. A robot can repeat the same wrong position perfectly until it is calibrated.',
    demo: 'loop', loop: ['Read joint sensors', 'Compare with saved target', 'Correct and move'],
    quiz: { q: 'Which is true?', options: ['Repeatable always means accurate', 'A robot can repeat the same wrong position', 'Robots never need calibration'], answer: 1, why: 'Repeatability is consistency. Accuracy is hitting the true target, which needs calibration.' },
    atlas: [{ label: 'Encoder', href: '/atlas/concept/encoder' }, { label: 'Servo motor', href: '/atlas/concept/servo-motor' }],
    next: 'feedback-control',
  },
  {
    slug: 'feedback-control', title: 'Feedback Control Explained: How Cruise Control Works', course: 'control',
    ids: ['RlCZAYFErQc', '-6OpSCTWsJE'],
    summary: 'Measure, compare with the goal, correct, repeat. Cruise control and robots use the same loop.',
    what: [
      'Cruise control measures your speed, compares it with the speed you set, and changes the throttle by the difference. Going uphill slows the car, so the error grows and the throttle opens more.',
      'This is closed-loop control. A PID controller is the most common version, mixing the present error, its history and how fast it is changing.',
    ],
    withIt: 'A system holds a target despite hills, wind, load or wear, because it keeps correcting.',
    without: 'Open-loop control just sets a fixed output and hopes. Any hill, bump or battery drop and it misses the target.',
    limit: 'A correction that is too aggressive makes the system oscillate. Too gentle and it is slow.',
    demo: 'feedback',
    quiz: { q: 'What does closed-loop control use that open-loop does not?', options: ['A measurement of the result', 'A bigger motor', 'More power'], answer: 0, why: 'Feeding the measured result back is what lets it correct errors.' },
    atlas: [{ label: 'Feedback loop', href: '/atlas/concept/feedback-loop' }, { label: 'PID controller', href: '/atlas/concept/pid-controller' }],
    next: 'line-follower',
  },
  {
    slug: 'line-follower', title: 'Line Follower Robot: How It Follows a Line', course: 'control',
    ids: ['wblsA_LDbzc', 'bNoJH3yCzaA'],
    summary: 'Two light sensors see dark line or bright floor. If the line drifts to one side, the robot steers toward it.',
    what: [
      'Infrared sensors under the robot report dark or light. If the left sensor sees the line, the robot turns left. If the right sees it, it turns right. If both see floor, it keeps straight.',
      'Better versions use several sensors and measure how far off the line they are, then steer in proportion. That is feedback control again.',
    ],
    withIt: 'A cheap robot can follow a route in a factory floor or a school contest with no camera at all.',
    without: 'Driving straight and hoping would lose the line at the first bend.',
    limit: 'Shiny floors, sharp corners and high speed can cause it to lose the line.',
    demo: 'loop', loop: ['Sensors read dark or light', 'Decide which side is off', 'Steer wheels to correct'],
    quiz: { q: 'The left sensor sees the line. What should the robot do?', options: ['Turn left', 'Turn right', 'Stop forever'], answer: 0, why: 'The line has drifted to the left, so steering left puts it back over the line.' },
    atlas: [{ label: 'PID controller', href: '/atlas/concept/pid-controller' }, { label: 'DC motor', href: '/atlas/concept/dc-motor' }, { label: 'Motor driver', href: '/atlas/concept/motor-driver' }],
    next: 'balance-moving-bus',
  },
  {
    slug: 'balance-moving-bus', title: "Why You Don't Fall in a Moving Bus (And Robots Do)", course: 'control',
    ids: ['Njlr1ldKoYI'],
    summary: 'Your inner ear and muscles correct your balance constantly without you noticing. A robot must be built to do the same.',
    what: [
      'When a bus brakes, your body tends to keep moving forward. Your inner ear senses the change and your muscles lean you back, all in a fraction of a second.',
      'A robot only does this if it has a tilt sensor and a controller that reacts quickly enough. Without them, a small push becomes a fall.',
    ],
    withIt: 'A robot with an IMU and a fast loop can stay upright on a moving platform or after a shove.',
    without: 'An upright robot is like a pencil on its tip. It stays up only if something keeps correcting it.',
    limit: 'If the correction is late or too weak, the fall wins. Speed of the control loop matters.',
    demo: 'tilt',
    quiz: { q: 'What do you and a balancing robot both need to stay upright?', options: ['A tilt sense and fast correction', 'Heavy feet only', 'A wide base only'], answer: 0, why: 'Sensing tilt and correcting quickly is the common recipe.' },
    atlas: [{ label: 'IMU', href: '/atlas/concept/imu' }, { label: 'Zero moment point', href: '/atlas/concept/zero-moment-point' }],
    next: 'boston-dynamics-balance',
  },
  {
    slug: 'boston-dynamics-balance', title: 'How Boston Dynamics Robots Keep Their Balance', course: 'control',
    ids: ['-5xwW9hLVCg'],
    summary: 'Legged robots sense their body tilt and joint positions many times per second and keep shifting weight and placing feet to stay up.',
    what: [
      'Robots such as Spot and Atlas combine an IMU, joint sensors and sometimes cameras. A controller predicts where the body is heading and decides where each foot should land.',
      'Walking is controlled falling. The robot keeps catching itself with each step.',
    ],
    withIt: 'A legged robot can walk on rough ground, recover from a slip and go where wheels cannot.',
    without: 'It would fall at the first uneven step or push.',
    limit: 'Slippery or unseen ground, and very large pushes, can still topple them.',
    demo: 'tilt',
    quiz: { q: 'Walking is best described as...', options: ['Controlled falling and catching', 'Standing perfectly still', 'Sliding on wheels'], answer: 0, why: 'Each step catches the body that is leaning forward.' },
    atlas: [{ label: 'Spot', href: '/atlas/robot/spot' }, { label: 'Atlas', href: '/atlas/robot/atlas' }, { label: 'Zero moment point', href: '/atlas/concept/zero-moment-point' }],
    next: 'robot-hand-egg',
  },
  {
    slug: 'robot-hand-egg', title: 'How a Robot Hand Holds an Egg Without Crushing It', course: 'hands',
    ids: ['OwaCw9_n66c'],
    summary: 'Touch and force sensors tell the hand how hard it is squeezing. The controller stops tightening at just enough force.',
    what: [
      'A hand that only knows position will squeeze until the fingers stop, which can break an egg. Force or tactile sensors measure the squeeze directly.',
      'The controller tightens until it feels firm contact, watches for slipping, and tightens only a little more if the object starts to slide.',
    ],
    withIt: 'Robots can handle eggs, fruit and glass, and adapt when the object is heavier or slipperier than expected.',
    without: 'Too little force drops the object, too much crushes it. Without touch it is pure guesswork.',
    limit: 'Good touch sensors are costly and delicate, which is why many robots still use simple grippers.',
    demo: 'loop', loop: ['Touch sensor reads force', 'Decide: tighter, looser or hold', 'Fingers adjust grip'],
    quiz: { q: 'What stops the hand from crushing the egg?', options: ['Force sensing feedback', 'A heavier arm', 'Faster motors'], answer: 0, why: 'Reading the force lets the controller stop at just enough.' },
    atlas: [{ label: 'Tactile sensor', href: '/atlas/concept/tactile-sensor' }, { label: 'Force sensor', href: '/atlas/concept/force-sensor' }, { label: 'Gripper', href: '/atlas/concept/gripper' }],
    next: 'prosthetic-hands',
  },
  {
    slug: 'prosthetic-hands', title: 'Why Robotic and Prosthetic Hands Are So Hard to Build', course: 'hands',
    ids: ['cSdg-BTRrWE'],
    summary: 'A human hand packs many joints, strong tendons, fine touch and quick control into a tiny space. Matching that is very hard.',
    what: [
      'The human hand has around twenty-seven degrees of freedom, powered by muscles mostly in the forearm, with thousands of touch receptors in the fingertips.',
      'Robot and prosthetic hands must fit motors, sensors, wiring and batteries into a similar size and weight, while the user needs a simple way to control them, often through muscle signals.',
    ],
    withIt: 'Better hands restore daily tasks such as holding a cup or turning a key, and allow robots to use human tools.',
    without: 'Simple hooks and two-finger grippers can only do a few tasks.',
    limit: 'Weight, battery life, cost, touch feedback and intuitive control are still open problems.',
    demo: 'loop', loop: ['Muscle signal or command', 'Controller picks a grip', 'Fingers close with feedback'],
    quiz: { q: 'Which makes prosthetic hands hard?', options: ['Fitting many joints, sensors and power into a small light hand', 'Hands need no control', 'Fingers never move'], answer: 0, why: 'The size and weight limit, plus natural control and touch, are the core challenges.' },
    atlas: [{ label: 'Tactile sensor', href: '/atlas/concept/tactile-sensor' }, { label: 'Gripper', href: '/atlas/concept/gripper' }],
    next: 'surgical-robots',
  },
  {
    slug: 'surgical-robots', title: 'Why Surgical Robots Never Shake', course: 'hands',
    ids: ['9gYs4ueBsNk'],
    summary: 'A surgeon controls the robot from a console. The system filters out hand tremor and scales big hand motions into tiny precise ones.',
    what: [
      'In systems like the da Vinci, the surgeon moves controls at a console and the robot arms copy the motion inside the patient. The robot does not operate by itself.',
      'Software removes small shakes and can scale movement, for example turning a centimetre of hand motion into a few millimetres at the tool.',
    ],
    withIt: 'Surgeons can work through tiny cuts with steadier, more precise motion and a magnified 3D view.',
    without: 'Natural hand tremor limits how fine the work can be, and open surgery needs larger cuts.',
    limit: 'The systems are expensive and need training. The surgeon remains in charge.',
    demo: 'loop', loop: ['Surgeon moves the controls', 'Software removes tremor and scales motion', 'Robot arm moves the tool'],
    quiz: { q: 'Who decides what a surgical robot does?', options: ['The surgeon at the console', 'The robot alone', 'The patient'], answer: 0, why: 'These are teleoperated systems. The robot assists, the surgeon directs.' },
    atlas: [{ label: 'Surgical robot', href: '/atlas/concept/surgical-robot' }, { label: 'da Vinci system', href: '/atlas/robot/da-vinci-surgical-system' }, { label: 'Teleoperation', href: '/atlas/concept/teleoperation' }],
    next: 'robot-vacuum-docking',
  },
  {
    slug: 'robot-vacuum-docking', title: 'How a Robot Vacuum Finds Its Charging Dock', course: 'work',
    ids: ['I9Ug-KUZCX8', 'L1p3OfuV1nA'],
    summary: 'The dock sends a signal the robot can detect. When the battery runs low, the robot heads toward that signal and lines up.',
    what: [
      'Many docks send out infrared signals. The robot turns until it picks up the signal, drives toward it and adjusts left or right until the charging contacts meet.',
      'Robots that build a map also remember where the dock is and navigate back to it.',
    ],
    withIt: 'The robot cleans on its own, recharges, and goes back to work without you.',
    without: 'It would run flat somewhere in the room and wait for you to carry it back.',
    limit: 'Clutter, dark corners or a dock in a bad spot can make it miss on the first try.',
    demo: 'loop', loop: ['Battery low, search for dock signal', 'Steer toward the strongest signal', 'Align and connect to charge'],
    quiz: { q: 'How does the vacuum know where to dock?', options: ['It detects a signal from the dock or remembers its map', 'It guesses randomly', 'You press a button each time'], answer: 0, why: 'Dock signals and stored maps are the common methods.' },
    atlas: [{ label: 'SLAM', href: '/atlas/concept/slam' }, { label: 'Odometry', href: '/atlas/concept/odometry' }],
    next: 'vacuum-corners',
  },
  {
    slug: 'vacuum-corners', title: 'Why Robot Vacuums Always Miss the Corner', course: 'work',
    ids: ['6drkA0mYbNE', 'awAFomLnKrw'],
    summary: 'A round robot cannot fit into a square corner, and its sensors see less right at the wall. Side brushes only partly fix it.',
    what: [
      'A circle can touch a wall only at one point, so it leaves the corner gap. Many vacuums add a side brush to sweep dirt toward the middle.',
      'Close to a wall some sensors have a blind spot, so the robot slows and keeps a small safe distance to avoid bumping.',
    ],
    withIt: 'A round body can spin on the spot and escape from tight places without getting stuck.',
    without: 'A square robot would cover corners better but could jam when it turns near furniture.',
    limit: 'Design is a trade-off. Some newer vacuums use D-shaped or extending-arm designs to reach corners.',
    demo: 'loop', loop: ['Sensors see the wall ahead', 'Plan a safe turn', 'Round body turns and brush sweeps'],
    quiz: { q: 'Why does a round robot miss corners?', options: ['A circle cannot fill a square corner', 'It is too slow', 'It has no motor'], answer: 0, why: 'The curved body touches walls at a point and leaves a gap.' },
    atlas: [{ label: 'Path planning', href: '/atlas/concept/path-planning' }],
    next: 'warehouse-robots',
  },
  {
    slug: 'warehouse-robots', title: 'How Warehouse Robots Avoid Crashing Into Each Other', course: 'work',
    ids: ['HH9jQRvpX2o'],
    summary: 'A central planner gives each robot a route and reserves the path in time, like air traffic control, while on-board sensors handle surprises.',
    what: [
      'In a busy warehouse hundreds of robots share the floor. A fleet manager plans routes so two robots never need the same spot at the same time, and assigns who goes first at crossings.',
      'Each robot also has its own sensors so it can stop if a person or an unexpected object appears.',
    ],
    withIt: 'Goods move around the clock with little waiting and few collisions.',
    without: 'Robots would jam at crossings or collide, and the whole floor could gridlock.',
    limit: 'If communication fails or plans change fast, robots may wait or need re-planning.',
    demo: 'loop', loop: ['Fleet planner assigns routes', 'Reserve crossing times', 'Robots move and stop if blocked'],
    quiz: { q: 'What is the central planner like?', options: ['Air traffic control', 'A vacuum cleaner', 'A camera'], answer: 0, why: 'It schedules paths in space and time so robots do not meet.' },
    atlas: [{ label: 'Warehouse robot', href: '/atlas/concept/warehouse-robot' }, { label: 'Kiva warehouse robots', href: '/atlas/robot/kiva-warehouse-robots' }, { label: 'Path planning', href: '/atlas/concept/path-planning' }],
    next: 'stairs',
  },
  {
    slug: 'stairs', title: 'Why Robots Still Struggle to Climb Stairs', course: 'work',
    ids: ['0gXGsxcesws'],
    summary: 'Stairs need 3D sensing, careful foot placement, balance and strong joints all at once. Wheels cannot do it, and legs are hard.',
    what: [
      'A robot has to see the step height and depth, place a foot on the edge safely, shift its weight and push up, without losing balance if it misjudges by a little.',
      'Stairs differ from house to house, with different heights, slippery edges and handrails, so a trick that works on one set may fail on another.',
    ],
    withIt: 'A robot that handles stairs can work in ordinary homes and buildings, not only on flat floors.',
    without: 'It stays on one level and needs ramps or lifts.',
    limit: 'Legged robots do climb stairs now, but doing it reliably in any building is still hard.',
    demo: 'tilt',
    quiz: { q: 'Why do stairs need more than wheels?', options: ['Wheels cannot step up vertical edges', 'Stairs are too wide', 'Stairs need no sensing'], answer: 0, why: 'Standard wheels cannot lift over a step. Legs or special mechanisms are needed.' },
    atlas: [{ label: 'Humanoid robot', href: '/atlas/concept/humanoid-robot' }, { label: 'Zero moment point', href: '/atlas/concept/zero-moment-point' }],
    next: 'ultrasonic-sensor',
  },
]

export const getShort = (slug: string) => SHORTS.find((s) => s.slug === slug)
export const shortsInCourse = (c: string) => SHORTS.filter((s) => s.course === c)
