'use client';

import { useEffect, useRef, useState } from 'react';

export function ROS2Playground() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // If the iframe never reports 'load' within 7 seconds, assume it was blocked.
  useEffect(() => {
    if (loadedOnce) return;
    const t = setTimeout(() => {
      if (!loadedOnce) setLoadFailed(true);
    }, 7000);
    return () => clearTimeout(t);
  }, [reloadKey, loadedOnce]);

  const reload = () => {
    setLoadFailed(false);
    setLoadedOnce(false);
    setReloadKey((k) => k + 1);
  };

  const QUICK_CMDS = [
    'ros2 topic list',
    "ros2 topic pub /cmd_vel geometry_msgs/msg/Twist '{linear: {x: 0.5}}'",
    'ros2 node list',
    'ros2 run demo_nodes_py talker',
    'ros2 run demo_nodes_py listener',
  ];

  return (
    <div
      style={{
        background: '#0a0f1e',
        border: '1px solid var(--border-2)',
        borderRadius: 16,
        padding: 'clamp(16px, 2.5vw, 28px)',
        ...(fullscreen
          ? {
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              borderRadius: 0,
              padding: 14,
              overflow: 'auto',
            }
          : {}),
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: 999,
            background: 'rgba(0,184,212,.18)',
            border: '1px solid var(--cyan)',
            color: 'var(--cyan-bright)',
            fontSize: 11,
            letterSpacing: '.15em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono), monospace',
            fontWeight: 700,
          }}
        >
          🤖 ROS2 Live Environment
        </span>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>
          Powered by ROS2WASM · Real ROS2 Humble running in your browser
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setFullscreen((f) => !f)} style={btn}>
            {fullscreen ? '↙ Exit Fullscreen' : '↗ Fullscreen'}
          </button>
          <button onClick={reload} style={btn}>
            🔄 Reload
          </button>
          <button onClick={() => setHelpOpen((h) => !h)} style={btn}>
            ❓ {helpOpen ? 'Hide help' : 'Help'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: helpOpen ? '1fr 280px' : '1fr', gap: 14 }}>
        <div>
          {loadFailed ? (
            <FallbackUI />
          ) : (
            <iframe
              key={reloadKey}
              ref={iframeRef}
              src="https://ros2wasm.dev"
              title="ROS2 Live Environment"
              width="100%"
              height={fullscreen ? Math.max(400, typeof window !== 'undefined' ? window.innerHeight - 200 : 600) : 600}
              style={{ border: 'none', borderRadius: 8, background: '#000', display: 'block' }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onLoad={() => setLoadedOnce(true)}
              onError={() => setLoadFailed(true)}
            />
          )}
        </div>

        {helpOpen && (
          <aside
            style={{
              padding: 14,
              borderRadius: 10,
              background: '#050810',
              border: '1px solid var(--border-2)',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 12.5,
              color: '#C8D0DC',
              maxHeight: 600,
              overflowY: 'auto',
            }}
          >
            <div style={{ color: '#94A3B8', fontSize: 11, letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>
              Quick commands
            </div>
            {QUICK_CMDS.map((c) => (
              <pre
                key={c}
                style={{
                  margin: '0 0 10px 0',
                  padding: '8px 10px',
                  background: '#0a0f1e',
                  borderRadius: 6,
                  border: '1px solid #1e293b',
                  color: '#22c55e',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: 11.5,
                  lineHeight: 1.5,
                }}
              >
                {c}
              </pre>
            ))}
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 12, lineHeight: 1.55 }}>
              Click into the embedded shell to focus it, then type.
            </p>
          </aside>
        )}
      </div>

      <p style={{ marginTop: 14, fontSize: 13.5, color: '#A8B0BC', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--mist)' }}>Tip:</strong> This is real ROS2 Humble running in WebAssembly in your browser. No installation needed. Your code runs locally — nothing is sent to a server.
      </p>
    </div>
  );
}

function FallbackUI() {
  return (
    <div
      style={{
        padding: 30,
        borderRadius: 10,
        background: 'linear-gradient(135deg, #050810, #0a0f1e)',
        border: '1px solid var(--border-2)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 38, marginBottom: 14 }}>🚧</div>
      <h3 style={{ fontSize: 20, color: 'var(--mist)', margin: '0 0 8px', fontFamily: 'var(--font-display), sans-serif' }}>
        ROS2 Playground temporarily unavailable
      </h3>
      <p style={{ fontSize: 14, color: '#94A3B8', maxWidth: 520, margin: '0 auto 20px', lineHeight: 1.55 }}>
        The embed couldn't load (likely a cross-origin frame restriction from ros2wasm.dev). Open it directly, or try our local browser playground.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a
          href="https://ros2wasm.dev"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: '1px solid var(--cyan)',
            background: 'rgba(0,184,212,.2)',
            color: 'var(--cyan-bright)',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Open ROS2WASM →
        </a>
        <a
          href="/visualizer#playground"
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: '1px solid var(--border-2)',
            background: 'rgba(11,37,64,.5)',
            color: '#C8D0DC',
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          Try local playground →
        </a>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid var(--border-2)',
  background: 'rgba(11,37,64,.5)',
  color: '#C8D0DC',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
