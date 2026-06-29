'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Student = {
  id: string;
  display_name: string | null;
  email: string | null;
  total_xp: number;
  current_track: string | null;
  streak_days: number | null;
  last_xp_awarded_at: string | null;
};

export function TeacherDashboard({ classCode, schoolName }: { classCode: string; schoolName: string }) {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email, total_xp, current_track, streak_days, last_xp_awarded_at')
        .eq('class_code', classCode)
        .order('total_xp', { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      setStudents((data as Student[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [classCode]);

  useEffect(() => {
    load();
  }, [load]);

  const totalXp = useMemo(() => (students ?? []).reduce((s, x) => s + (x.total_xp ?? 0), 0), [students]);
  const totalStudents = students?.length ?? 0;
  const active7d = useMemo(() => {
    if (!students) return 0;
    const cutoff = Date.now() - 7 * 86_400_000;
    return students.filter((s) => s.last_xp_awarded_at && new Date(s.last_xp_awarded_at).getTime() >= cutoff).length;
  }, [students]);

  function downloadCsv() {
    if (!students) return;
    const rows = [
      ['name', 'email', 'total_xp', 'track', 'streak_days', 'last_active'].join(','),
      ...students.map((s) =>
        [
          (s.display_name ?? 'Unknown').replace(/,/g, ' '),
          s.email ?? '',
          s.total_xp ?? 0,
          s.current_track ?? '',
          s.streak_days ?? 0,
          s.last_xp_awarded_at ?? '',
        ].join(','),
      ),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `r2bot-class-${classCode}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function sendReminderWA() {
    const text = `Hi! Your R2BOT class (${schoolName} · code ${classCode}) is waiting for you. Open https://r2bot.in and finish today's lesson — keep your streak alive!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');
  }

  return (
    <div className="mx-auto max-w-5xl px-4">
      <header className="text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-cyan-300">Teacher dashboard</p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">{schoolName}</h1>
        <p className="mt-2 inline-flex rounded-full border-2 border-yellow-300 bg-yellow-300/10 px-4 py-1 font-mono text-base font-black tracking-widest text-yellow-100">
          Class code: {classCode}
        </p>
      </header>

      {error ? (
        <p className="mt-6 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Students joined" value={String(totalStudents)} />
        <Stat label="Active last 7 days" value={String(active7d)} />
        <Stat label="Total class XP" value={totalXp.toLocaleString()} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={sendReminderWA}
          className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-extrabold text-emerald-950 hover:scale-[1.02]"
        >
          📲 Send reminder via WhatsApp
        </button>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={!students || students.length === 0}
          className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ⬇ Download class CSV
        </button>
      </div>

      <section className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-white/[0.03]">
            <tr>
              <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">#</th>
              <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Student</th>
              <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Track</th>
              <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">XP</th>
              <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Streak</th>
              <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Last active</th>
            </tr>
          </thead>
          <tbody>
            {students === null ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-zinc-400">
                  Loading…
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-zinc-400">
                  No students have joined yet. Share your class code <strong className="text-yellow-200">{classCode}</strong>.
                </td>
              </tr>
            ) : (
              students.map((s, i) => (
                <tr key={s.id} className="border-t border-white/5">
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500">{i + 1}</td>
                  <td className="px-4 py-2 text-white">
                    {s.display_name ?? `Student ${s.id.slice(0, 6)}`}
                    {s.email ? <p className="m-0 text-[10px] text-zinc-500">{s.email}</p> : null}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs uppercase text-zinc-300">{s.current_track ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-amber-200">{(s.total_xp ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-xs text-yellow-200">🔥 {s.streak_days ?? 0}</td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-400">
                    {s.last_xp_awarded_at ? new Date(s.last_xp_awarded_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
      <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
