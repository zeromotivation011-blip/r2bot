'use client';

import { useState } from 'react';

type State = 'idle' | 'submitting' | 'success' | 'error';

const BOARDS = ['CBSE', 'ICSE', 'State Board', 'IGCSE / IB', 'Other'];
const ROLES = ['Teacher', 'HOD', 'Principal', 'Coordinator', 'Other'];
const GRADES = ['6–8', '9–10', '11–12', 'All (6–12)'];

export function SchoolRegisterForm() {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [classCode, setClassCode] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    try {
      const res = await fetch('/api/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Server returned ${res.status}`);
      }
      const j = (await res.json()) as { classCode: string };
      setClassCode(j.classCode);
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('error');
    }
  }

  if (state === 'success' && classCode) {
    const whatsapp = `https://wa.me/?text=${encodeURIComponent(
      `Our school is now on R2BOT! Class code: ${classCode}. Visit https://r2bot.in to start.`,
    )}`;
    return (
      <div className="mt-10 rounded-3xl border border-emerald-400/40 bg-emerald-500/[0.08] p-8 text-center">
        <span className="text-6xl" aria-hidden>✅</span>
        <h2 className="mt-4 text-3xl font-black text-emerald-100">You&apos;re in!</h2>
        <p className="mt-3 text-emerald-50">
          We&apos;ll activate your account within 24 hours and email your teacher dashboard link. Meanwhile, share your
          class code with your students:
        </p>
        <p className="mt-5 inline-flex rounded-2xl border-2 border-yellow-300 bg-yellow-300/10 px-6 py-3 font-mono text-3xl font-black tracking-widest text-yellow-100">
          {classCode}
        </p>
        <p className="mt-5">
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-emerald-950 hover:bg-emerald-300"
          >
            📲 Share via WhatsApp
          </a>
        </p>
        <p className="mt-3 text-xs text-emerald-200">Bookmark this page or screenshot the code.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-10 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <Field name="school_name" label="School Name" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="city" label="City" required />
        <Field name="state" label="State" required />
      </div>
      <Select name="board" label="Board" options={BOARDS} required />
      <hr className="my-3 border-white/10" />
      <Field name="teacher_name" label="Your Name" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="teacher_email" label="Email" type="email" required />
        <Field name="phone" label="Phone (optional)" />
      </div>
      <Select name="role" label="Your Role" options={ROLES} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="student_count_estimate" label="Estimated students" type="number" min="1" required />
        <Select name="grade_range" label="Which grade?" options={GRADES} required />
      </div>

      {error ? (
        <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="mt-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-7 py-3 text-base font-extrabold text-[#1a0f00] hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {state === 'submitting' ? 'Submitting…' : 'Register School — Free →'}
      </button>
      <p className="mt-2 text-xs text-zinc-500">
        By registering you agree to our Privacy &amp; Terms. We never share school data.
      </p>
    </form>
  );
}

function Field({ name, label, type = 'text', required, min }: { name: string; label: string; type?: string; required?: boolean; min?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
        {label} {required ? <span className="text-amber-300">*</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        min={min}
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-amber-400/60"
      />
    </label>
  );
}

function Select({ name, label, options, required }: { name: string; label: string; options: string[]; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
        {label} {required ? <span className="text-amber-300">*</span> : null}
      </span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="mt-1 w-full rounded-xl border border-white/10 bg-[#0a0f1e] px-4 py-2.5 text-sm text-white outline-none focus:border-amber-400/60"
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
