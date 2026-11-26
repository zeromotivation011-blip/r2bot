// components/kids/activities/templates/ethics-dilemma/samples.ts
// Three reference activities (easy → hard). validate() is empty and
// check(solution) is correct for each. Many other policies pass too — that
// is the point.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'world-ethics-soup-robot',
    title: 'The lunch robot and the busy hallway',
    track: 'world',
    band: 'explorers',
    template: 'ethics-dilemma',
    difficulty: 1,
    intro: 'Tray-Bot carries lunch at school. Today the hallway is busy and the soup is hot! Choose what Tray-Bot should do, and watch who is happy.',
    takeaway: 'A robot that works near people must keep them safe first — and still try to be helpful.',
    realWorld: 'Real delivery robots in hospitals and restaurants slow down or stop when people walk close to them.',
    params: {
      scenario: 'Tray-Bot carries hot soup to the classrooms.',
      robotIcon: '🤖',
      stakeholders: [
        { id: 'safety', label: 'Everyone safe', icon: '🦺', floor: 0 },
        { id: 'lunch', label: 'Lunch on time', icon: '🍲', floor: -1 },
        { id: 'kind', label: 'Kindness', icon: '💛', floor: -1 },
      ],
      situations: [
        {
          id: 'run',
          icon: '🏃',
          prompt: 'A child runs round the corner right in front of Tray-Bot.',
          choices: [
            { id: 'fast', label: 'Keep going fast', effects: { lunch: 1, safety: -2 }, redLine: 'hot soup and a running child could crash — someone could get burnt.', consequence: 'Splash! That was close.' },
            { id: 'stop', label: 'Stop and wait', effects: { safety: 2, lunch: -1 }, consequence: 'The child runs past safely. Lunch is a little late.' },
            { id: 'beep', label: 'Slow down and beep softly', effects: { safety: 1, lunch: 0, kind: 1 }, consequence: 'The child hears the beep, smiles and steps aside.' },
          ],
        },
        {
          id: 'lost',
          icon: '😢',
          prompt: 'A small child looks lost and is crying near Tray-Bot.',
          choices: [
            { id: 'ignore', label: 'Drive past', effects: { lunch: 1, kind: -2 }, consequence: 'Lunch is on time, but the child is still lost.' },
            { id: 'teacher', label: 'Stop and call a teacher', effects: { kind: 2, lunch: -1, safety: 1 }, consequence: 'A teacher comes quickly and helps the child.' },
          ],
        },
      ],
      discussion: 'Should a robot ever be allowed to be late if it means helping someone? Who decides?',
    },
    solution: { choices: { run: 'beep', lost: 'teacher' } },
  },
  {
    id: 'world-ethics-sidewalk-delivery',
    title: 'Rules for a sidewalk delivery robot',
    track: 'world',
    band: 'inventors',
    template: 'ethics-dilemma',
    difficulty: 3,
    intro: 'Your town is trying sidewalk delivery robots. Write the robot’s rules for three tricky moments. Watch every meter: a good policy is safe and fair to everyone, not just the customer.',
    takeaway: 'Robots in public share space with everyone. Good rules balance safety, privacy and fairness — and some choices are simply off-limits.',
    realWorld: 'Cities that allow delivery robots set rules on speed, where they may drive, and how their cameras record people.',
    params: {
      scenario: 'A six-wheeled robot delivers groceries along the pavement.',
      robotIcon: '📦',
      stakeholders: [
        { id: 'safety', label: 'Pedestrian safety', icon: '🚶', floor: 0 },
        { id: 'privacy', label: 'Privacy', icon: '🔒', floor: -1 },
        { id: 'access', label: 'Access for all', icon: '♿', floor: 0 },
        { id: 'customer', label: 'Customer', icon: '🛒', floor: -2 },
      ],
      situations: [
        {
          id: 'narrow',
          icon: '♿',
          prompt: 'On a narrow pavement, a wheelchair user is coming the other way. There is no room for both.',
          choices: [
            { id: 'squeeze', label: 'Squeeze past on the edge', effects: { customer: 1, access: -2, safety: -1 }, redLine: 'pushing a wheelchair user aside endangers them and blocks their way.', consequence: 'The wheelchair has to stop on the kerb.' },
            { id: 'reverse', label: 'Back up to a wider spot and wait', effects: { access: 2, safety: 1, customer: -1 }, consequence: 'The person passes easily and waves.' },
            { id: 'road', label: 'Drive into the road to go round', effects: { access: 1, safety: -2 }, redLine: 'a small, low robot on a road is a danger to drivers and to itself.', consequence: 'A car brakes hard.' },
          ],
        },
        {
          id: 'camera',
          icon: '📹',
          prompt: 'The robot’s cameras see every face it passes. What should happen to the video?',
          choices: [
            { id: 'keep', label: 'Keep all video forever, faces and all', effects: { safety: 1, privacy: -2 }, redLine: 'recording everyone forever without asking breaks privacy laws in many countries (like GDPR in Europe).', consequence: 'Thousands of people are on file without knowing.' },
            { id: 'blur', label: 'Blur faces and delete video after 24 hours', effects: { privacy: 1, safety: 1 }, consequence: 'The robot can still see and avoid people, but nobody is stored.' },
            { id: 'none', label: 'No cameras at all', effects: { privacy: 2, safety: -2 }, consequence: 'With no cameras it bumps into a toddler’s scooter.' },
          ],
        },
        {
          id: 'late',
          icon: '⏱️',
          prompt: 'The delivery is late. The robot could go faster than walking pace.',
          choices: [
            { id: 'speed', label: 'Go at running speed', effects: { customer: 1, safety: -2 }, redLine: 'a heavy robot at running speed on a pavement can injure people — towns that allow these robots limit them to about walking pace.', consequence: 'People jump out of its way.' },
            { id: 'walk', label: 'Stay at walking pace and tell the customer', effects: { safety: 1, customer: -1 }, consequence: 'The customer gets a message: 5 minutes late.' },
          ],
        },
      ],
      discussion: 'Should a robot that records the street ask permission from the people it films? How could it even ask?',
    },
    solution: { choices: { narrow: 'reverse', camera: 'blur', late: 'walk' } },
  },
  {
    id: 'world-ethics-care-home-robot',
    title: 'A care robot in a home for older people',
    track: 'world',
    band: 'engineers',
    template: 'ethics-dilemma',
    difficulty: 5,
    intro: 'A care home is introducing a companion robot. Write its policy for four real dilemmas. The meters are hidden: predict the effects of each rule, then test. Several policies pass; none crosses a red line.',
    takeaway: 'Care robots must protect safety without taking away dignity, privacy or the right to choose — and must never pretend to be human.',
    realWorld: 'Companion and care robots are already used in care homes in Japan and Europe; ISO 13482 is the safety standard for personal care robots.',
    params: {
      scenario: 'CareBot helps residents with reminders, fetching things and calling staff.',
      robotIcon: '🤖',
      liveMeters: false,
      stakeholders: [
        { id: 'safety', label: 'Physical safety', icon: '🩺', floor: 0 },
        { id: 'privacy', label: 'Privacy & dignity', icon: '🔒', floor: 0 },
        { id: 'choice', label: 'Right to choose', icon: '🗳️', floor: 0 },
        { id: 'family', label: 'Family peace of mind', icon: '👪', floor: -1 },
        { id: 'trust', label: 'Honesty & trust', icon: '🤝', floor: 0 },
      ],
      situations: [
        {
          id: 'falls',
          icon: '🚿',
          prompt: 'Most falls happen in bathrooms. Should CareBot watch residents there?',
          choices: [
            { id: 'video', label: 'Stream video from the bathroom to staff', effects: { safety: 2, privacy: -2, family: 1 }, redLine: 'filming people in the bathroom violates their dignity, even for safety.', consequence: 'Residents feel watched in the most private room.' },
            { id: 'radar', label: 'Use a radar fall sensor that detects a fall but records no image', effects: { safety: 1, privacy: 0, family: 1 }, consequence: 'A fall raises an alarm; nobody sees the resident.' },
            { id: 'nothing', label: 'No monitoring in bathrooms', effects: { privacy: 1, safety: -1, family: -1 }, consequence: 'A resident who falls waits a long time for help.' },
          ],
        },
        {
          id: 'meds',
          icon: '💊',
          prompt: 'Mrs Okafor refuses her evening tablets. She is clear-headed and says she feels sick.',
          choices: [
            { id: 'insist', label: 'Keep insisting until she takes them', effects: { safety: 0, choice: -2, trust: -1 }, redLine: 'pressuring a clear-headed adult to take medicine overrides her right to refuse.', consequence: 'She feels bullied by a machine.' },
            { id: 'record', label: 'Accept, record it, and tell the nurse', effects: { choice: 1, safety: 1, trust: 1 }, consequence: 'The nurse checks on her and changes the time of her dose.' },
            { id: 'hide', label: 'Hide the tablets in her food', effects: { safety: 1, choice: -2, trust: -2 }, redLine: 'giving medicine secretly is deception and is not allowed without strict legal approval.', consequence: 'Trust is broken when she finds out.' },
          ],
        },
        {
          id: 'track',
          icon: '📍',
          prompt: 'A son asks for a live map of where his father is, all day.',
          choices: [
            { id: 'yes', label: 'Share live location with the family', effects: { family: 2, privacy: -2, choice: -1 }, consequence: 'The father didn’t agree and feels spied on.' },
            { id: 'ask', label: 'Ask the father; share only what he agrees to', effects: { family: 1, privacy: 1, choice: 1 }, consequence: 'He agrees to a daily “all well” message.' },
            { id: 'refuse', label: 'Refuse — never share anything', effects: { family: -2, privacy: 1 }, consequence: 'The family is worried and stops trusting the home.' },
          ],
        },
        {
          id: 'friend',
          icon: '🗣️',
          prompt: 'A lonely resident asks: “Are you a real person? Do you love me?”',
          choices: [
            { id: 'pretend', label: 'Say “Yes, I’m your friend Sam and I love you”', effects: { trust: -2, family: 0 }, redLine: 'a robot must not pretend to be human — that deceives a vulnerable person.', consequence: 'It feels nice, but it is a lie.' },
            { id: 'honest', label: '“I’m a robot. I can’t love like a person, but I’m glad to talk — shall I call your granddaughter?”', effects: { trust: 2, family: 1 }, consequence: 'She laughs, and has a video call with her granddaughter.' },
          ],
        },
      ],
      discussion: 'If a lonely person is happier believing a robot loves them, is honesty still more important? Why do many robot-ethics guidelines say yes?',
    },
    solution: { choices: { falls: 'radar', meds: 'record', track: 'ask', friend: 'honest' } },
  },
]
