// components/kids/activities/templates/classify-sort/samples.ts
// Three reference activities (easy → hard). validate() is empty and
// check(solution) is correct for each.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'ai-sort-magnet-recycling',
    title: 'The magnet sorting robot',
    track: 'ai',
    band: 'explorers',
    template: 'classify-sort',
    difficulty: 1,
    intro: 'At the recycling centre a big magnet robot pulls things out of the rubbish. Put each thing in the right bin: does the magnet grab it or not?',
    takeaway: 'Robots sort things by their features. Here the feature is what something is made of.',
    realWorld: 'Recycling plants really use giant magnets to pull steel cans and iron out of mixed rubbish.',
    params: {
      task: 'Help the magnet robot: which things will it grab?',
      mode: 'sort',
      categories: [
        { id: 'grab', label: 'Magnet grabs it', icon: '🧲' },
        { id: 'stay', label: 'Magnet can’t', icon: '🚫' },
      ],
      features: [{ key: 'material', label: 'Made of', kind: 'word' }],
      items: [
        { id: 'nail', label: 'Iron nail', icon: '📌', features: { material: 'iron' }, category: 'grab', why: 'iron is magnetic' },
        { id: 'tin', label: 'Steel food can', icon: '🥫', features: { material: 'steel' }, category: 'grab', why: 'steel has iron in it, so magnets stick to it' },
        { id: 'clip', label: 'Paper clip', icon: '📎', features: { material: 'steel' }, category: 'grab', why: 'paper clips are steel wire' },
        { id: 'bottle', label: 'Plastic bottle', icon: '🧴', features: { material: 'plastic' }, category: 'stay', why: 'plastic is not magnetic' },
        { id: 'jar', label: 'Glass jar', icon: '🫙', features: { material: 'glass' }, category: 'stay', why: 'glass is not magnetic' },
        { id: 'box', label: 'Cardboard box', icon: '📦', features: { material: 'card' }, category: 'stay', why: 'card is made from wood, which is not magnetic' },
      ],
      showFeatures: true,
    },
    solution: { placements: { nail: 'grab', tin: 'grab', clip: 'grab', bottle: 'stay', jar: 'stay', box: 'stay' } },
  },
  {
    id: 'ai-sort-vacuum-bumps',
    title: 'Over it or around it?',
    track: 'ai',
    band: 'builders',
    template: 'classify-sort',
    difficulty: 3,
    intro: 'A robot vacuum meets things on the floor. Sort them yourself, then write the robot’s rule — and see if it works on things it has never met.',
    takeaway: 'A good rule uses the feature that really matters (height), not one that just happens to differ (colour). Test it on new things!',
    realWorld: 'Many robot vacuums can climb bumps up to about 2 cm; anything taller they treat as an obstacle and steer around.',
    params: {
      task: 'Teach the robot vacuum when to drive over something and when to go around.',
      mode: 'both',
      categories: [
        { id: 'over', label: 'Drive over', icon: '⬆️' },
        { id: 'around', label: 'Go around', icon: '↪️' },
      ],
      features: [
        { key: 'height', label: 'Height', kind: 'number', unit: 'cm' },
        { key: 'colour', label: 'Colour', kind: 'word' },
      ],
      items: [
        { id: 'rug', label: 'Rug edge', icon: '🟫', features: { height: 1, colour: 'red' }, category: 'over', why: 'only 1 cm tall — the wheels climb it' },
        { id: 'strip', label: 'Door strip', icon: '🚪', features: { height: 1.5, colour: 'brown' }, category: 'over', why: '1.5 cm is low enough to climb' },
        { id: 'mat', label: 'Bath mat', icon: '🟦', features: { height: 0.5, colour: 'blue' }, category: 'over', why: 'it is very flat' },
        { id: 'book', label: 'Book', icon: '📕', features: { height: 3, colour: 'red' }, category: 'around', why: '3 cm is too tall to climb' },
        { id: 'car', label: 'Toy car', icon: '🚗', features: { height: 5, colour: 'red' }, category: 'around', why: '5 cm is far too tall' },
        { id: 'shoe', label: 'Shoe', icon: '👟', features: { height: 10, colour: 'blue' }, category: 'around', why: 'a shoe is a wall to a robot vacuum' },
      ],
      testItems: [
        { id: 'mag', label: 'Magazine', icon: '📰', features: { height: 0.6, colour: 'red' }, category: 'over' },
        { id: 'laptop', label: 'Closed laptop', icon: '💻', features: { height: 2.5, colour: 'brown' }, category: 'around' },
        { id: 'cable', label: 'Flat cable cover', icon: '➖', features: { height: 1.2, colour: 'blue' }, category: 'over' },
        { id: 'slipper', label: 'Slipper', icon: '🩴', features: { height: 4, colour: 'blue' }, category: 'around' },
      ],
      showFeatures: true,
      minAccuracy: 1,
    },
    solution: {
      placements: { rug: 'over', strip: 'over', mat: 'over', book: 'around', car: 'around', shoe: 'around' },
      rule: { feature: 'height', threshold: 2, ifTrue: 'around', ifFalse: 'over' },
    },
  },
  {
    id: 'ai-sort-weeding-robot',
    title: 'Crop or weed? A farm robot’s rule',
    track: 'ai',
    band: 'engineers',
    template: 'classify-sort',
    difficulty: 5,
    intro: 'A weeding robot’s camera measures every plant in a lettuce field. No single measurement is perfect. Find the best one-feature rule and prove it on new plants.',
    takeaway: 'Real data overlaps. A decision stump picks the single split with the fewest errors — real learners stack many of them into decision trees and forests.',
    realWorld: 'Camera-guided weeding robots already work on farms, telling crops from weeds and removing weeds with blades or lasers instead of herbicide.',
    params: {
      task: 'Build the rule that tells lettuce (keep) from weeds (remove). At least 85 % of all plants must be right.',
      mode: 'rule',
      categories: [
        { id: 'crop', label: 'Lettuce — keep', icon: '🥬' },
        { id: 'weed', label: 'Weed — remove', icon: '🌿' },
      ],
      features: [
        { key: 'leaf', label: 'Leaf width', kind: 'number', unit: 'mm' },
        { key: 'height', label: 'Height', kind: 'number', unit: 'cm' },
        { key: 'row', label: 'In the planted row?', kind: 'word' },
      ],
      items: [
        { id: 'p1', label: 'Plant A', icon: '🥬', features: { leaf: 42, height: 9, row: 'yes' }, category: 'crop' },
        { id: 'p2', label: 'Plant B', icon: '🥬', features: { leaf: 48, height: 11, row: 'yes' }, category: 'crop' },
        { id: 'p3', label: 'Plant C', icon: '🥬', features: { leaf: 37, height: 7, row: 'yes' }, category: 'crop' },
        { id: 'p4', label: 'Plant D', icon: '🥬', features: { leaf: 19, height: 4, row: 'yes' }, category: 'crop' },
        { id: 'p5', label: 'Plant E', icon: '🥬', features: { leaf: 45, height: 12, row: 'no' }, category: 'crop' },
        { id: 'p6', label: 'Plant F', icon: '🌿', features: { leaf: 12, height: 6, row: 'no' }, category: 'weed' },
        { id: 'p7', label: 'Plant G', icon: '🌿', features: { leaf: 8, height: 14, row: 'no' }, category: 'weed' },
        { id: 'p8', label: 'Plant H', icon: '🌿', features: { leaf: 15, height: 9, row: 'yes' }, category: 'weed' },
        { id: 'p9', label: 'Plant I', icon: '🌿', features: { leaf: 40, height: 10, row: 'no' }, category: 'weed' },
        { id: 'p10', label: 'Plant J', icon: '🌿', features: { leaf: 10, height: 5, row: 'yes' }, category: 'weed' },
      ],
      testItems: [
        { id: 't1', label: 'New plant 1', icon: '🌱', features: { leaf: 44, height: 10, row: 'yes' }, category: 'crop' },
        { id: 't2', label: 'New plant 2', icon: '🌱', features: { leaf: 11, height: 8, row: 'yes' }, category: 'weed' },
        { id: 't3', label: 'New plant 3', icon: '🌱', features: { leaf: 39, height: 6, row: 'yes' }, category: 'crop' },
        { id: 't4', label: 'New plant 4', icon: '🌱', features: { leaf: 14, height: 12, row: 'no' }, category: 'weed' },
        { id: 't5', label: 'New plant 5', icon: '🌱', features: { leaf: 9, height: 3, row: 'no' }, category: 'weed' },
      ],
      showFeatures: true,
      minAccuracy: 0.85,
    },
    solution: { rule: { feature: 'leaf', threshold: 28, ifTrue: 'crop', ifFalse: 'weed' } },
  },
]
