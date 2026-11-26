#!/usr/bin/env python3
"""Writes content/courses/robots-that-explore/course.json (Series 2, Course D)."""
import json
import os

LESSONS = [
    {
        "id": "01-how-mars-rovers-drive-themselves",
        "title": "How Mars Rovers Drive Themselves",
        "summary": "See why light-speed delay forces Mars rovers to make some of their own driving decisions, autonomously.",
        "videoNo": 1, "durationMin": 5,
        "quiz": [
            {"q": "Why can't a person on Earth drive a Mars rover in real time like a video game?", "options": ["Radio signals take many minutes to travel to Mars and back, so there's a long delay", "Mars has no radio signals at all", "Rovers have no wheels, so driving doesn't apply"], "answer": 0, "why": "The communication delay (often many minutes each way) makes live joystick control impossible."},
            {"q": "What do rovers use onboard to plan a safe path over short distances?", "options": ["Cameras and onboard software that spot hazards like rocks and slopes", "A live human co-pilot sitting in the rover", "Nothing; they drive completely blind"], "answer": 0, "why": "Rovers use onboard vision and autonomy software to identify obstacles and choose a safe short path."},
            {"q": "How do mission teams typically plan a rover's longer drives?", "options": ["They study images, plan a route, and send a batch of driving instructions once a day", "They send one command every second in real time", "Routes are never planned; the rover wanders at random"], "answer": 0, "why": "Given the communication delay, teams plan ahead and uplink a day's worth of commands rather than controlling live."},
            {"q": "What's a risk the rover's autonomy system must watch for while driving?", "options": ["Wheel slip on sand, or a wheel getting stuck on a hidden rock", "Running out of oxygen, since rovers have none", "Getting a parking ticket"], "answer": 0, "why": "Mars terrain includes loose sand and rocks that can cause wheel slip or getting stuck, which onboard checks try to catch early."},
        ],
    },
    {
        "id": "02-curiosity-and-perseverance",
        "title": "Curiosity and Perseverance: What They Actually Do",
        "summary": "Compare the two NASA rovers' science instruments and what each is actually searching for on Mars.",
        "videoNo": 2, "durationMin": 5,
        "quiz": [
            {"q": "What is a major focus of Curiosity's mission on Mars?", "options": ["Studying Mars' climate and geology to see if it could ever have supported life", "Building a human colony immediately", "Repairing other rovers"], "answer": 0, "why": "Curiosity's mission centers on studying Martian geology and past habitability."},
            {"q": "What distinguishes Perseverance's mission from Curiosity's?", "options": ["It collects and caches rock samples intended for eventual return to Earth", "It cannot move at all, unlike Curiosity", "It has no scientific instruments onboard"], "answer": 0, "why": "A signature goal of Perseverance is caching samples for a future mission to bring back to Earth for study."},
            {"q": "What onboard tool helps these rovers examine rock composition without touching the rock directly?", "options": ["Laser/spectrometer instruments that analyze rock from a distance", "A rover's wheels, used to feel the rock", "A simple magnifying glass held by a human nearby"], "answer": 0, "why": "Laser-based spectrometers let these rovers analyze chemical composition remotely, without physical sampling every time."},
            {"q": "Why do both rovers still rely on human teams for science decisions?", "options": ["People interpret rover data and decide which sites are scientifically worth exploring next", "Humans have no role once a rover launches", "Decisions are made entirely by a coin flip"], "answer": 0, "why": "Scientists on Earth analyze data the rover sends and plan which sites to investigate further."},
        ],
    },
    {
        "id": "03-how-a-drone-flies",
        "title": "How a Drone Flies",
        "summary": "Understand how four spinning rotors, tilted together, let a quadcopter drone hover, move and turn.",
        "videoNo": 3, "durationMin": 4,
        "quiz": [
            {"q": "How does a typical quadcopter drone stay level and hover?", "options": ["By precisely balancing the speed of its four rotors many times per second", "By flapping wings like a bird", "By floating on a cushion of compressed air"], "answer": 0, "why": "A flight controller rapidly adjusts each rotor's speed to keep the drone balanced and stable."},
            {"q": "How does a drone move forward instead of just hovering in place?", "options": ["It tilts slightly by spinning some rotors faster than others, directing thrust sideways", "It uses a small propeller pointed sideways only", "It cannot move forward; it only hovers"], "answer": 0, "why": "Tilting the whole drone redirects some of the rotors' thrust horizontally, producing forward motion."},
            {"q": "What sensor combination helps a drone know its orientation in the air?", "options": ["Gyroscopes and accelerometers (inertial sensors)", "A thermometer only", "Nothing; drones fly with no sensors"], "answer": 0, "why": "Inertial sensors measure tilt and rotation many times a second, which the flight controller needs to stay stable."},
            {"q": "Why do quadcopters usually have an even number of rotors spinning in opposite directions?", "options": ["To cancel out rotational force so the drone's body doesn't spin uncontrollably", "It is only for symmetry in photographs", "Even numbers are required by international law"], "answer": 0, "why": "Pairs of rotors spinning opposite ways cancel each other's torque, keeping the body from spinning."},
        ],
    },
    {
        "id": "04-drone-delivery-and-farm-drones",
        "title": "Drone Delivery and Farm Drones",
        "summary": "See how delivery drones plan safe routes, and how farm drones spot crop problems and save water.",
        "videoNo": 4, "durationMin": 4,
        "quiz": [
            {"q": "What's a major technical challenge for drone delivery at scale?", "options": ["Safely sharing airspace and avoiding obstacles, weather and other aircraft", "Drones cannot carry any packages at all", "There is no challenge; it is already fully solved everywhere"], "answer": 0, "why": "Airspace safety, weather and obstacle avoidance remain significant hurdles for widespread drone delivery."},
            {"q": "How can a farm drone help save water?", "options": ["By spotting dry or stressed areas of a field so irrigation targets only where it's needed", "By spraying water everywhere equally regardless of need", "Drones cannot be used for agriculture"], "answer": 0, "why": "Precision imaging lets farmers irrigate only the areas that actually need it, reducing waste."},
            {"q": "What kind of sensor often helps farm drones detect crop stress before it's visible to the eye?", "options": ["Multispectral or infrared cameras that detect plant health signals", "A simple microphone", "A regular smartphone camera only, with no special sensor"], "answer": 0, "why": "Multispectral imaging can reveal plant stress (like water or nutrient issues) earlier than the naked eye can see it."},
            {"q": "Why do delivery drones typically fly pre-approved routes rather than go anywhere freely?", "options": ["Regulators require defined safe corridors to manage air traffic and risk", "Drones are physically incapable of turning", "There are no rules governing drone flight anywhere"], "answer": 0, "why": "Aviation authorities generally require approved routes and altitudes to manage safety and traffic."},
        ],
    },
    {
        "id": "05-underwater-robots-rovs-and-auvs",
        "title": "Underwater Robots: ROVs and AUVs Explained",
        "summary": "Learn the difference between a tethered ROV piloted from a ship and a fully autonomous underwater vehicle (AUV).",
        "videoNo": 5, "durationMin": 4,
        "quiz": [
            {"q": "What does ROV stand for, and how is it typically controlled?", "options": ["Remotely Operated Vehicle, controlled live by a pilot through a tether cable", "Robotic Ocean Vessel, controlled by voice commands only", "Rapid Orbital Vehicle, controlled from space"], "answer": 0, "why": "An ROV is tethered to a surface ship and piloted live, with the cable carrying both power and control signals."},
            {"q": "What does AUV stand for, and how does it typically operate?", "options": ["Autonomous Underwater Vehicle, which follows a pre-programmed mission without a live tether", "Automated Upward Vessel, which only moves toward the surface", "Aerial Underwater Vehicle, which flies then dives"], "answer": 0, "why": "AUVs run independently on a planned mission, not tied to a live human controller."},
            {"q": "Why does radio communication fail underwater, affecting these robots' design?", "options": ["Radio waves are absorbed quickly by water, so other methods like cables or acoustic signals are used instead", "Radio waves travel faster underwater than in air", "There is no difference between radio underwater and in air"], "answer": 0, "why": "Water strongly attenuates radio waves, which is why tethers (ROVs) or acoustic signalling (AUVs) are used instead."},
            {"q": "What's a common real-world use for ROVs and AUVs?", "options": ["Inspecting pipelines, mapping the seafloor, or exploring shipwrecks", "Delivering mail to coastal towns", "Replacing all commercial fishing boats"], "answer": 0, "why": "These underwater robots are widely used for industrial inspection, scientific mapping, and exploration tasks."},
        ],
    },
    {
        "id": "06-robot-arms-in-space",
        "title": "Robot Arms in Space: How Canadarm Works",
        "summary": "See how the Canadarm's jointed, cable-driven arm grapples cargo and helps assemble the space station.",
        "videoNo": 6, "durationMin": 4,
        "quiz": [
            {"q": "What is Canadarm primarily used for on the space station?", "options": ["Capturing, moving and berthing cargo spacecraft and assisting with station assembly and maintenance", "Cooking meals for astronauts", "Firing rocket thrusters to change the station's orbit"], "answer": 0, "why": "Canadarm-type systems are robotic arms used to grapple and move spacecraft and assist in assembly tasks."},
            {"q": "How is an arm like Canadarm typically controlled?", "options": ["By astronauts operating it remotely from inside the station using cameras and controls", "It makes all decisions fully on its own with no human input", "By a ground-based robot pressing physical buttons"], "answer": 0, "why": "Astronauts typically operate the arm using camera views and manual controls from inside the spacecraft."},
            {"q": "Why must a space robotic arm be engineered differently than an arm on Earth?", "options": ["Microgravity, vacuum and temperature extremes require specialized materials and lubrication", "Space arms can be made from any ordinary material with no changes", "There is no meaningful difference in engineering requirements"], "answer": 0, "why": "The vacuum, radiation and temperature swings of space require specialized engineering well beyond a typical Earth-based arm."},
            {"q": "Why is grappling a free-floating spacecraft in orbit a hard robotics problem?", "options": ["Both the arm's base and the target are moving, so precise relative motion must be judged and matched", "The target object is always perfectly still and simple to grab", "Grappling requires no coordination at all"], "answer": 0, "why": "Matching position and velocity between two moving objects in orbit, with no gravity to simplify things, is a genuinely hard control problem."},
        ],
    },
    {
        "id": "07-self-driving-cars",
        "title": "Self-Driving Cars: How They See the Road",
        "summary": "Learn how cameras, radar and LIDAR combine so a self-driving car can see lanes, cars and pedestrians.",
        "videoNo": 7, "durationMin": 5,
        "quiz": [
            {"q": "Why do many self-driving car systems combine multiple sensor types (cameras, radar, LIDAR)?", "options": ["Each sensor type has strengths and weaknesses, so combining them improves reliability", "Using more than one sensor is purely for show", "Only one sensor type is actually ever used"], "answer": 0, "why": "Sensor fusion lets a car cover for the weaknesses of any single sensor type (for instance, camera struggles in glare, radar sees through fog)."},
            {"q": "What's a key situation that remains hardest for self-driving systems?", "options": ["Rare, unusual edge cases like unexpected debris or erratic human behaviour", "Driving in a straight line on an empty road", "Stopping at a red light"], "answer": 0, "why": "Common scenarios are well handled; it's the rare 'long tail' of unusual situations that remain the biggest challenge."},
            {"q": "What does LIDAR measure to help a car understand its surroundings?", "options": ["Distance to objects, by timing laser light bouncing back", "Only sound levels around the car", "The car's own fuel level"], "answer": 0, "why": "LIDAR measures distance precisely by timing how long laser pulses take to reflect back."},
            {"q": "Why is it misleading to call current widely available systems 'fully self-driving'?", "options": ["Most production systems today still require a human to stay alert and ready to take over", "All production cars today are already fully autonomous everywhere", "Self-driving technology does not exist in any car"], "answer": 0, "why": "Most consumer systems on the road are advanced driver-assist, not fully autonomous, and still expect driver attention."},
        ],
    },
    {
        "id": "08-rescue-robots",
        "title": "Rescue Robots That Go Into Rubble",
        "summary": "See how small tracked or snake-like robots search collapsed buildings where it's too dangerous to send people.",
        "videoNo": 8, "durationMin": 4,
        "quiz": [
            {"q": "Why are robots used to search collapsed buildings after disasters?", "options": ["They can enter tight, unstable spaces too dangerous for human rescuers", "Robots are faster than running water", "Robots are required by international treaty"], "answer": 0, "why": "Rescue robots let teams search dangerous rubble without risking a human rescuer's life."},
            {"q": "What body shape is common for a rescue robot navigating rubble?", "options": ["Small, tracked or snake-like bodies that can squeeze through tight, uneven gaps", "Large wheeled trucks that need wide open roads", "A rigid box shape with no flexibility"], "answer": 0, "why": "Tracks and flexible, snake-like designs handle uneven, narrow rubble spaces better than rigid wheeled bodies."},
            {"q": "What sensors help a rescue robot detect a trapped survivor?", "options": ["Thermal cameras, microphones and gas sensors", "Only a basic light bulb", "No sensors are used; it relies on a map alone"], "answer": 0, "why": "Thermal imaging can spot body heat, microphones can detect calls for help, and gas sensors flag hazardous air."},
            {"q": "Why do rescue robots usually stay connected to a human operator rather than acting fully autonomously?", "options": ["Life-or-death decisions in unpredictable rubble benefit from human judgment guiding the robot", "Robots cannot be controlled remotely at all", "Full autonomy is already standard in every rescue robot"], "answer": 0, "why": "The stakes and unpredictability of disaster sites make human-in-the-loop control valuable for current rescue robots."},
        ],
    },
    {
        "id": "09-robot-swarms",
        "title": "Robot Swarms: Many Simple Robots, One Job",
        "summary": "See how many small, simple robots can follow basic local rules to complete a complex task together.",
        "videoNo": 9, "durationMin": 4,
        "quiz": [
            {"q": "What is the core idea behind a robot swarm?", "options": ["Many simple robots follow basic local rules that combine into complex group behaviour", "One single large robot does everything alone", "Swarms require each robot to understand the whole task individually"], "answer": 0, "why": "Swarm robotics relies on simple individual rules producing complex collective results, inspired by social insects."},
            {"q": "Why can swarms be more robust than one large robot for some tasks?", "options": ["Losing a few robots in the swarm doesn't stop the whole task", "A swarm always costs more than one large robot", "Swarms cannot complete any task at all"], "answer": 0, "why": "Distributing the job across many robots means the system can often tolerate individual failures better than a single point of failure."},
            {"q": "What kind of rule might guide an individual robot in a swarm?", "options": ["Stay near some neighbours, avoid collisions, and move toward an area needing coverage", "Each robot must memorize the entire swarm's full plan in advance", "There are no rules; swarms move completely at random"], "answer": 0, "why": "Simple local rules about neighbours and goals are what let swarms self-organize without central micromanagement."},
            {"q": "What's a practical example use for swarm robotics mentioned in this course?", "options": ["Coordinated light shows using many small drones", "Performing brain surgery with a thousand tiny robots", "Replacing all of a city's traffic lights"], "answer": 0, "why": "Drone light shows are a well-known real example of large numbers of simple units coordinating into one visible display."},
        ],
    },
    {
        "id": "10-moon-rovers-and-future-space-robots",
        "title": "Moon Rovers and the Future of Space Robots",
        "summary": "Compare driving on dusty lunar regolith to Mars, and look ahead at upcoming lunar and deep-space robots.",
        "videoNo": 10, "durationMin": 5,
        "quiz": [
            {"q": "What makes lunar dust (regolith) especially tricky for rover wheels?", "options": ["It is fine, abrasive, and can cling to and wear down moving parts", "It is identical to Earth sand with zero differences", "The Moon has no dust at all"], "answer": 0, "why": "Lunar regolith is fine and abrasive, posing wear and clogging risks for mechanical systems over time."},
            {"q": "Why does driving on the Moon involve a shorter communication delay than driving on Mars?", "options": ["The Moon is much closer to Earth than Mars, so signals travel faster round-trip", "There is no communication delay difference at all", "The Moon has faster-than-light communication"], "answer": 0, "why": "The Moon is vastly closer than Mars, so its communication delay is only a couple of seconds rather than minutes."},
            {"q": "What's one upcoming direction for space robotics mentioned in this course?", "options": ["More autonomous rovers and robots supporting future crewed lunar and Mars missions", "Ending all space robotics programs entirely", "Only ever reusing robots built in the 1970s"], "answer": 0, "why": "Space agencies and companies are actively developing more autonomous systems to support upcoming crewed missions."},
            {"q": "Why is greater autonomy valuable for future deep-space robots?", "options": ["Longer communication delays to places like Mars or beyond make real-time human control impractical", "Autonomy is only useful on Earth, never in space", "Communication delays are getting worse the closer a destination is to Earth"], "answer": 0, "why": "As missions go farther, the growing communication delay makes it more important for robots to handle more decisions on their own."},
        ],
    },
]

course = {
    "title": "Robots That Explore: Drones, Rovers and Underwater Machines",
    "order": 9,
    "tagline": "Machines that go where people cannot: Mars, the sky, the ocean floor and space.",
    "description": "Ten lessons on exploration robots: Mars rovers and NASA's Curiosity and Perseverance, how drones fly and deliver, underwater ROVs and AUVs, space station robot arms, self-driving cars, rescue robots, swarms, and the future of Moon and deep-space robots.",
    "outcome": "After this course you can explain how rovers, drones, underwater robots and self-driving cars sense and decide, and why autonomy matters more the farther a robot has to go.",
    "level": "Beginner",
    "levelLabel": "Beginner, no experience needed",
    "whoFor": "Anyone curious about space missions, drones, self-driving cars or underwater exploration.",
    "prerequisites": "None. No maths or coding needed.",
    "status": "published",
    "instructor": "R2BOT",
    "presenters": ["R2BOT"],
    "updated": "2026-11-27",
    "availability": "soon",
    "minutes": 44,
    "outcomes": [
        "Explain why Mars rovers must make some of their own driving decisions",
        "Describe how a drone stays balanced and moves through the air",
        "Tell the difference between a tethered ROV and an autonomous AUV",
        "Explain how a self-driving car combines different sensors to see the road",
        "Describe why autonomy matters more for robots exploring farther from Earth",
    ],
    "finalActivity": {
        "lessonId": "10-moon-rovers-and-future-space-robots",
        "title": "Design a mission robot",
        "prompt": "Pick one place from this course — Mars, the deep ocean, the sky or the Moon — and write one sentence on what sensor or ability you'd prioritise for a robot exploring it, and why.",
    },
    "lessons": [
        {"id": l["id"], "title": l["title"], "summary": l["summary"], "youtubeId": "", "videoNo": l["videoNo"], "durationMin": l["durationMin"], "quiz": l["quiz"]}
        for l in LESSONS
    ],
}

out_dir = os.path.join("content", "courses", "robots-that-explore")
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "course.json")
with open(out_path, "w") as f:
    json.dump(course, f, indent=2, ensure_ascii=False)
    f.write("\n")
print("Wrote", out_path, "with", len(course["lessons"]), "lessons")
