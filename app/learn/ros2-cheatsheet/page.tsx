// app/learn/ros2-cheatsheet/page.tsx — ROS 2 command-line cheat sheet.
//
// One printable page of the commands people actually type, grouped by what
// they are trying to do, each with a one-line "why". Targets "ros2 cli cheat
// sheet", "ros2 topic list command", "ros2 bag record", and sits next to the
// Atlas ROS 2 entries that explain the ideas behind them.
//
// Commands verified against the ROS 2 Humble/Jazzy CLI (ros2cli). Flags that
// changed between distributions are noted inline.
import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPage } from '@/components/StaticPage';
import { jsonldScript } from '@/lib/seo/jsonld';
import { authorRef } from '@/lib/author';
import { pageUpdated } from '@/lib/content-dates';

export const revalidate = 86400;
const BASE = 'https://www.r2bot.in';
const PATH = '/learn/ros2-cheatsheet';

export const metadata: Metadata = {
  title: 'ROS 2 Cheat Sheet — Every CLI Command You Actually Use (Printable)',
  description:
    'ros2 topic, node, service, action, param, launch, bag and tf2 commands on one page, each with what it is for. Workspace setup, colcon, rosdep, QoS and debugging included. Humble and Jazzy.',
  alternates: { canonical: `${BASE}${PATH}` },
  openGraph: {
    type: 'article',
    url: `${BASE}${PATH}`,
    siteName: 'R2BOT',
    title: 'ROS 2 cheat sheet — the commands you actually use',
    description: 'Nodes, topics, services, actions, parameters, launch, bag, tf2, colcon and rosdep — one printable page.',
  },
};

type Row = { cmd: string; why: string; note?: string };
type Group = { id: string; title: string; intro: string; atlas?: { slug: string; label: string }; rows: Row[] };

const GROUPS: Group[] = [
  {
    id: 'setup',
    title: 'Environment and workspace',
    intro: 'Nothing works until the right setup file is sourced in the terminal you are typing in. Most "command not found" and "package not found" errors are this.',
    atlas: { slug: 'ros2', label: 'What ROS 2 is' },
    rows: [
      { cmd: 'source /opt/ros/jazzy/setup.bash', why: 'Load the ROS 2 install into this shell (replace jazzy with humble, iron…). Put it in ~/.bashrc so you stop forgetting.' },
      { cmd: 'mkdir -p ~/ros2_ws/src && cd ~/ros2_ws', why: 'A workspace is just a folder with a src/ directory. Packages go in src/.' },
      { cmd: 'colcon build --symlink-install', why: 'Build every package in src/. --symlink-install lets Python and launch-file edits take effect without rebuilding.' },
      { cmd: 'colcon build --packages-select my_pkg', why: 'Build one package instead of waiting for all of them.' },
      { cmd: 'source install/setup.bash', why: 'Overlay your workspace on top of the ROS install. Run it after every build, in every new terminal.' },
      { cmd: 'rosdep install --from-paths src --ignore-src -r -y', why: 'Install the system dependencies every package in src/ declares in its package.xml. Run rosdep update first on a fresh machine.' },
      { cmd: 'export ROS_DOMAIN_ID=7', why: 'Isolate your nodes from everyone else on the same network. Pick 0–101; both machines must match.' },
      { cmd: 'export ROS_LOCALHOST_ONLY=1', why: 'Keep discovery traffic on this machine only. Handy on shared Wi-Fi.', note: 'Jazzy prefers ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST.' },
      { cmd: 'export RMW_IMPLEMENTATION=rmw_cyclonedds_cpp', why: 'Switch the DDS middleware (Fast DDS is the default). Every node in the system should use the same one.' },
    ],
  },
  {
    id: 'packages',
    title: 'Packages',
    intro: 'A package is the unit of code you build, share and depend on.',
    rows: [
      { cmd: 'ros2 pkg create --build-type ament_python my_pkg --dependencies rclpy std_msgs', why: 'Scaffold a Python package. Use ament_cmake for C++.' },
      { cmd: 'ros2 pkg create --build-type ament_cmake my_pkg --node-name talker', why: 'Scaffold a C++ package with a starter node already wired into CMake.' },
      { cmd: 'ros2 pkg list', why: 'Every package the current shell can see.' },
      { cmd: 'ros2 pkg executables my_pkg', why: 'What can I actually ros2 run from this package?' },
      { cmd: 'ros2 pkg prefix my_pkg', why: 'Where is it installed? Useful when two copies are fighting.' },
    ],
  },
  {
    id: 'nodes',
    title: 'Nodes',
    intro: 'A node is one running program. Everything else is how nodes talk.',
    atlas: { slug: 'ros2-nodes', label: 'Nodes explained' },
    rows: [
      { cmd: 'ros2 run my_pkg my_node', why: 'Start one executable from a package.' },
      { cmd: 'ros2 run my_pkg my_node --ros-args -r __node:=left_cam -r /image:=/left/image', why: 'Rename the node and remap a topic at launch time, no code change.' },
      { cmd: 'ros2 run my_pkg my_node --ros-args -p rate:=10.0 --params-file cfg.yaml', why: 'Set a parameter inline, or load a whole YAML of them.' },
      { cmd: 'ros2 run my_pkg my_node --ros-args --log-level debug', why: 'See everything the node logs. Use --log-level my_node:=debug to target one node.' },
      { cmd: 'ros2 node list', why: 'Who is running right now?' },
      { cmd: 'ros2 node info /my_node', why: 'Every topic, service, action and parameter this node exposes. The first thing to run when something is silent.' },
    ],
  },
  {
    id: 'topics',
    title: 'Topics',
    intro: 'Streams of messages: sensors publish, controllers subscribe. Most debugging is looking at a topic.',
    atlas: { slug: 'ros2-topics', label: 'Topics explained' },
    rows: [
      { cmd: 'ros2 topic list -t', why: 'All topics with their message types.' },
      { cmd: 'ros2 topic echo /scan', why: 'Print messages as they arrive. Add --once for one, --no-arr to hide long arrays.' },
      { cmd: 'ros2 topic echo /scan --qos-reliability best_effort', why: 'Sensor topics are often best-effort; a reliable subscriber hears nothing. This is the classic "echo shows nothing" fix.' },
      { cmd: 'ros2 topic hz /scan', why: 'Publish rate. A lidar that should be 10 Hz showing 2 Hz tells you where the problem is.' },
      { cmd: 'ros2 topic bw /camera/image_raw', why: 'Bandwidth. Cameras over Wi-Fi fail here first.' },
      { cmd: 'ros2 topic info /cmd_vel -v', why: 'Who publishes, who subscribes, and with which QoS. Mismatched QoS is why two nodes "cannot see each other".' },
      { cmd: 'ros2 topic pub -r 10 /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.2}, angular: {z: 0.0}}"', why: 'Publish by hand at 10 Hz. --once for a single message. Press Ctrl-C to stop the robot.' },
      { cmd: 'ros2 interface show geometry_msgs/msg/Twist', why: 'The fields of a message, so you know what to put in the braces above.' },
      { cmd: 'ros2 interface list | grep -i laser', why: 'Find a message type when you only remember part of its name.' },
    ],
  },
  {
    id: 'services',
    title: 'Services',
    intro: 'Request and reply. Use them for things that happen once: reset, take a photo, switch a mode.',
    atlas: { slug: 'ros2-services', label: 'Services explained' },
    rows: [
      { cmd: 'ros2 service list -t', why: 'All services and their types.' },
      { cmd: 'ros2 service type /reset', why: 'Which request/response type does this service use?' },
      { cmd: 'ros2 service call /reset std_srvs/srv/Trigger "{}"', why: 'Call it from the terminal. Empty braces for a request with no fields.' },
      { cmd: 'ros2 interface show std_srvs/srv/SetBool', why: 'Request fields above the ---, response fields below it.' },
      { cmd: 'ros2 service find std_srvs/srv/Trigger', why: 'Every service of a given type.' },
    ],
  },
  {
    id: 'actions',
    title: 'Actions',
    intro: 'Long-running goals with feedback and cancel: navigate to a pose, move an arm, dock.',
    atlas: { slug: 'ros2-actions', label: 'Actions explained' },
    rows: [
      { cmd: 'ros2 action list -t', why: 'All action servers and their types.' },
      { cmd: 'ros2 action info /navigate_to_pose', why: 'Which nodes serve and which call this action.' },
      { cmd: 'ros2 action send_goal /fibonacci example_interfaces/action/Fibonacci "{order: 5}" --feedback', why: 'Send a goal and watch feedback stream back until the result arrives.' },
      { cmd: 'ros2 interface show nav2_msgs/action/NavigateToPose', why: 'Goal, result and feedback fields, separated by ---.' },
    ],
  },
  {
    id: 'params',
    title: 'Parameters',
    intro: 'Per-node settings you can read and change while the node runs.',
    atlas: { slug: 'ros2-parameters', label: 'Parameters explained' },
    rows: [
      { cmd: 'ros2 param list', why: 'Every parameter of every node. Add a node name to narrow it.' },
      { cmd: 'ros2 param get /controller max_speed', why: 'Read one value.' },
      { cmd: 'ros2 param set /controller max_speed 0.5', why: 'Change it live. Nodes decide whether to accept the change.' },
      { cmd: 'ros2 param dump /controller > controller.yaml', why: 'Save the current configuration to a file you can load next time.', note: 'Older Humble builds write the file themselves instead of printing; check with --help.' },
      { cmd: 'ros2 param load /controller controller.yaml', why: 'Load a YAML of parameters into a running node.' },
      { cmd: 'ros2 param describe /controller max_speed', why: 'Type, description and allowed range, if the node declared them.' },
    ],
  },
  {
    id: 'launch',
    title: 'Launch files',
    intro: 'Start many nodes with their parameters and remaps in one command. Real robots are launched, not ros2 run one at a time.',
    atlas: { slug: 'ros2-launch', label: 'Launch files explained' },
    rows: [
      { cmd: 'ros2 launch my_pkg bringup.launch.py', why: 'Run a launch file from a package.' },
      { cmd: 'ros2 launch my_pkg bringup.launch.py use_sim_time:=true', why: 'Pass a launch argument. use_sim_time is the one you will set most, for Gazebo and bag playback.' },
      { cmd: 'ros2 launch my_pkg bringup.launch.py -s', why: 'Show the arguments a launch file accepts without starting anything.' },
      { cmd: 'ros2 launch ./my.launch.py', why: 'Run a launch file by path, outside any package.' },
    ],
  },
  {
    id: 'bag',
    title: 'Recording and playback (rosbag2)',
    intro: 'Record the real robot once, replay it a hundred times on your laptop.',
    rows: [
      { cmd: 'ros2 bag record -a', why: 'Record every topic. Big files fast — prefer naming topics.' },
      { cmd: 'ros2 bag record -o run1 /scan /odom /tf /tf_static', why: 'Record chosen topics into a folder named run1. Always include /tf and /tf_static.' },
      { cmd: 'ros2 bag info run1', why: 'Duration, topics, message counts, storage format.' },
      { cmd: 'ros2 bag play run1 --clock', why: 'Replay and publish /clock so nodes started with use_sim_time:=true follow the recording.' },
      { cmd: 'ros2 bag play run1 -r 0.5 -l', why: 'Half speed, looping.' },
      { cmd: 'ros2 bag record -s mcap -a', why: 'Record in MCAP, the default storage from Iron onwards and faster to seek than SQLite.' },
    ],
  },
  {
    id: 'tf',
    title: 'Coordinate frames (tf2)',
    intro: 'Where is the lidar relative to the base, and the base relative to the map? When navigation "does nothing", check tf first.',
    atlas: { slug: 'ros2-tf', label: 'tf2 explained' },
    rows: [
      { cmd: 'ros2 run tf2_tools view_frames', why: 'Writes a PDF of the whole frame tree. Broken trees are obvious on paper.' },
      { cmd: 'ros2 run tf2_ros tf2_echo map base_link', why: 'The live transform between two frames, and an error if there is no path between them.' },
      { cmd: 'ros2 run tf2_ros static_transform_publisher --x 0.1 --y 0 --z 0.2 --yaw 0 --pitch 0 --roll 0 --frame-id base_link --child-frame-id laser', why: 'Publish a fixed transform from the command line (named flags since Humble).' },
      { cmd: 'ros2 topic echo /tf_static --qos-durability transient_local', why: 'Static transforms are latched; a plain echo misses them.' },
    ],
  },
  {
    id: 'debug',
    title: 'Debugging and tools',
    intro: 'In rough order of how often they save the day.',
    rows: [
      { cmd: 'ros2 doctor', why: 'Checks your install, network and environment and names what is wrong. ros2 doctor --report for the long version.' },
      { cmd: 'ros2 daemon stop && ros2 daemon start', why: 'The discovery daemon caches node lists. When ros2 node list is stale or empty, restart it.' },
      { cmd: 'rqt_graph', why: 'A picture of who talks to whom. The fastest way to spot a topic-name typo.' },
      { cmd: 'ros2 run rqt_console rqt_console', why: 'All log messages from all nodes, filterable by level.' },
      { cmd: 'ros2 run rviz2 rviz2 -d my.rviz', why: '3D visualisation of frames, scans, maps and paths. -d loads a saved layout.' },
      { cmd: 'ros2 run plotjuggler plotjuggler', why: 'Plot any numeric field of any topic over time. Needs the plotjuggler-ros package.' },
      { cmd: 'ros2 lifecycle list /my_node && ros2 lifecycle set /my_node configure', why: 'Managed (lifecycle) nodes, as used by Nav2, must be configured and activated before they do anything.' },
      { cmd: 'ros2 component list', why: 'Nodes loaded into a composed container. Composition is why one process can hold many nodes.' },
    ],
  },
];

export default function Ros2CheatsheetPage() {
  const totalCommands = GROUPS.reduce((n, g) => n + g.rows.length, 0);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'ROS 2 Cheat Sheet — every CLI command you actually use',
    description: metadata.description,
    url: `${BASE}${PATH}`,
    mainEntityOfPage: `${BASE}${PATH}`,
    dateModified: pageUpdated(PATH).toISOString(),
    author: authorRef(),
    publisher: { '@type': 'Organization', name: 'R2BOT', url: BASE },
    proficiencyLevel: 'Beginner',
    dependencies: 'ROS 2 Humble or Jazzy',
    about: GROUPS.map((g) => ({ '@type': 'Thing', name: g.title })),
  };

  return (
    <StaticPage
      eyebrow="Reference · ROS 2"
      title="ROS 2 cheat sheet"
      lede={`${totalCommands} commands, grouped by what you are trying to do, each with the one line of why. Works for Humble and Jazzy; differences are marked. Print it: Ctrl/⌘ + P.`}
      maxWidth={960}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />

      <nav aria-label="Sections" className="not-prose mb-8 flex flex-wrap gap-2 print:hidden">
        {GROUPS.map((g) => (
          <a key={g.id} href={`#${g.id}`} className="rounded-full border border-white/10 px-3 py-1 text-sm text-gray-300 hover:border-amber-400/50 hover:text-white">{g.title}</a>
        ))}
      </nav>

      <div className="not-prose mb-8 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-gray-200">
        <strong className="text-white">The three habits that remove 80% of ROS 2 pain:</strong> source <code className="rounded bg-black/30 px-1">install/setup.bash</code> in every new terminal;
        when a topic is silent run <code className="rounded bg-black/30 px-1">ros2 topic info -v</code> and compare QoS; when the robot does nothing, check tf with <code className="rounded bg-black/30 px-1">view_frames</code> before touching your code.
      </div>

      {GROUPS.map((g) => (
        <section key={g.id} id={g.id} className="not-prose mb-10 scroll-mt-28 break-inside-avoid">
          <h2 className="text-2xl font-black text-white">{g.title}</h2>
          <p className="mt-1 text-gray-400">
            {g.intro}
            {g.atlas && (
              <> <Link href={`/atlas/concept/${g.atlas.slug}`} className="text-amber-300 underline decoration-amber-300/40 hover:decoration-amber-300">{g.atlas.label} →</Link></>
            )}
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-gray-400">
                <tr><th className="px-4 py-2 font-semibold">Command</th><th className="px-4 py-2 font-semibold">What it is for</th></tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.cmd} className="border-t border-white/10 align-top">
                    <td className="w-[46%] px-4 py-3"><code className="block whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-amber-200">{r.cmd}</code></td>
                    <td className="px-4 py-3 text-gray-300">
                      {r.why}
                      {r.note && <span className="mt-1 block text-xs text-gray-500">{r.note}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="not-prose mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-5 print:hidden">
        <h2 className="text-lg font-black text-white">Go deeper</h2>
        <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <li><Link href="/atlas/concept/ros2" className="text-amber-300 hover:underline">ROS 2 — what it is and why robots use it</Link></li>
          <li><Link href="/atlas/concept/quality-of-service" className="text-amber-300 hover:underline">Quality of Service (QoS) — why two nodes cannot see each other</Link></li>
          <li><Link href="/ros2" className="text-amber-300 hover:underline">ROS 2 Playground — try these commands in your browser</Link></li>
          <li><Link href="/academy/wire" className="text-amber-300 hover:underline">Wire track — Arduino to ROS 2, six written lessons</Link></li>
        </ul>
        <p className="mt-4 text-xs text-gray-500">
          Source of truth for every command: the ROS 2 documentation at docs.ros.org (Humble and Jazzy CLI tools pages) and the ros2cli package. Found a flag that changed? <a className="underline" href="mailto:hello@r2bot.in">Tell us</a>.
        </p>
      </section>
    </StaticPage>
  );
}
