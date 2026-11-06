// India hub content. Only well-documented, stable facts. No prices, no market-size numbers.
export const MILESTONES = [
  { year: '2013-14', title: 'Mangalyaan reaches Mars orbit', text: 'ISRO\'s Mars Orbiter Mission was launched in November 2013 and entered Mars orbit in September 2014. India became the first country to reach Mars orbit on its first attempt.' },
  { year: '2020', title: 'Vyommitra unveiled', text: 'ISRO showed Vyommitra, a female-looking half-humanoid robot made to ride in uncrewed test flights of the Gaganyaan human spaceflight programme.' },
  { year: '2023', title: 'Chandrayaan-3 lands near the Moon\'s south pole region', text: 'On 23 August 2023 the Vikram lander touched down and the Pragyan rover rolled out. India became the fourth country to soft-land on the Moon.' },
  { year: '2023', title: 'Aditya-L1 launched', text: 'India\'s first space mission to study the Sun was launched in September 2023.' },
]
export const COMPANIES = [
  { name: 'GreyOrange', what: 'Warehouse robots and software that move goods in fulfilment centres.' },
  { name: 'Addverb', what: 'Warehouse and factory automation, part of the Reliance group.' },
  { name: 'Genrobotics', what: 'Kerala company behind Bandicoot, a robot for cleaning manholes.' },
  { name: 'CynLr', what: 'Bengaluru startup working on robot vision for picking unfamiliar objects.' },
  { name: 'Ati Motors', what: 'Bengaluru company making self-driving vehicles for factories and warehouses.' },
]
export const PROGRAMMES = [
  { name: 'Atal Tinkering Labs', text: 'Part of the Atal Innovation Mission (set up in 2016 under NITI Aayog). Schools get lab space to build with electronics and robotics. Ask your school if it has one.' },
  { name: 'DD Robocon', text: 'The national contest that picks India\'s team for the international ABU Robocon, run by Doordarshan. Engineering college teams build competition robots.' },
  { name: 'DRDO CAIR, Bengaluru', text: 'DRDO\'s Centre for Artificial Intelligence and Robotics works on robots and AI for defence uses. It is behind robots such as Daksh.' },
]
export const MARKETS = [
  { city: 'Mumbai', place: 'Lamington Road' }, { city: 'Delhi', place: 'Nehru Place and Lajpat Rai Market' },
  { city: 'Bengaluru', place: 'SP Road' }, { city: 'Chennai', place: 'Ritchie Street' },
]
export const STAGES = [
  { stage: 'Class 6 to 10', steps: ['Watch the free course path and finish Robotics Foundations.', 'Build a first robot from a kit or Pip\'s parts list.', 'Join the school\'s Atal Tinkering Lab if it has one.', 'Try the simulators on R2BOT. They need no parts.'] },
  { stage: 'Class 11 and 12', steps: ['Learn Python and basic electronics (Ohm\'s law, sensors, motor drivers).', 'Build one project that solves a real problem near you and film a short demo.', 'Learn what PID control is and try it on a line follower.', 'Look for robotics clubs and inter-school contests.'] },
  { stage: 'College', steps: ['Join or start a robotics team. DD Robocon is a goal worth building toward.', 'Learn ROS 2 and one of: vision, control or embedded systems.', 'Publish projects on GitHub with a short write-up and video.', 'Apply for internships at robotics companies and research labs.'] },
  { stage: 'Working or switching careers', steps: ['Pick one niche: warehouse automation, agriculture, inspection or medical robotics.', 'Finish a small, complete project and show it publicly.', 'Learn the software side first (Python, ROS 2), then add hardware.', 'Talk to people in the field. Many roles come from projects and referrals.'] },
]
export const PROBLEMS = [
  { id: 'farm', label: 'Spraying and weeding on small farms', robot: 'A small wheeled or tracked robot with a camera and a sprayer.', sensors: 'Camera to tell crop from weed, GPS for rows, soil and wheel sensors.', hard: 'Fields are uneven and muddy. Crops look different every week and in every light.', india: 'Plots are small and irregular, so a cheap, light machine beats a huge tractor-sized one.' },
  { id: 'sewer', label: 'Cleaning manholes and sewers', robot: 'A robot with arms and a bucket that works from the street, like Bandicoot.', sensors: 'Cameras, gas sensors and depth sensing in the dark.', hard: 'Dirty, wet and dark. Electronics must be sealed and parts must survive grime.', india: 'The goal is to stop people entering dangerous sewers by hand. This is robotics for dignity and safety.' },
  { id: 'warehouse', label: 'E-commerce warehouses', robot: 'Mobile robots that carry shelves or totes to packing stations.', sensors: 'Lidar, floor markers or cameras, and wheel sensors.', hard: 'Peaks around festival sales mean the robot fleet must plan routes for many robots at once.', india: 'Sale seasons create sudden surges. Flexible robots that scale up matter more than fixed conveyor lines.' },
  { id: 'hospital', label: 'Moving supplies inside hospitals', robot: 'A self-driving cart that carries samples, linen or medicines.', sensors: 'Lidar, depth cameras and bump sensors for corridors full of people.', hard: 'Crowded corridors and lifts. The robot must be gentle and predictable.', india: 'Busy public hospitals need robots that give staff time back for patients.' },
  { id: 'rescue', label: 'Search after floods or building collapse', robot: 'A small tracked or flying robot that fits into gaps.', sensors: 'Thermal camera, microphone, gas sensor and a radio link.', hard: 'Radio signals vanish in rubble and the ground keeps shifting.', india: 'Floods, earthquakes and landslides are real risks, so low-cost rescue robots could save lives.' },
  { id: 'delivery', label: 'Last-mile delivery on crowded roads', robot: 'A small sidewalk or road robot.', sensors: 'Cameras, lidar and GPS with a safety stop.', hard: 'Traffic is unpredictable and sidewalks are not always continuous.', india: 'Roads mix many vehicle types and animals. It is a very hard problem and a great research one.' },
] as const
