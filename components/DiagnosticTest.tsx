'use client';

import { useEffect, useState } from 'react';
import { useCopilot } from './CopilotProvider';

type Answer = 0 | 1 | 2; // 0 = least experienced, 2 = most

type Question = {
  id: string;
  text: string;
  options: [string, string, string]; // index 0=worth 0, 1=worth 1, 2=worth 2
};

const QUESTIONS: Question[] = [
  {
    id: 'solder',
    text: 'Have you ever soldered a wire?',
    options: ["What's solder?", 'No, but I know what it is', 'Yes, comfortably'],
  },
  {
    id: 'loop',
    text: 'Can you write a for-loop in any programming language?',
    options: ['Not yet', 'With some Googling', 'Easily, in my sleep'],
  },
  {
    id: 'linux',
    text: 'Have you used Linux from the command line?',
    options: ['Never', 'Tried, got lost', 'Yes, regularly'],
  },
  {
    id: 'pwm',
    text: 'Do you know what PWM means?',
    options: ['No idea', 'Heard the term', 'Yes, and used it'],
  },
  {
    id: 'built',
    text: 'Have you ever built or programmed something that moves on its own?',
    options: ['No', 'Sort of (Lego, code in a sim)', 'Yes — real motors, real movement'],
  },
];

type Track = 'spark' | 'wire' | 'forge' | 'edge';

const TRACKS: Record<Track, {
  label: string;
  range: string;
  blurb: string;
  next: string;
  courses: { id: string; title: string }[];
  color: string;
}> = {
  spark: {
    label: 'Spark',
    range: 'Beginner',
    blurb:
      "You're at the start of the journey — exactly where you should be. Spark is the entry track: what a robot is, how its body works, your first circuit. No prior experience assumed. By the end, you'll have blinked an LED and understood every word of this sentence.",
    next: 'Spark 01: What is a Robot, Really?',
    courses: [
      { id: 'spark-01', title: 'What is a Robot, Really?' },
      { id: 'spark-02', title: 'The Anatomy of a Machine' },
      { id: 'spark-03', title: 'Senses — How Robots See, Hear, Feel' },
      { id: 'spark-04', title: 'Muscles — Motors & Movement' },
      { id: 'spark-05', title: 'The Brain — Microcontrollers in 20 Minutes' },
      { id: 'spark-06', title: 'Your Very First Circuit' },
    ],
    color: '#00B8D4',
  },
  wire: {
    label: 'Wire',
    range: 'Intermediate',
    blurb:
      "You've got the basics. Wire is where you start building. Arduino, Raspberry Pi, a bit of Python, your first computer-vision project, your first line-following bot. Real hardware, real code, real motion.",
    next: 'Wire 01: Arduino from Scratch',
    courses: [
      { id: 'wire-01', title: 'Arduino From Scratch' },
      { id: 'wire-02', title: 'Raspberry Pi Playground' },
      { id: 'wire-03', title: 'Python for Robots' },
      { id: 'wire-04', title: 'Computer Vision in 90 Minutes' },
      { id: 'wire-05', title: 'Talking to Servos & Motors' },
      { id: 'wire-06', title: 'Build a Line-Following Bot' },
    ],
    color: '#22C55E',
  },
  forge: {
    label: 'Forge',
    range: 'Advanced',
    blurb:
      "You're an engineer. Forge is the serious track: ROS 2, SLAM, reinforcement learning, robotic arms, drones, simulation. The same skills that go on a robotics-engineer CV at Boston Dynamics, ISRO, or any modern robotics startup.",
    next: 'Forge 01: ROS 2 — The OS for Robots',
    courses: [
      { id: 'forge-01', title: 'ROS 2 — The OS for Robots' },
      { id: 'forge-02', title: 'SLAM & Autonomous Navigation' },
      { id: 'forge-03', title: 'Reinforcement Learning for Robots' },
      { id: 'forge-04', title: 'Robotic Arms & Manipulation' },
      { id: 'forge-05', title: 'Drones — From Build to Flight' },
      { id: 'forge-06', title: 'Simulation with Gazebo & Isaac Sim' },
    ],
    color: '#FFB020',
  },
  edge: {
    label: 'Edge',
    range: 'Expert',
    blurb:
      "You're at the frontier. Edge is for working engineers, researchers, and founders building what's next: humanoids, swarms, soft robotics, foundation models for control, the business of robotics. Nothing in here is settled science.",
    next: 'Edge 01: Humanoid Robotics',
    courses: [
      { id: 'edge-01', title: 'Humanoid Robotics' },
      { id: 'edge-02', title: 'Multi-Robot Systems & Swarms' },
      { id: 'edge-03', title: 'Bio-inspired Robotics' },
      { id: 'edge-04', title: 'Generative AI for Robotics' },
      { id: 'edge-05', title: 'Designing for Manufacture' },
      { id: 'edge-06', title: 'Starting a Robotics Company' },
    ],
    color: '#A56BFF',
  },
};

function scoreToTrack(score: number): Track {
  if (score <= 2) return 'spark';
  if (score <= 5) return 'wire';
  if (score <= 8) return 'forge';
  return 'edge';
}

const LS_KEY = 'r2bot:diagnostic';

export function DiagnosticTest() {
  const [step, setStep] = useState<number>(0); // 0..N-1 = questions, N = result
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [savedTrack, setSavedTrack] = useState<Track | null>(null);
  const { openWith } = useCopilot();

  // Restore previous result (so a returning user sees their last placement)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { track?: Track };
        if (parsed.track && parsed.track in TRACKS) setSavedTrack(parsed.track);
      }
    } catch {}
  }, []);

  const choose = (value: Answer) => {
    const next = [...answers, value];
    setAnswers(next);
    if (next.length >= QUESTIONS.length) {
      // Compute & save
      const score = next.reduce<number>((s, a) => s + a, 0);
      const track = scoreToTrack(score);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ track, score, at: new Date().toISOString() }));
      } catch {}
      setSavedTrack(track);
      setStep(QUESTIONS.length);
    } else {
      setStep(s => s + 1);
    }
  };

  const restart = () => {
    setAnswers([]);
    setStep(0);
  };

  const isResult = step >= QUESTIONS.length && savedTrack;

  // ===== RESULT VIEW =====
  if (isResult && savedTrack) {
    const t = TRACKS[savedTrack];
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,184,212,.06), rgba(165,107,255,.04))',
        border: '1px solid var(--border-2)',
        borderRadius: 20,
        padding: 40,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -60, top: -60, width: 320, height: 320, background: `radial-gradient(circle, ${t.color}30, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, letterSpacing: '.35em', color: t.color, textTransform: 'uppercase', marginBottom: 16 }}>
            Your level
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(48px, 7vw, 84px)', margin: '0 0 12px', color: 'var(--mist)', lineHeight: 1 }}>
            {t.label}
          </h2>
          <div style={{ fontSize: 16, color: 'var(--muted)', fontFamily: 'var(--font-mono), monospace', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 24 }}>
            {t.range}
          </div>
          <p style={{ fontSize: 18, color: '#C8D0DC', lineHeight: 1.65, margin: '0 0 28px', maxWidth: 600 }}>
            {t.blurb}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '14px 24px', fontSize: 15, background: t.color }}
              onClick={() => openWith(`I just got placed in the ${t.label} track. What should I do first?`)}
            >
              Ask R2 what&apos;s next →
            </button>
            <button onClick={restart} className="chip" style={{ padding: '10px 18px', fontSize: 14 }}>
              Retake the test
            </button>
          </div>

          <div style={{ paddingTop: 30, borderTop: '1px solid var(--border)' }}>
            <h3 className="display" style={{ fontSize: 22, margin: '0 0 18px', color: 'var(--mist)' }}>
              The {t.label} track — 6 courses
            </h3>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {t.courses.map((c, i) => (
                <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: i < t.courses.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, color: t.color, minWidth: 70 }}>
                    {c.id.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 16, color: 'var(--mist)' }}>{c.title}</span>
                  {i === 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: t.color, fontFamily: 'var(--font-mono), monospace', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                      Start here
                    </span>
                  )}
                </li>
              ))}
            </ol>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 22 }}>
              Courses go live as we build them. Sign up for the Pulse newsletter on the homepage to get notified when each one ships.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ===== QUESTION VIEW =====
  const q = QUESTIONS[step];
  const progress = (step / QUESTIONS.length) * 100;

  return (
    <div>
      {/* Progress */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono), monospace', fontSize: 12, color: 'var(--muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 10 }}>
          <span>Question {step + 1} of {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--cyan), var(--cyan-bright))', transition: 'width .35s cubic-bezier(.22,.61,.36,1)' }} />
        </div>
      </div>

      {/* Question */}
      <h2 className="display" style={{ fontSize: 'clamp(28px, 3.6vw, 40px)', lineHeight: 1.15, margin: '0 0 32px', color: 'var(--mist)' }}>
        {q.text}
      </h2>

      {/* Options */}
      <div style={{ display: 'grid', gap: 12 }}>
        {q.options.map((label, i) => (
          <button
            key={label}
            onClick={() => choose(i as Answer)}
            style={{
              textAlign: 'left',
              padding: '20px 24px',
              borderRadius: 14,
              background: 'rgba(11,37,64,.4)',
              border: '1px solid var(--border)',
              color: 'var(--mist)',
              fontSize: 17,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all .2s cubic-bezier(.22,.61,.36,1)',
              display: 'flex',
              alignItems: 'center',
              gap: 18,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--cyan)';
              e.currentTarget.style.background = 'rgba(0,184,212,.08)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'rgba(11,37,64,.4)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, color: 'var(--cyan)', minWidth: 22 }}>
              {String.fromCharCode(65 + i)}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      <p style={{ marginTop: 28, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
        No right or wrong answers. Pick the option that&apos;s most true today.
      </p>
    </div>
  );
}
