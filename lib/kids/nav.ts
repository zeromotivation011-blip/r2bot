// lib/kids/nav.ts — the kids product's one information architecture.
//
// Primary (phone tab bar, exactly five): Home · Learn · Worlds · Games · Garage.
// The desktop header shows the same places (the logo is Home) plus the Skill
// Galaxy. KidsShell renders them from KIDS_TABS / KIDS_HEADER_TABS below.
//
// Why these five words (roadmap #3, decided 27 Nov 2026): a 6-year-old reads
// the tab bar before anything else, so every tab is one everyday word with one
// meaning. "Course" and "Hangar" were grown-up words, so the course tab is
// **Learn** and the robot's home is the **Garage** (the page already called
// itself that). We kept five tabs instead of the review's Learn / Play /
// Garage / Me: a "Me" tab would split the robot's one home (badges, bests and
// the robot already live in the Garage), and folding Worlds into "Play" would
// hide the seven worlds one level deeper. Games and Worlds stay apart because
// a child means different things by them: a game is "play a round", a world is
// "go to a place".
//
// Secondary (the header's "More" menu on every width, and the "More ways to
// play" grid on /kids): KIDS_MORE below, each place listed once. Everything a
// child can open is at most two taps from any kids page (More → item).
// Grown-up places sit behind ONE gated door, /kids/grown-ups (KIDS_GROWNUP_DOORS),
// which is the single grown-up link in the kids footer (roadmap #20).
//
// Only built pages go here: a link to an empty page is worse than no link.

export interface KidsNavItem {
  href: string
  emoji: string
  label: string
  /** One short line for menus. */
  line: string
}

export interface KidsTab {
  href: string
  emoji: string
  label: string
  /** True when this tab owns the current path. */
  match: (path: string) => boolean
}

export const HOME_TAB: KidsTab = { href: '/kids', emoji: '🏠', label: 'Home', match: (p) => p === '/kids' }
export const LEARN_TAB: KidsTab = {
  href: '/kids/course',
  emoji: '🚀',
  label: 'Learn',
  match: (p) => p.startsWith('/kids/course') || p.startsWith('/kids/lab/episodes'),
}
export const WORLDS_TAB: KidsTab = { href: '/kids/worlds', emoji: '🧭', label: 'Worlds', match: (p) => p.startsWith('/kids/worlds') }
export const GALAXY_TAB: KidsTab = { href: '/kids/galaxy', emoji: '🌌', label: 'Galaxy', match: (p) => p.startsWith('/kids/galaxy') }
export const GAMES_TAB: KidsTab = { href: '/kids/play', emoji: '🎮', label: 'Games', match: (p) => p.startsWith('/kids/play') }
export const GARAGE_TAB: KidsTab = {
  href: '/kids/hangar',
  emoji: '🤖',
  label: 'Garage',
  match: (p) => p.startsWith('/kids/hangar') || p.startsWith('/kids/portfolio'),
}

/** Phone tab bar: exactly five. */
export const KIDS_TABS: readonly KidsTab[] = [HOME_TAB, LEARN_TAB, WORLDS_TAB, GAMES_TAB, GARAGE_TAB]
/** Desktop header (the logo is Home). */
export const KIDS_HEADER_TABS: readonly KidsTab[] = [LEARN_TAB, WORLDS_TAB, GALAXY_TAB, GAMES_TAB, GARAGE_TAB]

export const KIDS_MORE: KidsNavItem[] = [
  { href: '/kids/ai', emoji: '🧠', label: 'How Robots Think', line: 'AI labs: train a tiny brain, teach a robot to see and talk.' },
  { href: '/kids/stories', emoji: '🎬', label: 'Story Theatre', line: 'Animated robot episodes where you choose what happens.' },
  { href: '/kids/workshop', emoji: '🛠️', label: 'Robot Workshop', line: 'Build your robot in 3D and see it in your room.' },
  { href: '/kids/code-lab', emoji: '🧩', label: 'Code Lab', line: 'Snap blocks together to drive your own robot.' },
  { href: '/kids/spark-trail', emoji: '🗺️', label: 'Spark Trail', line: 'Six zones of quick games with Spark, from robot parts to first code.' },
  { href: '/kids/lab/sim', emoji: '🧪', label: 'Physics Lab', line: 'A real-physics robot sandbox (beta).' },
  { href: '/kids/lab/power', emoji: '🔋', label: 'Power Lab', line: 'Build a battery pack and get home before it runs flat.' },
  { href: '/kids/lab/network', emoji: '📡', label: 'Link Lab', line: 'Drive a robot over a laggy, lossy radio link, then fix it.' },
  { href: '/kids/maths', emoji: '🧮', label: 'Robot Maths', line: 'The maths inside robots, at your age.' },
  { href: '/kids/robodex', emoji: '📇', label: 'Robodex', line: 'Collect real robots from every world by playing.' },
  { href: '/kids/careers', emoji: '🌟', label: 'Robotics careers', line: 'Meet the makers who build robots, and the skills they use.' },
  { href: '/kids/printables', emoji: '✂️', label: 'Make at Home', line: 'Kitchen-table robot builds with a grown-up and a fair test.' },
]

/** Settings (sound, motion, text size, progress backup). In More on every width, never on the /kids grid. */
export const KIDS_SETTINGS: KidsNavItem = {
  href: '/kids/settings', emoji: '⚙️', label: 'Settings', line: 'Sound, motion, reading size and your progress code.',
}

/** The one grown-up front door (gated from the kids footer). */
export const KIDS_GROWNUPS_HREF = '/kids/grown-ups'

export interface KidsGrownUpDoor extends KidsNavItem {
  /** Who it is for, shown as a small label. */
  who: string
  /** Leaves R2BOT Kids (another part of r2bot.in): follows the parent "outbound links" switch. */
  leaves?: boolean
}

/**
 * Everything behind the grown-up door, in the order a grown-up usually needs it.
 * Rendered by /kids/grown-ups (server text + gated links).
 */
export const KIDS_GROWNUP_DOORS: readonly KidsGrownUpDoor[] = [
  { href: '/kids/parents', emoji: '👪', label: 'Parents', who: 'Parents and carers', line: 'This week in plain words, daily time and quiet hours, Spark and camera switches, profiles for brothers and sisters.' },
  { href: '/kids/teach', emoji: '🧑‍🏫', label: 'Teachers', who: 'Teachers and club leaders', line: 'A teacher guide for every session of all four levels, unplugged lessons, standards maps and Present mode.' },
  { href: '/kids/classroom', emoji: '🏫', label: 'Teacher classroom', who: 'Teachers', line: 'Create a class, print join cards, see progress by concept and set a Class Power-Up goal.' },
  { href: '/kids/schools', emoji: '🎓', label: 'Schools', who: 'School leaders', line: 'How a school runs R2BOT Kids with no lab and no kits, and how to start a pilot.' },
  { href: '/kids/teach/trust', emoji: '🛡️', label: 'Trust Pack', who: 'Schools and data officers', line: 'Exactly what a class shares, what never leaves the device, and a PDF for your records.' },
  { href: '/privacy#kids', emoji: '🔒', label: 'Children’s privacy', who: 'Everyone', line: 'The children’s section of the R2BOT privacy notice, in plain words.', leaves: true },
  { href: '/', emoji: '🧭', label: 'R2BOT for grown-ups', who: 'Teens moving on, and adults', line: 'The main R2BOT site: the Atlas, the free course path and the R2 Co-pilot.', leaves: true },
]
