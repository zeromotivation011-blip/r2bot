// components/kids/games/robot-brain/quiz.ts
// Legend's bonus star: one data-science judgement per round. Every wrong option
// is a mistake real teams make, written as plausibly as the right one, so the
// star tests understanding rather than spotting the only sensible sentence.

import { makeRng } from './symbols'

export interface Quiz {
  q: string
  /** The first option is the right one; they are shuffled before showing. */
  options: [string, string, string]
  explain: string
}

export const QUIZZES: Quiz[] = [
  {
    q: 'Brain A: k = 1, training 100%, validation 61%. Brain B: k = 5, training 93%, validation 86%. A teammate says “ship A, it scored 100%”. What is the best reply?',
    options: [
      'With k = 1 every training drawing is its own nearest neighbour, so A’s 100% only proves memory. Compare on validation, where B wins.',
      'A is best on known drawings, so ship A and add B’s validation drawings to A’s training data to fix the rest of its mistakes.',
      'Ship B, because a bigger k always generalises better than a small one, whatever the data looks like — so k = 9 would be better still.',
    ],
    explain:
      'Training accuracy with the example allowed to vote for itself measures memory, not understanding. Validation (or leave-one-out) is the honest estimate. Bigger k is not always better: too big and a rare label is always out-voted. And once you train on the validation drawings they stop being a fair check.',
  },
  {
    q: 'You try ten brain designs, check each on the SAME validation set, and keep the best: 95% on validation. What should you expect on the final exam?',
    options: [
      'Probably a little lower: picking the best of ten lets some lucky fit to those exact validation drawings sneak in, which is why the exam is fresh.',
      'About 95%: the validation and exam drawings are made the same way, so the validation score is a fair, unbiased forecast of the exam.',
      'Much lower, near chance: a score on drawings you have already looked at says nothing at all about drawings you have never seen.',
    ],
    explain:
      'Every time you choose using the validation set, a little of it leaks into your design, so the winner of ten tries is partly the luckiest. It still predicts the exam roughly — just a bit optimistically. That is why real teams keep a final test set they look at once.',
  },
  {
    q: 'After you add augmented (turned, moved, resized) copies, validation goes UP but leave-one-out accuracy on the training data goes DOWN a little. How can both happen?',
    options: [
      'The copies make the training set harder and more varied, so each drawing is harder to get right — but together they cover more of what new drawings look like.',
      'Each copy sits right next to its original, so leave-one-out lets it vote for its twin; the drop means the copies were made badly and should be removed.',
      'The validation drawings happen to be turned the same way as the copies, so the gain is luck that will vanish on the exam’s fresh drawings.',
    ],
    explain:
      'Leave-one-out here hides a drawing AND its copies, so no twin can vote for it. Augmentation makes the training set more like the messy real world: harder to score on, better at generalising — and the exam is made the same way as validation, so the gain carries over.',
  },
]

/** The question for a round and the order its options are shown in (the right one moves around). */
export function shuffledQuiz(round: number): { quiz: Quiz; order: number[] } {
  const quiz = QUIZZES[round % QUIZZES.length]
  const slot = (Math.floor(round / QUIZZES.length) + 1 + round) % 3
  const wrong = makeRng(round * 31 + 7)() < 0.5 ? [1, 2] : [2, 1]
  const order = [...wrong]
  order.splice(slot, 0, 0)
  return { quiz, order }
}
