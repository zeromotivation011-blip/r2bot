// components/kids/ui/toast-queue.ts — the reward-toast queue (pure, no React).
//
// RewardToastClient shows the head of this queue (two toasts on a phone, three
// on a wider screen). A burst of rewards — a robot rename can earn a badge, a
// quest and several unlocks at once — must not bury the screen, so the queue
// holds at most TOAST_QUEUE_CAP toasts and folds the rest into ONE
// "+N more rewards" toast that points to the Garage. Checked by
// components/kids/ui/shell.verify.ts.

export interface Toast {
  id: number
  icon: string
  title: string
  body: string
  /** A folded "+N more" toast: how many rewards it stands for. */
  more?: number
}

/** Most toasts waiting at once (visible + queued); the rest fold into one "+N more" toast. */
export const TOAST_QUEUE_CAP = 5

// Fold toasts get negative ids, so they can never clash with the shell's own (positive) ids.
let foldSeq = 0

export function moreToast(n: number, id: number = --foldSeq): Toast {
  return { id, icon: '🎉', title: `+${n} more ${n === 1 ? 'reward' : 'rewards'}`, body: 'Open your Garage to see them all.', more: n }
}

/** Add `next` to the queue, keeping it at TOAST_QUEUE_CAP by folding the overflow into one "+N more" toast. */
export function enqueueToasts(queue: readonly Toast[], next: readonly Toast[]): Toast[] {
  const all = [...queue, ...next]
  if (all.length <= TOAST_QUEUE_CAP) return all
  const fold = all.find((t) => t.more !== undefined)
  // Keep the first CAP-1 real toasts (oldest first); everything after becomes, or joins, the one fold.
  const real = all.filter((t) => t.more === undefined)
  const keep = real.slice(0, TOAST_QUEUE_CAP - 1)
  const folded = real.length - keep.length + (fold?.more ?? 0)
  return folded > 0 ? [...keep, moreToast(folded, fold?.id)] : keep
}
