'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { icon: '🏠', label: 'Home',       href: '/schools/student' },
  { icon: '📚', label: 'Lessons',    href: '/schools/learn' },
  { icon: '🔬', label: 'Simulator',  href: '/schools/simulate' },
  { icon: '🚀', label: 'Projects',   href: '/schools/projects' },
  { icon: '🎥', label: 'Videos',     href: '/schools/videos' },
  { icon: '🏆', label: 'Progress',   href: '/schools/student?progress=1' },
  { icon: '📜', label: 'Certificate', href: '/schools/certificate/me' },
] as const

export function SchoolSideNav() {
  const pathname = usePathname() ?? ''

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex sticky top-16 h-[calc(100vh-4rem)] w-20 flex-col items-center gap-2 border-r border-gray-800 bg-gray-900/60 py-4">
        {ITEMS.map(item => {
          const active = pathname === item.href.split('?')[0] || pathname.startsWith(item.href.split('?')[0] + '/')
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex w-16 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium transition-colors ${
                active ? 'bg-amber-500/15 text-amber-300' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <span className="text-2xl leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-gray-800 bg-gray-900/95 backdrop-blur">
        {ITEMS.slice(0, 5).map(item => (
          <Link key={item.label} href={item.href} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-gray-300">
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
