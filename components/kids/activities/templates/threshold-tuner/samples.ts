// components/kids/activities/templates/threshold-tuner/samples.ts
// Three reference activities (easy → hard). validate() is empty and
// check(solution) is correct for each.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'sense-threshold-line-or-floor',
    title: 'Black line or white floor?',
    track: 'sensors',
    band: 'explorers',
    template: 'threshold-tuner',
    difficulty: 1,
    intro: 'Spark’s floor sensor gives small numbers on the black line and big numbers on the white floor. Drag the line so Spark always knows where it is!',
    takeaway: 'A threshold splits readings into two groups. Put it in the gap between them.',
    realWorld: 'Every line-following robot has a threshold like this deciding “line” or “floor”.',
    params: {
      sensor: { name: 'Floor light sensor', unit: '%', min: 0, max: 100 },
      states: {
        low: { label: 'On the black line', icon: '⬛', level: 15, action: 'Steer right' },
        high: { label: 'On the white floor', icon: '⬜', level: 80, action: 'Steer left' },
      },
      timeline: [
        { t: 0, state: 'high' },
        { t: 2, state: 'low' },
        { t: 4, state: 'high' },
        { t: 6, state: 'low' },
        { t: 8, state: 'high' },
      ],
      trace: { durationS: 10, sampleHz: 10, noise: 3, seed: 11 },
      allowedErrorPct: 3,
      liveStats: true,
    },
    solution: { threshold: 48 },
    badges: ['line-rider'],
  },
  {
    id: 'sense-threshold-wall-hysteresis',
    title: 'Stop flickering at the wall',
    track: 'control',
    band: 'inventors',
    template: 'threshold-tuner',
    difficulty: 3,
    intro: 'The rover must stop when the wall is close and drive when the path is clear. Its distance readings are noisy, so one line makes it stutter. Add hysteresis!',
    takeaway: 'Hysteresis uses two switch points: change your mind only when the reading is clearly past the line. It stops chattering.',
    realWorld: 'Thermostats, robot bumpers and car parking sensors all use hysteresis so they don’t click on and off constantly.',
    params: {
      sensor: { name: 'Ultrasonic distance', unit: 'cm', min: 0, max: 100 },
      states: {
        low: { label: 'Wall close', icon: '🧱', level: 30, action: 'Stop' },
        high: { label: 'Path clear', icon: '🛣️', level: 60, action: 'Drive' },
      },
      timeline: [
        { t: 0, state: 'high' },
        { t: 3, state: 'low' },
        { t: 7, state: 'high' },
        { t: 10, state: 'low' },
      ],
      trace: { durationS: 13, sampleHz: 10, noise: 8, seed: 5 },
      rampS: 0.5,
      knobs: { hysteresis: { max: 30 } },
      allowedErrorPct: 6,
      lagAllowanceS: 0.5,
      maxExtraSwitches: 0,
      liveStats: true,
    },
    solution: { threshold: 45, hysteresis: 20 },
    badges: ['smooth-operator'],
  },
  {
    id: 'sense-threshold-cliff-filter',
    title: 'Cliff sensor for a robot vacuum',
    track: 'control',
    band: 'engineers',
    template: 'threshold-tuner',
    difficulty: 5,
    intro: 'A robot vacuum’s downward IR sensor reads less light over a stair edge. The signal is noisy with glitches. Tune threshold, hysteresis and a moving-average filter: no false alarms, no missed edges.',
    takeaway: 'Filtering and hysteresis together tame noise and glitches — but a longer filter reacts later, so the best setting is a trade-off.',
    realWorld: 'Robot vacuums carry 4–6 IR cliff sensors and filter them like this so a dark rug is not mistaken for a staircase.',
    params: {
      sensor: { name: 'IR cliff sensor', unit: '%', min: 0, max: 100 },
      states: {
        low: { label: 'Over the stair edge', icon: '🪜', level: 25, action: 'Back away' },
        high: { label: 'Safe floor', icon: '🟫', level: 55, action: 'Keep cleaning' },
      },
      timeline: [
        { t: 0, state: 'high' },
        { t: 2.5, state: 'low' },
        { t: 4, state: 'high' },
        { t: 7, state: 'low' },
        { t: 8.5, state: 'high' },
      ],
      trace: { durationS: 11, sampleHz: 20, noise: 7, spikes: 3, seed: 99 },
      rampS: 0.2,
      knobs: { hysteresis: { max: 24 }, filter: { maxWindow: 10 } },
      allowedErrorPct: 5,
      lagAllowanceS: 0.4,
      maxExtraSwitches: 0,
      liveStats: false,
    },
    solution: { threshold: 40, hysteresis: 10, window: 4 },
  },
]
