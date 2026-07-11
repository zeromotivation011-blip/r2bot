import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { SenseThinkActVisual } from '@/components/visuals/SenseThinkActVisual';
import { PIDSimulator } from '@/components/visuals/PIDSimulator';
import { RobotTypesVisual } from '@/components/visuals/RobotTypesVisual';
import { InverseKinematicsVisual } from '@/components/visuals/InverseKinematicsVisual';
import { AStarVisual } from '@/components/visuals/AStarVisual';
import { SensorFusionVisual } from '@/components/visuals/SensorFusionVisual';
import { SLAMVisual } from '@/components/visuals/SLAMVisual';
import { MotorControlVisual } from '@/components/visuals/MotorControlVisual';
import { RobotPlayground } from '@/components/visuals/RobotPlayground';
import { URDFViewerWrapper } from '@/components/visuals/URDFViewerWrapper';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

const SIMULATOR_LESSONS: Record<string, { href: string; title: string }> = {
  'pid': { href: '/academy/wire/w-03-pid-control-practice', title: 'W-03: PID Control in Practice' },
  'sensor-fusion': { href: '/academy/wire/w-02-sensor-integration', title: 'W-02: Sensor Integration' },
  'slam': { href: '/academy/forge/f-01-ros2-nav2', title: 'F-01: ROS2 Navigation Stack' },
  'astar': { href: '/academy/forge/f-01-ros2-nav2', title: 'F-01: ROS2 Navigation Stack' },
  'ik': { href: '/academy/forge/f-02-moveit2-manipulation', title: 'F-02: Robot Manipulation' },
  'sense-think-act': { href: '/academy/spark/s-01-what-is-a-robot', title: 'S-01: What is a Robot?' },
  'robot-types': { href: '/academy/spark/s-02-types-of-robots', title: 'S-02: Types of Robots' },
  'motor': { href: '/academy/spark/s-04-how-robots-move', title: 'S-04: How Robots Move' },
  'playground': { href: '/academy/wire/w-06-capstone-navigator', title: 'W-06: Capstone Navigator' },
};

import { VisualizerActions } from '@/components/visualizer/VisualizerActions';
import { HashAutoScroll } from '@/components/visualizer/HashAutoScroll';

function MasterThisLink({ lessonKey }: { lessonKey?: string }) {
  if (!lessonKey) return null;
  const lesson = SIMULATOR_LESSONS[lessonKey];
  if (!lesson) return null;
  return (
    <Link
      href={lesson.href}
      className="inline-flex items-center gap-1.5 text-xs text-amber-500/70 hover:text-amber-400 transition-colors mt-2"
      style={{ marginBottom: 18 }}
    >
      <span>📚</span> Master this in {lesson.title} →
    </Link>
  );
}

export const metadata: Metadata = {
  title: 'Interactive Robotics Simulators',
  description:
    '9 browser-based robotics simulators. PID tuner, A* pathfinder, SLAM, inverse kinematics, sensor fusion — no install required.',
  alternates: { canonical: `${BASE_URL}/visualizer` },
};

function VisualSection({
  eyebrow,
  title,
  blurb,
  id,
  featured,
  lessonKey,
  children,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  id?: string;
  featured?: boolean;
  lessonKey?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ marginTop: 64, scrollMarginTop: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div className="section-eyebrow">{eyebrow}</div>
        {featured && (
          <span
            style={{
              padding: '2px 10px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, rgba(0,229,255,.25), rgba(0,184,212,.15))',
              border: '1px solid var(--cyan)',
              color: 'var(--cyan-bright)',
              fontSize: 10,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono), monospace',
              fontWeight: 700,
            }}
          >
            ★ Featured
          </span>
        )}
      </div>
      <h2 className="display" style={{ fontSize: 'clamp(28px, 3vw, 36px)', margin: '8px 0 8px', color: 'var(--mist)' }}>
        {title}
      </h2>
      <p style={{ fontSize: 16, color: '#B0B8C5', margin: '0 0 8px', maxWidth: 640 }}>
        {blurb}
      </p>
      <MasterThisLink lessonKey={lessonKey} />
      {id ? <VisualizerActions sectionId={id} title={title} /> : null}
      {children}
    </section>
  );
}

export default function VisualizerPage() {
  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />
      <HashAutoScroll />
      <main id="main-content" style={{ paddingTop: 140, paddingBottom: 100, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="section-eyebrow">Interactive · Hands-on</div>
          <h1
            className="display"
            style={{ fontSize: 'clamp(40px, 5.5vw, 64px)', margin: '0 0 16px' }}
          >
            R2BOT Lab — Interactive Robotics Simulations.
          </h1>
          <p style={{ fontSize: 19, color: '#B0B8C5', maxWidth: 680, margin: 0 }}>
            9 hands-on simulations. No installation. No signup. Just learn.
          </p>
          <div style={{ marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a
              href="#playground"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 999,
                border: '1px solid var(--cyan)',
                background: 'rgba(0,184,212,.2)',
                color: 'var(--cyan-bright)',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 0 20px rgba(0,184,212,.15)',
              }}
            >
              Try the Code Playground →
            </a>
            <a
              href="#ik"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 999,
                border: '1px solid var(--border-2)',
                background: 'transparent',
                color: '#C8D0DC',
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Browse all sims
            </a>
          </div>
        </div>

        {/* Featured: 3D Robot Explorer — full width, top */}
        <div className="container" style={{ maxWidth: 1200, marginTop: 56 }}>
          <section id="robots" style={{ scrollMarginTop: 100 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="section-eyebrow">★ Featured</div>
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, rgba(0,229,255,.3), rgba(0,184,212,.15))',
                  border: '1px solid var(--cyan)',
                  color: 'var(--cyan-bright)',
                  fontSize: 10,
                  letterSpacing: '.2em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono), monospace',
                  fontWeight: 700,
                }}
              >
                NEW ✨
              </span>
            </div>
            <h2 className="display" style={{ fontSize: 'clamp(28px, 3vw, 36px)', margin: '8px 0 8px', color: 'var(--mist)' }}>
              3D Robot Explorer
            </h2>
            <p style={{ fontSize: 16, color: '#B0B8C5', margin: '0 0 22px', maxWidth: 720 }}>
              Rotate, zoom, and move the joints of 4 real robot types — TurtleBot3, UR5 arm, quadruped, drone. All rendered live with Three.js.
            </p>
            <URDFViewerWrapper />
          </section>
        </div>

        {/* Featured: Playground — full width */}
        <div className="container" style={{ maxWidth: 1200, marginTop: 64 }}>
          <section id="playground" style={{ scrollMarginTop: 100 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="section-eyebrow">00 · Featured</div>
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, rgba(0,229,255,.25), rgba(0,184,212,.15))',
                  border: '1px solid var(--cyan)',
                  color: 'var(--cyan-bright)',
                  fontSize: 10,
                  letterSpacing: '.2em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono), monospace',
                  fontWeight: 700,
                }}
              >
                ★ Featured
              </span>
            </div>
            <h2 className="display" style={{ fontSize: 'clamp(28px, 3vw, 36px)', margin: '8px 0 8px', color: 'var(--mist)' }}>
              Robot Code Playground — Write code, see it move.
            </h2>
            <p style={{ fontSize: 16, color: '#B0B8C5', margin: '0 0 8px', maxWidth: 720 }}>
              A full Monaco editor wired to a 2D robot. Write commands in Python-like syntax, watch the robot drive, share your program with a link.
            </p>
            <MasterThisLink lessonKey="playground" />
            <RobotPlayground />
          </section>
        </div>

        <div className="container" style={{ maxWidth: 900 }}>
          <VisualSection
            eyebrow="01 · The robot loop"
            title="Sense → Think → Act"
            blurb="Every robot, from a £20 line follower to a Mars rover, runs this loop thousands of times a second."
            lessonKey="sense-think-act"
          >
            <SenseThinkActVisual />
          </VisualSection>

          <VisualSection
            id="pid"
            eyebrow="02 · Control theory"
            title="PID controller — tune it yourself"
            blurb="Drag the sliders to see how Proportional, Integral, and Derivative gains shape how a robot reaches its target."
            lessonKey="pid"
          >
            <PIDSimulator />
          </VisualSection>

          <VisualSection
            eyebrow="03 · Robot families"
            title="Types of robots"
            blurb="Six families of robot you'll meet in the real world. Tap each card for the key tech behind it."
            lessonKey="robot-types"
          >
            <RobotTypesVisual />
          </VisualSection>

          <VisualSection
            id="ik"
            eyebrow="04 · Manipulation"
            title="Inverse Kinematics — Drag to move"
            blurb="Drag the cyan gripper anywhere. Watch the math figure out which joint angles get the arm there."
            lessonKey="ik"
          >
            <InverseKinematicsVisual />
          </VisualSection>

          <VisualSection
            id="astar"
            eyebrow="05 · Path planning"
            title="A* Path Planning — Draw your own maze"
            blurb="Draw walls, set a start and goal, and watch A* search for the shortest path step by step."
            lessonKey="astar"
          >
            <AStarVisual />
          </VisualSection>

          <VisualSection
            id="fusion"
            eyebrow="06 · Localization"
            title="Sensor Fusion — GPS + IMU = accuracy"
            blurb="GPS is noisy. IMU drifts. Combining them produces a smooth, accurate estimate — the secret behind every drone and self-driving car."
            lessonKey="sensor-fusion"
          >
            <SensorFusionVisual />
          </VisualSection>

          <VisualSection
            id="slam"
            eyebrow="07 · Mapping"
            title="SLAM — Watch the map build itself"
            blurb="A robot enters an unknown room with no map. It uses LiDAR rays to scan, then builds the map as it explores."
            lessonKey="slam"
          >
            <SLAMVisual />
          </VisualSection>

          <VisualSection
            id="motor"
            eyebrow="08 · Actuation"
            title="Motor Control — PWM explained visually"
            blurb="See the PWM square wave on the left, the motor spinning on the right. Drag the duty cycle slider and watch them lock together."
            lessonKey="motor"
          >
            <MotorControlVisual />
          </VisualSection>
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
