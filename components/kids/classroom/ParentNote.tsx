// components/kids/classroom/ParentNote.tsx
// What a class sees about a child, in plain words for parents. Used on
// /kids/join (under the form and after joining) and on the teacher pages so
// teachers can show families exactly the same text. No hooks: works in server
// and client components alike.

import type { ReactNode } from 'react'

export interface ParentNoteProps {
  variant?: 'kids' | 'teacher'
  children?: ReactNode
}

export function ParentNote({ variant = 'kids', children }: ParentNoteProps) {
  const box =
    variant === 'kids'
      ? 'rounded-3xl border border-white/10 bg-[#111C32] p-5 text-slate-200 sm:p-6'
      : 'rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-slate-300'
  return (
    <section className={box} aria-labelledby="parent-note-h">
      <h2 id="parent-note-h" className="text-lg font-extrabold text-white">👪 For parents and carers</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed">
        <li><strong className="text-white">What the teacher sees:</strong> the nickname your child typed, and their progress as counts — course sessions, Skill Galaxy activities (stars and tries), which robotics ideas are secure, how many times a check answer pointed to a common misconception (never the answer itself), games and missions, how many things they finished each day for the class goal, the robot they built, and when they last played. Never minutes of play.</li>
        <li><strong className="text-white">What the teacher can set:</strong> the age band your child plays at (Explorers, Builders, Inventors or Engineers — a range, never an age). Your child’s device switches to it the next time it syncs with the class.</li>
        <li><strong className="text-white">What we never ask for:</strong> no email, no password, no birthday, no photo, no account. Please use a first name or a made-up name.</li>
        <li><strong className="text-white">Where it lives:</strong> progress is saved on this device. While your child is in a class, a small summary is sent to the class so the teacher can see it. It is not shown publicly, sold or used for ads.</li>
        <li><strong className="text-white">Leaving:</strong> “Leave class” on the join page deletes the nickname and class progress from R2BOT straight away. The teacher can also remove a child at any time.</li>
      </ul>
      {children}
    </section>
  )
}
