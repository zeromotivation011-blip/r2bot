---
updated: 2026-11-28
reviewed: 2026-11-28
---

## The idea in one sentence

The first industrial robot, Unimate, went to work at a General Motors plant in New Jersey in 1961, moving hot metal castings by repeating a list of stored steps, and it showed that a machine following fixed rules could take dull, heavy and dangerous work away from people.

## A machine that remembers a list of moves

In 1954 an American inventor, George Devol, filed a patent called "Programmed Article Transfer". It describes a machine for "the routine job of transporting one article after another from a supply point to a delivery point". The key word is *programmed*. Programmable machines already existed, such as looms and automatic machine tools, and the patent says so; but machines that moved parts from place to place were built for one job. Devol's machine stored a sequence of positions and moved through them, so you could give it a different job by recording a different sequence.

Devol met the engineer and businessman Joseph Engelberger in 1956, and together they set up Unimation to build it. The patent was granted on 13 June 1961, and the same year the first Unimate began work on a General Motors line in Ewing Township, near Trenton, New Jersey (the plant was later known as Inland Fisher Guide).

## The job it did

Unimate's job was moving die castings: metal parts made by forcing molten metal into a mould. They come out hot and heavy, and the work exposed people to toxic fumes and the risk of injury. The robot did not get burned, tired or bored, and it did the same move the same way every time.

It was not small. Unimate weighed about 4,000 pounds (around 1,800 kg), and its arm was driven by hydraulics: liquid under pressure pushing pistons, which gives a lot of force from a compact actuator.

## How it was "taught"

Nobody wrote code for Unimate in the way you might write a program today. An operator moved the gripper to a position, and the robot recorded that position on a rotating **magnetic drum**, an early kind of memory. Step by step, the operator recorded the whole job. Then the robot played the list back, over and over.

This is called **teach-and-repeat** (or playback) programming, and factory robots are still taught this way today, often with a handheld controller called a teach pendant, alongside programming on a computer.

## Why it mattered

- **Safety.** It moved a dangerous job from a person to a machine. Taking people away from heat, heavy loads and repetitive strain is still one of the main reasons factories use robots.
- **Reprogramming.** Because the moves were stored, the same robot could be set up for a different job. That is one of the lines the industry standard draws between a robot and an ordinary machine (see below).
- **A new industry.** Unimation was the first company built to make robots. In 2003 the Unimate was inducted into the Robot Hall of Fame.

The scale today makes the point. According to the International Federation of Robotics, 542,000 industrial robots were installed in 2024, and about 4.66 million were working in factories worldwide at the end of 2024.

## The limit of fixed rules

Unimate had no cameras and no sense of touch. It moved to the recorded positions whether or not the part was there. If a casting arrived in the wrong place, or the job changed, the robot carried on with its old list and got it wrong.

That is the limit of any machine that only follows fixed rules: it works perfectly while the world stays exactly the same. The rest of robotics history is largely the story of adding what Unimate lacked: **sensors** to notice what is really there, and **decisions** that change the plan when something is different. The next lessons in this course cover both.

## Going further

- **What counts as an industrial robot?** The international standard ISO 8373:2021 defines one as an "automatically controlled, reprogrammable multipurpose manipulator, programmable in three or more axes", fixed in place or on a mobile platform, for industrial automation. Unimate's arm is usually described with five axes (later models had six), so it clears the bar comfortably.
- **Point-to-point motion.** Unimate's drum recorded positions and the arm moved from one to the next. Modern controllers still offer this point-to-point mode, alongside continuous-path modes that follow a smooth line, which arc welding, gluing and painting need. Spot welding, an early Unimate job, is point-to-point.
- **Open-loop at the task level.** Each joint had to reach its recorded position, but the robot never checked whether the *task* had succeeded: whether the part was actually in the gripper. Closing that outer loop with sensing is what separates a modern pick-and-place cell, which uses a camera to find each part, from Unimate.
- **Patent against product.** The 1961 production robot differed a lot from the 1954 patent drawing, which described an arm with sliding joints. That is normal: a patent records an idea, and engineering turns it into a machine that works.

## Try it

- Move a robot arm yourself and watch the joints work together: [3D Robot Explorer](/visualizer/robots).
- Read more in the Atlas: [Unimate](/atlas/robot/unimate), [George Devol](/atlas/person/george-devol), [Joseph Engelberger](/atlas/person/joseph-engelberger), [industrial robot](/atlas/concept/industrial-robot), [degrees of freedom](/atlas/concept/degrees-of-freedom) and [hydraulic actuator](/atlas/concept/hydraulic-actuator).

## Sources

1. G. C. Devol Jr., "Programmed article transfer", [US Patent 2,988,237](https://patents.google.com/patent/US2988237A/en), filed 10 December 1954, granted 13 June 1961.
2. IEEE Spectrum, [article on Unimation and the Unimate](https://spectrum.ieee.org/unimation-robot) (the 1956 meeting, the plant near Trenton, hydraulics).
3. "George Devol Invents Unimate, the First Industrial Robot", [HistoryofInformation.com](https://www.historyofinformation.com/detail.php?id=3616).
4. "Unimate", [Wikipedia](https://en.wikipedia.org/wiki/Unimate) (first installation, drum memory, hydraulic five-axis arm, Robot Hall of Fame 2003).
5. International Federation of Robotics, "Global robot demand in factories doubles over 10 years", [World Robotics 2025 press release](https://ifr.org/ifr-press-releases/news/global-robot-demand-in-factories-doubles-over-10-years), 25 September 2025.
6. International Federation of Robotics, ["Industrial robots" definition](https://ifr.org/industrial-robots), quoting ISO 8373:2021, clause 3.6.
