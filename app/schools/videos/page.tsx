'use client'

import Link from 'next/link'
import { SchoolSideNav } from '../_components/SchoolSideNav'

const VIDEOS = [
  { id: 'br0NW9i-gqs', title: 'Boston Dynamics Spot — what makes it a robot?', source: 'Boston Dynamics' },
  { id: 'Ki4tBPQfvyQ', title: '10 robots already running your life', source: 'R2BOT' },
  { id: 'tF4DML7FIWk', title: 'How a 4-wheel robot turns (differential drive)', source: 'Engineering Explained' },
  { id: 'dRTFq8VCK_M', title: 'How self-driving cars see the world', source: 'Wired' },
  { id: 'zOjov-2OZ0E', title: 'From blocks to Python — coding for robots', source: 'Code.org' },
  { id: 'nL34zDTPkcs', title: 'Arduino in 60 seconds', source: 'Make:' },
  { id: '0qwrnUeSpYQ', title: 'DC vs Servo vs Stepper motors', source: 'GreatScott!' },
  { id: '4Y7zG48uHRo', title: 'PID control explained in 5 minutes', source: 'MATLAB' },
  { id: 'kqtD5dpn9C8', title: 'Python in 90 seconds', source: 'Fireship' },
  { id: 'oXlwWbU8l2o', title: '5-minute OpenCV tour', source: 'TheCodingTrain' },
  { id: 'HDOyW42pYBo', title: 'ROS in 5 minutes', source: 'Articulated Robotics' },
  { id: 'cdiD-9MMpb0', title: 'AI-powered robots, today', source: 'CleanTechnica' },
]

export default function VideosPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <SchoolSideNav />
      <main className="flex-1 min-w-0 pb-24 md:pb-12">
        <header className="border-b border-gray-800 px-4 py-6">
          <div className="mx-auto max-w-6xl">
            <Link href="/schools/student" className="text-amber-400 text-sm hover:underline">← Dashboard</Link>
            <h1 className="mt-1 text-3xl font-bold">🎥 Curated Robotics Videos</h1>
            <p className="text-sm text-gray-400 mt-0.5">Short, high-quality videos pulled from the lessons. Watch any time.</p>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VIDEOS.map(v => (
            <article key={v.id} className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
              <div className="aspect-video bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${v.id}`}
                  title={v.title}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm leading-tight">{v.title}</p>
                <p className="text-[10px] text-gray-500 mt-1">via {v.source}</p>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
