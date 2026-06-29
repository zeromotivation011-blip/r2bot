'use client';

import { useState } from 'react';
import type { Robot } from '@/lib/robots-data';

const specLabels: Record<string, string> = {
  height: 'Height',
  weight: 'Weight',
  speed: 'Speed',
  payload: 'Payload',
  battery: 'Battery',
  dof: 'Degrees of Freedom',
  reach: 'Reach',
};

export function RobotSpecs({ robot }: { robot: Robot }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(robot.specs).filter(([, v]) => !!v);
  if (entries.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.04]"
      >
        <span className="text-base font-bold text-white">
          See full specs{' '}
          <span className="ml-1 text-xs font-normal text-zinc-400">({entries.length} entries)</span>
        </span>
        <span className="text-amber-300" aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open ? (
        <table className="w-full text-left text-sm">
          <tbody>
            {entries.map(([key, value]) => (
              <tr key={key} className="border-t border-white/5 odd:bg-white/[0.02]">
                <th className="w-1/3 px-5 py-3 font-semibold text-zinc-200">
                  {specLabels[key] ?? key}
                </th>
                <td className="px-5 py-3 text-zinc-300">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
