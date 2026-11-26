// lib/kids/ai/think/neural-missions.ts
// Missions of the Neural Playground, from "draw the line yourself" (a
// perceptron by hand, ages 5–7) to hidden layers that untangle spirals
// (ages 14–17). Each mission is checked against a snapshot of the lab.

import type { TierName } from '@/lib/kids/universe/tiers'
import type { ThinkMission } from './common'
import type { DatasetId, FeatureSet } from './nn'

export type NeuralMode = 'hand' | 'train'

export interface NeuralSnapshot {
  mode: NeuralMode
  dataset: DatasetId | 'own'
  /** Points of each class the child placed themselves. */
  ownOrange: number
  ownCyan: number
  /** Accuracy (0..1) of the current model or hand-drawn line on the current points. */
  accuracy: number
  /** True when the robot (perceptron rule) moved the line, not the child. */
  lineByRobot: boolean
  hiddenLayers: number
  totalHidden: number
  features: FeatureSet
  /** Training steps since the network was last reset. */
  steps: number
  loss: number
}

export interface NeuralMission extends ThinkMission {
  check: (s: NeuralSnapshot) => boolean
}

export const NEURAL_MISSIONS: NeuralMission[] = [
  {
    id: 'hand-split',
    tier: 'Cadet',
    title: 'Draw the line',
    goal: 'Load “Two groups”. Turn and slide the line until every orange dot is on the orange side.',
    lesson: 'You just did what the first robot brain, the perceptron, does: split things with one straight line.',
    xp: 15,
    check: (s) => s.mode === 'hand' && s.dataset === 'blobs' && !s.lineByRobot && s.accuracy >= 1,
  },
  {
    id: 'own-dots',
    tier: 'Cadet',
    title: 'Your own dots',
    goal: 'Clear the board. Tap to put 4 orange and 4 blue dots, then draw a line that splits them.',
    lesson: 'Examples are how a robot learns. You chose the examples AND the answer.',
    xp: 20,
    check: (s) => s.mode === 'hand' && s.dataset === 'own' && s.ownOrange >= 4 && s.ownCyan >= 4 && s.accuracy >= 1,
  },
  {
    id: 'robot-tries',
    tier: 'Cadet',
    title: 'Let the robot try',
    goal: 'Press “Robot, fix one mistake” again and again until the robot gets every dot right.',
    lesson: 'Each mistake nudged the line a little. Learning from mistakes, one at a time, is how machines learn.',
    xp: 20,
    badges: ['robot-teacher'],
    check: (s) => s.mode === 'hand' && s.lineByRobot && s.accuracy >= 1,
  },
  {
    id: 'train-line',
    tier: 'Pilot',
    title: 'Train one neuron',
    goal: 'Switch to Train. With 0 hidden layers, train on “Slanted split” until accuracy is 95% or more.',
    lesson: 'One neuron = one straight line. Training found the right tilt by making its error smaller, step by step.',
    xp: 25,
    badges: ['robot-teacher'],
    check: (s) => s.mode === 'train' && s.dataset === 'line' && s.hiddenLayers === 0 && s.accuracy >= 0.95,
  },
  {
    id: 'xor-stuck',
    tier: 'Pilot',
    title: 'The impossible checkerboard',
    goal: 'Still with 0 hidden layers, train on “Checkerboard (XOR)” for 300 steps. Watch it get stuck.',
    lesson: 'No single straight line can split XOR. In 1969 this puzzle made people think neural networks were a dead end — until hidden layers.',
    xp: 20,
    check: (s) => s.mode === 'train' && s.dataset === 'xor' && s.hiddenLayers === 0 && s.steps >= 300 && s.accuracy < 0.85,
  },
  {
    id: 'xor-solved',
    tier: 'Ace',
    title: 'Hidden layer to the rescue',
    goal: 'Add a hidden layer and train on XOR until accuracy is 95% or more.',
    lesson: 'Each hidden neuron draws its own line; the output neuron combines them. Lines combined can make any shape.',
    xp: 30,
    badges: ['robot-teacher'],
    check: (s) => s.mode === 'train' && s.dataset === 'xor' && s.hiddenLayers >= 1 && s.features === 'xy' && s.accuracy >= 0.95,
  },
  {
    id: 'circle-few',
    tier: 'Ace',
    title: 'Circle with 3 neurons',
    goal: 'Solve “Circle” to 95% using only 3 hidden neurons or fewer (x and y inputs only).',
    lesson: 'Three straight lines make a triangle — enough to fence in a circle. Engineers look for the smallest brain that works.',
    xp: 35,
    badges: ['robot-teacher'],
    check: (s) =>
      s.mode === 'train' && s.dataset === 'circle' && s.hiddenLayers >= 1 && s.totalHidden <= 3 && s.features === 'xy' && s.accuracy >= 0.95,
  },
  {
    id: 'spiral-deep',
    tier: 'Legend',
    title: 'Untangle the spirals',
    goal: 'Use x and y inputs only. Build a deep enough network to reach 90% on “Spirals”.',
    lesson: 'Deeper networks bend space layer by layer until a tangled problem becomes a simple one.',
    xp: 45,
    badges: ['robot-teacher'],
    check: (s) => s.mode === 'train' && s.dataset === 'spiral' && s.features === 'xy' && s.accuracy >= 0.9,
  },
  {
    id: 'circle-features',
    tier: 'Legend',
    title: 'Feature engineering',
    goal: 'Turn on the x², y², x·y inputs and solve “Circle” with 0 hidden layers.',
    lesson: 'With x² + y² as an input, a circle becomes a straight-line problem. Good features can replace a bigger brain.',
    xp: 35,
    check: (s) => s.mode === 'train' && s.dataset === 'circle' && s.hiddenLayers === 0 && s.features === 'xy+squares' && s.accuracy >= 0.97,
  },
]

export function neuralMissionsFor(tier: TierName): NeuralMission[] {
  return NEURAL_MISSIONS.filter((m) => m.tier === tier)
}
