// Quick Lessons batch 4 (English): the 36 Shorts that were uploaded privately
// and held until their lesson pages existed (task 56, built 25 Nov 2026).
//
// Each Short goes public on YouTube at the slot in its `publishAt` (two a day,
// 15:00 and 18:00 UTC, continuing the channel's schedule in autopilot.yt_plan).
// Until then the page exists, so the link already printed in each Short's
// description works, but it is noindex and kept out of the sitemap, hubs,
// search and "next" links (see isLive() in lib/shorts.ts).
//
// Eleven of the Shorts repeat a topic that already has a lesson. They are
// attached to that lesson in DEC_EXTRA_VIDEOS instead of getting a second URL,
// and the slug printed in their description 308s to the owning lesson
// (next.config.mjs). One more Short (homing-zero) is on hold for accuracy and
// has no page yet.
//
// The text was written from each Short's title, description and, where one
// exists, its caption track, then checked against the sources listed in the
// pull request. When a Short is live, skim it against the video.
import type { ShortLesson } from '@/lib/shorts'

export const SHORTS_SCHEDULED_DEC: ShortLesson[] = [
  {
    slug: 'bumper-switch', title: 'Bumper Switch: How a Robot Feels a Collision', course: 'senses', ids: ['j2yOjgWMThA'], publishAt: '2026-12-05T18:00:00Z',
    summary: 'A soft shell around the robot presses a switch when it touches something. One click tells the robot it has hit an obstacle, and which side.',
    what: [
      'A bumper is a movable shell on the front or around the edge of a robot, with one or more small switches behind it. When the shell touches a chair leg, it moves a few millimetres and presses a switch, which closes a circuit. The controller reads that as a simple yes: I have hit something.',
      'With a switch on the left and one on the right, the robot also knows which side was hit, so it can back up a little and turn the other way. Robot vacuums use exactly this, and many add infrared or laser sensors so they hit things less often, keeping the bumper as the last line of defence.',
    ],
    withIt: 'A robot can find walls and furniture for the price of two switches, and the signal is so simple that it is almost never wrong.',
    without: 'A robot with no contact sensing keeps pushing after it hits something, scraping furniture, stalling its motors or getting stuck.',
    limit: 'A bumper only reacts after contact, so on its own it is not enough for fast or heavy robots, which need to detect obstacles before they touch them, and it cannot feel obstacles above or below the shell, such as a table edge or a drop.',
    demo: 'loop', loop: ['Shell touches an object', 'Switch closes a circuit', 'Stop, back up, turn away'],
    quiz: { q: 'How does a robot with two bumper switches know which way to turn after a hit?', options: ['It measures the sound of the crash', 'The switch that closed tells it which side was hit', 'It turns the same way every time'], answer: 1, why: 'Each switch covers one side, so whichever one clicked shows where the obstacle is.' },
    atlas: [{ label: 'Tactile sensor', href: '/atlas/concept/tactile-sensor' }, { label: 'Mobile robot', href: '/atlas/concept/mobile-robot' }, { label: 'Finite state machine', href: '/atlas/concept/finite-state-machine' }], next: 'dead-reckoning',
  },
  {
    slug: 'brushless-vs-brushed', title: 'Brushless vs Brushed Motors: Why Brushless Needs a Controller', course: 'motion', ids: ['EdDodrWvZQY'], publishAt: '2026-12-06T15:00:00Z',
    summary: 'A brushed motor switches its own current with sliding contacts, so it spins as soon as you connect a battery. A brushless motor needs electronics to do that switching.',
    what: [
      'Every DC motor has to keep reversing the current in its coils at the right moment, or it would turn half a turn and stop. A brushed motor does this mechanically: carbon brushes rub on a split ring (the commutator) on the shaft, and the contacts swap over as it turns. Connect a battery and it spins.',
      'A brushless motor has no brushes. Its coils are fixed and the magnets turn, so a controller (often called an ESC, electronic speed controller) has to energise the coils in sequence. It works out where the rotor is from Hall-effect sensors or from the small voltage the spinning magnets induce in the unpowered coil.',
    ],
    withIt: 'Brushless motors waste less energy in friction and sparks, run cooler and last far longer, which is why drones, robot joints and power tools use them.',
    without: 'With only brushed motors, a drone’s motors would wear out far sooner and lose more efficiency to heat, though cheap toys and small hobby robots still use them happily.',
    limit: 'The controller adds cost and complexity, and a sensorless controller struggles at very low speed, where the induced voltage is too small to read. Robot joints often add a position encoder for that reason.',
    demo: 'loop', loop: ['Read where the rotor is', 'Switch current to the next coil', 'Magnets are pulled round'],
    quiz: { q: 'What does a brushless motor need that a brushed motor does not?', options: ['A battery', 'An electronic controller to switch the coils', 'A gearbox'], answer: 1, why: 'Without brushes nothing switches the current mechanically, so electronics must do it in time with the rotor.' },
    atlas: [{ label: 'Brushless motor', href: '/atlas/concept/brushless-motor' }, { label: 'DC motor', href: '/atlas/concept/dc-motor' }, { label: 'Motor driver', href: '/atlas/concept/motor-driver' }], next: 'backdrivability',
  },
  {
    slug: 'depth-camera', title: 'Depth Camera: How a Robot Sees in 3D', course: 'senses', ids: ['W5hkalnn-vc'], publishAt: '2026-12-06T18:00:00Z',
    summary: 'A depth camera gives every pixel a distance as well as a colour, so the robot gets the shape of the scene, not just a flat picture.',
    what: [
      'A normal camera tells a robot that a red patch is there, but not whether it is a small cup close by or a big box far away. A depth camera adds a distance to every pixel, so the robot can measure size, find the edge of a table and work out where to put its hand.',
      'There are three common ways to get that distance. Stereo cameras compare two views, as your two eyes do. Structured-light cameras project a known pattern of infrared dots and see how it bends over surfaces. Time-of-flight cameras time how long light takes to bounce back, like a LiDAR for every pixel at once.',
    ],
    withIt: 'A robot arm can pick a box from a pile, a mobile robot can see a step or a low table, and a phone can blur the background behind your face.',
    without: 'With a flat image alone the robot has to guess distance from size and shading, which fails as soon as an object is an unexpected size.',
    limit: 'Shiny, black or transparent objects return poor depth, stereo needs texture to match, and infrared patterns get washed out in strong sunlight.',
    demo: 'loop', loop: ['Send light or take two views', 'Work out distance for each pixel', 'Build a 3D picture'],
    quiz: { q: 'What does a depth camera add that a normal camera lacks?', options: ['More colours', 'A distance for every pixel', 'A wider view'], answer: 1, why: 'Each pixel gets a range value, which turns a flat picture into 3D shape.' },
    atlas: [{ label: 'Depth camera', href: '/atlas/concept/depth-camera' }, { label: 'Stereo vision', href: '/atlas/concept/stereo-vision' }, { label: 'Structured light', href: '/atlas/concept/structured-light' }, { label: 'Time-of-flight sensor', href: '/atlas/concept/time-of-flight-sensor' }], next: 'sunlight-camera',
  },
  {
    slug: 'emergency-stop', title: 'Emergency Stop: Why the Red Button Does Not Rely on the Main Software', course: 'work', ids: ['ie_-lNGlXQc'], publishAt: '2026-12-07T15:00:00Z',
    summary: 'The emergency stop is wired into a separate safety circuit that cuts motor power, at once or right after a controlled stop, so it works even if the robot’s main software has frozen.',
    what: [
      'Software can crash, hang or have a bug. If the only way to stop a robot were to ask its software nicely, a frozen program would also be a robot you cannot stop. So the emergency stop, a red mushroom button on a yellow background, is wired into a separate safety circuit, often through a safety relay or a certified safety controller, that feeds the motors.',
      'The button breaks a circuit rather than making one, so a cut wire has the same effect as a press. It latches down until someone deliberately resets it, and resetting it does not restart the robot by itself. The stop must be category 0 (power cut at once) or category 1 (a controlled stop, then power cut). Machinery standards such as ISO 13850 and IEC 60204-1 set these rules.',
    ],
    withIt: 'Anyone nearby can stop a machine in one move, whatever state its computer is in.',
    without: 'A crashed controller could leave a powerful arm moving with no way to halt it except pulling the plug, if you can reach it.',
    limit: 'An e-stop is a backup, not the main safety design. Fences, light curtains, speed limits and good guarding are meant to keep people out of danger in the first place.',
    demo: 'loop', loop: ['Button pressed or wire cut', 'Safety circuit opens', 'Motor power is removed'],
    quiz: { q: 'Why is an emergency stop wired to break the circuit rather than send a message to the software?', options: ['It is cheaper', 'It still stops the robot if the main software has frozen', 'Software is too slow to read buttons'], answer: 1, why: 'A hardware circuit does not depend on the program working, which is exactly when you need it.' },
    atlas: [{ label: 'Emergency stop', href: '/atlas/concept/emergency-stop' }, { label: 'Functional safety', href: '/atlas/concept/functional-safety' }, { label: 'Robot safety', href: '/atlas/concept/robot-safety' }], next: 'watchdog-timer',
  },
  {
    slug: 'suction-gripper', title: 'Suction Grippers: Why They Need Flat, Smooth Surfaces', course: 'hands', ids: ['V_IZMFukLL8'], publishAt: '2026-12-07T18:00:00Z',
    summary: 'A suction cup holds by sealing against a surface and pulling the air out. If air can leak back in, the grip is gone.',
    what: [
      'A suction gripper presses a soft cup against an object and a pump or venturi removes the air inside. The air outside the cup is now pushing harder than the thin air inside, and that pressure difference holds the object against the cup.',
      'The holding force is roughly the pressure difference times the cup area. Even a perfect vacuum gives at most one atmosphere, about 10 newtons per square centimetre, so a cup 4 cm across can never hold more than about 125 newtons, and real systems design for much less. Warehouses use rows of cups to lift boxes, glass panels and sheet metal.',
    ],
    withIt: 'One simple, cheap tool can grab boxes, bags and panels of many sizes from the top, without needing to reach around them.',
    without: 'The robot would need fingers that fit each object, which is slower and harder to plan for a mixed pile of parcels.',
    limit: 'Rough, porous, curved or dusty surfaces let air leak in, so cardboard with holes, fabric and mesh are hard. Soft bellows cups and foam pads help, but only up to a point.',
    demo: 'loop', loop: ['Press the cup onto the surface', 'Pump the air out', 'Outside air holds the object on'],
    quiz: { q: 'Why does a suction gripper fail on a rough surface?', options: ['The cup gets too hot', 'Air leaks back in through the gaps', 'Rough things are always too heavy'], answer: 1, why: 'The grip comes from a sealed low-pressure pocket. Gaps let air in and the pressure difference disappears.' },
    atlas: [{ label: 'Suction gripper', href: '/atlas/concept/suction-gripper' }, { label: 'Vacuum gripper', href: '/atlas/concept/vacuum-gripper' }, { label: 'End effector', href: '/atlas/concept/end-effector' }], next: 'gecko-grippers',
  },
  {
    slug: 'gps-indoors', title: 'Why a Robot’s GPS Stops Working Indoors', course: 'senses', ids: ['nsDZbRtOGlo'], publishAt: '2026-12-08T15:00:00Z',
    summary: 'GPS works by timing faint radio signals from satellites. Roofs and walls block or bounce those signals, so indoor robots use other ways to find their position.',
    what: [
      'Each GPS satellite sends a signal saying exactly what time it is on board. The receiver measures how late each signal arrives, which gives its distance to that satellite. With four or more satellites it can solve for its position and for its own clock error at the same time.',
      'The signals reach the ground extremely weak, weaker than the background radio noise, and receivers dig them out with clever processing. A roof or concrete wall can block them completely, and tall buildings bounce them so the timing is wrong and the position jumps around.',
    ],
    withIt: 'Outdoors a tractor, delivery robot or survey drone knows its place on Earth to a few metres, or to a few centimetres with correction services such as RTK.',
    without: 'Indoors the robot has to rely on wheel odometry, cameras, LiDAR maps or markers on the floor and walls instead.',
    limit: 'Even outdoors, GPS is unreliable in narrow streets, under trees and in tunnels, so outdoor robots also fuse it with wheel and inertial sensors.',
    demo: 'loop', loop: ['Hear several satellites', 'Time each signal', 'Solve for one position'],
    quiz: { q: 'What is the minimum number of satellites a GPS receiver usually needs for a 3D position?', options: ['One', 'Two', 'Four'], answer: 2, why: 'Three unknowns for position plus one for the receiver’s own clock error means at least four signals.' },
    atlas: [{ label: 'GPS / GNSS', href: '/atlas/concept/gps-gnss' }, { label: 'RTK GPS', href: '/atlas/concept/rtk-gps' }, { label: 'Localisation', href: '/atlas/concept/localisation' }, { label: 'Odometry', href: '/atlas/concept/odometry' }], next: 'qr-navigation',
  },
  {
    slug: 'payload-vs-reach', title: 'Payload vs Reach: Why Robot Arms Lift Less When Stretched Out', course: 'motion', ids: ['UMdm4xFb3iI'], publishAt: '2026-12-08T18:00:00Z',
    summary: 'The same weight is much harder to hold far from the shoulder. That one fact shapes how big a robot arm’s motors have to be.',
    what: [
      'Hold a full bottle close to your chest, then hold it at arm’s length. The bottle weighs the same, but your shoulder works much harder. Torque is force times distance, so doubling the distance from the joint doubles the twisting load on it.',
      'A robot arm’s shoulder motors have a maximum torque. At full stretch the load sits far from the shoulder and the arm’s own links add their weight too, so designers size the motors for that worst case, which is why a long-reach arm needs much bigger motors. The payload diagram manufacturers publish shows the same rule at the wrist: how much it can carry as the load’s centre of gravity moves farther from the tool flange.',
    ],
    withIt: 'An engineer can check that an arm will really carry a part, including a long gripper that holds the weight far from the flange.',
    without: 'An arm chosen without checking how far the part’s weight sits from the flange may overload its wrist joints, or be slowed down automatically.',
    limit: 'Speed matters too. Fast moves need extra torque to accelerate the load, so an arm may carry its full rated payload only at reduced acceleration.',
    demo: 'loop', loop: ['Load sits far from the joint', 'Torque = weight × distance', 'Check the payload chart for that reach'],
    quiz: { q: 'A load is moved from 0.3 m to 0.9 m from a robot’s shoulder joint. What happens to the torque it needs?', options: ['It stays the same', 'It roughly triples', 'It halves'], answer: 1, why: 'Torque is force times distance. Three times the distance means about three times the torque from the load.' },
    atlas: [{ label: 'Torque', href: '/atlas/concept/torque' }, { label: 'Workspace', href: '/atlas/concept/workspace' }, { label: 'Robot arm', href: '/atlas/concept/robot-arm' }], next: 'torque-vs-speed',
  },
  {
    slug: 'qr-navigation', title: 'How Robots Use QR Codes on the Floor to Know Where They Are', course: 'work', ids: ['BfzrxU99suk'], publishAt: '2026-12-09T15:00:00Z',
    summary: 'Many warehouse robots read square 2D codes, similar to QR codes, stuck to the floor. Each code is a known spot on the map, so the robot corrects its position every time it drives over one.',
    what: [
      'Between markers, the robot estimates its position by counting wheel turns. That estimate slowly drifts. A camera pointing at the floor reads a printed square code, whose exact position is stored in the map. As soon as the robot sees one, it knows precisely where it is and which way it is facing.',
      'Amazon’s Kiva-style drive units work this way, crossing a grid of floor codes. Codes on walls and shelves, such as AprilTags and ArUco markers, do the same job for robots and drones that look sideways instead of down.',
    ],
    withIt: 'Hundreds of robots can share one floor with centimetre-level accuracy and cheap sensors, because the building does half of the work.',
    without: 'Each robot needs LiDAR or camera-based mapping to find itself in long aisles of identical shelves, which costs more and fails more often.',
    limit: 'Codes get dirty, scuffed or covered, and the layout must be set up in advance. Change the warehouse and someone has to re-lay and re-map the codes.',
    demo: 'loop', loop: ['Count wheel turns between codes', 'Camera reads a floor code', 'Snap position to the known spot'],
    quiz: { q: 'Why does a warehouse robot need the floor codes if it can already count its wheel turns?', options: ['Wheel counting slowly drifts and the codes reset the error', 'The codes power the robot', 'The codes tell it what to pick'], answer: 0, why: 'Small odometry errors add up. Each code is an exact known spot that wipes out the drift.' },
    atlas: [{ label: 'Autonomous mobile robot', href: '/atlas/concept/autonomous-mobile-robot' }, { label: 'Warehouse robotics', href: '/atlas/concept/warehouse-robotics' }, { label: 'Localisation', href: '/atlas/concept/localisation' }, { label: 'Dead reckoning', href: '/atlas/concept/dead-reckoning' }], next: 'warehouse-robots',
  },
  {
    slug: 'potentiometer-angle', title: 'Potentiometer: How a Robot Knows Its Joint Angle', course: 'senses', ids: ['NkxYXBm2iaY'], publishAt: '2026-12-09T18:00:00Z',
    summary: 'A potentiometer turns an angle into a voltage. The controller reads the voltage as a number, and the number is the joint’s position.',
    what: [
      'Inside a potentiometer is a strip of resistive material with a voltage across its ends, and a wiper that slides along it as the shaft turns. Near one end the wiper picks up a low voltage, near the other a high one, and in between it changes smoothly.',
      'Connect the shaft to a robot joint and the voltage tracks the joint angle. The controller’s analogue-to-digital converter turns that voltage into a number many times a second. A hobby servo uses exactly this: a potentiometer on the output shaft tells its little circuit when it has reached the commanded angle.',
    ],
    withIt: 'A robot knows its joint angle the moment it switches on, with one cheap part and one wire to read.',
    without: 'The controller would have no idea where the joint is, or it would need a more expensive encoder.',
    limit: 'The wiper wears with use, readings get noisy, and most potentiometers turn less than one full revolution, which is why industrial arms use encoders instead.',
    demo: 'feedback',
    quiz: { q: 'What does the robot actually read from a potentiometer?', options: ['A voltage that changes with the angle', 'A pulse every degree', 'The speed of the joint'], answer: 0, why: 'The wiper position sets the voltage, and the voltage is converted to a number that stands for the angle.' },
    atlas: [{ label: 'Servo motor', href: '/atlas/concept/servo-motor' }, { label: 'Rotary encoder', href: '/atlas/concept/rotary-encoder' }, { label: 'Absolute encoder', href: '/atlas/concept/absolute-encoder' }], next: 'servo-motor',
  },
  {
    slug: 'hydraulic-robots', title: 'Hydraulic Robots: How They Lift So Much', course: 'motion', ids: ['7ftZANkFEjA'], publishAt: '2026-12-10T15:00:00Z',
    summary: 'A pump pushes oil at very high pressure into a cylinder. Pressure times piston area gives a huge force from a compact actuator.',
    what: [
      'Liquid barely squeezes, so pressure applied in one place is passed through the whole fluid (Pascal’s principle). A pump pressurises oil, valves send it to a cylinder, and the oil pushes on the piston. Force equals pressure times piston area, so a wider piston or a higher pressure means more force.',
      'Hydraulic systems commonly run at more than a hundred times atmospheric pressure, so a cylinder the size of a drinks can can push with many tonnes. That is why excavators, heavy industrial manipulators and some legged research robots have used hydraulics.',
    ],
    withIt: 'A machine can lift, crush or hold enormous loads with actuators small enough to fit inside its limbs.',
    without: 'Getting the same force from electric motors needs large motors and big gear reductions, which add weight, size and slowness.',
    limit: 'Hydraulics need a pump, hoses and filters, they can leak oil, and they waste energy as heat. Many new robots, including Boston Dynamics’ 2024 Atlas, have moved to electric actuators.',
    demo: 'loop', loop: ['Pump pressurises the oil', 'Valve sends it to a cylinder', 'Pressure × area pushes the piston'],
    quiz: { q: 'How can a hydraulic cylinder produce more force without a stronger pump pressure?', options: ['Use a wider piston', 'Use thinner oil', 'Use a longer hose'], answer: 0, why: 'Force equals pressure times area, so a larger piston area gives more force at the same pressure.' },
    atlas: [{ label: 'Hydraulic actuator', href: '/atlas/concept/hydraulic-actuator' }, { label: 'Actuator', href: '/atlas/concept/actuator' }, { label: 'Pneumatic actuator', href: '/atlas/concept/pneumatic-actuator' }], next: 'pneumatic-muscles',
  },
  {
    slug: 'microphone-array', title: 'Microphone Array: How a Robot Tells Where a Sound Came From', course: 'senses', ids: ['P8g34PFcEh8'], publishAt: '2026-12-10T18:00:00Z',
    summary: 'A sound reaches the nearer microphone a fraction of a millisecond before the farther one. That tiny gap tells the robot the direction.',
    what: [
      'Sound travels at about 343 metres per second. If two microphones are 10 cm apart and a voice comes from one side, it reaches the near microphone about 0.3 milliseconds before the far one. If it comes from straight ahead, it arrives at both together.',
      'By measuring this time difference between several pairs of microphones, the robot works out the angle of the sound. The same array can then combine the microphones so sound from that direction adds up and noise from other directions partly cancels, which is called beamforming. Smart speakers use rings of microphones for exactly this.',
    ],
    withIt: 'A robot can turn its head toward the person speaking and hear them clearly across a noisy room.',
    without: 'With one microphone the robot hears a voice but has no idea where it came from, and room noise drowns it out.',
    limit: 'Echoes off walls create false directions, and two microphones alone cannot tell front from back. More microphones and cleverer processing reduce both problems.',
    demo: 'loop', loop: ['Sound reaches the microphones', 'Measure the arrival-time gaps', 'Work out the direction'],
    quiz: { q: 'A sound arrives at both microphones at exactly the same time. Where is it coming from?', options: ['From the left', 'From straight ahead or straight behind', 'From the right'], answer: 1, why: 'Equal arrival times mean equal distances, which happens anywhere on the middle line between the pair, such as straight ahead or behind.' },
    atlas: [{ label: 'Speech recognition', href: '/atlas/concept/speech-recognition' }, { label: 'Sensor fusion', href: '/atlas/concept/sensor-fusion' }], next: 'wake-word',
  },
  {
    slug: 'dead-reckoning', title: 'Dead Reckoning: How a Robot Guesses Where It Is', course: 'control', ids: ['QxCsRVSulpc'], publishAt: '2026-12-11T15:00:00Z',
    summary: 'Count how far each wheel turned and which way you are facing, add it up, and you know roughly where you are. The catch: small errors keep growing.',
    what: [
      'Dead reckoning starts from a known position and adds up every movement since. A wheeled robot reads its wheel encoders: if both wheels turned the same amount it went straight, if one turned more it curved. Sum thousands of small steps and you have an estimate of where it is.',
      'Every step has a tiny error: a wheel slips on a rug, a tyre is slightly smaller than assumed, the floor is uneven. Errors in heading are the worst, because a one-degree mistake points every later step slightly the wrong way, and the position error grows with each metre travelled.',
    ],
    withIt: 'A robot always has a smooth, instant guess of where it is, even between landmarks and with no outside signal at all.',
    without: 'The robot would only know its position when it could see a landmark or a marker, and would be lost in between.',
    limit: 'Dead reckoning drifts without limit. Real robots reset it regularly with something absolute: a map match, a floor code, a camera or GPS.',
    demo: 'loop', loop: ['Start from a known spot', 'Add each wheel movement', 'Estimate the new position'],
    quiz: { q: 'Why does a dead-reckoning position get worse the farther the robot drives?', options: ['The battery weakens', 'Small errors in each step keep adding up', 'The map gets bigger'], answer: 1, why: 'Each step adds a little error and nothing removes it, so the total grows with distance.' },
    atlas: [{ label: 'Dead reckoning', href: '/atlas/concept/dead-reckoning' }, { label: 'Odometry', href: '/atlas/concept/odometry' }, { label: 'Encoder', href: '/atlas/concept/encoder' }], next: 'qr-navigation',
  },
  {
    slug: 'gecko-grippers', title: 'Gecko Grippers: How Robots Stick Without Glue or Suction', course: 'hands', ids: ['tpL3TfmXsJw'], publishAt: '2026-12-11T18:00:00Z',
    summary: 'A gecko’s foot is covered in millions of tiny hairs that get so close to a surface that weak molecular forces add up to a strong grip. Robots copy the trick.',
    what: [
      'Gecko toes carry millions of microscopic hairs that split into even finer tips. Each tip gets close enough to the wall for van der Waals forces, the weak attraction between nearby molecules, to act. One tip holds almost nothing; millions together hold the gecko’s weight.',
      'Engineers mould synthetic versions from rubber-like materials with tiny angled wedges. Pull along the surface and the wedges flatten and stick; lift at an angle and they peel off with almost no force. Because the grip needs no air, NASA’s Jet Propulsion Laboratory has tested gecko-style grippers for grabbing objects in space, where suction cannot work.',
    ],
    withIt: 'A gripper or climbing robot can hold smooth surfaces like glass or panels without glue, residue, suction pumps or power to stay attached.',
    without: 'The robot would need suction, which fails in a vacuum and on leaky surfaces, or fingers that have to wrap around the object.',
    limit: 'Gecko adhesives work best on smooth, clean surfaces. Dust, rough texture and wear reduce the grip, and they hold far less than a good mechanical clamp.',
    demo: 'loop', loop: ['Press and slide the pads', 'Tiny wedges flatten against the surface', 'Molecular forces add up to a grip'],
    quiz: { q: 'Why can a gecko-style gripper work in space when a suction cup cannot?', options: ['It uses glue', 'It does not need air pressure to hold', 'It is magnetic'], answer: 1, why: 'Suction relies on outside air pushing in. Gecko adhesion comes from forces between molecules, which need no air.' },
    atlas: [{ label: 'Gripper', href: '/atlas/concept/gripper' }, { label: 'Soft robot', href: '/atlas/concept/soft-robot' }, { label: 'Suction gripper', href: '/atlas/concept/suction-gripper' }], next: 'wall-climbing-robots',
  },
  {
    slug: 'lidar-fog-radar-fusion', title: 'Why Fog Blinds LiDAR but Not Radar', course: 'senses', ids: ['x2JbIwIWMdM'], publishAt: '2026-12-12T15:00:00Z',
    summary: 'LiDAR brings its own light, so darkness is no problem. Fog, rain and snow are: water droplets scatter the laser. Radar’s much longer waves pass through, so robots use both.',
    what: [
      'A LiDAR measures distance by timing laser pulses, usually near-infrared light at a wavelength of about 905 or 1,550 nanometres. Fog droplets range from a few to a few tens of micrometres across, larger than that wavelength, so they scatter the light strongly. Some pulses bounce back early off the fog itself, and the rest come back too weak to measure.',
      'Automotive radar uses radio waves around 77 GHz, with a wavelength of about 4 millimetres, hundreds of times larger than a fog droplet. The droplets barely affect it, so radar keeps seeing cars and walls in weather that blinds LiDAR and cameras, but with much coarser detail.',
    ],
    withIt: 'Fusing LiDAR with radar lets a robot or car keep a sharp picture in clear weather and a reliable, if blurrier, one in fog and snow.',
    without: 'A LiDAR-only robot slows down, stops, or sees false obstacles in the fog, exactly when the conditions are most dangerous.',
    limit: 'Radar cannot see shape or small objects well, and it can be fooled by metal reflections. No single sensor covers every condition, which is why sensor fusion exists.',
    demo: 'loop', loop: ['Send laser and radio pulses', 'Fog scatters the laser, not the radio', 'Fuse both into one picture'],
    quiz: { q: 'Why does radar see through fog better than LiDAR?', options: ['Radar is more powerful', 'Its wavelength is far larger than fog droplets', 'Radar works only at night'], answer: 1, why: 'Waves are scattered strongly by particles about their size or larger. Millimetre radio waves pass around micrometre droplets.' },
    atlas: [{ label: 'Lidar', href: '/atlas/concept/lidar' }, { label: 'Radar sensor', href: '/atlas/concept/radar-sensor' }, { label: 'Sensor fusion', href: '/atlas/concept/sensor-fusion' }], next: 'sensor-fusion',
  },
  {
    slug: 'backdrivability', title: 'Backdrivability: Why a Geared Robot Joint Is Hard to Push', course: 'motion', ids: ['v-txls5sOXA'], publishAt: '2026-12-12T18:00:00Z',
    summary: 'A big gear reduction makes a small motor strong. Push the joint from the outside, though, and the same ratio fights you. That is backdrivability.',
    what: [
      'A 100:1 gearbox multiplies the motor’s torque roughly a hundred times. Turn it around: to move the joint by hand you now have to spin the motor a hundred times faster than the joint, through all the friction of the gears. The joint feels stiff or completely locked.',
      'Engineers call a joint backdrivable when outside forces can move it easily. It matters for robots that touch the world: the motor’s inertia, as felt at the joint, grows with the square of the gear ratio, so a high ratio makes collisions harder and contact less gentle. That is why some legged robots, such as the MIT Mini Cheetah, use strong motors with a low ratio of about 6:1.',
    ],
    withIt: 'A low-ratio, backdrivable joint can feel bumps, absorb impacts and be moved by hand, which makes walking and working beside people safer.',
    without: 'A non-backdrivable joint holds its position for free with the power off, which is useful for lifts and some arms, but it shrugs off nothing and feels every collision as a hard hit.',
    limit: 'Low gear ratios need bigger, more expensive motors to get the same torque. Every design picks a point between strength and gentleness.',
    demo: 'gears',
    quiz: { q: 'Why is a joint with a high gear ratio hard to push by hand?', options: ['The motor is turned on', 'Pushing the output has to spin the motor much faster through the gears', 'Gears are magnetic'], answer: 1, why: 'The ratio works both ways. Moving the joint means driving the motor many times faster against friction and inertia.' },
    atlas: [{ label: 'Backdrivability', href: '/atlas/concept/backdrivability' }, { label: 'Gear ratio', href: '/atlas/concept/gear-ratio' }, { label: 'Harmonic drive', href: '/atlas/concept/harmonic-drive' }], next: 'harmonic-drive',
  },
  {
    slug: 'watchdog-timer', title: 'Watchdog Timer: Why a Robot’s Computer Must Keep Checking In', course: 'control', ids: ['GY1I4hiy0FE'], publishAt: '2026-12-13T15:00:00Z',
    summary: 'A small timer counts down in the background. The main program must reset it regularly. If the program freezes, the timer runs out and forces a safe reset.',
    what: [
      'A watchdog is a hardware counter, usually built into the microcontroller and running from its own clock. The main program “feeds” it, resetting it to full, every time it gets through its loop. As long as the program is healthy, the counter never reaches zero.',
      'If the program hangs, gets stuck in an endless loop or crashes, nobody feeds the watchdog. It runs out and resets the processor, or switches the outputs to a safe state. A robot that might otherwise drive off with its motors stuck on instead stops and reboots.',
    ],
    withIt: 'A frozen controller recovers by itself in a fraction of a second, which matters on robots nobody is watching, from Mars rovers to factory machines.',
    without: 'One rare bug could leave a robot stuck with its motors running until someone notices and pulls the power.',
    limit: 'A watchdog only catches a program that stops. A program that keeps running but does the wrong thing still feeds it, so safety also needs checks of what the robot is actually doing.',
    demo: 'loop', loop: ['Program finishes a loop', 'Feed the watchdog', 'No feed in time? Reset to safe'],
    quiz: { q: 'What happens if the main program freezes and stops feeding the watchdog?', options: ['Nothing changes', 'The timer runs out and forces a reset or safe state', 'The robot speeds up'], answer: 1, why: 'The watchdog exists for exactly this case. No feed before zero means something is wrong.' },
    atlas: [{ label: 'Microcontroller', href: '/atlas/concept/microcontroller' }, { label: 'Embedded system', href: '/atlas/concept/embedded-system' }, { label: 'Real-time computing', href: '/atlas/concept/real-time-computing' }], next: 'emergency-stop',
  },
  {
    slug: 'averaging-noise', title: 'Why Robots Average Sensor Readings to Cancel Noise', course: 'senses', ids: ['7scff0GvpFg'], publishAt: '2026-12-13T18:00:00Z',
    summary: 'Every reading has a little random error. Average many readings and the ups and downs cancel, leaving a value closer to the truth.',
    what: [
      'A distance sensor pointed at a wall might report 101, 99, 102, 98 and 100 centimetres. The wall has not moved; that jitter is noise. Because random errors are as likely to be high as low, averaging several readings makes them cancel.',
      'Averaging N independent readings cuts random noise by about the square root of N: four readings halve it, a hundred cut it to a tenth. A moving average keeps only the latest few readings so the value can still follow real changes.',
    ],
    withIt: 'Cheap sensors give smooth, steady values, so a robot does not twitch or make decisions on a single bad reading.',
    without: 'Controllers react to every flicker of noise, motors jitter, and a single spike can trigger a false stop.',
    limit: 'Averaging adds delay, because the result trails the real value, and it cannot remove a constant offset. A sensor that always reads 2 cm long still reads 2 cm long after averaging; that needs calibration. A single big spike is better handled by a median filter.',
    demo: 'loop', loop: ['Take many readings', 'Add them up and divide', 'Random errors cancel out'],
    quiz: { q: 'Which error does averaging NOT reduce at all?', options: ['Random jitter between readings', 'A sensor that always reads 2 cm too long', 'Occasional small spikes'], answer: 1, why: 'Averaging cancels errors that go both ways. A constant offset goes the same way every time and survives.' },
    atlas: [{ label: 'Kalman filter', href: '/atlas/concept/kalman-filter' }, { label: 'Complementary filter', href: '/atlas/concept/complementary-filter' }, { label: 'Sensor fusion', href: '/atlas/concept/sensor-fusion' }], next: 'gyroscope-imu',
  },
  {
    slug: 'tool-changer', title: 'Tool Changer: How One Robot Arm Does Many Jobs', course: 'hands', ids: ['o3FU3IGDzXg'], publishAt: '2026-12-14T15:00:00Z',
    summary: 'A tool changer lets a robot arm drop one tool and lock on another in seconds: a gripper, then a screwdriver, then a glue nozzle.',
    what: [
      'A tool changer has two halves. One plate is bolted to the robot’s wrist; a matching plate is fitted to each tool. The arm moves the tool into a rack, unlocks, drives over to the next tool and locks onto it, usually with a pneumatic piston pushing balls or a cam into a groove.',
      'The plates also pass through what the tool needs: compressed air, electrical power and signals. The robot program knows which tool is mounted and switches to that tool’s size and weight, so its movements and payload stay correct.',
    ],
    withIt: 'One arm can do a whole sequence of tasks, which saves floor space and money when a factory makes small batches of many products.',
    without: 'Each job needs its own robot, or someone has to stop the line and swap tools by hand.',
    limit: 'Every change costs a few seconds, the coupling adds weight at the wrist, and the lock must stay locked even if air pressure is lost.',
    demo: 'loop', loop: ['Park the old tool in the rack', 'Unlock and move to the new tool', 'Lock and load its settings'],
    quiz: { q: 'Why does a robot program need to know which tool is mounted?', options: ['To choose the tool colour', 'So it uses the right size and weight for its moves', 'Tools only work at night'], answer: 1, why: 'The tool changes where the working point is and how much load the arm carries.' },
    atlas: [{ label: 'End effector', href: '/atlas/concept/end-effector' }, { label: 'Industrial robot', href: '/atlas/concept/industrial-robot' }, { label: 'Gripper', href: '/atlas/concept/gripper' }], next: 'end-effectors',
  },
  {
    slug: 'sunlight-camera', title: 'Why Direct Sunlight Breaks a Robot’s Camera', course: 'senses', ids: ['YLDqxyCQx04'], publishAt: '2026-12-14T18:00:00Z',
    summary: 'A camera can only capture a limited range of brightness at once. In harsh sun, bright parts turn pure white and shadows pure black, and the detail in between is gone.',
    what: [
      'Each pixel can only count so much light before it fills up, and below a certain level it sees only noise. The span between the two is the camera’s dynamic range. A sunlit wall and a deep shadow on a summer day can differ by more than the camera can hold in one exposure.',
      'Set the exposure for the shadows and the sunny areas clip to white; set it for the sun and the shadows go black. A robot’s vision software then sees edges that are not real and misses ones that are. Infrared depth cameras suffer too, because sunlight contains far more infrared than their own projector.',
    ],
    withIt: 'Knowing this, outdoor robots use high-dynamic-range sensors, shades and filters, and fuse cameras with LiDAR or radar that bring their own signal.',
    without: 'A robot tuned indoors walks into bright sun and suddenly cannot find the path, the person or the object it was tracking.',
    limit: 'HDR helps but is not magic: merging exposures can blur fast motion, and looking straight at the sun still blinds the sensor.',
    demo: 'loop', loop: ['Light hits the pixels', 'Bright parts saturate, dark parts drop to noise', 'Detail in between is lost'],
    quiz: { q: 'What is a camera’s dynamic range?', options: ['How far away it can see', 'The span from the darkest to the brightest light it can record at once', 'How many colours it has'], answer: 1, why: 'Outside that span, light is clipped to black or white and its detail is lost.' },
    atlas: [{ label: 'Camera vision', href: '/atlas/concept/camera-vision' }, { label: 'Depth camera', href: '/atlas/concept/depth-camera' }, { label: 'Computer vision', href: '/atlas/concept/computer-vision' }], next: 'computer-vision',
  },
  {
    slug: 'arm-brakes', title: 'Why Robot Arm Brakes Lock When the Power Fails', course: 'work', ids: ['1uRyGNmhsKQ'], publishAt: '2026-12-15T15:00:00Z',
    summary: 'A robot joint brake is held open by electricity and closed by a spring. Lose power and the spring wins, so the arm locks instead of dropping.',
    what: [
      'Most robot arm joints carry a spring-applied, electrically released brake. A spring presses the brake pads together all the time. An electromagnet pulls them apart, but only while it has power.',
      'When the robot is running, the brake is released and the motor holds the joint. When the drives are switched off, the power fails or a wire breaks, the magnet lets go and the spring clamps the joint. The failure leaves the arm in the safe state: still.',
    ],
    withIt: 'A heavy arm holding a part stays where it is during a blackout or emergency stop, instead of falling onto the part or onto a person.',
    without: 'A brake that needed power to clamp would release in exactly the moment it is needed most.',
    limit: 'Trapping someone under a stopped arm is its own hazard, so many arms, especially cobots, have a way to release the brakes or force the joints by hand so the arm can be pushed away.',
    demo: 'loop', loop: ['Power on: magnet holds the brake open', 'Power lost: magnet lets go', 'Spring clamps the joint'],
    quiz: { q: 'What closes a typical robot joint brake when power is lost?', options: ['A spring', 'A battery backup', 'The software'], answer: 0, why: 'The brake is spring-applied and only held open by power, so losing power closes it automatically.' },
    atlas: [{ label: 'Robot safety', href: '/atlas/concept/robot-safety' }, { label: 'Functional safety', href: '/atlas/concept/functional-safety' }, { label: 'Cobot', href: '/atlas/concept/cobot' }], next: 'safety-cages',
  },
  {
    slug: 'defect-inspection', title: 'How Robots Spot Defects by Comparing to a Perfect Image', course: 'work', ids: ['xW2b_-4jaiE'], publishAt: '2026-12-15T18:00:00Z',
    summary: 'A vision system stores what a good part looks like, lines up each new part with it and flags any area that differs: a scratch, a dent or a missing label.',
    what: [
      'The classic method is template comparison. A camera photographs a known-good part under fixed lighting. For every new part, the software first aligns the image with that reference, then compares them region by region. Where the difference is bigger than a set threshold, it marks a defect.',
      'Real lines vary a little, so systems learn the normal range of variation rather than one perfect image. Newer systems use machine learning trained only on good parts, which flags anything unusual, even a defect nobody thought to describe.',
    ],
    withIt: 'Every part can be checked at line speed, all day, with the same strictness, catching faults people miss after hours of staring.',
    without: 'Inspection is done by people on a sample of parts, so some defects slip through and checks vary from shift to shift.',
    limit: 'Changes in lighting, dust on the lens or a slightly shifted part look like defects too, so lighting, alignment and thresholds need care, and some false alarms always need a human look.',
    demo: 'loop', loop: ['Photograph the new part', 'Align it with the reference', 'Flag areas that differ'],
    quiz: { q: 'Why does the system align the new image with the reference before comparing?', options: ['To make it bigger', 'So a slightly shifted part is not mistaken for a defect', 'To change the colours'], answer: 1, why: 'Without alignment, every edge of a slightly moved part would look like a difference.' },
    atlas: [{ label: 'Computer vision', href: '/atlas/concept/computer-vision' }, { label: 'Inspection robot', href: '/atlas/concept/inspection-robot' }, { label: 'Industrial robot', href: '/atlas/concept/industrial-robot' }], next: 'fruit-recognition',
  },
  {
    slug: 'pneumatic-muscles', title: 'Pneumatic Muscles: Why They Move With a Natural Bounce', course: 'motion', ids: ['58JjJSFMv6w'], publishAt: '2026-12-16T15:00:00Z',
    summary: 'Blow air into a rubber tube inside a woven sleeve and it gets fatter and shorter, pulling like a muscle. Because air squashes, the pull is springy.',
    what: [
      'A pneumatic artificial muscle, often called a McKibben muscle, is a rubber bladder inside a braided mesh sleeve. Pressurise it and the bladder swells. The braid can only get fatter by getting shorter, so the muscle contracts and pulls on whatever it is attached to. Commercial versions contract by up to about a quarter of their length.',
      'Air compresses, unlike the oil in hydraulics, and the braid pulls less the more it shortens. So the muscle behaves like a spring: push on it and it gives a little, then pushes back. Raising the pressure makes it stiffer. That natural give is why the motion looks soft and bouncy compared with a geared motor.',
    ],
    withIt: 'Robots can move softly and safely around people, absorb knocks without damage, and get a lot of pull from a very light actuator.',
    without: 'You need motors and gears that are stiff by nature and must be controlled carefully to behave gently.',
    limit: 'The springiness makes precise positioning hard, the muscle only pulls (so joints need two working against each other, or one plus a return spring), and it needs a compressor and valves.',
    demo: 'loop', loop: ['Pump air into the bladder', 'Braid forces it fat and short', 'Muscle pulls, with a springy give'],
    quiz: { q: 'Why does a pneumatic muscle move with a bounce?', options: ['The rubber is loose', 'Air can be compressed, so it acts like a spring', 'The valves are slow'], answer: 1, why: 'Compressed air stores and returns energy, so the actuator gives a little under load and springs back.' },
    atlas: [{ label: 'Pneumatic actuator', href: '/atlas/concept/pneumatic-actuator' }, { label: 'Soft actuator', href: '/atlas/concept/soft-actuator' }, { label: 'Series elastic actuator', href: '/atlas/concept/series-elastic-actuator' }], next: 'soft-grippers',
  },
  {
    slug: 'wall-climbing-robots', title: 'Wall-Climbing Robots: How They Stick to Steel', course: 'work', ids: ['v_u5uDRUJhY'], publishAt: '2026-12-16T18:00:00Z',
    summary: 'Strong magnets in the wheels or tracks pull the robot onto steel, so it can drive up tanks, ship hulls and boiler walls to inspect them.',
    what: [
      'Ordinary carbon steel is magnetic, so a robot with permanent magnets in its wheels or between them is pulled firmly onto the surface. The wheels can still roll, so the robot drives up a vertical wall or upside down under a pipe, carrying cameras and ultrasonic thickness sensors.',
      'Inspection robots of this kind check storage tanks, ship hulls, wind towers and power-station boilers for corrosion and thinning metal, jobs that used to need scaffolding, rope access or emptying the whole tank.',
    ],
    withIt: 'Inspections get faster, cheaper and safer, with fewer people working at height and far more measurements per wall.',
    without: 'People climb or dangle on ropes to take spot readings, which is slow, costly and risky.',
    limit: 'Magnets only work on magnetic metals such as carbon steel and iron, not on most stainless steel, aluminium or concrete; paint and rust weaken the grip, and welds, bolts and edges are hard to cross. Other walls need suction or other methods.',
    demo: 'loop', loop: ['Magnets pull the wheels onto steel', 'Wheels drive up the wall', 'Sensors scan the metal'],
    quiz: { q: 'Which wall could a magnetic climbing robot NOT climb?', options: ['A steel ship hull', 'A steel storage tank', 'A glass window'], answer: 2, why: 'Glass is not magnetic, so a magnetic robot has nothing to pull against.' },
    atlas: [{ label: 'Inspection robot', href: '/atlas/concept/inspection-robot' }, { label: 'Mobile robot', href: '/atlas/concept/mobile-robot' }], next: 'window-cleaner',
  },
  {
    slug: 'solar-robots', title: 'Solar-Powered Robots: How They Run on Sunlight', course: 'work', ids: ['uB2w85Q8mHg'], publishAt: '2026-12-17T15:00:00Z',
    summary: 'Solar panels turn sunlight into electricity and top up the battery, so a slow robot can keep working for months without plugging in.',
    what: [
      'At midday in clear weather, sunlight brings roughly 1,000 watts of power to each square metre of ground. A good solar panel converts about a fifth of that into electricity. So a robot with a square metre of panel gets around 200 watts at best, and much less on cloudy days, in the morning and at night.',
      'That power charges a battery, and the battery runs the robot when the sun is weak. It suits robots that move slowly or spend most of their time waiting: lawn and field robots, ocean drones, remote sensors and planetary rovers. NASA’s Opportunity rover ran on solar power on Mars for about 14 years.',
    ],
    withIt: 'A robot can work far from any plug, for weeks or years, without anyone swapping batteries.',
    without: 'Remote robots have to come back to charge, carry heavy batteries, or not go at all.',
    limit: 'Solar power is small, so fast or heavy robots cannot run on it directly. Dust on the panels cuts the output, and a planet-wide dust storm in June 2018 blocked the Sun so completely that Opportunity never woke again (NASA ended the mission in February 2019).',
    demo: 'loop', loop: ['Panels catch sunlight', 'Charge the battery', 'Battery runs the robot day and night'],
    quiz: { q: 'Why can a solar panel not power a fast, heavy robot directly?', options: ['A panel turns sunlight into only about 200 watts per square metre at best', 'Solar panels only work at night', 'Robots cannot use electricity'], answer: 0, why: 'About 1,000 W of sunlight per square metre at best, with about a fifth converted, is far below what a fast heavy robot draws.' },
    atlas: [{ label: 'Battery power systems', href: '/atlas/concept/battery-power-systems' }, { label: 'Mobile robot', href: '/atlas/concept/mobile-robot' }], next: 'robot-battery-life',
  },
  {
    slug: 'window-cleaner', title: 'Window-Cleaning Robots: How They Stick to Glass', course: 'work', ids: ['TowvUui91ko'], publishAt: '2026-12-17T18:00:00Z',
    summary: 'A home window robot holds itself on the glass with a suction fan and wipes in a pattern. Skyscraper robots are still rare; the leading example rides on the building’s own cleaning gondola.',
    what: [
      'A home window-cleaning robot has a fan that pulls air out from under it, so outside air pressure presses it flat against the glass. Soft tracks or rotating pads move it across the window while cloths wipe, and edge sensors tell it when it reaches the frame. A safety cord catches it if the suction fails.',
      'On skyscrapers, most cleaning is still done from a gondola, the building maintenance unit, that hangs from the roof. Robots up there are still rare. A few newer systems, such as Skyline Robotics’ Ozmo, mount a robot arm in that gondola, with an operator supervising from the roof.',
    ],
    withIt: 'Fewer people have to hang off tall buildings, and windows can be cleaned more often and more evenly.',
    without: 'Window cleaning at height stays one of the riskier jobs in building maintenance.',
    limit: 'Wind, window frames, sealant joints and dirty glass make it hard to grip and move. Most high-rise robots still need a human operator on site.',
    demo: 'loop', loop: ['Fan sucks the robot onto the glass', 'Pads wipe in a pattern', 'Edge sensors turn it at the frame'],
    quiz: { q: 'What holds a home window-cleaning robot on the glass?', options: ['Glue', 'A fan that creates suction under it', 'Magnets'], answer: 1, why: 'The fan lowers the pressure under the robot, so the air outside presses it against the glass.' },
    atlas: [{ label: 'Window-cleaning robot', href: '/atlas/concept/window-cleaning-robot' }, { label: 'Suction gripper', href: '/atlas/concept/suction-gripper' }], next: 'wall-climbing-robots',
  },
]

/**
 * Shorts in this batch that repeat a topic which already has a lesson. Each joins
 * its lesson as an extra embed on its release day; the slug printed in its
 * YouTube description 308s here (next.config.mjs, "Quick Lessons batch 4").
 * MxnUhrL4RtI and Z0_wOic-YRo were scheduled earlier as second cuts and link to
 * the owning lesson directly.
 */
export const DEC_EXTRA_VIDEOS: Record<string, { id: string; publishAt: string }[]> = {
  'pid-controller': [{ id: 'MxnUhrL4RtI', publishAt: '2026-12-04T18:00:00Z' }],
  'inverse-kinematics': [{ id: 'Z0_wOic-YRo', publishAt: '2026-12-05T15:00:00Z' }, { id: 'wWDxyJWhlqk', publishAt: '2026-12-21T18:00:00Z' }],
  'gyroscope-imu': [{ id: '57_llSrya5o', publishAt: '2026-12-18T15:00:00Z' }],
  'robot-hand-egg': [{ id: '2hHJyovGC_w', publishAt: '2026-12-18T18:00:00Z' }],
  'slam': [{ id: '-NTyw_lpucQ', publishAt: '2026-12-19T15:00:00Z' }, { id: 'S_-NdUysBqU', publishAt: '2026-12-23T15:00:00Z' }],
  'vacuum-corners': [{ id: 'qNS0_sX14s8', publishAt: '2026-12-19T18:00:00Z' }],
  'gain-and-damping': [{ id: '7V3mr0RMNGk', publishAt: '2026-12-20T15:00:00Z' }],
  'qr-navigation': [{ id: 'M_ACEXI4E6U', publishAt: '2026-12-20T18:00:00Z' }],
  'drone-stays-level': [{ id: 'rnAsvxZGN-8', publishAt: '2026-12-21T15:00:00Z' }],
  'stairs': [{ id: 'coEFE_-hcbY', publishAt: '2026-12-22T15:00:00Z' }],
  'lidar-fog-radar-fusion': [{ id: '9wjddnMKHG0', publishAt: '2026-12-22T18:00:00Z' }],
}
