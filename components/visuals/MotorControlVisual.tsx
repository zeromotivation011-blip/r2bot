'use client';

import { useEffect, useRef, useState } from 'react';

const PWM_W = 300;
const PWM_H = 180;
const MOTOR_W = 300;
const MOTOR_H = 180;

type MotorType = 'dc' | 'servo';

export function MotorControlVisual() {
  const [motorType, setMotorType] = useState<MotorType>('dc');
  const [duty, setDuty] = useState(50); // 0-100 for DC
  const [servoAngle, setServoAngle] = useState(90); // 0-180 for servo
  const [forward, setForward] = useState(true);
  const [shaftAngle, setShaftAngle] = useState(0);
  const rafRef = useRef<number | null>(null);

  // DC motor: continuous spin proportional to duty
  // Servo: shaft snaps to commanded angle
  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (motorType === 'dc') {
        // angle += duty * 0.08 * dir per frame (16ms baseline)
        const perFrame = duty * 0.08 * (forward ? 1 : -1);
        const frames = dt / 16;
        setShaftAngle((a) => (a + perFrame * frames) % 360);
      } else {
        // ease toward servoAngle
        setShaftAngle((a) => {
          const diff = servoAngle - a;
          return a + diff * Math.min(1, dt / 100);
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [duty, forward, motorType, servoAngle]);

  // PWM waveform: 3 complete cycles across the available width
  const margin = 10;
  const usableW = PWM_W - margin * 2;
  const periodPx = usableW / 3;
  const highY = 30;
  const lowY = PWM_H - 30;
  const dutyFrac = motorType === 'dc' ? duty / 100 : servoAngle / 180; // visualize servo PWM too
  const buildPath = () => {
    let d = `M ${margin} ${lowY}`;
    let x = margin;
    for (let i = 0; i < 3; i++) {
      const high = periodPx * dutyFrac;
      d += ` L ${x} ${highY} L ${x + high} ${highY} L ${x + high} ${lowY}`;
      x += periodPx;
      d += ` L ${x} ${lowY}`;
    }
    return d;
  };

  const periodMs = 20;
  const onMs = motorType === 'dc' ? (duty / 100) * periodMs : 0.5 + (servoAngle / 180) * 2; // servo pulse 0.5-2.5ms typical
  const offMs = periodMs - onMs;

  const speedLabel = (() => {
    if (motorType === 'servo') return `${servoAngle.toFixed(0)}° angle`;
    if (duty === 0) return 'STOPPED';
    if (duty < 41) return 'LOW SPEED';
    if (duty < 71) return 'MED SPEED';
    return 'FULL SPEED';
  })();

  const tempLabel = (() => {
    const v = motorType === 'dc' ? duty : servoAngle / 1.8;
    if (v <= 30) return { label: '❄ Cool', color: '#3b82f6' };
    if (v <= 70) return { label: '🌡️ Warm', color: '#f59e0b' };
    return { label: '🔥 Hot', color: '#ef4444' };
  })();

  return (
    <div
      style={{
        background: '#0a0f1e',
        border: '1px solid var(--border-2)',
        borderRadius: 16,
        padding: 'clamp(20px, 3vw, 36px)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {/* PWM oscilloscope */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, color: '#94A3B8', marginBottom: 6, letterSpacing: '.15em' }}>
            PWM SIGNAL
          </div>
          <svg
            viewBox={`0 0 ${PWM_W} ${PWM_H}`}
            width="100%"
            style={{ maxWidth: PWM_W, background: '#0A0E17', borderRadius: 10, display: 'block' }}
            aria-label="PWM oscilloscope"
          >
            {/* grid lines */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line key={`v-${i}`} x1={margin + i * (usableW / 6)} y1={20} x2={margin + i * (usableW / 6)} y2={PWM_H - 20} stroke="#1e293b" strokeWidth={0.5} strokeDasharray="2 4" />
            ))}
            <line x1={margin} y1={highY} x2={PWM_W - margin} y2={highY} stroke="#1e293b" strokeWidth={0.5} strokeDasharray="2 4" />
            <line x1={margin} y1={lowY} x2={PWM_W - margin} y2={lowY} stroke="#1e293b" strokeWidth={0.5} />

            <text x={2} y={highY + 4} fill="#64748b" fontSize={9} fontFamily="JetBrains Mono, monospace">
              5V
            </text>
            <text x={2} y={lowY + 4} fill="#64748b" fontSize={9} fontFamily="JetBrains Mono, monospace">
              0V
            </text>
            <text x={PWM_W - margin - 18} y={lowY + 14} fill="#475569" fontSize={9} fontFamily="JetBrains Mono, monospace">
              GND
            </text>

            <path d={buildPath()} stroke="#00B8D4" strokeWidth={2} fill="none" style={{ filter: 'drop-shadow(0 0 4px rgba(0,184,212,.5))' }} />
          </svg>
          <div style={{ marginTop: 8, fontFamily: 'var(--font-mono), monospace', fontSize: 12, color: '#C8D0DC' }}>
            <span style={{ color: '#22c55e' }}>ON: {onMs.toFixed(1)}ms</span> &nbsp; <span style={{ color: '#f59e0b' }}>OFF: {offMs.toFixed(1)}ms</span>
            &nbsp; <span style={{ color: '#94A3B8' }}>(20ms period, 50Hz)</span>
          </div>
        </div>

        {/* Motor animation */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, color: '#94A3B8', marginBottom: 6, letterSpacing: '.15em' }}>
            {motorType === 'dc' ? 'DC MOTOR' : 'SERVO MOTOR'}
          </div>
          <svg
            viewBox={`0 0 ${MOTOR_W} ${MOTOR_H}`}
            width="100%"
            style={{ maxWidth: MOTOR_W, background: 'rgba(11,37,64,.4)', borderRadius: 10, display: 'block' }}
            aria-label="Motor visualization"
          >
            {/* Motor body 80x50 centered */}
            <rect x={70} y={65} width={80} height={50} rx={8} fill="#1e293b" stroke="#475569" strokeWidth={2} />
            {/* cooling fins */}
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1={82 + i * 17} y1={65} x2={82 + i * 17} y2={115} stroke="#0f172a" strokeWidth={2} />
            ))}
            <text x={110} y={95} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="JetBrains Mono, monospace">
              M
            </text>

            {/* Shaft 60px right */}
            <line x1={150} y1={90} x2={210} y2={90} stroke="#475569" strokeWidth={4} />

            {/* Rotating indicator at shaft end (length 25) */}
            <g transform={`translate(210, 90) rotate(${motorType === 'dc' ? shaftAngle : shaftAngle - 90})`}>
              <circle cx={0} cy={0} r={18} fill="#0f172a" stroke="#00B8D4" strokeWidth={2} />
              <line x1={0} y1={0} x2={25} y2={0} stroke="#00E5FF" strokeWidth={3} strokeLinecap="round" />
              <circle cx={0} cy={0} r={3} fill="#00E5FF" />
            </g>

            {/* Speed/angle label */}
            <text x={MOTOR_W / 2} y={28} textAnchor="middle" fill="var(--cyan-bright)" fontSize={13} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
              {speedLabel}
            </text>

            {/* Direction indicator */}
            {motorType === 'dc' && (
              <text x={MOTOR_W / 2} y={146} textAnchor="middle" fill="#94A3B8" fontSize={10} fontFamily="JetBrains Mono, monospace">
                {forward ? '→ Forward' : '← Reverse'}
              </text>
            )}

            {/* Current bar */}
            <text x={15} y={163} fill="#64748b" fontSize={9} fontFamily="JetBrains Mono, monospace">
              Current Draw
            </text>
            <rect x={15} y={166} width={MOTOR_W - 30} height={6} fill="#0f172a" stroke="#1e293b" strokeWidth={0.5} rx={2} />
            <rect
              x={15}
              y={166}
              width={Math.max(0, (MOTOR_W - 30) * dutyFrac)}
              height={6}
              fill="#f59e0b"
              rx={2}
            />
            <text x={MOTOR_W - 15} y={163} textAnchor="end" fill={tempLabel.color} fontSize={9} fontFamily="JetBrains Mono, monospace">
              {Math.round(dutyFrac * 100)}% load · {tempLabel.label}
            </text>
          </svg>
        </div>
      </div>

      {/* Controls */}
      <div style={{ marginTop: 22 }}>
        {/* Motor type selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
          {(['dc', 'servo'] as MotorType[]).map((t) => (
            <button
              key={t}
              onClick={() => setMotorType(t)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                border: '1px solid ' + (motorType === t ? 'var(--cyan)' : 'var(--border-2)'),
                background: motorType === t ? 'rgba(0,184,212,.2)' : 'rgba(11,37,64,.5)',
                color: motorType === t ? 'var(--cyan-bright)' : '#C8D0DC',
                fontSize: 12.5,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t === 'dc' ? 'DC Motor' : 'Servo (0–180°)'}
            </button>
          ))}
        </div>

        {motorType === 'dc' ? (
          <label style={{ display: 'block', fontSize: 13, color: '#C8D0DC' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Duty Cycle</span>
              <span style={{ color: 'var(--cyan-bright)', fontFamily: 'var(--font-mono), monospace' }}>{duty}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={duty}
              onChange={(e) => setDuty(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#00B8D4' }}
            />
          </label>
        ) : (
          <label style={{ display: 'block', fontSize: 13, color: '#C8D0DC' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Servo Angle</span>
              <span style={{ color: 'var(--cyan-bright)', fontFamily: 'var(--font-mono), monospace' }}>{servoAngle}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={180}
              step={1}
              value={servoAngle}
              onChange={(e) => setServoAngle(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#00B8D4' }}
            />
          </label>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14, justifyContent: 'center' }}>
          {motorType === 'dc' && (
            <>
              <button
                onClick={() => setDuty(0)}
                style={btnStyle(duty === 0)}
              >
                STOP
              </button>
              <button
                onClick={() => setDuty(50)}
                style={btnStyle(duty === 50)}
              >
                HALF SPEED
              </button>
              <button
                onClick={() => setDuty(100)}
                style={btnStyle(duty === 100)}
              >
                FULL SPEED
              </button>
              <button
                onClick={() => setForward((f) => !f)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-2)',
                  background: 'rgba(11,37,64,.5)',
                  color: '#C8D0DC',
                  fontSize: 12.5,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {forward ? 'Forward →' : '← Reverse'}
              </button>
            </>
          )}
          {motorType === 'servo' && (
            <>
              <button onClick={() => setServoAngle(0)} style={btnStyle(servoAngle === 0)}>
                0°
              </button>
              <button onClick={() => setServoAngle(90)} style={btnStyle(servoAngle === 90)}>
                90°
              </button>
              <button onClick={() => setServoAngle(180)} style={btnStyle(servoAngle === 180)}>
                180°
              </button>
            </>
          )}
        </div>
      </div>

      <p style={{ marginTop: 20, fontSize: 14, color: '#A8B0BC', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--mist)' }}>PWM (Pulse Width Modulation)</strong> controls motor speed by switching power on and off thousands of times per second. A 50% duty cycle delivers 50% average voltage = half speed. This is how every Arduino, Raspberry Pi, and microcontroller controls motors.
      </p>
      <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
        <a
          href="/atlas/concept/pwm"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--cyan-bright)', fontSize: 13.5, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
        >
          Read: PWM →
        </a>
        <a
          href="/atlas/concept/dc-motor"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--cyan-bright)', fontSize: 13.5, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
        >
          Read: DC Motor →
        </a>
      </div>
    </div>
  );
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid ' + (active ? 'var(--cyan)' : 'var(--border-2)'),
    background: active ? 'rgba(0,184,212,.2)' : 'rgba(11,37,64,.5)',
    color: active ? 'var(--cyan-bright)' : '#C8D0DC',
    fontSize: 12.5,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
}
