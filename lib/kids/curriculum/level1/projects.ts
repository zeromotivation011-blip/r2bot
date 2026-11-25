// lib/kids/curriculum/level1/projects.ts
// The four Level 1 "Make it yours" projects (sessions 6, 12, 18, 24). Kept in
// their own small module so levels.ts can list them without importing the
// full Level 1 session data.

import type { Project } from '../types'

export const L1_PROJECTS: [Project, Project, Project, Project] = [
  {
    id: 'l1-p1', session: 6,
    title: 'My Robot, My Dance',
    brief: 'Give your robot a name, colours and a face. Then make up a dance that cheers up the whole town.',
    designSteps: [
      'Imagine: what kind of robot is yours — silly, calm, fast?',
      'Plan: draw the dance as arrows and sound notes on the planning sheet.',
      'Build: one block for each arrow.',
      'Test: press Go and watch — is it what you drew?',
      'Improve: change one thing that did not work.',
      'Share: show the dance and say what you changed.',
    ],
    constraints: ['At least 5 steps.', 'Stay on the 3×3 dance floor.', 'Use at least one turn and one sound.'],
    selfCheck: ['I drew my plan first.', 'My program has at least 5 steps.', 'I changed something after testing.', 'I can tell someone what my robot does.'],
    share: 'Shown to the class (or family at home). Saved in the child’s own gallery; never public.',
  },
  {
    id: 'l1-p2', session: 12,
    title: 'The Festival Banner',
    brief: 'Draw a picture for the festival banner that shows something you love. Your drawing must use Repeat at least once.',
    designSteps: [
      'Imagine: what do you love about your town or home?',
      'Plan: draw it on the grid sheet; circle the part that repeats.',
      'Build: the repeating part first, inside Repeat.',
      'Test: does the drawing match your plan?',
      'Improve: fix one thing.',
      'Share: show it and say which part repeats.',
    ],
    constraints: ['At least one Repeat.', 'Stay on the banner (7 × 5 squares).', 'Lift the pen at the end.'],
    selfCheck: ['My picture has a part that repeats.', 'I used Repeat for it.', 'I tested and fixed something.', 'I can explain my picture.'],
    share: 'Shown in class; the drawing is saved as a picture the family can download. Never public.',
  },
  {
    id: 'l1-p3', session: 18,
    title: 'A Helper for My Home',
    brief: 'Think of someone at home who could use a little help. Choose a job, choose the right tool, and program your robot to help — kindly and safely.',
    designSteps: [
      'Ask: who needs help, and with what?',
      'Imagine: which tool fits the job — pen, scoop or headlight?',
      'Plan: draw the path on the house plan.',
      'Build: one part at a time.',
      'Test and improve.',
      'Share: say who your helper helps and why you chose that tool.',
    ],
    constraints: ['One tool only (choose it!).', 'At least one kind word (a Say block).', 'No bumping furniture.'],
    selfCheck: ['I chose a job that helps someone.', 'I picked the tool that fits the job.', 'My robot is polite and safe.', 'I tested and fixed my program.'],
    share: 'Shown in class. Families see it in the child’s gallery. Never public.',
  },
  {
    id: 'l1-p4', session: 24,
    title: 'The Night of a Hundred Lights',
    brief: 'The lights are home! Design a festival show for your robot. It can dance, draw, carry a lantern or light up the dark corner — you decide. Keep the audience safe and make them smile.',
    designSteps: [
      'Ask: what will make people at the festival smile?',
      'Imagine: dance, drawing, lantern delivery, or light show?',
      'Plan: draw the path and the actions on the planning sheet.',
      'Build: one part at a time, in the simulator.',
      'Test and improve: watch, find the bug, fix it.',
      'Share: show your run and say one bug you fixed.',
    ],
    constraints: [
      'Use at least one loop.',
      'Use at least one sensor block, to stay safe.',
      'Use your tool at least once.',
      'Say something kind to the audience.',
      'Stay on the stage. Touch nothing — except a gentle bumper touch on the stage fence, if your sensor is the bumper.',
    ],
    selfCheck: [
      'My show has a loop.',
      'My robot checks with a sensor before it moves or bumps.',
      'My robot uses its tool.',
      'My robot says something kind.',
      'I found a bug and fixed it.',
    ],
    share: 'Shown at a class “festival” and in the child’s family gallery. Never public by default; teachers may choose a class showcase with family consent.',
  },
]
