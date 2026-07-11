import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { ROS2Playground } from '@/components/ROS2Playground';
import { CopyButtonClient } from '@/components/CopyButtonClient';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export const metadata: Metadata = {
  title: 'Run Real ROS2 In Your Browser — R2BOT',
  description: 'No Linux. No installation. No VM. Real ROS2 Humble, powered by WebAssembly. Practise topics, nodes, and cmd_vel publishers live.',
  alternates: { canonical: `${BASE_URL}/ros2` },
};

const LESSONS: { title: string; description: string; code: string }[] = [
  {
    title: 'First ROS2 topic',
    description: 'Publish a string message to a custom topic.',
    code: `# In one terminal
ros2 topic pub /hello std_msgs/msg/String "{data: 'Hello, robot!'}"

# In another terminal
ros2 topic echo /hello`,
  },
  {
    title: 'Create a ROS2 node',
    description: 'Minimal Python node that prints every second.',
    code: `import rclpy
from rclpy.node import Node

class HelloNode(Node):
    def __init__(self):
        super().__init__('hello_node')
        self.create_timer(1.0, self.tick)
    def tick(self):
        self.get_logger().info('hello')

rclpy.init()
rclpy.spin(HelloNode())`,
  },
  {
    title: 'Robot velocity control',
    description: 'Send a Twist to /cmd_vel so the robot moves forward.',
    code: `ros2 topic pub /cmd_vel geometry_msgs/msg/Twist \\
  '{linear: {x: 0.2}, angular: {z: 0.0}}'`,
  },
];

export default function ROS2Page() {
  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />
      <main id="main-content" style={{ paddingTop: 140, paddingBottom: 100, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 920 }}>
          <div className="section-eyebrow">Live ROS2 · WebAssembly</div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5.5vw, 60px)', margin: '0 0 16px' }}>
            Run Real ROS2 — In Your Browser.
          </h1>
          <p style={{ fontSize: 19, color: '#B0B8C5', maxWidth: 680, margin: 0 }}>
            No Linux. No installation. No VM. Real ROS2 Humble, powered by WebAssembly.
          </p>

          {/* Features row */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
              marginTop: 24,
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 12,
              color: '#94A3B8',
              letterSpacing: '.1em',
              textTransform: 'uppercase',
            }}
          >
            {['🤖 Real ROS2 Humble', '⚡ Runs in WebAssembly', '💯 Zero installation'].map((f) => (
              <span
                key={f}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: 'rgba(0,184,212,.07)',
                  border: '1px solid var(--border-2)',
                  color: '#C8D0DC',
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Playground (full width) */}
        <div className="container" style={{ maxWidth: 1200, marginTop: 36 }}>
          <ROS2Playground />
        </div>

        {/* Lesson cards */}
        <div className="container" style={{ maxWidth: 1200, marginTop: 56 }}>
          <h2 className="display" style={{ fontSize: 'clamp(24px, 3vw, 32px)', margin: '0 0 22px', color: 'var(--mist)' }}>
            Try these next
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {LESSONS.map((l) => (
              <ROS2LessonCard key={l.title} {...l} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="container" style={{ maxWidth: 920, marginTop: 56, textAlign: 'center' }}>
          <p style={{ fontSize: 16, color: '#B0B8C5', marginBottom: 12 }}>
            Ready for a structured path?
          </p>
          <a
            href="/academy"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: 999,
              border: '1px solid var(--cyan)',
              background: 'rgba(0,184,212,.2)',
              color: 'var(--cyan-bright)',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Start the Wire track →
          </a>
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}

function ROS2LessonCard({ title, description, code }: { title: string; description: string; code: string }) {
  return (
    <article
      style={{
        padding: 18,
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'rgba(11,37,64,.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 16, color: 'var(--mist)', fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#B0B8C5', lineHeight: 1.5 }}>{description}</div>
      <pre
        style={{
          margin: 0,
          padding: 12,
          background: '#050810',
          borderRadius: 8,
          border: '1px solid #1e293b',
          color: '#22c55e',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 11.5,
          lineHeight: 1.5,
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
        }}
      >
        {code}
      </pre>
      <CopyButtonClient code={code} />
    </article>
  );
}
