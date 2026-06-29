'use client';

import { useMemo, useState } from 'react';
import { HARDWARE, HARDWARE_BY_ID, HARDWARE_CATEGORIES } from '@/lib/hardware-index';

export function CostCalculator({ defaults = [] }: { defaults?: string[] }) {
  const [picked, setPicked] = useState<string[]>(defaults);
  const [adding, setAdding] = useState('');
  const [copied, setCopied] = useState(false);

  const items = useMemo(() => picked.map((id) => HARDWARE_BY_ID.get(id)).filter(Boolean), [picked]);
  const min = items.reduce((s, h) => s + (h?.priceLow ?? 0), 0);
  const max = items.reduce((s, h) => s + (h?.priceHigh ?? 0), 0);

  function add() {
    if (!adding || picked.includes(adding)) return;
    setPicked((p) => [...p, adding]);
    setAdding('');
  }
  function remove(id: string) {
    setPicked((p) => p.filter((x) => x !== id));
  }

  async function copyBom() {
    const text = items
      .map((h) => `- ${h!.name} (${h!.type}) — ₹${h!.priceLow}–${h!.priceHigh}`)
      .concat([`\nTotal: ₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')}`, `\n— Built with the R2BOT Cost Calculator (r2bot.in/hardware)`])
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // best-effort
    }
  }

  return (
    <div className="not-prose my-6 rounded-2xl border border-cyan-400/30 bg-cyan-500/[0.06] p-5">
      <h3 className="m-0 text-lg font-extrabold text-white">🧮 Material Cost Calculator</h3>
      <p className="mt-1 text-sm text-zinc-300">Pick components to build a Bill of Materials for this project.</p>

      <div className="mt-4 flex gap-2">
        <select
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          className="flex-1 rounded-xl border border-white/15 bg-[#0a0f1e] px-3 py-2 text-sm text-white"
        >
          <option value="">Select a component…</option>
          {HARDWARE_CATEGORIES.map((c) => (
            <optgroup key={c.id} label={`${c.emoji} ${c.label}`}>
              {HARDWARE.filter((h) => h.category === c.id).map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} (₹{h.priceLow}–{h.priceHigh})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={!adding}
          className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-cyan-950 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add
        </button>
      </div>

      {items.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {items.map((h) => (
            <li
              key={h!.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200"
            >
              <span>
                <span className="font-bold text-white">{h!.name}</span>{' '}
                <span className="font-mono text-[10px] text-zinc-400">({h!.type})</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-xs text-amber-200">₹{h!.priceLow}–{h!.priceHigh}</span>
                <button
                  type="button"
                  onClick={() => remove(h!.id)}
                  aria-label={`Remove ${h!.name}`}
                  className="text-xs text-zinc-500 hover:text-red-300"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-white/15 p-3 text-center text-xs text-zinc-500">
          No items selected yet.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 font-mono text-sm font-extrabold text-amber-100">
          Total: ₹{min.toLocaleString('en-IN')} – ₹{max.toLocaleString('en-IN')}
        </span>
        <button
          type="button"
          onClick={copyBom}
          disabled={items.length === 0}
          className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-100 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? '✓ BOM copied' : '⧉ Share my BOM'}
        </button>
      </div>
    </div>
  );
}
