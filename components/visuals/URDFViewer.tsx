'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type RobotKey = 'turtlebot' | 'ur5' | 'quadruped' | 'drone';

type RobotInfo = {
  key: RobotKey;
  emoji: string;
  name: string;
  category: string;
  specs: string;
  atlas: string;
  atlasLabel: string;
};

const ROBOTS: RobotInfo[] = [
  {
    key: 'turtlebot',
    emoji: '🚗',
    name: 'TurtleBot3 Burger',
    category: 'Mobile robot',
    specs: '2 DOF · Used for ROS2 education',
    atlas: '/atlas/concept/mobile-robot',
    atlasLabel: 'Mobile robot',
  },
  {
    key: 'ur5',
    emoji: '🦾',
    name: 'UR5 Robotic Arm',
    category: 'Industrial arm',
    specs: '6 DOF · 5kg payload · Used in light assembly, packaging',
    atlas: '/atlas/concept/industrial-arm',
    atlasLabel: 'Industrial arm',
  },
  {
    key: 'quadruped',
    emoji: '🐕',
    name: 'Unitree-style Quadruped',
    category: 'Legged robot',
    specs: '12 DOF · All-terrain · Inspection, recon',
    atlas: '/atlas/concept/legged-robot',
    atlasLabel: 'Legged robot',
  },
  {
    key: 'drone',
    emoji: '🚁',
    name: 'Quadrotor Drone',
    category: 'Aerial robot',
    specs: '4 motors · GPS-stabilized · Survey, delivery',
    atlas: '/atlas/concept/drone',
    atlasLabel: 'Drone',
  },
];

type RobotJointHandles = {
  ur5?: THREE.Group[];
  quadHip?: THREE.Group[];
  droneProps?: THREE.Group[];
  tbWheels?: THREE.Group[];
};

function buildTurtleBot(scene: THREE.Group, handles: RobotJointHandles) {
  // base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.05, 32),
    new THREE.MeshStandardMaterial({ color: 0x334155 }),
  );
  base.position.y = 0.025;
  scene.add(base);

  // wheels
  const wheelGeom = new THREE.CylinderGeometry(0.033, 0.033, 0.018, 24);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x00b8d4 });
  const wheelL = new THREE.Group();
  const wheelLM = new THREE.Mesh(wheelGeom, wheelMat);
  wheelLM.rotation.z = Math.PI / 2;
  wheelL.add(wheelLM);
  wheelL.position.set(0, 0.033, -0.1);
  scene.add(wheelL);

  const wheelR = new THREE.Group();
  const wheelRM = new THREE.Mesh(wheelGeom, wheelMat);
  wheelRM.rotation.z = Math.PI / 2;
  wheelR.add(wheelRM);
  wheelR.position.set(0, 0.033, 0.1);
  scene.add(wheelR);
  handles.tbWheels = [wheelL, wheelR];

  // lidar tower
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.04, 16),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8 }),
  );
  tower.position.y = 0.07;
  scene.add(tower);

  // caster
  const caster = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x64748b }),
  );
  caster.position.set(0.08, 0.015, 0);
  scene.add(caster);
}

function buildUR5(scene: THREE.Group, handles: RobotJointHandles) {
  // base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.05, 32),
    new THREE.MeshStandardMaterial({ color: 0x1e293b }),
  );
  base.position.y = 0.025;
  scene.add(base);

  const colors = [0x00b8d4, 0x0891b2, 0x0e7490, 0x155e75, 0x164e63, 0x00b8d4];
  const sizes = [
    new THREE.Vector3(0.05, 0.15, 0.05),
    new THREE.Vector3(0.04, 0.25, 0.04),
    new THREE.Vector3(0.04, 0.2, 0.04),
    new THREE.Vector3(0.035, 0.1, 0.035),
    new THREE.Vector3(0.035, 0.08, 0.035),
  ];

  const joints: THREE.Group[] = [];
  let parent: THREE.Group = scene;
  let stackY = 0.05;

  for (let i = 0; i < 5; i++) {
    const j = new THREE.Group();
    j.position.y = stackY;
    parent.add(j);
    joints.push(j);
    const link = new THREE.Mesh(
      new THREE.BoxGeometry(sizes[i].x, sizes[i].y, sizes[i].z),
      new THREE.MeshStandardMaterial({ color: colors[i] }),
    );
    link.position.y = sizes[i].y / 2;
    j.add(link);
    parent = j;
    stackY = sizes[i].y;
  }

  // flange (joint 6)
  const j6 = new THREE.Group();
  j6.position.y = stackY;
  parent.add(j6);
  joints.push(j6);
  const flange = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.02, 24),
    new THREE.MeshStandardMaterial({ color: 0x00b8d4 }),
  );
  flange.position.y = 0.01;
  j6.add(flange);

  // gripper fingers
  const gMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
  const g1 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.03), gMat);
  const g2 = g1.clone();
  g1.position.set(0.02, 0.04, 0);
  g2.position.set(-0.02, 0.04, 0);
  j6.add(g1);
  j6.add(g2);

  handles.ur5 = joints;
}

function buildQuadruped(scene: THREE.Group, handles: RobotJointHandles) {
  // body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.1, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x1e293b }),
  );
  body.position.y = 0.25;
  scene.add(body);

  // head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.08, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x334155 }),
  );
  head.position.set(0.28, 0.27, 0);
  scene.add(head);

  // camera
  const cam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.04, 16),
    new THREE.MeshStandardMaterial({ color: 0x00b8d4 }),
  );
  cam.rotation.z = Math.PI / 2;
  cam.position.set(0.35, 0.27, 0);
  scene.add(cam);

  // 4 legs
  const upperMat = new THREE.MeshStandardMaterial({ color: 0x00b8d4 });
  const lowerMat = new THREE.MeshStandardMaterial({ color: 0x0891b2 });
  const footMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
  const hipPositions: [number, number][] = [
    [0.2, 0.1],
    [0.2, -0.1],
    [-0.2, 0.1],
    [-0.2, -0.1],
  ];
  const hips: THREE.Group[] = [];

  for (const [x, z] of hipPositions) {
    const hip = new THREE.Group();
    hip.position.set(x, 0.22, z);
    scene.add(hip);
    hips.push(hip);

    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.04), upperMat);
    upper.position.y = -0.075;
    hip.add(upper);

    const knee = new THREE.Group();
    knee.position.y = -0.15;
    hip.add(knee);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.03), lowerMat);
    lower.position.y = -0.075;
    knee.add(lower);

    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), footMat);
    foot.position.y = -0.15;
    knee.add(foot);
  }
  handles.quadHip = hips;
}

function buildDrone(scene: THREE.Group, handles: RobotJointHandles) {
  // body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.04, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x1e293b }),
  );
  body.position.y = 0.2;
  scene.add(body);

  // gimbal
  const gimbal = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.03, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x64748b }),
  );
  gimbal.position.y = 0.165;
  scene.add(gimbal);

  // arms + motors + propellers
  const armMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
  const motorMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
  const propMat = new THREE.MeshStandardMaterial({ color: 0x00b8d4, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const propPositions: [number, number][] = [
    [0.12, 0.12],
    [-0.12, 0.12],
    [0.12, -0.12],
    [-0.12, -0.12],
  ];
  const props: THREE.Group[] = [];

  for (const [x, z] of propPositions) {
    // arm: thin box from center to motor
    const arm = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x) * 2, 0.015, 0.015), armMat);
    arm.position.set(x / 2, 0.2, 0);
    if (z !== 0) {
      // diagonal — orient by rotating Y
      arm.rotation.y = Math.atan2(z, x);
      arm.position.set(0, 0.2, 0);
      arm.scale.x = Math.hypot(x, z) / Math.abs(x);
      // simpler: stack 4 arms as X by rotating each individually
    }
    scene.add(arm);

    // motor
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.025, 16), motorMat);
    motor.position.set(x, 0.21, z);
    scene.add(motor);

    // propeller
    const propGroup = new THREE.Group();
    propGroup.position.set(x, 0.225, z);
    const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.005, 24), propMat);
    propGroup.add(prop);
    scene.add(propGroup);
    props.push(propGroup);
  }
  handles.droneProps = props;
}

function buildRobot(key: RobotKey, scene: THREE.Group): RobotJointHandles {
  const handles: RobotJointHandles = {};
  if (key === 'turtlebot') buildTurtleBot(scene, handles);
  else if (key === 'ur5') buildUR5(scene, handles);
  else if (key === 'quadruped') buildQuadruped(scene, handles);
  else if (key === 'drone') buildDrone(scene, handles);
  return handles;
}

export function URDFViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const robotRootRef = useRef<THREE.Group | null>(null);
  const handlesRef = useRef<RobotJointHandles>({});
  const rafRef = useRef<number | null>(null);

  const [robotKey, setRobotKey] = useState<RobotKey>('ur5');
  // UR5 joints in degrees
  const [ur5Joints, setUr5Joints] = useState<number[]>([0, -30, 45, 0, 60, 0]);
  // Quadruped hip angles in degrees, 4 legs
  const [quadHips, setQuadHips] = useState<number[]>([0, 0, 0, 0]);
  // Drone throttle 0-100
  const [throttle, setThrottle] = useState(40);
  // TurtleBot wheel speed -100..100
  const [tbSpeed, setTbSpeed] = useState(50);

  // Apply preset from URL ?robot=
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search).get('robot');
    if (p && ['turtlebot', 'ur5', 'quadruped', 'drone'].includes(p)) {
      setRobotKey(p as RobotKey);
    }
  }, []);

  // Build scene once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050810);
    sceneRef.current = scene;

    // lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 5);
    scene.add(dir);
    const point = new THREE.PointLight(0x00b8d4, 0.5);
    point.position.set(0, 5, 0);
    scene.add(point);

    // ground grid
    const grid = new THREE.GridHelper(2, 20, 0x1e293b, 0x111827);
    scene.add(grid);

    // camera
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 100);
    camera.position.set(0.6, 0.5, 0.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    canvasRef.current = renderer.domElement;
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.2, 0);
    controlsRef.current = controls;

    const root = new THREE.Group();
    scene.add(root);
    robotRootRef.current = root;
    handlesRef.current = buildRobot(robotKey, root);

    const onResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    const animate = () => {
      controls.update();
      // propeller spin
      const h = handlesRef.current;
      if (h.droneProps) {
        const speed = (throttleRef.current / 100) * 0.5;
        for (const p of h.droneProps) p.rotation.y += speed;
      }
      if (h.tbWheels) {
        const speed = (tbSpeedRef.current / 100) * 0.2;
        for (const w of h.tbWheels) w.children[0].rotation.x += speed;
      }
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
          else mat.dispose();
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild on robot change
  useEffect(() => {
    const root = robotRootRef.current;
    if (!root) return;
    // clear children
    while (root.children.length > 0) {
      const c = root.children[0];
      root.remove(c);
      c.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
          else mat.dispose();
        }
      });
    }
    handlesRef.current = buildRobot(robotKey, root);

    // reset camera position
    if (cameraRef.current && controlsRef.current) {
      const target = robotKey === 'quadruped' ? new THREE.Vector3(0, 0.25, 0) : robotKey === 'ur5' ? new THREE.Vector3(0, 0.4, 0) : new THREE.Vector3(0, 0.2, 0);
      controlsRef.current.target.copy(target);
      cameraRef.current.position.set(0.8, 0.6, 0.9);
    }
  }, [robotKey]);

  // Apply UR5 joint angles
  useEffect(() => {
    const h = handlesRef.current;
    if (robotKey !== 'ur5' || !h.ur5) return;
    h.ur5.forEach((j, idx) => {
      const angle = (ur5Joints[idx] * Math.PI) / 180;
      // alternate joint axes: 0=y(base), 1=x(shoulder pitch), 2=x, 3=x, 4=y, 5=y
      if (idx === 0 || idx === 4 || idx === 5) j.rotation.y = angle;
      else j.rotation.x = angle;
    });
  }, [ur5Joints, robotKey]);

  // Apply quadruped hip rotations
  useEffect(() => {
    const h = handlesRef.current;
    if (robotKey !== 'quadruped' || !h.quadHip) return;
    h.quadHip.forEach((hip, i) => {
      hip.rotation.x = (quadHips[i] * Math.PI) / 180;
    });
  }, [quadHips, robotKey]);

  // refs for animation loop
  const throttleRef = useRef(throttle);
  const tbSpeedRef = useRef(tbSpeed);
  useEffect(() => {
    throttleRef.current = throttle;
  }, [throttle]);
  useEffect(() => {
    tbSpeedRef.current = tbSpeed;
  }, [tbSpeed]);

  const screenshot = useCallback(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!canvas || !renderer || !scene || !camera) return;
    // render one frame first to ensure content
    renderer.render(scene, camera);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `r2bot-${robotKey}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, [robotKey]);

  const share = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}${window.location.pathname}?robot=${robotKey}#robots`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
  }, [robotKey]);

  const current = ROBOTS.find((r) => r.key === robotKey)!;

  return (
    <div
      style={{
        background: '#0a0f1e',
        border: '1px solid var(--cyan)',
        borderRadius: 16,
        padding: 'clamp(16px, 2.5vw, 28px)',
        boxShadow: '0 0 40px rgba(0,184,212,.12)',
      }}
    >
      {/* Robot tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {ROBOTS.map((r) => (
          <button
            key={r.key}
            onClick={() => setRobotKey(r.key)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid ' + (robotKey === r.key ? 'var(--cyan)' : 'var(--border-2)'),
              background: robotKey === r.key ? 'rgba(0,184,212,.2)' : 'rgba(11,37,64,.5)',
              color: robotKey === r.key ? 'var(--cyan-bright)' : '#C8D0DC',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ marginRight: 6 }}>{r.emoji}</span>
            {r.name.split(' ')[0]}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={screenshot}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-2)',
              background: 'rgba(11,37,64,.5)',
              color: '#C8D0DC',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            📸 Screenshot
          </button>
          <button
            onClick={share}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-2)',
              background: 'rgba(11,37,64,.5)',
              color: '#C8D0DC',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            🔗 Share
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {/* 3D canvas */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: 480,
            minHeight: 400,
            background: '#0A0E17',
            borderRadius: 12,
            border: '1px solid var(--border-2)',
            overflow: 'hidden',
          }}
        />

        {/* Joint controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '.15em', textTransform: 'uppercase', fontFamily: 'var(--font-mono), monospace' }}>
            {robotKey === 'turtlebot' && 'Drive controls'}
            {robotKey === 'ur5' && 'Joint angles (6 DOF)'}
            {robotKey === 'quadruped' && 'Hip angles (4 legs)'}
            {robotKey === 'drone' && 'Throttle'}
          </div>

          {robotKey === 'turtlebot' && (
            <label style={{ fontSize: 13, color: '#C8D0DC' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Wheel speed</span>
                <span style={{ color: 'var(--cyan-bright)', fontFamily: 'var(--font-mono), monospace' }}>{tbSpeed}</span>
              </div>
              <input type="range" min={-100} max={100} value={tbSpeed} onChange={(e) => setTbSpeed(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#00B8D4' }} />
            </label>
          )}

          {robotKey === 'ur5' &&
            ur5Joints.map((v, i) => (
              <label key={i} style={{ fontSize: 13, color: '#C8D0DC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Joint {i + 1}</span>
                  <span style={{ color: 'var(--cyan-bright)', fontFamily: 'var(--font-mono), monospace' }}>{v}°</span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={v}
                  onChange={(e) => {
                    const next = ur5Joints.slice();
                    next[i] = parseInt(e.target.value);
                    setUr5Joints(next);
                  }}
                  style={{ width: '100%', accentColor: '#00B8D4' }}
                />
              </label>
            ))}

          {robotKey === 'quadruped' &&
            quadHips.map((v, i) => {
              const labels = ['Front-L hip', 'Front-R hip', 'Rear-L hip', 'Rear-R hip'];
              return (
                <label key={i} style={{ fontSize: 13, color: '#C8D0DC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{labels[i]}</span>
                    <span style={{ color: 'var(--cyan-bright)', fontFamily: 'var(--font-mono), monospace' }}>{v}°</span>
                  </div>
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    value={v}
                    onChange={(e) => {
                      const next = quadHips.slice();
                      next[i] = parseInt(e.target.value);
                      setQuadHips(next);
                    }}
                    style={{ width: '100%', accentColor: '#00B8D4' }}
                  />
                </label>
              );
            })}

          {robotKey === 'drone' && (
            <label style={{ fontSize: 13, color: '#C8D0DC' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Throttle</span>
                <span style={{ color: 'var(--cyan-bright)', fontFamily: 'var(--font-mono), monospace' }}>{throttle}%</span>
              </div>
              <input type="range" min={0} max={100} value={throttle} onChange={(e) => setThrottle(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#00B8D4' }} />
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>Higher throttle spins all 4 propellers faster.</div>
            </label>
          )}

          <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>
            Drag to orbit · Scroll to zoom · Right-click to pan.
          </p>
        </div>
      </div>

      {/* Info panel */}
      <div
        style={{
          marginTop: 16,
          padding: '14px 18px',
          borderRadius: 12,
          background: 'rgba(0,184,212,.06)',
          border: '1px solid var(--border-2)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 28 }}>{current.emoji}</div>
        <div style={{ flex: '1 1 240px' }}>
          <div style={{ fontSize: 15, color: 'var(--mist)', fontWeight: 600 }}>{current.name}</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
            {current.category} · {current.specs}
          </div>
        </div>
        <a
          href={current.atlas}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid var(--cyan)',
            color: 'var(--cyan-bright)',
            fontSize: 13,
            textDecoration: 'none',
            background: 'rgba(0,184,212,.1)',
          }}
        >
          Read: {current.atlasLabel} →
        </a>
      </div>
    </div>
  );
}
