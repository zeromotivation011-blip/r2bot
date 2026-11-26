#!/usr/bin/env python3
"""Writes content/courses/humanoid-robots-race-to-build-a-worker/course.json (Series 2, Course B)."""
import json
import os

LESSONS = [
    {
        "id": "01-what-is-a-humanoid-robot-and-why-legs",
        "title": "What Is a Humanoid Robot, and Why Give It Legs?",
        "summary": "Explain what makes a robot 'humanoid' and why legs, not wheels, are the hard but deliberate choice.",
        "videoNo": 1, "durationMin": 4,
        "quiz": [
            {"q": "What makes a robot 'humanoid' rather than just any robot?", "options": ["A body plan roughly matching a human's: torso, two arms, two legs, a head", "Any robot that can talk", "Any robot that is painted silver"], "answer": 0, "why": "Humanoid specifically refers to the human-like body layout, not intelligence or appearance details."},
            {"q": "Why do engineers choose legs for some robots, even though wheels are simpler?", "options": ["So the robot can use the stairs, doors and tools already built for human bodies", "Legs are always cheaper than wheels", "Legs use no motors at all"], "answer": 0, "why": "The human world — stairs, ladders, vehicle cabs, tools — is built for human-shaped bodies, which is the main argument for legs."},
            {"q": "What is a major downside of legs compared to wheels?", "options": ["Legs need constant active balance and are mechanically more complex", "Legs cannot be made from metal", "Legs are banned indoors"], "answer": 0, "why": "Keeping a legged robot upright takes continuous sensing and correction, unlike a wheeled base that's stable by default."},
            {"q": "Why might a warehouse choose a wheeled robot over a humanoid for most of its tasks?", "options": ["Wheels are simpler, cheaper and more efficient on flat factory floors", "Warehouses have no flat floors", "Wheeled robots are illegal in warehouses"], "answer": 0, "why": "On flat, predictable floors, wheels are usually the more efficient and reliable choice — legs earn their keep where the terrain is human-built."},
        ],
    },
    {
        "id": "02-who-is-building-humanoid-robots",
        "title": "Who Is Building Humanoid Robots, and What Each Wants",
        "summary": "Survey Optimus, Figure, Atlas, Digit and Unitree, and the different bets each company is making.",
        "videoNo": 2, "durationMin": 5,
        "quiz": [
            {"q": "Companies building humanoids today are mostly targeting which first use case?", "options": ["Warehouse and light factory work", "Deep-sea exploration", "Space tourism"], "answer": 0, "why": "Most current humanoid programs are piloting in warehouses and factories, where tasks are structured and repeatable."},
            {"q": "Why are several different companies building humanoids at once right now?", "options": ["Advances in AI, batteries and actuators have made it newly plausible, so many are racing to be first", "It is required by a single global law", "Humanoids were invented last week"], "answer": 0, "why": "A convergence of better machine learning, batteries and actuators has made the humanoid bet look newly realistic to many companies at once."},
            {"q": "What's one reason companies differ in their humanoid designs?", "options": ["Different bets on whether to prioritize cost, strength, dexterity or software first", "They are all copying exactly one design", "Robot designs are randomly generated"], "answer": 0, "why": "Each company makes different trade-offs — some prioritize low-cost manufacturing, others prioritize dexterous hands or advanced AI."},
            {"q": "Quadruped robot makers like Boston Dynamics (Spot) differ from humanoid makers mainly by…", "options": ["Choosing a four-legged shape instead of a two-legged human shape for different task needs", "Not using any motors", "Building robots that cannot move at all"], "answer": 0, "why": "Quadrupeds trade human-tool compatibility for simpler balance and robustness on rough terrain — a different bet than humanoids."},
        ],
    },
    {
        "id": "03-how-a-humanoid-stays-on-its-feet",
        "title": "How a Humanoid Stays on Its Feet",
        "summary": "See the sense-and-correct loop — gyroscopes, foot sensors and fast control — that keeps a two-legged robot upright.",
        "videoNo": 3, "durationMin": 4,
        "quiz": [
            {"q": "What keeps a humanoid robot from falling over as it walks?", "options": ["Constant balance sensing and fast motor corrections, many times per second", "A single rule set once at the factory", "Nothing; they simply don't fall"], "answer": 0, "why": "Balance is an active, continuous process of sensing tilt and correcting it rapidly, not a one-time setup."},
            {"q": "Which sensors are key to a humanoid's balance system?", "options": ["Gyroscopes/accelerometers and foot-pressure sensors", "Microphones only", "Colour cameras only"], "answer": 0, "why": "Inertial sensors detect tilt and motion, while foot sensors detect contact and weight distribution — both feed the balance loop."},
            {"q": "Why do humanoid robots often bend their knees slightly while walking?", "options": ["It lowers the centre of gravity and keeps joints ready to react quickly", "It saves paint", "It is only for appearance"], "answer": 0, "why": "A slightly bent stance improves stability and leaves joints room to absorb a push or stumble."},
            {"q": "What happens if the balance control loop runs too slowly?", "options": ["The robot can't correct a stumble in time and may fall", "The robot becomes lighter", "The battery charges faster"], "answer": 0, "why": "Balance corrections must happen within milliseconds; a slow loop means a real stumble turns into a fall."},
        ],
    },
    {
        "id": "04-why-robot-hands-are-the-hardest-part",
        "title": "Why Robot Hands Are the Hardest Part",
        "summary": "Understand why a dexterous hand, not legs, is often the most expensive and hardest-to-perfect part of a humanoid.",
        "videoNo": 4, "durationMin": 4,
        "quiz": [
            {"q": "Why are robot hands often considered harder to build well than legs?", "options": ["Hands need many small, precise actuators and rich touch sensing packed into a tiny space", "Hands never need any sensors", "Hands are simply larger than legs"], "answer": 0, "why": "Fitting many degrees of freedom and fine touch sensing into a hand-sized package is an extreme packaging and control challenge."},
            {"q": "What does a hand need, beyond motors, to grip a wide range of objects well?", "options": ["Touch/force feedback to judge grip strength and slipping", "Nothing else is needed", "A fixed grip shape for every object"], "answer": 0, "why": "Without feedback on force and slip, a hand either crushes delicate items or drops heavy ones."},
            {"q": "Why can a robot hand cost more than the rest of a humanoid's body?", "options": ["Its many small precision actuators and sensors are expensive to engineer and manufacture", "Hands are made of gold", "Cost has nothing to do with complexity"], "answer": 0, "why": "The sheer density of precision parts packed into a small hand drives up its engineering and manufacturing cost."},
            {"q": "A simpler two- or three-finger gripper is often used instead of a full hand because…", "options": ["It is cheaper and reliable enough for many structured warehouse tasks", "Full hands are banned in factories", "Grippers can lift more than any hand ever could"], "answer": 0, "why": "For many repeatable tasks, a simple gripper is a good enough, lower-cost trade-off compared to a full dexterous hand."},
        ],
    },
    {
        "id": "05-how-humanoids-learn-by-watching-people",
        "title": "How Humanoid Robots Learn by Watching People",
        "summary": "See how imitation learning and VR teleoperation let a robot pick up a skill from watching a human do it.",
        "videoNo": 5, "durationMin": 4,
        "quiz": [
            {"q": "What is 'imitation learning' for a robot?", "options": ["Learning a skill by studying examples of a human performing it", "Copying another robot's paint job", "Random trial and error with no data at all"], "answer": 0, "why": "Imitation learning trains a robot's model on demonstrations, rather than hand-coding every motion."},
            {"q": "How can a person teach a robot remotely using VR?", "options": ["By teleoperating the robot's arms/hands in VR while the robot records the motion as training data", "By writing a letter to the robot", "VR cannot be used with robots"], "answer": 0, "why": "VR teleoperation lets a human demonstrate tasks through the robot's own body, generating useful training data."},
            {"q": "Why is learning from demonstration often faster than hand-coding every motion?", "options": ["One good demonstration can teach a flexible skill instead of writing exhaustive rules for every case", "Hand-coding is actually always faster", "Demonstrations teach nothing useful"], "answer": 0, "why": "A model trained on demonstrations can generalize to similar situations, instead of needing a rule written for every possible case."},
            {"q": "What does it mean when 'one robot learns a skill, all of them get it'?", "options": ["A trained model can be copied or shared across many robots of the same design", "Robots communicate telepathically", "Only one robot in the world is ever allowed to learn"], "answer": 0, "why": "Because the skill lives in software (a trained model), it can be deployed to every robot running that software, unlike a human skill."},
        ],
    },
    {
        "id": "06-boston-dynamics-from-bigdog-to-atlas",
        "title": "Boston Dynamics: From BigDog to Atlas",
        "summary": "Trace the company's path from the early rough-terrain BigDog quadruped to today's agile Atlas humanoid.",
        "videoNo": 6, "durationMin": 5,
        "quiz": [
            {"q": "What was BigDog, an early Boston Dynamics robot, designed to do?", "options": ["Carry heavy loads over rough terrain for the military", "Fly through the air", "Play chess"], "answer": 0, "why": "BigDog was a rough-terrain quadruped built to carry gear across difficult ground."},
            {"q": "Atlas, Boston Dynamics' humanoid, is best known for demonstrating…", "options": ["Dynamic, athletic movement like running, jumping and recovering balance", "The cheapest robot ever made", "The first robot with no sensors"], "answer": 0, "why": "Atlas is a research platform showcasing highly dynamic, athletic humanoid movement."},
            {"q": "Why does Boston Dynamics' long history across many robot shapes matter?", "options": ["It shows decades of compounding knowledge about balance, actuators and control reused across designs", "It shows they only ever built one robot", "History has no bearing on engineering"], "answer": 0, "why": "Core balance and control expertise built on early robots carried forward and sped up later, more advanced designs."},
            {"q": "What marks the shift from early Boston Dynamics robots to today's humanoids?", "options": ["Hydraulics-focused robust prototypes gave way to more electric, commercially-aimed designs", "Nothing changed at all", "They stopped using any sensors"], "answer": 0, "why": "Boston Dynamics moved from hydraulic research platforms toward more electric, manufacturable designs aimed at real deployment."},
        ],
    },
    {
        "id": "07-robot-dogs-spot-and-four-legged-machines",
        "title": "Robot Dogs: Spot and the Four-Legged Machines",
        "summary": "Look at why four legs are often a more practical choice than two, and where quadruped robots already work.",
        "videoNo": 7, "durationMin": 4,
        "quiz": [
            {"q": "Why are four-legged (quadruped) robots often more stable than two-legged ones?", "options": ["More legs give a wider, more stable support base at any moment", "Four legs always weigh less", "Quadrupeds never use sensors"], "answer": 0, "why": "With four legs, it's easier to always keep multiple feet on the ground, which naturally aids stability."},
            {"q": "Where are quadruped robots like Spot already used in the real world?", "options": ["Site inspections, hazardous environments and remote monitoring", "Only in toy stores", "Nowhere; they are purely research demos"], "answer": 0, "why": "Quadrupeds are already deployed for inspection tasks in industrial and hazardous settings."},
            {"q": "What's a trade-off quadrupeds make compared to humanoids?", "options": ["They can't use human tools or stairs/doors as naturally, but gain stability and robustness", "They are always more expensive", "They cannot carry any sensors"], "answer": 0, "why": "Giving up the human body plan costs some tool/environment compatibility in exchange for simpler, sturdier mobility."},
            {"q": "What helps a robot dog like Spot recover after being pushed or kicked?", "options": ["Real-time balance control reacting within a fraction of a second", "It simply falls over every time", "A person must always catch it"], "answer": 0, "why": "Fast active balance control is what lets these robots absorb a shove and keep walking."},
        ],
    },
    {
        "id": "08-exoskeletons-robots-you-wear",
        "title": "Exoskeletons: Robots You Wear",
        "summary": "Learn how wearable exoskeletons add strength or support, and where they're used in industry and rehabilitation.",
        "videoNo": 8, "durationMin": 4,
        "quiz": [
            {"q": "What is an exoskeleton, in the robotics sense?", "options": ["A wearable powered frame that adds strength or support to a human body", "A robot that replaces a human entirely", "A type of paint used on robots"], "answer": 0, "why": "Exoskeletons are worn devices that augment the human body rather than replace it."},
            {"q": "Where are industrial exoskeletons commonly used today?", "options": ["Factories and warehouses, to reduce strain from repetitive lifting", "Only in outer space", "Only in video games"], "answer": 0, "why": "Many companies already use exoskeletons to reduce worker fatigue and injury from repeated lifting."},
            {"q": "How can a medical exoskeleton help someone with a mobility impairment?", "options": ["By powering leg movement to help them stand or walk", "By making their condition worse on purpose", "By replacing the need for any medical treatment"], "answer": 0, "why": "Medical exoskeletons can provide powered assistance for standing and walking during rehabilitation or daily life."},
            {"q": "Why is an exoskeleton generally simpler to build than a full humanoid robot?", "options": ["It relies on the wearer's own balance and brain, adding power rather than full autonomy", "It has no moving parts at all", "It requires no engineering at all"], "answer": 0, "why": "An exoskeleton assists a human who already balances and decides, which removes a huge part of a standalone robot's hardest problems."},
        ],
    },
    {
        "id": "09-can-a-humanoid-do-your-housework",
        "title": "Can a Humanoid Do Your Housework? A Reality Check",
        "summary": "Compare demo videos of humanoids folding laundry to what's realistic for unstructured homes today.",
        "videoNo": 9, "durationMin": 4,
        "quiz": [
            {"q": "Why is a home a harder environment for a robot than a warehouse?", "options": ["Homes are unstructured and unpredictable, with objects and layouts that constantly change", "Homes have no floors", "Warehouses have more furniture than homes"], "answer": 0, "why": "Warehouses are designed for predictability; homes are cluttered, varied, and constantly rearranged by people."},
            {"q": "What should viewers be cautious about with flashy humanoid demo videos?", "options": ["Some demos are edited, sped up, or partly teleoperated rather than fully autonomous", "All demo videos are scientifically verified live broadcasts", "Demo videos never exist"], "answer": 0, "why": "It's well documented that some robot demo footage involves editing or human assistance, so viewers should check sourcing and claims."},
            {"q": "What household task is currently more realistic for a robot than general housework?", "options": ["A single repeatable task, like folding one type of clothing in a fixed spot", "Any task at all, instantly, everywhere", "Cooking any dish perfectly from any recipe"], "answer": 0, "why": "Current robots do best with narrow, repeatable tasks rather than the full variety of general housework."},
            {"q": "What's the realistic near-term timeline many experts give for full general-purpose home robots?", "options": ["Still years away, with narrow task capability coming first", "Already fully solved and on sale", "Impossible forever"], "answer": 0, "why": "Most experts see narrow capabilities arriving first, with broad, reliable general home robots still some years out."},
        ],
    },
    {
        "id": "10-will-humanoids-take-jobs",
        "title": "Will Humanoids Take Jobs? What They Will Really Do",
        "summary": "Look past the headlines at which jobs are realistically targeted first, and which are not.",
        "videoNo": 10, "durationMin": 5,
        "quiz": [
            {"q": "Which kinds of jobs are companies targeting first for humanoid robots?", "options": ["Repetitive, physically demanding tasks in controlled settings like warehouses", "Creative writing jobs", "Jobs requiring deep emotional counselling"], "answer": 0, "why": "The current first wave of deployment targets structured, repetitive physical tasks, not creative or emotionally nuanced work."},
            {"q": "Why do most economists expect humanoid adoption to be gradual rather than overnight?", "options": ["Cost, reliability and task limitations mean deployment happens task-by-task over years", "All factories will switch in a single day by law", "Robots are already in every job worldwide"], "answer": 0, "why": "Real deployment is constrained by cost, reliability, and how narrow current robot skills are, which spreads adoption out over time."},
            {"q": "What is one likely effect on existing workers in an early-adopting factory?", "options": ["Workers may shift toward supervising, maintaining or training robots, not simply lose work overnight", "All human workers are fired on day one everywhere", "Nothing about any job will ever change"], "answer": 0, "why": "In early deployments, human roles often shift toward overseeing and maintaining the new systems rather than disappearing instantly."},
            {"q": "Why is it misleading to say humanoids will simply 'replace all jobs'?", "options": ["Today's robots handle narrow physical tasks, not most knowledge work, judgment calls or caregiving", "Because robots cannot move at all", "Because no robot has ever worked alongside a human"], "answer": 0, "why": "Current humanoid capability is narrow and physical, far from the broad judgment and social skills many jobs need."},
        ],
    },
]

course = {
    "title": "Humanoid Robots: The Race to Build a Robot Worker",
    "order": 7,
    "tagline": "Who is building humanoid robots, how they balance and learn, and what they will actually do.",
    "description": "Ten lessons on the humanoid robot race: Optimus, Figure, Atlas, Digit and Unitree, how a two-legged robot balances and learns, Boston Dynamics' history, exoskeletons, and a reality check on what humanoids can really do at home and at work.",
    "outcome": "After this course you can explain how a humanoid robot balances and learns, name the major companies and their different bets, and give a realistic view of what humanoid workers will and won't do soon.",
    "level": "Beginner",
    "levelLabel": "Beginner, no experience needed",
    "whoFor": "Anyone curious about the humanoid robot headlines and what's actually real behind them.",
    "prerequisites": "None. No maths or coding needed.",
    "status": "published",
    "instructor": "R2BOT",
    "presenters": ["R2BOT"],
    "updated": "2026-11-27",
    "availability": "soon",
    "minutes": 43,
    "outcomes": [
        "Explain why some robots get legs and others get wheels or four legs",
        "Describe how a humanoid robot keeps its balance in real time",
        "Explain why robot hands are often the hardest and most expensive part",
        "Describe how robots learn from human demonstration and VR teleoperation",
        "Give a realistic view of which jobs humanoids are likely to take on first",
    ],
    "finalActivity": {
        "lessonId": "10-will-humanoids-take-jobs",
        "title": "Pick one job and reality-check it",
        "prompt": "Pick one job you know well. Write one sentence on which part of it a humanoid robot could realistically do today, and one sentence on which part it cannot do yet, and why.",
    },
    "lessons": [
        {"id": l["id"], "title": l["title"], "summary": l["summary"], "youtubeId": "", "videoNo": l["videoNo"], "durationMin": l["durationMin"], "quiz": l["quiz"]}
        for l in LESSONS
    ],
}

out_dir = os.path.join("content", "courses", "humanoid-robots-race-to-build-a-worker")
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "course.json")
with open(out_path, "w") as f:
    json.dump(course, f, indent=2, ensure_ascii=False)
    f.write("\n")
print("Wrote", out_path, "with", len(course["lessons"]), "lessons")
