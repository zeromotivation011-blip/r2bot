'use client';

import { useEffect, useState } from 'react';

type Fact = { text: string; href: string };

// Each "did you know" fact links to a real Atlas entry that elaborates.
const FACTS: Fact[] = [
  { text: "A surgical robot's arm is more precise than a human hair is thick.", href: '/lens/davinci-surgical-robot-knot' },
  { text: "ISRO's Pragyan rover made India the first country to soft-land near the lunar south pole.", href: '/atlas/robot/pragyan' },
  { text: "The first industrial robot, Unimate, was installed at a GM plant in 1961.", href: '/atlas/concept/industrial-robot' },
  { text: "A Roomba doesn't clean randomly — it builds a real map of your home using SLAM.", href: '/lens/roomba-how-it-cleans' },
  { text: 'China makes more industrial robots per year than the next 5 countries combined.', href: '/atlas/concept/industrial-robot' },
  { text: "Boston Dynamics' Atlas does parkour with real-time math, not pre-recorded moves.", href: '/lens/boston-dynamics-atlas-parkour' },
  { text: 'The cheapest humanoid robot you can buy in 2026 — Unitree H1 — costs less than a used car.', href: '/atlas/company/unitree' },
  { text: 'Most modern robots run an open-source toolkit called ROS — it lets dozens of programs talk to each other.', href: '/atlas/concept/ros' },
  { text: 'A drone is inherently unstable. It only stays in the air because a computer corrects its orientation 1,000 times per second.', href: '/atlas/concept/drone' },
  { text: 'Tesla\'s Optimus walks heel-first now — the same way you do. Earlier versions shuffled flat-footed.', href: '/lens/tesla-optimus-walking-explained' },
];

export function DidYouKnowToast() {
  const [show, setShow] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let hideTimer: number;
    const trigger = () => {
      setShow(true);
      hideTimer = window.setTimeout(() => setShow(false), 14000);
    };
    const firstShow = window.setTimeout(trigger, 8000);
    const interval = window.setInterval(() => {
      setIndex(i => (i + 1) % FACTS.length);
      trigger();
    }, 75000);
    return () => {
      clearTimeout(firstShow);
      clearTimeout(hideTimer);
      clearInterval(interval);
    };
  }, []);

  const fact = FACTS[index];

  return (
    <div className={`toast ${show ? 'show' : ''}`} role="status" aria-live="polite">
      <div className="toast-head">
        <span className="toast-eyebrow">Did you know?</span>
        <button className="toast-close" onClick={() => setShow(false)} aria-label="Dismiss">×</button>
      </div>
      <div className="toast-body">{fact.text}</div>
      <a className="toast-link" href={fact.href}>Read more →</a>
    </div>
  );
}
