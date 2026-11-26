// lib/kids/ai/vision/lab.ts
// Glue between the examples a child collects and the two classifiers: building
// training sets with the feature groups that are switched on, testing (leave-
// one-out for k-NN, a held-out split for the network), the "test in the dark"
// experiment, and a step-by-step network trainer the UI can run a few epochs
// per animation frame so the loss curve draws live.

import { argmax, createNet, knnPredict, netLoss, netPredict, scoreFrom, stratifiedSplit, trainEpoch, type Net, type Sample, type Score } from './classifiers'
import { extractFeatures, groupWeights, relight, weighted, type FeatureGroup, type Features, type Thumb } from './features'

export interface Example {
  id: number
  cls: number
  thumb: Thumb
  feats: Features
  /** Captured with the room light below normal. */
  dim: boolean
}

export type GroupsOn = Record<FeatureGroup, boolean>

export const ALL_ON: GroupsOn = { shape: true, colour: true, edges: true }

/** Light level used by "Test in the dark". */
export const DARK_LIGHT = 0.4

export function knnK(n: number): number {
  // 1 neighbour while there are only a few examples, then 3 that vote
  // (weighted by how close they are), which gives honest confidence values.
  return n < 9 ? 1 : 3
}

export function toSamples(examples: Example[], groups: GroupsOn): Sample[] {
  const w = groupWeights(groups)
  return examples.map((e) => ({ x: weighted(e.feats.vec, w), y: e.cls }))
}

export function knnProbs(train: Sample[], feats: Features, groups: GroupsOn, classes: number): number[] {
  if (!train.length) return new Array<number>(classes).fill(1 / classes)
  const x = weighted(feats.vec, groupWeights(groups))
  return knnPredict(train, x, knnK(train.length), classes).probs
}

/** Leave-one-out test for k-NN, plus the same test with every picture darkened. */
export function evaluateKnn(examples: Example[], groups: GroupsOn, classes: number, withDark: boolean): { score: Score; dark: Score | null } {
  const train = toSamples(examples, groups)
  const k = knnK(train.length - 1)
  const pairs = train.map((s, i) => ({
    y: s.y,
    p: argmax(knnPredict(train, s.x, k, classes, i).probs),
  }))
  let dark: Score | null = null
  if (withDark) {
    const w = groupWeights(groups)
    // Darken only pictures taken in normal light (dim ones are dark already).
    const dpairs = examples
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => !e.dim)
      .map(({ e, i }) => {
        const x = weighted(extractFeatures(relight(e.thumb, DARK_LIGHT, e.id + 11)).vec, w)
        return {
          y: e.cls,
          p: argmax(knnPredict(train, x, k, classes, i).probs),
        }
      })
    dark = dpairs.length ? scoreFrom(dpairs, classes) : null
  }
  return { score: scoreFrom(pairs, classes), dark }
}

// ── Network trainer ─────────────────────────────────────────────────────────

export interface TrainerOptions {
  hidden: number
  learningRate: number
  epochs: number
  seed: number
}

export class NetTrainer {
  readonly net: Net
  readonly train: Sample[]
  readonly test: Sample[]
  readonly testExamples: Example[]
  readonly classes: number
  readonly groups: GroupsOn
  readonly epochs: number
  epoch = 0
  trainLoss: number[] = []
  testLoss: number[] = []

  constructor(examples: Example[], classes: number, groups: GroupsOn, opts: TrainerOptions) {
    const all = toSamples(examples, groups)
    // Keep track of which examples went to the test set (for the dark test).
    const tagged = all.map((s, i) => ({ ...s, i }))
    const split = stratifiedSplit(tagged, 0.25, opts.seed)
    this.train = split.train
    this.test = split.test
    this.testExamples = (split.test as (Sample & { i: number })[]).map((s) => examples[s.i])
    this.classes = classes
    this.groups = groups
    this.epochs = opts.epochs
    this.net = createNet(this.train, classes, {
      hidden: opts.hidden,
      learningRate: opts.learningRate,
      l2: 1e-3,
      seed: opts.seed,
    })
  }

  get done(): boolean {
    return this.epoch >= this.epochs
  }

  /** Run up to `n` epochs; returns true when training has finished. */
  step(n: number): boolean {
    for (let i = 0; i < n && !this.done; i++) {
      this.trainLoss.push(trainEpoch(this.net, this.train, this.epoch))
      this.testLoss.push(this.test.length ? netLoss(this.net, this.test) : NaN)
      this.epoch++
    }
    return this.done
  }

  evaluate(withDark: boolean): { score: Score; dark: Score | null } {
    const pairs = this.test.map((s) => ({
      y: s.y,
      p: argmax(netPredict(this.net, s.x)),
    }))
    let dark: Score | null = null
    if (withDark) {
      const w = groupWeights(this.groups)
      const bright = this.testExamples.filter((e) => !e.dim)
      dark = !bright.length
        ? null
        : scoreFrom(
            bright.map((e) => ({
              y: e.cls,
              p: argmax(netPredict(this.net, weighted(extractFeatures(relight(e.thumb, DARK_LIGHT, e.id + 11)).vec, w))),
            })),
            this.classes,
          )
    }
    return { score: scoreFrom(pairs, this.classes), dark }
  }

  predict(feats: Features): number[] {
    return netPredict(this.net, weighted(feats.vec, groupWeights(this.groups)))
  }
}
