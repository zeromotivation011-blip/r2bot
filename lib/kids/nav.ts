// lib/kids/nav.ts — the kids product's one information architecture.
//
// Primary (phone tab bar + desktop header, five at most): Home · Course ·
// Galaxy · Games · Hangar — the tabs live in app/kids/KidsShell.tsx.
// Secondary (the header's "More" menu and the "More ways to play" grid on
// /kids): the older surfaces below. Grown-up links (parents, teachers,
// schools, join a class, privacy) live in the kids footer.

export interface KidsNavItem {
  href: string
  emoji: string
  label: string
  /** One short line for menus. */
  line: string
}

export const KIDS_MORE: KidsNavItem[] = [
  { href: '/kids/workshop', emoji: '🛠️', label: 'Robot Workshop', line: 'Build your robot in 3D and see it in your room.' },
  { href: '/kids/code-lab', emoji: '🧩', label: 'Code Lab', line: 'Snap blocks together to drive your own robot.' },
  { href: '/kids/stories', emoji: '🎬', label: 'Story Theatre', line: 'Animated robot episodes where you choose what happens.' },
  { href: '/kids/world', emoji: '🗺️', label: 'Robot World', line: 'Quick games with Spark for the youngest explorers.' },
  { href: '/kids/lab/sim', emoji: '🧪', label: 'Physics Lab', line: 'A real-physics robot sandbox (beta).' },
  { href: '/kids/activities', emoji: '✂️', label: 'Make at Home', line: 'Printable paper robots and unplugged games.' },
]
