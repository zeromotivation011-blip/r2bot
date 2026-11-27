// lib/kids/nav.ts — the kids product's one information architecture.
//
// Primary (phone tab bar, exactly five): Home · Course · Worlds · Games ·
// Hangar. The desktop header shows the same places (the logo is Home) plus the
// Skill Galaxy. The tabs live in app/kids/KidsShell.tsx.
// Secondary (the header's "More" menu on every width, and the "More ways to
// play" grid on /kids): KIDS_MORE below, each place listed once. Everything a
// child can open is at most two taps from any kids page (More → item).
// Grown-up links (parents, teachers, schools, join a class, teacher classroom,
// privacy) live in the kids footer.
//
// Only built pages go here: a link to an empty page is worse than no link.

export interface KidsNavItem {
  href: string
  emoji: string
  label: string
  /** One short line for menus. */
  line: string
}

export const KIDS_MORE: KidsNavItem[] = [
  { href: '/kids/ai', emoji: '🧠', label: 'How Robots Think', line: 'AI labs: train a tiny brain, teach a robot to see and talk.' },
  { href: '/kids/stories', emoji: '🎬', label: 'Story Theatre', line: 'Animated robot episodes where you choose what happens.' },
  { href: '/kids/workshop', emoji: '🛠️', label: 'Robot Workshop', line: 'Build your robot in 3D and see it in your room.' },
  { href: '/kids/code-lab', emoji: '🧩', label: 'Code Lab', line: 'Snap blocks together to drive your own robot.' },
  { href: '/kids/spark-trail', emoji: '🗺️', label: 'Spark Trail', line: 'Six zones of quick games with Spark, from robot parts to first code.' },
  { href: '/kids/lab/sim', emoji: '🧪', label: 'Physics Lab', line: 'A real-physics robot sandbox (beta).' },
  { href: '/kids/lab/power', emoji: '🔋', label: 'Power Lab', line: 'Build a battery pack and get home before it runs flat.' },
  { href: '/kids/robodex', emoji: '📇', label: 'Robodex', line: 'Collect real robots from every world by playing.' },
  { href: '/kids/careers', emoji: '🌟', label: 'Robotics careers', line: 'Meet the makers who build robots, and the skills they use.' },
  { href: '/kids/printables', emoji: '✂️', label: 'Make at Home', line: 'Kitchen-table robot builds with a grown-up and a fair test.' },
]

/** Settings (sound, motion, text size, progress backup). In More on every width, never on the /kids grid. */
export const KIDS_SETTINGS: KidsNavItem = {
  href: '/kids/settings', emoji: '⚙️', label: 'Settings', line: 'Sound, motion, reading size and your progress code.',
}
