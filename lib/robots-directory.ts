// Robot directory: short, high-confidence entries (maker, country, year, one line).
// Only facts that are stable and well documented. Full profiles live in robots-data.ts.
export type DirType = 'humanoid' | 'industrial' | 'space' | 'consumer' | 'service' | 'educational' | 'cobot' | 'quadruped' | 'warehouse' | 'research' | 'agri-infra'
export interface DirRobot { name: string; maker: string; country: string; flag: string; year: number; type: DirType; line: string }

export const DIR_TYPES: { id: DirType; label: string }[] = [
  { id: 'humanoid', label: 'Humanoid' }, { id: 'industrial', label: 'Industrial arm' }, { id: 'cobot', label: 'Cobot' },
  { id: 'quadruped', label: 'Legged' }, { id: 'space', label: 'Space' }, { id: 'warehouse', label: 'Warehouse' },
  { id: 'consumer', label: 'Home and consumer' }, { id: 'educational', label: 'Education' }, { id: 'research', label: 'Research milestone' },
  { id: 'agri-infra', label: 'Public work' },
]

const R = (name: string, maker: string, country: string, flag: string, year: number, type: DirType, line: string): DirRobot => ({ name, maker, country, flag, year, type, line })

export const DIRECTORY: DirRobot[] = [
  R('Lunokhod 1', 'Soviet Union', 'Soviet Union', '🇷🇺', 1970, 'space', 'The first remote-controlled rover to drive on another world: the Moon.'),
  R('Unimate', 'Unimation', 'USA', '🇺🇸', 1961, 'industrial', 'The first industrial robot arm, put to work on a car factory line in 1961.'),
  R('Shakey', 'SRI International', 'USA', '🇺🇸', 1966, 'research', 'An early mobile robot that could plan its own actions, a milestone for AI planning.'),
  R('WABOT-1', 'Waseda University', 'Japan', '🇯🇵', 1973, 'humanoid', 'Often called the first full-scale humanoid robot, with limbs, vision and speech.'),
  R('PUMA', 'Unimation', 'USA', '🇺🇸', 1978, 'industrial', 'A programmable arm that shaped modern factory robots and robot arm teaching.'),
  R('Canadarm', 'NASA and Canada', 'Canada', '🇨🇦', 1981, 'space', 'The robot arm on the Space Shuttle, first flown in 1981.'),
  R('Husqvarna Automower', 'Husqvarna', 'Sweden', '🇸🇪', 1995, 'consumer', 'One of the first commercial robotic lawnmowers.'),
  R('Honda P2', 'Honda', 'Japan', '🇯🇵', 1996, 'humanoid', 'A self-contained walking humanoid that led the way to ASIMO.'),
  R('Sojourner', 'NASA', 'USA', '🇺🇸', 1997, 'space', 'The first rover to drive on Mars, part of the Pathfinder mission.'),
  R('LEGO Mindstorms', 'LEGO', 'Denmark', '🇩🇰', 1998, 'educational', 'A building kit that taught a generation of students to program robots.'),
  R('Spirit and Opportunity', 'NASA', 'USA', '🇺🇸', 2004, 'space', 'Twin Mars rovers that landed in 2004 and far outlasted their planned missions.'),
  R('BigDog', 'Boston Dynamics', 'USA', '🇺🇸', 2005, 'quadruped', 'A four-legged robot that showed machines could balance on rough ground.'),
  R('QRIO', 'Sony', 'Japan', '🇯🇵', 2003, 'humanoid', 'A small dancing and running humanoid from Sony. It never went on sale.'),
  R('TurtleBot', 'Willow Garage and Open Robotics', 'USA', '🇺🇸', 2010, 'educational', 'A low-cost ROS robot used to teach navigation and mapping.'),
  R('PR2', 'Willow Garage', 'USA', '🇺🇸', 2010, 'research', 'A two-armed research robot that helped grow the ROS software community.'),
  R('Robonaut 2', 'NASA and General Motors', 'USA', '🇺🇸', 2011, 'humanoid', 'A humanoid upper body launched to the International Space Station.'),
  R('Baxter', 'Rethink Robotics', 'USA', '🇺🇸', 2012, 'cobot', 'A friendly two-armed factory robot you could teach by moving its arms.'),
  R('KUKA LBR iiwa', 'KUKA', 'Germany', '🇩🇪', 2013, 'cobot', 'A lightweight arm with torque sensors in every joint, built to work near people.'),
  R('Sawyer', 'Rethink Robotics', 'USA', '🇺🇸', 2015, 'cobot', 'A single-arm collaborative robot for small factory tasks.'),
  R('ABB YuMi', 'ABB', 'Switzerland', '🇨🇭', 2015, 'cobot', 'A small dual-arm robot designed for careful assembly beside people.'),
  R('Anki Cozmo', 'Anki', 'USA', '🇺🇸', 2016, 'consumer', 'A palm-sized toy robot with a lot of personality and a coding mode.'),
  R('ANYmal', 'ANYbotics', 'Switzerland', '🇨🇭', 2016, 'quadruped', 'A legged robot built for inspecting industrial sites.'),
  R('Cassie', 'Agility Robotics', 'USA', '🇺🇸', 2017, 'quadruped', 'A bipedal robot with bird-like legs, a base for later robots like Digit.'),
  R('Handle', 'Boston Dynamics', 'USA', '🇺🇸', 2017, 'warehouse', 'A wheeled robot with a counterbalance arm that moved boxes.'),
  R('Franka Emika Panda', 'Franka Emika', 'Germany', '🇩🇪', 2017, 'cobot', 'A popular research arm known for its smooth, sensitive touch.'),
  R('Jibo', 'Jibo Inc.', 'USA', '🇺🇸', 2017, 'consumer', 'A tabletop social robot that moved and talked with family members.'),
  R('UBTECH Walker', 'UBTECH', 'China', '🇨🇳', 2018, 'humanoid', 'A service humanoid first shown at CES in 2018.'),
  R('Bandicoot', 'Genrobotics', 'India', '🇮🇳', 2018, 'agri-infra', 'A robot built in Kerala to clean manholes so people do not have to enter them.'),
  R('Digit', 'Agility Robotics', 'USA', '🇺🇸', 2019, 'humanoid', 'A bipedal robot designed to move boxes and totes in warehouses.'),
  R('Yutu-2', 'China (CNSA)', 'China', '🇨🇳', 2019, 'space', 'A rover on the far side of the Moon, part of the Chang\'e 4 mission.'),
  R('Ingenuity', 'NASA', 'USA', '🇺🇸', 2021, 'space', 'The first helicopter to make a powered, controlled flight on another planet.'),
  R('Stretch', 'Boston Dynamics', 'USA', '🇺🇸', 2021, 'warehouse', 'A mobile robot with a suction arm built to unload boxes from trucks.'),
  R('Xiaomi CyberOne', 'Xiaomi', 'China', '🇨🇳', 2022, 'humanoid', 'A humanoid prototype shown by a consumer-electronics company.'),
  R('Sanctuary Phoenix', 'Sanctuary AI', 'Canada', '🇨🇦', 2023, 'humanoid', 'A general-purpose humanoid aimed at work in many industries.'),
  R('Apptronik Apollo', 'Apptronik', 'USA', '🇺🇸', 2023, 'humanoid', 'A general-purpose humanoid designed for logistics and manufacturing.'),
  R('Unitree H1', 'Unitree', 'China', '🇨🇳', 2023, 'humanoid', 'A full-size humanoid known for fast, strong legs.'),
  R('Unitree Go2', 'Unitree', 'China', '🇨🇳', 2023, 'quadruped', 'A low-cost robot dog used for research and education.'),
  R('Pragyan', 'ISRO', 'India', '🇮🇳', 2023, 'space', 'The rover of Chandrayaan-3, which landed near the Moon\'s south pole region.'),
]
