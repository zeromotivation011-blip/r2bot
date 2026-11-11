import type { Metadata } from 'next'
import Link from 'next/link'
import { ResumeStrip } from '@/components/ResumeStrip'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'Start Here: Your Free Robotics Learning Path',
  description: 'New to robotics? Pick the path that fits you: complete beginner, coder, ROS 2 builder or AI curious. Every step is free.',
  alternates: { canonical: `${BASE}/start` },
}

// Ordered. The first card is the recommended default: one minute of value
// before we ask for anything. Every href below must land on something that
// exists today — three of these used to point at "Coming Soon · notify me at
// launch" waitlists, so the recommended path for a beginner ended on an email
// form for a course that had no lessons.
const PATHS: {
  emoji: string
  title: string
  time: string
  primary?: boolean
  steps: { t: string; href: string }[]
}[] = [
  {
    emoji: '⚡', title: 'I have one minute', time: 'One minute each', primary: true,
    steps: [
      { t: 'Watch: how a robot measures distance', href: '/shorts/ultrasonic-sensor' },
      { t: 'Watch: how a servo holds its angle', href: '/shorts/servo-motor' },
      { t: 'All 47 one-minute lessons', href: '/shorts' },
    ],
  },
  {
    emoji: '🎬', title: 'I like short videos and a clear path', time: 'About 2 hours',
    steps: [
      { t: 'Course 1: Robotics Foundations', href: '/courses/robotics-foundations' },
      { t: 'Course 2: Build Your First Robot', href: '/courses/build-your-first-robot-pip' },
      { t: 'Course 3: Robot Arms', href: '/courses/robot-arms-build-ari' },
      { t: 'See all 5 courses and certificates', href: '/courses' },
    ],
  },
  {
    emoji: '🌱', title: 'I am brand new to robotics', time: 'About 4 hours',
    steps: [
      { t: 'Read: how robots work', href: '/blog/how-do-robots-work' },
      { t: 'Spark lesson 1: what a robot is', href: '/academy/spark/01' },
      { t: 'Try a simulator', href: '/visualizer' },
      { t: 'Look up any word in the Atlas', href: '/atlas' },
    ],
  },
  {
    emoji: '💻', title: 'I can code and want to build', time: 'About 8 hours',
    steps: [
      { t: 'Pick a board: Arduino, ESP32 or Pi', href: '/blog/arduino-vs-esp32-vs-raspberry-pi-for-robots' },
      { t: 'Wire track: build real ROS 2 robots', href: '/academy/wire/01' },
      { t: 'Learn PID control', href: '/atlas/concept/pid-controller' },
      { t: 'Build a guided project', href: '/build' },
    ],
  },
  {
    emoji: '🧩', title: 'I want to learn ROS 2', time: 'About 10 hours',
    steps: [
      { t: 'ROS vs ROS 2: what to learn', href: '/blog/ros-vs-ros2-which-to-learn' },
      { t: 'Forge track: Nav2 and MoveIt2', href: '/academy/forge/01' },
      { t: 'Understand SLAM', href: '/atlas/concept/slam' },
      { t: 'Practise in the ROS 2 playground', href: '/ros2' },
    ],
  },
  {
    emoji: '🧠', title: 'I am curious about AI + robots', time: 'About 3 hours',
    steps: [
      { t: 'AI and Robotics hub: plain-English guides', href: '/ai-robotics' },
      { t: 'AI and robotics: the complete guide', href: '/blog/ai-and-robotics-complete-guide' },
      { t: 'How robots learn', href: '/blog/how-robots-learn-machine-learning-and-reinforcement-learning' },
      { t: 'LLMs and robots', href: '/atlas/concept/large-language-model-robotics' },
      { t: 'Ask the R2 Co-pilot anything', href: '/copilot' },
    ],
  },
]

export default function StartPage() {
  return (
    <main className="max-w-4xl mx-auto px-5 py-14">
      <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-500">Start here</p>
      <h1 className="text-3xl md:text-5xl font-black text-white mt-2">Where do you want to begin?</h1>
      <p className="text-gray-400 mt-4 max-w-2xl">Pick the path that sounds most like you. Each one is a short list of steps, in order. Everything is free, and you can switch paths any time.</p>

      <div className="mt-8"><ResumeStrip /></div>

      <div className="grid md:grid-cols-2 gap-5 mt-10">
        {PATHS.map((p) => (
          <section
            key={p.title}
            className={
              p.primary
                ? 'rounded-2xl border border-amber-500/50 bg-amber-500/[0.07] p-6 md:col-span-2'
                : 'rounded-2xl border border-white/10 bg-white/[0.02] p-6'
            }
          >
            <div className="text-3xl">{p.emoji}</div>
            {p.primary && (
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-amber-400">
                Start here
              </p>
            )}
            <h2 className="text-xl font-extrabold text-white mt-2">{p.title}</h2>
            <p className="text-gray-500 text-xs mt-1">{p.time}</p>
            <ol className="mt-4 space-y-2">
              {p.steps.map((s, i) => (
                <li key={s.href}>
                  <Link href={s.href} className="flex items-center gap-3 rounded-lg border border-white/10 px-3 min-h-[44px] hover:border-amber-500/60 text-gray-200">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-white/10 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                    {s.t}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <p className="text-gray-400 mt-10">Not sure? Take the 2-minute <Link href="/diagnostic" className="text-amber-500 underline">placement test</Link> and we will suggest where to start.</p>
    </main>
  )
}
