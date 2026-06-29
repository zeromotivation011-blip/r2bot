'use client';

import { useState } from 'react';

type Track = 'spark' | 'wire' | 'forge' | 'edge';

const ACCENT: Record<Track, string> = {
  spark: '#00B8D4',
  wire: '#A56BFF',
  forge: '#00E5FF',
  edge: '#FFB800',
};

type Roadmap = {
  key: Track;
  role: string;
  goal: string;
  timeline: string;
  atlas: Array<{ slug: string; label: string }>;
  academy: string;
  skills: string[];
  projects: string[];
  jobs: string[];
  salary: { from: number; to: number; label: string };
  companies?: string[];
  platforms: string[];
  certs: string[];
};

const ROADMAPS: Roadmap[] = [
  {
    key: 'spark',
    role: 'Robotics Enthusiast / Hobbyist',
    goal: 'Build first robot project, join a robotics club',
    timeline: '3–6 months',
    atlas: [
      { slug: 'concept/dc-motor', label: 'actuator' },
      { slug: 'concept/camera-vision', label: 'sensor' },
      { slug: 'concept/microcontroller', label: 'microcontroller' },
      { slug: 'concept/single-board-computer', label: 'arduino' },
      { slug: 'concept/servo-motor', label: 'servo-motor' },
      { slug: 'concept/feedback', label: 'feedback-loop' },
    ],
    academy: 'Spark 01–06',
    skills: ['Basic electronics', 'Arduino programming', 'CAD basics'],
    projects: ['Line-following robot', 'Obstacle-avoiding bot', 'Robotic arm with servo'],
    jobs: ['Intern — Robotics', 'Junior Technician', 'Lab Assistant'],
    salary: { from: 2, to: 4, label: '₹2–4 LPA (entry / internship)' },
    platforms: ['Internshala', 'LinkedIn', 'college placement cells'],
    certs: ['NPTEL Robotics', 'Coursera Robotics Specialization (UPenn)'],
  },
  {
    key: 'wire',
    role: 'Robotics Engineer (Junior)',
    goal: 'Land your first full-time robotics job',
    timeline: '6–12 months',
    atlas: [
      { slug: 'concept/pid-controller', label: 'pid-controller' },
      { slug: 'concept/ros', label: 'ros' },
      { slug: 'concept/encoder', label: 'encoder' },
      { slug: 'concept/imu', label: 'imu' },
      { slug: 'concept/forward-kinematics', label: 'kinematic-chain' },
      { slug: 'concept/odometry', label: 'odometry' },
      { slug: 'concept/slam', label: 'slam' },
    ],
    academy: 'Wire 01–06 (coming soon)',
    skills: ['ROS / ROS2', 'Python + C++', 'URDF', 'Gazebo simulation'],
    projects: ['ROS2 navigation stack on TurtleBot', 'Autonomous indoor mapping'],
    jobs: ['Robotics Software Engineer', 'Automation Engineer', 'Controls Engineer'],
    salary: { from: 4, to: 10, label: '₹4–10 LPA' },
    companies: [
      'Addverb Technologies',
      'GreyOrange',
      'Systemantics',
      'Nuro',
      'Ati Motors',
      'Wipro Robotics',
      'L&T',
      'Tata Elxsi',
    ],
    platforms: ['Naukri.com', 'LinkedIn', 'IIT job portals'],
    certs: ['ROS Developer Certificate (The Construct)', 'MATLAB Robotics'],
  },
  {
    key: 'forge',
    role: 'Senior Robotics Engineer',
    goal: 'Lead robot system design and deployment',
    timeline: '1–2 years',
    atlas: [
      { slug: 'concept/motion-planning', label: 'motion-planning' },
      { slug: 'concept/inverse-kinematics', label: 'inverse-kinematics' },
      { slug: 'concept/computer-vision', label: 'computer-vision' },
      { slug: 'concept/sensor-fusion', label: 'kalman-filter' },
      { slug: 'concept/path-planning', label: 'path-planning' },
      { slug: 'concept/localisation', label: 'state-estimation' },
      { slug: 'concept/neural-network', label: 'neural-network' },
    ],
    academy: 'Forge 01–06 (coming soon)',
    skills: ['MoveIt', 'OpenCV', 'PyTorch / TensorFlow for robotics', 'Embedded systems'],
    projects: ['Production pick-and-place pipeline', 'Perception stack on real hardware'],
    jobs: ['Senior Robotics Engineer', 'Perception Engineer', 'ML Engineer — Robotics'],
    salary: { from: 12, to: 25, label: '₹12–25 LPA' },
    companies: ['Pixxel', 'AgniKul Cosmos', 'Skyroot Aerospace', 'Bosch India', 'ABB Robotics', 'Honeywell'],
    platforms: ['LinkedIn', 'AngelList', 'iimjobs.com for senior roles'],
    certs: ['AWS Robotics', 'Google TensorFlow Developer'],
  },
  {
    key: 'edge',
    role: 'Robotics Researcher / Architect',
    goal: 'Push the state of the art, lead R&D teams',
    timeline: 'Ongoing',
    atlas: [
      { slug: 'concept/reinforcement-learning', label: 'reinforcement-learning' },
      { slug: 'concept/sim-to-real', label: 'sim-to-real' },
      { slug: 'concept/slam', label: 'simultaneous-localization-and-mapping' },
      { slug: 'concept/pid-controller', label: 'model-predictive-control' },
      { slug: 'concept/neural-network', label: 'graph-neural-network' },
      { slug: 'concept/foundation-model-robotics', label: 'transformer-robotics' },
    ],
    academy: 'Edge 01–06 (coming soon)',
    skills: ['Research methods', 'Paper writing', 'ROS2 advanced', 'GPU programming (CUDA)'],
    projects: ['Publish at ICRA / IROS', 'Lead a research codebase to open-source release'],
    jobs: ['Principal Engineer', 'Research Scientist', 'CTO / Co-founder', 'Professor'],
    salary: { from: 30, to: 80, label: '₹30–80 LPA (industry) / ₹8–20 LPA (academia)' },
    companies: [
      'IIT research labs',
      'Microsoft Research India',
      'Google DeepMind India',
      'Amazon Robotics',
      'ISRO',
      'DRDO',
    ],
    platforms: ['Google Scholar', 'ResearchGate', 'LinkedIn', 'academic job boards'],
    certs: ['PhD', 'IIT / IISc research fellowships'],
  },
];

function SalaryBar({ from, to, accent }: { from: number; to: number; accent: string }) {
  // Visual scale capped at ₹100 LPA so the bar stays readable across tracks.
  const cap = 100;
  const left = Math.min(100, (from / cap) * 100);
  const right = Math.min(100, (to / cap) * 100);
  const width = Math.max(2, right - left);
  return (
    <div style={{ marginTop: 6 }}>
      <div
        style={{
          position: 'relative',
          height: 6,
          borderRadius: 999,
          background: 'rgba(255,255,255,.06)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${left}%`,
            width: `${width}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${accent}, var(--cyan-bright))`,
            boxShadow: `0 0 12px ${accent}66`,
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 10,
          color: 'var(--muted)',
        }}
      >
        <span>₹0</span>
        <span>₹25L</span>
        <span>₹50L</span>
        <span>₹75L</span>
        <span>₹100L</span>
      </div>
    </div>
  );
}

function StepBlock({
  n,
  title,
  children,
  accent,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 16, marginBottom: 24 }}>
      <div
        style={{
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 22,
          fontWeight: 700,
          color: accent,
        }}
      >
        0{n}
      </div>
      <div>
        <div
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            letterSpacing: '.25em',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {title}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

function Pill({ href, label, accent }: { href?: string; label: string; accent: string }) {
  const style: React.CSSProperties = {
    padding: '5px 12px',
    borderRadius: 999,
    border: `1px solid ${accent}55`,
    background: `${accent}14`,
    color: accent,
    fontSize: 12.5,
    textDecoration: 'none',
    display: 'inline-block',
  };
  return href ? (
    <a href={href} style={style}>
      {label}
    </a>
  ) : (
    <span style={style}>{label}</span>
  );
}

export function CareersClient() {
  const [active, setActive] = useState<Track>('spark');
  const current = ROADMAPS.find((r) => r.key === active)!;
  const accent = ACCENT[active];

  return (
    <>
      {/* Track tabs */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 28,
        }}
      >
        {ROADMAPS.map((r) => {
          const isActive = active === r.key;
          return (
            <button
              key={r.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(r.key)}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: `1px solid ${isActive ? ACCENT[r.key] : 'var(--border)'}`,
                background: isActive ? `${ACCENT[r.key]}1c` : 'rgba(11,37,64,.4)',
                color: isActive ? ACCENT[r.key] : '#C8D0DC',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                letterSpacing: '.02em',
                textTransform: 'capitalize',
              }}
            >
              {r.key}
            </button>
          );
        })}
      </div>

      {/* Card */}
      <div
        style={{
          padding: 'clamp(24px, 3vw, 36px)',
          borderRadius: 18,
          border: '1px solid var(--border-2)',
          background: `linear-gradient(135deg, ${accent}10, rgba(11,37,64,.4))`,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            letterSpacing: '.3em',
            color: accent,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {active} track · {current.timeline}
        </div>
        <h2 className="display" style={{ fontSize: 32, margin: '0 0 8px', color: 'var(--mist)' }}>
          {current.role}
        </h2>
        <p style={{ fontSize: 16, color: '#B0B8C5', margin: '0 0 28px' }}>{current.goal}</p>

        <StepBlock n={1} title="Master these Atlas terms" accent={accent}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {current.atlas.map((a) => (
              <Pill key={a.slug + a.label} href={`/atlas/${a.slug}`} label={a.label} accent={accent} />
            ))}
          </div>
        </StepBlock>

        <StepBlock n={2} title="Complete Academy lessons" accent={accent}>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--mist)' }}>{current.academy}</p>
        </StepBlock>

        <StepBlock n={3} title="Build these projects" accent={accent}>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--mist)', fontSize: 15, lineHeight: 1.7 }}>
            {current.projects.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </StepBlock>

        <StepBlock n={4} title="Apply to these companies" accent={accent}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(current.companies ?? ['(no specific companies yet — focus on internships)']).map((c) => (
              <span
                key={c}
                style={{
                  padding: '8px 14px',
                  borderRadius: 12,
                  background: 'rgba(11,37,64,.55)',
                  border: '1px solid var(--border)',
                  color: 'var(--mist)',
                  fontSize: 13.5,
                }}
              >
                {c}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
            Job titles: {current.jobs.join(' · ')}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--muted)' }}>
            Where to look: {current.platforms.join(' · ')}
          </div>
        </StepBlock>

        <StepBlock n={5} title="Earn these certifications" accent={accent}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {current.certs.map((c) => (
              <Pill key={c} label={c} accent={accent} />
            ))}
          </div>
        </StepBlock>

        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 11,
              letterSpacing: '.2em',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Skills · {current.skills.join(' · ')}
          </div>
          <div style={{ fontSize: 14, color: 'var(--cyan-bright)', marginBottom: 6 }}>{current.salary.label}</div>
          <SalaryBar from={current.salary.from} to={current.salary.to} accent={accent} />
        </div>

        <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <a
            href="/diagnostic"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 22px',
              borderRadius: 12,
              background: accent,
              color: '#001318',
              fontWeight: 600,
              fontSize: 14.5,
              textDecoration: 'none',
            }}
          >
            Start {active.charAt(0).toUpperCase() + active.slice(1)} track →
          </a>
          <a
            href="/atlas"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '12px 22px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              color: '#C8D0DC',
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Browse Atlas →
          </a>
        </div>
      </div>
    </>
  );
}
