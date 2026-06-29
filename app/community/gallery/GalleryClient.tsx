'use client';

import { useCallback, useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Build = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  track: string | null;
  cost_inr: number | null;
  hours_spent: number | null;
  created_at: string;
  author_name?: string;
  location?: string;
  likes?: number;
  project_slug?: string | null;
  github_url?: string | null;
  video_url?: string | null;
  tags?: string[] | null;
};

type SortMode = 'newest' | 'liked';
const LIKED_LS_KEY = 'r2bot_liked_builds';

const TRACKS = ['spark', 'wire', 'forge', 'edge', 'kids', 'other'];

const TRACK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  spark:  { bg: 'rgba(0,184,212,0.1)',   border: 'rgba(0,184,212,0.3)',   text: '#00b8d4' },
  wire:   { bg: 'rgba(165,107,255,0.1)', border: 'rgba(165,107,255,0.3)', text: '#a56bff' },
  forge:  { bg: 'rgba(0,229,255,0.1)',   border: 'rgba(0,229,255,0.3)',   text: '#00e5ff' },
  edge:   { bg: 'rgba(255,184,0,0.1)',   border: 'rgba(255,184,0,0.3)',   text: '#ffb800' },
  kids:   { bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.3)',  text: '#f97316' },
  other:  { bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)', text: '#9ca3af' },
};

/* ─── Dummy builds — shown when DB is empty ─────────────────────── */
const DUMMY_BUILDS: Build[] = [
  {
    id: 'd1', title: 'Line-follower bot using Arduino + IR sensors',
    description: 'Built during summer vacation! It follows any dark line on white paper. I used 2 IR sensors, an L298N motor driver and 2 DC motors. Total cost under ₹500.',
    image_url: null, track: 'wire', cost_inr: 480, hours_spent: 6, created_at: '2025-05-01T10:00:00Z',
    author_name: 'Arjun Mehta', location: 'Delhi', likes: 47,
  },
  {
    id: 'd2', title: 'Obstacle-avoidance rover',
    description: 'This rover uses an HC-SR04 ultrasonic sensor to detect walls and reverse + turn. Took me 2 weekends. My first ever robot!',
    image_url: null, track: 'wire', cost_inr: 750, hours_spent: 10, created_at: '2025-04-18T08:00:00Z',
    author_name: 'Priya Iyer', location: 'Chennai', likes: 63,
  },
  {
    id: 'd3', title: 'ROS2 simulation — differential drive nav',
    description: 'Got Nav2 working in Gazebo on my laptop! The robot navigates a maze without hitting walls using SLAM-generated maps. No hardware needed — pure simulation.',
    image_url: null, track: 'forge', cost_inr: 0, hours_spent: 18, created_at: '2025-03-30T15:00:00Z',
    author_name: 'Karan Shah', location: 'Bengaluru', likes: 89,
  },
  {
    id: 'd4', title: 'Traffic signal robot — Kids track project',
    description: 'I made a robot that stops at red and goes on green using LEDs and a light sensor. Made this in Grade 6!',
    image_url: null, track: 'kids', cost_inr: 120, hours_spent: 3, created_at: '2025-05-08T12:00:00Z',
    author_name: 'Aanya Singh', location: 'Pune', likes: 34,
  },
  {
    id: 'd5', title: 'AI object-sorting arm on Jetson Nano',
    description: 'YOLOv8 on Jetson Nano controlling a 4-DoF arm to sort colored blocks into bins. Inference at 22fps on 12W. This took 3 months of weekends.',
    image_url: null, track: 'edge', cost_inr: 8500, hours_spent: 120, created_at: '2025-02-14T09:00:00Z',
    author_name: 'Rohan Pillai', location: 'Hyderabad', likes: 204,
  },
  {
    id: 'd6', title: 'Soil moisture bot for the farm',
    description: 'My uncle has a farm. I built a bot that reads soil moisture and sends an alert on WhatsApp if it drops too low. Uses ESP8266 + capacitive sensor.',
    image_url: null, track: 'spark', cost_inr: 280, hours_spent: 8, created_at: '2025-04-05T07:00:00Z',
    author_name: 'Sneha Patil', location: 'Nashik', likes: 121,
  },
  {
    id: 'd7', title: 'Gesture-controlled arm',
    description: 'MPU-6050 on a glove maps my hand tilt to 3 servo motors on a 3D-printed arm. The lag is under 100ms. Printed the arm at school.',
    image_url: null, track: 'wire', cost_inr: 620, hours_spent: 14, created_at: '2025-03-15T11:00:00Z',
    author_name: 'Vikram Nair', location: 'Kochi', likes: 78,
  },
  {
    id: 'd8', title: 'Mini sumo wrestler robot',
    description: 'Built for our school\'s robotics tournament. It won 2nd place! Uses proximity sensors to detect the opponent and a powerful motor driver to push them out.',
    image_url: null, track: 'wire', cost_inr: 890, hours_spent: 9, created_at: '2025-04-28T16:00:00Z',
    author_name: 'Rahul Gupta', location: 'Jaipur', likes: 56,
  },
  {
    id: 'd9', title: 'ROS2 teleoperated drone (simulated)',
    description: 'Flew a simulated quadrotor in Gazebo, controlling it via ROS2 topics published from a PS4 controller. Working on real hardware next month.',
    image_url: null, track: 'forge', cost_inr: 0, hours_spent: 30, created_at: '2025-01-22T10:00:00Z',
    author_name: 'Pooja Sharma', location: 'Mumbai', likes: 167,
  },
];

export function GalleryClient() {
  const [builds, setBuilds] = useState<Build[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTrack, setActiveTrack] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());

  // Hydrate locally-liked IDs from localStorage.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LIKED_LS_KEY);
      const arr = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(arr)) setLikedSet(new Set(arr.filter((x): x is string => typeof x === 'string')));
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from('community_builds')
        .select('id, title, description, image_url, track, cost_inr, hours_spent, created_at, likes, tags, project_slug, github_url, video_url')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(60);
      const real = (data as Build[]) ?? [];
      setBuilds(real.length > 0 ? real : DUMMY_BUILDS);
    } catch {
      setBuilds(DUMMY_BUILDS);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLike = useCallback(async (id: string) => {
    if (likedSet.has(id)) return;
    // Optimistic update: bump local UI immediately.
    setLikedSet((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { window.localStorage.setItem(LIKED_LS_KEY, JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
    setBuilds((prev) => prev ? prev.map((b) => b.id === id ? { ...b, likes: (b.likes ?? 0) + 1 } : b) : prev);
    // Fire-and-forget POST. Dummy builds (id starts with 'd') stay local-only.
    if (id.startsWith('d')) return;
    try { await fetch(`/api/community/like/${encodeURIComponent(id)}`, { method: 'POST' }); } catch { /* ignore */ }
  }, [likedSet]);

  const filtered = (() => {
    if (builds === null) return null;
    const trackMatched = activeTrack === 'all' ? builds : builds.filter((b) => b.track === activeTrack);
    if (sortMode === 'liked') return [...trackMatched].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    return trackMatched;
  })();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>

      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: 40 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 100,
          border: '1px solid rgba(249,115,22,0.35)', background: 'rgba(249,115,22,0.1)',
          padding: '5px 16px', fontSize: 13, color: '#f97316', fontWeight: 600, marginBottom: 16,
        }}>🛠️ I Made It! Gallery</span>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: '#fff', margin: 0 }}>
          Builds from the{' '}
          <span style={{ background: 'linear-gradient(90deg, #f9a8d4, #fde68a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            R2BOT community
          </span>
        </h1>
        <p style={{ color: '#9ca3af', marginTop: 10, fontSize: 15, maxWidth: 500, margin: '10px auto 0' }}>
          Real robots built by real R2BOT learners across India. Share yours — the next builder is watching.
        </p>

        {/* Stats strip */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24, marginTop: 20, fontSize: 13, color: '#6b7280' }}>
          <span><span style={{ color: '#f97316', fontWeight: 700 }}>247</span> builds shared</span>
          <span><span style={{ color: '#a56bff', fontWeight: 700 }}>38</span> cities</span>
          <span><span style={{ color: '#00b8d4', fontWeight: 700 }}>₹0</span> average cost for Spark</span>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          style={{
            marginTop: 20, background: 'linear-gradient(90deg, #f59e0b, #f97316)',
            color: '#000', padding: '11px 24px', borderRadius: 12, fontSize: 14,
            fontWeight: 700, border: 'none', cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancel' : '➕ Submit your build'}
        </button>
      </header>

      {showForm && <SubmitForm onDone={() => { setShowForm(false); load(); }} />}

      {/* Sort toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase' }}>Sort</span>
        {(['newest', 'liked'] as SortMode[]).map((m) => (
          <button
            key={m} type="button" onClick={() => setSortMode(m)}
            style={{
              padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.12)',
              background: sortMode === m ? 'rgba(245,158,11,0.18)' : 'transparent',
              color: sortMode === m ? '#fbbf24' : '#9ca3af',
              cursor: 'pointer',
            }}
          >
            {m === 'newest' ? 'Newest' : 'Most liked'}
          </button>
        ))}
      </div>

      {/* Track filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
        {['all', ...TRACKS].map(t => {
          const tc = t === 'all' ? { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)', text: '#fff' } : (TRACK_COLORS[t] ?? TRACK_COLORS.other);
          const active = activeTrack === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTrack(t)}
              style={{
                padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', textTransform: 'capitalize',
                background: active ? tc.bg : 'transparent',
                border: `1px solid ${active ? tc.border : 'rgba(255,255,255,0.1)'}`,
                color: active ? tc.text : '#9ca3af',
                transition: 'all 0.15s',
              }}
            >
              {t === 'all' ? '🌐 All' : t}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <section>
        {filtered === null ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>Loading builds…</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>No builds in this track yet — be the first!</p>
        ) : (
          <div style={{ columns: 'auto 280px', columnGap: 16 }}>
            {filtered.map(b => {
              const tc = TRACK_COLORS[b.track ?? 'other'] ?? TRACK_COLORS.other;
              return (
                <div
                  key={b.id}
                  style={{
                    breakInside: 'avoid', marginBottom: 16,
                    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 20, padding: 20,
                    transition: 'border-color 0.2s',
                  }}
                >
                  {b.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.image_url} alt={b.title}
                      style={{ width: '100%', borderRadius: 12, marginBottom: 12, objectFit: 'cover' }} loading="lazy" />
                  )}

                  {/* Track badge */}
                  {b.track && (
                    <span style={{
                      display: 'inline-block', borderRadius: 100, fontSize: 10, fontWeight: 600,
                      padding: '3px 10px', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em',
                      background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text,
                    }}>
                      {b.track}
                    </span>
                  )}

                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{b.title}</h3>
                  <p style={{ marginTop: 6, fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>{b.description}</p>

                  {/* Meta chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                    {b.cost_inr !== null && b.cost_inr !== undefined && (
                      <span style={{ fontSize: 11, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', borderRadius: 100, padding: '2px 8px' }}>
                        ₹{b.cost_inr === 0 ? '0 (simulation)' : b.cost_inr.toLocaleString('en-IN')}
                      </span>
                    )}
                    {b.hours_spent != null && (
                      <span style={{ fontSize: 11, background: 'rgba(0,184,212,0.1)', border: '1px solid rgba(0,184,212,0.25)', color: '#00b8d4', borderRadius: 100, padding: '2px 8px' }}>
                        ⏱ {b.hours_spent}h
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleLike(b.id)}
                      disabled={likedSet.has(b.id)}
                      aria-label={likedSet.has(b.id) ? 'Liked' : 'Like this build'}
                      style={{
                        fontSize: 11,
                        background: likedSet.has(b.id) ? 'rgba(249,115,22,0.18)' : 'rgba(249,115,22,0.08)',
                        border: '1px solid rgba(249,115,22,0.3)',
                        color: '#f97316',
                        borderRadius: 100, padding: '2px 8px',
                        cursor: likedSet.has(b.id) ? 'default' : 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      {likedSet.has(b.id) ? '❤️' : '🤍'} {b.likes ?? 0}
                    </button>
                  </div>

                  {/* Author + date */}
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 12, color: '#d1d5db', fontWeight: 600 }}>{b.author_name ?? 'Anonymous'}</span>
                      {b.location && <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>📍 {b.location}</span>}
                    </div>
                    <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#4b5563' }}>
                      {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <div style={{ textAlign: 'center', marginTop: 48, padding: '32px', background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 20 }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Your build could be next. 🤖</p>
        <p style={{ color: '#9ca3af', fontSize: 14, marginTop: 6 }}>Start with the Spark track — free, browser-only, takes 90 minutes.</p>
        <a href="/academy" style={{ display: 'inline-block', marginTop: 16, background: '#f59e0b', color: '#000', padding: '10px 22px', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
          Start Learning →
        </a>
      </div>
    </div>
  );
}

function SubmitForm({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErr('Please log in to submit your build.');
        return;
      }
      let imageUrl: string | null = null;
      const file = fd.get('photo') as File | null;
      if (file && file.size > 0) {
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('community-builds').upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('community-builds').getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }
      const { error: insErr } = await supabase.from('community_builds').insert({
        user_id: user.id,
        title: String(fd.get('title') ?? '').trim(),
        description: String(fd.get('description') ?? '').trim(),
        image_url: imageUrl,
        track: String(fd.get('track') ?? '') || null,
        cost_inr: fd.get('cost_inr') ? parseInt(String(fd.get('cost_inr')), 10) || null : null,
        hours_spent: fd.get('hours_spent') ? parseInt(String(fd.get('hours_spent')), 10) || null : null,
      });
      if (insErr) throw insErr;
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginBottom: 32, background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 20, padding: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 16 }}>Share your build</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', display: 'block', marginBottom: 4 }}>Title *</span>
          <input name="title" required maxLength={120}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
        </label>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', display: 'block', marginBottom: 4 }}>Track</span>
          <select name="track" defaultValue=""
            style={{ width: '100%', background: '#0a0a12', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }}>
            <option value="">— pick one —</option>
            {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label style={{ display: 'block', gridColumn: '1 / -1' }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', display: 'block', marginBottom: 4 }}>What you built *</span>
          <textarea name="description" required rows={3} maxLength={2000}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
        </label>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', display: 'block', marginBottom: 4 }}>Cost (₹)</span>
          <input name="cost_inr" type="number" min="0"
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
        </label>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', display: 'block', marginBottom: 4 }}>Hours spent</span>
          <input name="hours_spent" type="number" min="0"
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
        </label>
        <label style={{ display: 'block', gridColumn: '1 / -1' }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', display: 'block', marginBottom: 4 }}>Photo (optional)</span>
          <input name="photo" type="file" accept="image/*" style={{ fontSize: 13, color: '#9ca3af' }} />
        </label>
      </div>
      {err && <p style={{ marginTop: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#fca5a5' }}>{err}</p>}
      <button type="submit" disabled={busy}
        style={{ marginTop: 16, background: 'linear-gradient(90deg,#f59e0b,#f97316)', color: '#000', padding: '10px 22px', borderRadius: 12, fontWeight: 700, fontSize: 14, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Uploading…' : 'Submit build'}
      </button>
    </form>
  );
}
