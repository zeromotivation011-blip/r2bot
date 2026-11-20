'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const FN = 'https://rbvoelnmckmibncatpyu.supabase.co/functions/v1/reel-inbox';
const PASS_KEY = 'reel-inbox-pass';
const MAX_MB = 500;

type Brand = 'r2bot' | 'rajstudy' | 'rajchaupal';
const BRANDS: { id: Brand; name: string; hint: string }[] = [
  { id: 'rajstudy', name: 'Raj Study', hint: 'Hindi · Rajasthan exams' },
  { id: 'r2bot', name: 'R2BOT', hint: 'English · robotics' },
  { id: 'rajchaupal', name: 'Raj Chaupal', hint: 'Hindi · political history' },
];

type InboxItem = {
  id: string; brand: Brand; filename: string | null; note: string | null; status: string;
  created_at: string; publish_at: string | null; title: string | null; hold_reason: string | null; youtube_id: string | null;
};

type Phase = 'idle' | 'uploading' | 'confirming' | 'done' | 'error';

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch(FN, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}

function ist(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function statusLine(it: InboxItem): { text: string; tone: string } {
  switch (it.status) {
    case 'uploading': return { text: 'Uploading…', tone: 'text-gray-400' };
    case 'received': return { text: 'Received · the Reel desk picks it up within 3 hours', tone: 'text-sky-300' };
    case 'processing': return { text: 'Being prepared: captions, fact-check, slot', tone: 'text-sky-300' };
    case 'scheduled': return { text: it.publish_at ? `Scheduled · ${ist(it.publish_at)} IST · YouTube + Instagram` : 'Scheduled', tone: 'text-emerald-300' };
    case 'held': return { text: `On hold · ${it.hold_reason || 'see Telegram'}`, tone: 'text-amber-300' };
    case 'failed': return { text: 'Failed · see Telegram', tone: 'text-red-300' };
    case 'cancelled': return { text: 'Cancelled', tone: 'text-gray-500' };
    default: return { text: it.status, tone: 'text-gray-400' };
  }
}

export default function UploadClient() {
  const [pass, setPass] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authErr, setAuthErr] = useState('');
  const [checking, setChecking] = useState(false);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<{ seconds: number; w: number; h: number } | null>(null);
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [pct, setPct] = useState(0);
  const [msg, setMsg] = useState('');
  const [items, setItems] = useState<InboxItem[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async (p: string) => {
    try { const r = await call<{ items: InboxItem[] }>({ action: 'recent', password: p }); setItems(r.items || []); } catch { /* list is a convenience */ }
  }, []);

  const login = useCallback(async (p: string, remember: boolean) => {
    setChecking(true); setAuthErr('');
    try {
      await call({ action: 'check', password: p });
      setAuthed(true);
      if (remember) { try { localStorage.setItem(PASS_KEY, p); } catch { /* private mode */ } }
      void refresh(p);
    } catch (e) {
      setAuthErr(e instanceof Error ? e.message : 'Could not check the password');
      try { localStorage.removeItem(PASS_KEY); } catch { /* ignore */ }
    } finally { setChecking(false); }
  }, [refresh]);

  useEffect(() => {
    let saved = '';
    try { saved = localStorage.getItem(PASS_KEY) || ''; } catch { /* ignore */ }
    if (saved) { setPass(saved); void login(saved, false); }
  }, [login]);

  useEffect(() => {
    if (!authed) return;
    const t = setInterval(() => { void refresh(pass); }, 60_000);
    return () => clearInterval(t);
  }, [authed, pass, refresh]);

  function pick(f: File | null) {
    setFile(f); setMeta(null); setPhase('idle'); setMsg(''); setPct(0);
    if (!f) return;
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { setMeta({ seconds: v.duration, w: v.videoWidth, h: v.videoHeight }); URL.revokeObjectURL(v.src); };
    v.src = URL.createObjectURL(f);
  }

  const warnings: string[] = [];
  if (file && file.size > MAX_MB * 1024 * 1024) warnings.push(`File is over ${MAX_MB} MB. Export it smaller (1080×1920 is enough).`);
  if (meta && meta.w > meta.h) warnings.push('This video is landscape. Reels and Shorts should be vertical (9:16).');
  if (meta && meta.seconds > 180) warnings.push('Longer than 3 minutes: YouTube will not treat it as a Short.');
  const blocked = !brand || !file || (file && file.size > MAX_MB * 1024 * 1024);

  async function upload() {
    if (!brand || !file) return;
    setPhase('uploading'); setPct(0); setMsg('');
    try {
      const start = await call<{ id: string; upload_url: string }>({ action: 'start', password: pass, brand, size: file.size, filename: file.name, note });
      await new Promise<void>((resolve, reject) => {
        const x = new XMLHttpRequest();
        x.open('PUT', start.upload_url);
        x.setRequestHeader('Content-Type', file.type || 'video/mp4');
        x.upload.onprogress = (e) => { if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100)); };
        x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error(`Upload failed (${x.status})`)));
        x.onerror = () => reject(new Error('Network error during upload. Check the connection and try again.'));
        x.send(file);
      });
      setPhase('confirming');
      await call({ action: 'done', password: pass, id: start.id });
      setPhase('done');
      setMsg('Got it. The Reel desk will write the title and captions, check the facts, pick the next free slot and tell you on Telegram.');
      setFile(null); setMeta(null); setNote('');
      if (fileInput.current) fileInput.current.value = '';
      void refresh(pass);
    } catch (e) {
      setPhase('error');
      setMsg(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-16">
        <h1 className="text-3xl font-bold text-white">Reel upload</h1>
        <p className="mt-2 text-gray-400">Private. Enter the password from your Telegram message.</p>
        <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); void login(pass, true); }}>
          <label htmlFor="pass" className="block text-sm text-gray-300">Password</label>
          <input id="pass" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)}
            className="h-12 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 text-base text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
          {authErr && <p role="alert" className="text-sm text-red-300">{authErr}</p>}
          <button type="submit" disabled={!pass || checking}
            className="h-12 w-full rounded-lg bg-amber-500 font-semibold text-gray-950 disabled:opacity-50">
            {checking ? 'Checking…' : 'Open'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-3xl font-bold text-white">Upload a reel</h1>
      <p className="mt-2 text-gray-400">Choose the brand, add the video and one line about it. Everything else is done for you.</p>

      <fieldset className="mt-8">
        <legend className="mb-3 text-sm font-medium text-gray-300">1. Brand</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {BRANDS.map((b) => (
            <button key={b.id} type="button" onClick={() => setBrand(b.id)} aria-pressed={brand === b.id}
              className={`min-h-[64px] rounded-xl border px-4 py-3 text-left transition-colors ${brand === b.id ? 'border-amber-500 bg-amber-500/10' : 'border-gray-700 bg-gray-900 hover:border-gray-500'}`}>
              <span className="block font-semibold text-white">{b.name}</span>
              <span className="block text-sm text-gray-400">{b.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-8">
        <label htmlFor="video" className="mb-3 block text-sm font-medium text-gray-300">2. Video (vertical, up to {MAX_MB} MB)</label>
        <input id="video" ref={fileInput} type="file" accept="video/mp4,video/quicktime,video/*" onChange={(e) => pick(e.target.files?.[0] ?? null)}
          className="block w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-base text-gray-200 file:mr-4 file:min-h-[44px] file:rounded-md file:border-0 file:bg-gray-700 file:px-4 file:text-white" />
        {file && (
          <p className="mt-2 text-sm text-gray-400">
            {(file.size / 1048576).toFixed(1)} MB{meta ? ` · ${Math.round(meta.seconds)} s · ${meta.w}×${meta.h}` : ''}
          </p>
        )}
        {warnings.map((w) => <p key={w} className="mt-2 text-sm text-amber-300">{w}</p>)}
      </div>

      <div className="mt-8">
        <label htmlFor="note" className="mb-3 block text-sm font-medium text-gray-300">3. One line about it (optional)</label>
        <textarea id="note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Topic, the source you used, anything the caption must say, or 'post at 7 pm'"
          className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-base text-white placeholder:text-gray-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
      </div>

      <button type="button" onClick={() => void upload()} disabled={blocked || phase === 'uploading' || phase === 'confirming'}
        className="mt-8 h-14 w-full rounded-xl bg-amber-500 text-lg font-semibold text-gray-950 disabled:opacity-40">
        {phase === 'uploading' ? `Uploading… ${pct}%` : phase === 'confirming' ? 'Finishing…' : 'Upload'}
      </button>
      {phase === 'uploading' && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-800" aria-hidden>
          <div className="h-full bg-amber-500 transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      )}
      {msg && <p role="status" className={`mt-4 ${phase === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>{msg}</p>}

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-white">Recent uploads</h2>
          <button type="button" onClick={() => void refresh(pass)} className="min-h-[44px] px-2 text-sm text-amber-400">Refresh</button>
        </div>
        {items.length === 0 ? (
          <p className="mt-4 text-gray-500">Nothing uploaded yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-800">
            {items.map((it) => {
              const s = statusLine(it);
              return (
                <li key={it.id} className="py-4">
                  <p className="text-white">
                    <span className="mr-2 rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-300">{BRANDS.find((b) => b.id === it.brand)?.name}</span>
                    {it.title || it.note || it.filename}
                  </p>
                  <p className={`mt-1 text-sm ${s.tone}`}>{s.text}</p>
                  <p className="mt-1 text-xs text-gray-500">Uploaded {ist(it.created_at)} IST</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <button type="button" className="mt-10 min-h-[44px] text-sm text-gray-500 underline"
        onClick={() => { try { localStorage.removeItem(PASS_KEY); } catch { /* ignore */ } setAuthed(false); setPass(''); }}>
        Forget the password on this device
      </button>
    </main>
  );
}
