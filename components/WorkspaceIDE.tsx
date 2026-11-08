'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100%',
        background: '#1e1e1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94A3B8',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 13,
      }}
    >
      Loading editor…
    </div>
  ),
});

const TerminalView = dynamic(() => import('./WorkspaceTerminal').then((m) => m.WorkspaceTerminal), {
  ssr: false,
  loading: () => (
    <div style={{ background: '#000', color: '#22c55e', padding: 12, fontFamily: 'monospace', fontSize: 12 }}>
      Loading terminal…
    </div>
  ),
});

type FileEntry = { name: string; path: string; content: string };

const INITIAL_FILES: FileEntry[] = [
  {
    name: 'robot_controller.py',
    path: 'src/robot_controller.py',
    content: `#!/usr/bin/env python3
"""
R2BOT Workspace — TurtleBot3 Controller
Write ROS2-style code and run it in the simulator below.
"""

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist

class RobotController(Node):
    def __init__(self):
        super().__init__('robot_controller')
        self.publisher = self.create_publisher(
            Twist, '/cmd_vel', 10
        )
        self.timer = self.create_timer(0.5, self.run)
        self.get_logger().info('Controller started!')

    def run(self):
        msg = Twist()
        # Move forward at 0.2 m/s
        msg.linear.x = 0.2
        msg.angular.z = 0.0
        self.publisher.publish(msg)
        self.get_logger().info('Publishing: forward')

def main():
    rclpy.init()
    node = RobotController()
    rclpy.spin(node)

if __name__ == '__main__':
    main()
`,
  },
  {
    name: 'sensor_reader.py',
    path: 'src/sensor_reader.py',
    content: `#!/usr/bin/env python3
"""Read sensor data from the robot."""

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import LaserScan

class SensorReader(Node):
    def __init__(self):
        super().__init__('sensor_reader')
        self.subscription = self.create_subscription(
            LaserScan, '/scan', self.scan_callback, 10
        )

    def scan_callback(self, msg):
        # ranges[0] is straight ahead
        ahead = msg.ranges[0]
        self.get_logger().info(f'Distance ahead: {ahead:.2f}m')

def main():
    rclpy.init()
    node = SensorReader()
    rclpy.spin(node)

if __name__ == '__main__':
    main()
`,
  },
  {
    name: 'path_planner.py',
    path: 'src/path_planner.py',
    content: `#!/usr/bin/env python3
"""Simple waypoint follower."""

WAYPOINTS = [
    (0.0, 0.0),
    (1.0, 0.0),
    (1.0, 1.0),
    (0.0, 1.0),
]

def plan(start, goal):
    # Returns a straight-line path.
    return [start, goal]
`,
  },
  {
    name: 'requirements.txt',
    path: 'requirements.txt',
    content: `# R2BOT Workspace requirements
rclpy>=4.0.0
geometry_msgs
sensor_msgs
numpy>=1.24.0
`,
  },
  {
    name: 'README.md',
    path: 'README.md',
    content: `# my_robot_ws

R2BOT learner workspace.

## Files
- src/robot_controller.py — main controller
- src/sensor_reader.py — laser scan reader
- src/path_planner.py — waypoint helper

## Run
Click ▶ Run above the editor. The simulator on the right will react.
`,
  },
];

const SIM_W = 320;
const SIM_H = 320;
const ROBOT_R = 9;

type Robot = { x: number; y: number; heading: number };

function checkCollide(x: number, y: number) {
  if (x < 30 || x > SIM_W - 30 || y < 30 || y > SIM_H - 30) return true;
  return false;
}

export function WorkspaceIDE() {
  const [files, setFiles] = useState<FileEntry[]>(INITIAL_FILES);
  const [activePath, setActivePath] = useState(INITIAL_FILES[0].path);
  const [openTabs, setOpenTabs] = useState<string[]>([INITIAL_FILES[0].path]);
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    'Welcome to R2BOT Workspace v1.0',
    'ROS2 Humble environment ready.',
    "Type 'ros2 --help' or click ▶ Run to execute your script.",
  ]);

  const [robot, setRobot] = useState<Robot>({ x: SIM_W / 2, y: SIM_H / 2, heading: 0 });
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const robotRef = useRef<Robot>({ x: SIM_W / 2, y: SIM_H / 2, heading: 0 });
  const trailRef = useRef<{ x: number; y: number }[]>([]);

  const active = files.find((f) => f.path === activePath) ?? files[0];

  const openFile = (path: string) => {
    if (!openTabs.includes(path)) setOpenTabs([...openTabs, path]);
    setActivePath(path);
  };
  const closeTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = openTabs.indexOf(path);
    const next = openTabs.filter((p) => p !== path);
    setOpenTabs(next);
    if (activePath === path) {
      setActivePath(next[Math.max(0, idx - 1)] ?? files[0].path);
    }
  };

  const updateFile = (path: string, newContent: string) => {
    setFiles((prev) => prev.map((f) => (f.path === path ? { ...f, content: newContent } : f)));
  };

  const appendTerm = useCallback((line: string) => {
    setTerminalLines((prev) => [...prev, line]);
  }, []);

  const handleTerminalCmd = (cmd: string) => {
    const c = cmd.trim();
    if (!c) return;
    appendTerm(`ros2@r2bot:~/my_robot_ws$ ${c}`);
    if (c === 'clear') {
      setTerminalLines([]);
      return;
    }
    if (c === 'ros2 --help') {
      appendTerm('usage: ros2 [-h] Call `ros2 <command> -h` for more detailed usage.');
      appendTerm('  topic      Various topic related sub-commands');
      appendTerm('  node       Various node related sub-commands');
      appendTerm('  run        Run a package specific executable');
      appendTerm('  service    Various service related sub-commands');
      appendTerm('  param      Various param related sub-commands');
      return;
    }
    if (c === 'ros2 topic list') {
      appendTerm('/cmd_vel');
      appendTerm('/odom');
      appendTerm('/scan');
      appendTerm('/tf');
      return;
    }
    if (c.startsWith('ros2 topic echo')) {
      appendTerm('Echoing — Twist messages every 500ms (Ctrl+C to stop):');
      for (let i = 0; i < 3; i++) {
        appendTerm(`linear:\n  x: 0.2\n  y: 0.0\n  z: 0.0\nangular:\n  x: 0.0\n  y: 0.0\n  z: 0.0\n---`);
      }
      return;
    }
    if (c === 'ros2 node list') {
      appendTerm('/robot_controller');
      appendTerm('/robot_state_publisher');
      return;
    }
    if (c.startsWith('ros2 run')) {
      appendTerm('Starting node...');
      appendTerm('[INFO] Node started.');
      return;
    }
    appendTerm('Command not found. Try: ros2 topic list');
  };

  const parseCmdVel = (code: string): { linear: number; angular: number } => {
    const lin = code.match(/msg\.linear\.x\s*=\s*(-?[0-9.]+)/);
    const ang = code.match(/msg\.angular\.z\s*=\s*(-?[0-9.]+)/);
    return {
      linear: lin ? parseFloat(lin[1]) : 0.2,
      angular: ang ? parseFloat(ang[1]) : 0,
    };
  };

  const reset = () => {
    stopRef.current = true;
    setRunning(false);
    robotRef.current = { x: SIM_W / 2, y: SIM_H / 2, heading: 0 };
    trailRef.current = [];
    setRobot({ ...robotRef.current });
    setTrail([]);
    setTerminalLines([
      'Welcome to R2BOT Workspace v1.0',
      'ROS2 Humble environment ready.',
    ]);
  };

  const run = async () => {
    if (running) return;
    stopRef.current = false;
    setRunning(true);
    const { linear, angular } = parseCmdVel(active.content);
    appendTerm(`ros2@r2bot:~/my_robot_ws$ python3 ${active.path}`);
    appendTerm('[INFO] [robot_controller]: Controller started!');
    // run for ~10 seconds, publishing every 500ms
    const totalTicks = 20;
    for (let i = 0; i < totalTicks; i++) {
      if (stopRef.current) break;
      appendTerm(`[INFO] [robot_controller]: Publishing: linear.x=${linear.toFixed(2)} angular.z=${angular.toFixed(2)}`);
      // animate ~30 frames per tick (500ms at 60fps)
      for (let f = 0; f < 30; f++) {
        if (stopRef.current) break;
        const r = robotRef.current;
        r.heading += angular * (Math.PI / 60); // small step
        const dx = Math.cos(r.heading) * linear * 1.5;
        const dy = Math.sin(r.heading) * linear * 1.5;
        const nx = r.x + dx;
        const ny = r.y + dy;
        if (checkCollide(nx, ny)) {
          appendTerm('[WARN] Wall collision — robot stopped.');
          stopRef.current = true;
          break;
        }
        r.x = nx;
        r.y = ny;
        trailRef.current.push({ x: r.x, y: r.y });
        if (trailRef.current.length > 200) trailRef.current.shift();
        setRobot({ ...r });
        setTrail([...trailRef.current]);
        await new Promise((res) => requestAnimationFrame(() => res(null)));
      }
    }
    appendTerm('[INFO] Node shut down.');
    setRunning(false);
  };

  const saveFile = () => {
    const blob = new Blob([active.content], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = active.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(active.content);
      appendTerm('[INFO] Code copied to clipboard.');
    } catch {
      appendTerm('[WARN] Clipboard copy failed.');
    }
  };

  const stop = () => {
    stopRef.current = true;
    setRunning(false);
  };

  useEffect(() => {
    return () => {
      stopRef.current = true;
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0a0f1e',
        color: '#e8ecf1',
        fontFamily: 'var(--font-mono), monospace',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid var(--border-2)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: '#0A0E17',
        }}
      >
        <a href="/" style={{ color: 'var(--cyan-bright)', fontWeight: 700, fontFamily: 'var(--font-display), sans-serif', fontSize: 17, textDecoration: 'none' }}>
          R<span style={{ color: 'var(--cyan)' }}>2</span>BOT
        </a>
        <span style={{ color: '#475569', fontSize: 13 }}>·</span>
        <span style={{ fontSize: 13, color: '#C8D0DC' }}>Workspace — Simulated ROS2 Environment</span>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 999,
            background: 'rgba(245,158,11,.15)',
            border: '1px solid #f59e0b',
            color: '#f59e0b',
            fontSize: 10,
            letterSpacing: '.15em',
            textTransform: 'uppercase',
          }}
        >
          Beta · Real ROS2 coming soon
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <ToolbarBtn onClick={run} disabled={running} primary>
            ▶ Run
          </ToolbarBtn>
          <ToolbarBtn onClick={stop} disabled={!running}>
            ⏸ Stop
          </ToolbarBtn>
          <ToolbarBtn onClick={saveFile}>💾 Save</ToolbarBtn>
          <ToolbarBtn onClick={copyCode}>📋 Copy</ToolbarBtn>
          <ToolbarBtn onClick={reset}>🔄 Reset</ToolbarBtn>
          <span style={{ width: 1, background: 'var(--border-2)', margin: '0 4px' }} />
          <a
            href="/atlas"
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...toolbarBtnStyle(false), textDecoration: 'none' }}
          >
            📖 Docs
          </a>
          <a
            href="/ros2"
            style={{ ...toolbarBtnStyle(false), textDecoration: 'none', borderColor: 'var(--cyan)', color: 'var(--cyan-bright)' }}
          >
            🚀 Try Real ROS2 →
          </a>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '200px 1fr 1fr', minHeight: 0 }}>
        {/* LEFT sidebar */}
        <aside
          style={{
            background: '#0A0E17',
            borderRight: '1px solid var(--border-2)',
            padding: 14,
            overflowY: 'auto',
          }}
        >
          <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 10 }}>
            📁 my_robot_ws
          </div>
          <div style={{ marginLeft: 4 }}>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>📁 src/</div>
            {INITIAL_FILES.filter((f) => f.path.startsWith('src/')).map((f) => (
              <FileBtn key={f.path} active={f.path === activePath} onClick={() => openFile(f.path)}>
                📄 {f.name}
              </FileBtn>
            ))}
            {INITIAL_FILES.filter((f) => !f.path.startsWith('src/')).map((f) => (
              <FileBtn key={f.path} active={f.path === activePath} onClick={() => openFile(f.path)} indent={0}>
                📄 {f.name}
              </FileBtn>
            ))}
          </div>

          <div style={{ marginTop: 28, padding: '10px 12px', borderRadius: 8, background: 'rgba(34,197,94,.07)', border: '1px solid rgba(34,197,94,.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#22c55e' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
              Connected robot
            </div>
            <div style={{ fontSize: 12, color: '#C8D0DC', marginTop: 4 }}>Simulated TurtleBot3</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>ROS2 Humble · Python 3.10</div>
          </div>
        </aside>

        {/* CENTER editor */}
        <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0, background: '#1e1e1e' }}>
          {/* tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #2d2d2d', background: '#252526', minHeight: 32 }}>
            {openTabs.map((p) => {
              const f = files.find((x) => x.path === p);
              if (!f) return null;
              return (
                <div
                  key={p}
                  onClick={() => setActivePath(p)}
                  style={{
                    padding: '7px 14px',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: p === activePath ? '#e8ecf1' : '#94A3B8',
                    background: p === activePath ? '#1e1e1e' : '#252526',
                    borderRight: '1px solid #2d2d2d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  📄 {f.name}
                  <span
                    onClick={(e) => closeTab(p, e)}
                    style={{ color: '#64748b', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                    aria-label={`Close ${f.name}`}
                  >
                    ×
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <MonacoEditor
              path={active.path}
              language={active.name.endsWith('.py') ? 'python' : active.name.endsWith('.md') ? 'markdown' : 'plaintext'}
              theme="vs-dark"
              value={active.content}
              onChange={(v) => updateFile(active.path, v ?? '')}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </main>

        {/* RIGHT panel: sim + terminal */}
        <aside style={{ display: 'flex', flexDirection: 'column', minWidth: 0, background: '#0a0f1e', borderLeft: '1px solid var(--border-2)' }}>
          {/* Sim panel (top) */}
          <div style={{ flex: '0 0 auto', padding: 14, borderBottom: '1px solid var(--border-2)' }}>
            <div style={{ fontSize: 10, color: '#94A3B8', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>
              Simulator · /cmd_vel listener
            </div>
            <svg
              viewBox={`0 0 ${SIM_W} ${SIM_H}`}
              width="100%"
              style={{ maxWidth: SIM_W, background: '#0A0E17', borderRadius: 8, border: '1px solid var(--border-2)' }}
            >
              <rect x={30} y={30} width={SIM_W - 60} height={SIM_H - 60} fill="none" stroke="#334155" strokeWidth={2} rx={4} />
              {trail.length > 1 && (
                <polyline
                  points={trail.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                  stroke="#00B8D4"
                  strokeWidth={1}
                  opacity={0.3}
                  fill="none"
                />
              )}
              <g transform={`translate(${robot.x}, ${robot.y}) rotate(${(robot.heading * 180) / Math.PI})`}>
                <circle r={ROBOT_R} fill="#00B8D4" stroke="#00E5FF" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 0 5px rgba(0,184,212,.7))' }} />
                <line x1={0} y1={0} x2={16} y2={0} stroke="#ffffff" strokeWidth={2} />
              </g>
            </svg>
          </div>

          {/* Terminal (bottom) */}
          <div style={{ flex: 1, minHeight: 0, padding: 14, paddingTop: 8, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10, color: '#94A3B8', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 6 }}>
              Terminal · ROS2 Humble
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <TerminalView lines={terminalLines} onCommand={handleTerminalCmd} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FileBtn({ children, active, onClick, indent = 1 }: { children: React.ReactNode; active: boolean; onClick: () => void; indent?: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: `6px 10px 6px ${10 + indent * 12}px`,
        background: active ? 'rgba(0,184,212,.15)' : 'transparent',
        border: 'none',
        color: active ? 'var(--cyan-bright)' : '#C8D0DC',
        fontSize: 12.5,
        cursor: 'pointer',
        fontFamily: 'inherit',
        borderRadius: 6,
        marginBottom: 2,
      }}
    >
      {children}
    </button>
  );
}

function toolbarBtnStyle(disabled: boolean, primary?: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid ' + (primary ? 'var(--cyan)' : 'var(--border-2)'),
    background: primary ? 'rgba(0,184,212,.25)' : 'rgba(11,37,64,.5)',
    color: primary ? 'var(--cyan-bright)' : '#C8D0DC',
    fontSize: 12.5,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    opacity: disabled ? 0.5 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  };
}

function ToolbarBtn({ children, onClick, disabled, primary }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={toolbarBtnStyle(!!disabled, primary)}>
      {children}
    </button>
  );
}
