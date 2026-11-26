// components/kids/games/safety-inspector/harm.ts
// The six-question ROBOT HARM CHECK — the idea at the heart of the Robot
// Guardians world. Shared by the Safety Inspector game, the world page and the
// printable Harm Check card, so the wording is identical everywhere.
//
// Pure data. Safe on server and client.

export type HarmCat = 'body' | 'data' | 'fairness' | 'control' | 'people' | 'planet'

export interface HarmQuestion {
  id: HarmCat
  n: number
  name: string
  icon: string
  /** The question a child asks of any robot. */
  question: string
  /** Short version for small screens and buttons. */
  short: string
  /** What to look for — real things engineers check. */
  lookFor: string[]
  /** Colour for content (badges, bars). Runtime style only. */
  color: string
}

export const HARM_CHECK: HarmQuestion[] = [
  {
    id: 'body',
    n: 1,
    name: 'Body',
    icon: '🦺',
    question: 'Can it hurt someone’s body?',
    short: 'Can it hurt someone?',
    lookFor: ['Pinch points and sharp edges', 'Speed and force near people', 'Fences, light curtains and safety scanners', 'An emergency stop within reach'],
    color: '#F43F5E',
  },
  {
    id: 'data',
    n: 2,
    name: 'Data',
    icon: '📷',
    question: 'What does it see, hear or record — and where does it go?',
    short: 'What does it record?',
    lookFor: ['Cameras and microphones', 'On the robot or sent to the cloud?', 'A light that shows when it is recording', 'Asking people first (consent)'],
    color: '#22D3EE',
  },
  {
    id: 'fairness',
    n: 3,
    name: 'Fairness',
    icon: '⚖️',
    question: 'Does it work for everyone?',
    short: 'Does it work for everyone?',
    lookFor: ['Who was in the training data?', 'Tested on children, older people, wheelchair users, all skin tones and accents', 'Results checked group by group'],
    color: '#FACC15',
  },
  {
    id: 'control',
    n: 4,
    name: 'Control',
    icon: '🛑',
    question: 'Who can stop it?',
    short: 'Who can stop it?',
    lookFor: ['A big red emergency stop', 'A human checks big decisions', 'When unsure, it stops safely and asks', 'It cannot do risky things on its own'],
    color: '#60A5FA',
  },
  {
    id: 'people',
    n: 5,
    name: 'People',
    icon: '🤝',
    question: 'Who gains, and who loses?',
    short: 'Who gains, who loses?',
    lookFor: ['Jobs that change or disappear', 'Training for new jobs', 'Robots doing dull, dirty and dangerous work', 'Time with friends and family'],
    color: '#F472B6',
  },
  {
    id: 'planet',
    n: 6,
    name: 'Planet',
    icon: '🌍',
    question: 'What does it cost the planet?',
    short: 'What does it cost the planet?',
    lookFor: ['Energy it uses', 'Batteries that can be swapped and recycled', 'Can it be repaired?', 'What happens to it at the end (e-waste)'],
    color: '#22C55E',
  },
]

export function harmQ(id: HarmCat): HarmQuestion {
  return HARM_CHECK.find((h) => h.id === id) ?? HARM_CHECK[0]
}
