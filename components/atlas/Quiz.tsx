'use client';

import { useState } from 'react';

export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number; // index of correct option
  explain: string;
};

export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  return (
    <div className="not-prose my-8 rounded-2xl border border-amber-400/30 bg-amber-500/[0.04] p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl" aria-hidden>🧠</span>
        <h3 className="m-0 text-lg font-bold text-white">Quick Quiz</h3>
        <span className="ml-auto rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-300">
          {questions.length} questions
        </span>
      </div>
      <ol className="m-0 list-none space-y-5 p-0">
        {questions.map((q, i) => (
          <QuestionItem key={i} q={q} index={i + 1} />
        ))}
      </ol>
    </div>
  );
}

function QuestionItem({ q, index }: { q: QuizQuestion; index: number }) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked !== null && picked === q.answer;
  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="m-0 mb-3 text-sm font-semibold text-white">
        <span className="mr-2 font-mono text-amber-300">{index}.</span>
        {q.q}
      </p>
      <ul className="m-0 list-none space-y-2 p-0">
        {q.options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === q.answer;
          let cls =
            'w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors';
          if (picked === null) {
            cls += ' border-white/10 bg-white/[0.02] text-zinc-200 hover:border-amber-400/40';
          } else if (isCorrect) {
            cls += ' border-emerald-400/40 bg-emerald-500/10 text-emerald-200';
          } else if (isPicked) {
            cls += ' border-red-400/40 bg-red-500/10 text-red-200';
          } else {
            cls += ' border-white/5 bg-white/[0.01] text-zinc-500';
          }
          return (
            <li key={i}>
              <button
                type="button"
                disabled={picked !== null}
                onClick={() => setPicked(i)}
                className={cls}
                aria-pressed={isPicked}
              >
                <span className="mr-2 font-mono text-xs text-zinc-400">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
                {picked !== null && isCorrect ? <span className="ml-2 text-emerald-300">✓</span> : null}
                {picked !== null && isPicked && !isCorrect ? <span className="ml-2 text-red-300">✗</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null ? (
        <p
          className={`m-0 mt-3 rounded-lg border p-3 text-xs leading-relaxed ${
            correct
              ? 'border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-200'
              : 'border-amber-400/30 bg-amber-500/[0.06] text-amber-200'
          }`}
        >
          <span className="font-bold">{correct ? 'Correct!' : 'Not quite.'}</span> {q.explain}
        </p>
      ) : null}
    </li>
  );
}
