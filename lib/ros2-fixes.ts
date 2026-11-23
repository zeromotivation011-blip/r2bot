// lib/ros2-fixes.ts
//
// Data for /ros2/fix/<slug> — one page per ROS 2 error a learner actually hits.
// Each page owns the query "<exact error text>" (see lib/canonical-map.ts):
// the Atlas explains the concept, the cheatsheet lists commands, a fix page
// takes someone from a broken terminal to a working one.
//
// The bar for adding a fix:
//   • a real, frequently-hit error, quoted exactly as ROS 2 prints it;
//   • every cause and command verified against ros2/ros2_documentation (read
//     on raw.githubusercontent.com, cited as the canonical docs.ros.org URL)
//     or against the ROS 2 source that prints the message;
//   • causes ordered from most to least likely, each with a way to CHECK it
//     before changing anything;
//   • `updated` is the day the content last really changed (it feeds lastmod).
//
// Inline `backticks` in prose render as code.

export type FixCode = {
  /** Shown above the block, e.g. "Check" or "Fix (Humble)". */
  label?: string
  code: string
}

export type FixCause = {
  id: string
  title: string
  /** What the reader sees when this is the cause. */
  symptom: string
  /** Why it happens, beginner-first. */
  why: string
  check?: FixCode
  fix: FixCode[]
  /** Extra detail after the fix (edge cases, distro differences). */
  note?: string
}

export type FixSection = {
  title: string
  body: string[]
  code?: FixCode[]
}

export type Ros2Fix = {
  slug: string
  /** H1. */
  title: string
  /** <title>, ≤ 60 chars. */
  seoTitle: string
  /** Meta description, ≤ 155 chars. */
  description: string
  /** The terminal output, exactly as printed. */
  errorText: string
  lede: string
  shortAnswer: string
  quickFix: FixCode
  /** Plain-English "what is actually going on", read before the causes. */
  explainer: string[]
  causes: FixCause[]
  /** Neighbouring problems that look similar. */
  more: FixSection[]
  prevent: string[]
  faq: { q: string; a: string }[]
  /** Distros the commands were checked against. */
  verifiedOn: string
  related: { href: string; label: string }[]
  sources: { name: string; url: string }[]
  /** YYYY-MM-DD */
  updated: string
}

export const ROS2_FIXES: Ros2Fix[] = [
  {
    slug: 'ros2-command-not-found',
    title: 'Fix “ros2: command not found”',
    seoTitle: 'ros2: command not found — Causes and Fixes',
    description:
      'Why your terminal says “ros2: command not found” and how to fix it: source setup.bash, match the distro to your Ubuntu, zsh, Docker and .bashrc cases.',
    errorText: '$ ros2 topic list\nros2: command not found\n\n# also printed as: bash: ros2: command not found  ·  zsh: command not found: ros2',
    lede:
      'Your terminal does not know where ROS 2 is. The fix is usually one line, but there are six different reasons it happens, and the one-liner only fixes the first.',
    shortAnswer:
      'ROS 2 installs under `/opt/ros/<distro>`, which is not on your PATH until you source its setup file. Run `source /opt/ros/jazzy/setup.bash` (with your distro name), then add that line to `~/.bashrc` so every new terminal gets it. If `/opt/ros` does not exist, ROS 2 is not installed for your Ubuntu version.',
    quickFix: {
      label: 'The 30-second fix (Ubuntu, bash)',
      code: `ls /opt/ros/                        # which distro is installed? e.g. jazzy
source /opt/ros/jazzy/setup.bash    # use the name ls printed
ros2 --help                         # should now list the ros2 commands
echo "source /opt/ros/jazzy/setup.bash" >> ~/.bashrc   # every new terminal`,
    },
    explainer: [
      'When you type a command, the shell looks for a program with that name in the folders listed in the `PATH` variable. The ROS 2 packages install into `/opt/ros/<distro>` (for example `/opt/ros/jazzy`), and that folder is deliberately not on `PATH`.',
      'That is by design. ROS 2 lets you keep several distributions, or several of your own workspaces, on one computer and choose which one a terminal uses. You choose by sourcing a setup file: `source` runs the script inside your current shell, which adds the ROS 2 folders to `PATH` and sets variables such as `ROS_DISTRO` and `ROS_VERSION`. The official tutorial puts it plainly: without sourcing the setup files, you will not be able to access ROS 2 commands.',
      'Sourcing only changes the shell it runs in. A new terminal tab, an SSH session or the terminal inside VS Code starts clean, which is why `ros2` worked yesterday and does not today.',
    ],
    causes: [
      {
        id: 'not-sourced',
        title: 'The setup file is not sourced in this terminal',
        symptom:
          'It worked in another terminal or an earlier session. `echo $ROS_DISTRO` prints an empty line.',
        why:
          'Each new shell starts without ROS 2. This is the most common cause, and the official “Configuring environment” tutorial exists for exactly this reason.',
        check: { label: 'Check', code: 'printenv | grep -i ROS' },
        fix: [
          { label: 'Fix for this terminal', code: 'source /opt/ros/jazzy/setup.bash' },
          { label: 'Fix for every new terminal', code: 'echo "source /opt/ros/jazzy/setup.bash" >> ~/.bashrc' },
        ],
        note:
          'After sourcing, the check should show `ROS_VERSION=2`, `ROS_PYTHON_VERSION=3` and `ROS_DISTRO=jazzy` (or your distro). Replace `jazzy` with `humble` or `lyrical` if that is what you installed.',
      },
      {
        id: 'wrong-distro',
        title: 'The distro name is wrong, or nothing is installed',
        symptom:
          'A line such as `bash: /opt/ros/humble/setup.bash: No such file or directory` appears just before the command-not-found error.',
        why:
          'Tutorials hard-code a distro name, and each distro’s Ubuntu packages are built for one Ubuntu release: Humble for Ubuntu 22.04 (Jammy), Jazzy for Ubuntu 24.04 (Noble), Lyrical for Ubuntu 26.04 (Resolute). Follow a Humble tutorial on Ubuntu 24.04 and apt has no `ros-humble-*` packages to install, so `/opt/ros/humble` never appears.',
        check: {
          label: 'Check what is installed and which Ubuntu you run',
          code: `ls /opt/ros/
grep VERSION_CODENAME /etc/os-release`,
        },
        fix: [
          { label: 'If ls printed a folder, use that name', code: 'source /opt/ros/<name-ls-printed>/setup.bash' },
          {
            label: 'If /opt/ros does not exist (after adding the ROS 2 apt repository as the install guide describes)',
            code: `sudo apt update
sudo apt install ros-jazzy-desktop    # Ubuntu 24.04; 22.04: ros-humble-desktop; 26.04: ros-lyrical-desktop`,
          },
        ],
        note:
          '`ros-<distro>-desktop` includes the tools, demos and RViz; `ros-<distro>-ros-base` is the smaller set without GUI tools. Both include the `ros2` command.',
      },
      {
        id: 'shell',
        title: 'You are in zsh (or sh), not bash',
        symptom:
          'The error reads `zsh: command not found: ros2`, or `ps -p $$` shows `zsh`.',
        why:
          '`setup.bash` is written for bash. ROS 2 ships a setup file per shell — `setup.bash`, `setup.zsh` and `setup.sh` — and you should source the one that matches the shell you are typing into.',
        check: { label: 'Check which shell you are typing into', code: 'ps -p $$ -o comm=' },
        fix: [
          {
            label: 'Fix for zsh',
            code: `source /opt/ros/jazzy/setup.zsh
echo "source /opt/ros/jazzy/setup.zsh" >> ~/.zshrc`,
          },
        ],
      },
      {
        id: 'bashrc',
        title: 'The line is in ~/.bashrc, but this shell did not read it',
        symptom: 'You added the source line, yet the error is still there.',
        why:
          'bash reads `~/.bashrc` when an interactive terminal starts, so terminals that were already open never see the new line. Login shells read `~/.bash_profile` or `~/.profile`; Ubuntu’s default `~/.profile` pulls in `~/.bashrc`, but creating a `~/.bash_profile` stops that. Commands run non-interactively — `ssh robot \'ros2 topic list\'`, cron, systemd — skip the end of Ubuntu’s `~/.bashrc` entirely, so a source line appended there never runs for them. A typo in the path prints a “No such file or directory” line at the top of every new terminal that is easy to miss.',
        check: { label: 'Check what your startup file actually says', code: 'grep -n "opt/ros" ~/.bashrc' },
        fix: [
          { label: 'Reload it in the current terminal (or open a new one)', code: 'source ~/.bashrc' },
        ],
        note:
          'Keep exactly one `/opt/ros/<distro>` line. Two distros sourced one after the other mix their paths, which produces stranger errors than this one.',
      },
      {
        id: 'docker',
        title: 'Inside Docker: `source` is not found, or the environment vanishes',
        symptom:
          '`/bin/sh: 1: source: not found` during `docker build`, or `ros2: not found` in a later `RUN` line.',
        why:
          'On Linux, Dockerfile `RUN` instructions use `/bin/sh -c` unless you say otherwise, and on Ubuntu `/bin/sh` is dash, which has no `source` command (its equivalent is `.`). Each `RUN` also starts a fresh shell, so sourcing on one line does nothing for the next.',
        fix: [
          {
            label: 'Fix in the Dockerfile',
            code: `SHELL ["/bin/bash", "-c"]
RUN source /opt/ros/jazzy/setup.bash && colcon build`,
          },
        ],
        note:
          'The official `ros` images on Docker Hub set an entrypoint, `/ros_entrypoint.sh`, that sources `/opt/ros/$ROS_DISTRO/setup.bash` before running your command — so `docker run … ros2 topic list` works, but `RUN` lines during the build are not covered by it.',
      },
      {
        id: 'no-cli',
        title: 'ROS is installed, but not the command-line tools',
        symptom:
          '`/opt/ros/<distro>` exists and is sourced, `ROS_DISTRO` is set, and `ros2` is still missing.',
        why:
          'The `ros2` command comes from the ros2cli packages. They are part of the standard `ros_core` set defined in REP 2001, and therefore of `ros-base` and `desktop`. A slim image built by installing individual packages (say, only `ros-jazzy-rclcpp`) can end up without them.',
        check: { label: 'Check', code: 'ls /opt/ros/jazzy/bin/ros2' },
        fix: [{ label: 'Fix', code: 'sudo apt install ros-jazzy-ros-base' }],
      },
    ],
    more: [
      {
        title: '`ros2` works, but your own package is “not found”',
        body: [
          '`ros2 run my_package my_node` answering `Package \'my_package\' not found` is the same problem one level up. `colcon build` writes your packages into the workspace’s `install/` folder, and the terminal only knows about them after you source that folder’s setup file.',
          'The official workspace tutorial adds one rule that saves hours: source the overlay in a new terminal, not the one you built in. Sourcing an overlay where you built, or building where an overlay is sourced, “may create complex issues”.',
        ],
        code: [
          {
            label: 'Build in one terminal, then in a NEW terminal',
            code: `source /opt/ros/jazzy/setup.bash
cd ~/ros2_ws
source install/local_setup.bash
ros2 run my_package my_node`,
          },
        ],
      },
      {
        title: '`ros2` starts, then crashes with Python import errors',
        body: [
          'That is a different problem: usually the wrong Python. The official troubleshooting guide is direct about it — mixing ROS 2 packages installed with apt and packages installed with conda does not work. If you use the apt binaries, make sure no conda paths are on your `PATH`; check `~/.bashrc` for a conda initialisation block and comment it out.',
          'If `rclpy` fails to import after an operating-system upgrade, the C extension may have been built for a different Python version; the guide says rebuilding the workspace may fix it.',
        ],
      },
    ],
    prevent: [
      'Put exactly one `source /opt/ros/<distro>/setup.bash` line in `~/.bashrc` (or `setup.zsh` in `~/.zshrc`).',
      'Install the distro that matches your Ubuntu release: Lyrical on 26.04, Jazzy on 24.04, Humble on 22.04.',
      'Build in one terminal, run in another, and source your workspace’s `install/` setup in the second one.',
      'In Dockerfiles, set `SHELL ["/bin/bash", "-c"]` and source in the same `RUN` line as the command that needs ROS.',
      'Run `ros2 doctor` once after installing: it checks your platform, version, network and environment, and warns about likely problems.',
    ],
    faq: [
      {
        q: 'Do I have to source setup.bash every time I open a terminal?',
        a: 'Yes, every new shell needs it — unless the source line is in your shell startup file (`~/.bashrc` for bash, `~/.zshrc` for zsh), which runs it for you.',
      },
      {
        q: 'What is the difference between setup.bash and local_setup.bash?',
        a: '`local_setup.bash` adds only the packages in that workspace. `setup.bash` adds the workspace and the underlay it was built on top of. Sourcing `/opt/ros/jazzy/setup.bash` and then your workspace’s `local_setup.bash` gives the same result as sourcing your workspace’s `setup.bash` alone.',
      },
      {
        q: 'Which ROS 2 distro should I install?',
        a: 'The long-term-support release built for your operating system. On Ubuntu 26.04 that is Lyrical Luth (supported until May 2031); on Ubuntu 24.04, Jazzy Jalisco (until May 2029); on Ubuntu 22.04, Humble Hawksbill (until May 2027). Kilted Kaiju is a short-support release that ends in December 2026, so it is a poor choice for a new setup. The official distributions page has the current list.',
      },
      {
        q: 'Does the same fix work on WSL2?',
        a: 'Yes. Ubuntu under WSL2 uses the same packages, the same `/opt/ros/<distro>` path and the same `~/.bashrc`, so the checks on this page apply unchanged.',
      },
    ],
    verifiedOn: 'Humble and Jazzy documentation; ros2cli source (Jazzy)',
    related: [
      { href: '/ros2/fix/nodes-cannot-see-each-other', label: 'Next problem: nodes cannot see each other' },
      { href: '/learn/ros2-cheatsheet', label: 'ROS 2 command cheatsheet' },
      { href: '/atlas/concept/ros2', label: 'What ROS 2 is, from the beginning' },
      { href: '/atlas/concept/colcon', label: 'colcon: how ROS 2 workspaces build' },
      { href: '/ros2', label: 'Try ROS 2 in your browser (no install)' },
    ],
    sources: [
      { name: 'ROS 2 docs — Configuring environment (Jazzy)', url: 'https://docs.ros.org/en/jazzy/Tutorials/Beginner-CLI-Tools/Configuring-ROS2-Environment.html' },
      { name: 'ROS 2 docs — Ubuntu (deb packages) install, Jazzy: Ubuntu 24.04', url: 'https://docs.ros.org/en/jazzy/Installation/Ubuntu-Install-Debs.html' },
      { name: 'ROS 2 docs — Ubuntu (deb packages) install, Humble: Ubuntu 22.04', url: 'https://docs.ros.org/en/humble/Installation/Ubuntu-Install-Debs.html' },
      { name: 'ROS 2 docs — Creating a workspace (overlay sourcing)', url: 'https://docs.ros.org/en/jazzy/Tutorials/Beginner-Client-Libraries/Creating-A-Workspace/Creating-A-Workspace.html' },
      { name: 'ROS 2 docs — Installation troubleshooting', url: 'https://docs.ros.org/en/jazzy/How-To-Guides/Installation-Troubleshooting.html' },
      { name: 'ROS 2 docs — Distributions (release and end-of-life dates)', url: 'https://docs.ros.org/en/rolling/Releases.html' },
      { name: 'ROS 2 docs — Lyrical Luth supported platforms (Ubuntu 26.04)', url: 'https://docs.ros.org/en/rolling/Releases/lyrical/supported-platforms.html' },
      { name: 'REP 2001 — ROS 2 variants (ros_core includes the ros2 CLI)', url: 'https://reps.openrobotics.org/rep-2001/' },
      { name: 'Docker docs — Dockerfile SHELL instruction', url: 'https://docs.docker.com/reference/dockerfile/#shell' },
      { name: 'Official ros Docker image — ros_entrypoint.sh (Jazzy)', url: 'https://github.com/osrf/docker_images/blob/master/ros/jazzy/ubuntu/noble/ros-core/ros_entrypoint.sh' },
    ],
    updated: '2026-11-24',
  },
  {
    slug: 'nodes-cannot-see-each-other',
    title: 'ROS 2 nodes can’t see each other',
    seoTitle: 'ROS 2 Nodes Not Communicating? 7 Causes and Fixes',
    description:
      'ros2 topic list is empty or the listener hears nothing? Check ROS_DOMAIN_ID, discovery range, multicast, the daemon, RMW and QoS, with a command for each.',
    errorText: '$ ros2 topic list\n/parameter_events\n/rosout\n\n# …but /chatter, published from the other terminal or machine, is missing',
    lede:
      'A talker is running, a listener is running, and nothing arrives. ROS 2 has no central master to ask, so when nodes do not find each other the cause is in discovery — and discovery has seven usual suspects.',
    shortAnswer:
      'Nodes only talk when they share a `ROS_DOMAIN_ID`, are allowed to discover each other (`ROS_LOCALHOST_ONLY`, and since Iron `ROS_AUTOMATIC_DISCOVERY_RANGE`), can exchange multicast, use the same middleware, and have compatible QoS. Check those in that order: `printenv | grep -E \'ROS|RMW\'`, then `ros2 multicast receive` / `send`, then `ros2 topic info -v`.',
    quickFix: {
      label: 'The 60-second diagnosis — compare both sides (receive first, then send from the other side)',
      code: `printenv | grep -E 'ROS_DOMAIN_ID|ROS_AUTOMATIC_DISCOVERY_RANGE|ROS_LOCALHOST_ONLY|ROS_STATIC_PEERS|RMW_IMPLEMENTATION'
ros2 daemon stop                 # clear a stale cache, then list again
ros2 topic list
ros2 multicast receive           # on one side…
ros2 multicast send              # …and this on the other`,
    },
    explainer: [
      'ROS 1 had a master: every node registered with `roscore`, and a node that could not reach it complained loudly. ROS 2 dropped the master. Each node announces itself on the network and listens for the announcements of others, and that conversation is handled by the middleware underneath — DDS by default, Fast DDS unless you chose another.',
      'The official description of discovery has three steps: a node advertises its presence to other nodes with the same ROS domain; nodes keep re-advertising so latecomers find them; and nodes announce when they leave. It adds one more condition that catches people out: nodes only connect if their Quality of Service settings are compatible.',
      'So “my nodes can’t see each other” means one of those steps is failing: the announcement is on a different domain, is not allowed to leave the machine, never crosses the network, is being read by a different middleware — or the nodes did meet and then refused each other’s QoS.',
    ],
    causes: [
      {
        id: 'domain-id',
        title: 'Different ROS_DOMAIN_ID values',
        symptom:
          'Nothing at all is shared: each side lists only its own topics. Often one terminal has an `export ROS_DOMAIN_ID=…` from `~/.bashrc` and the other was opened differently.',
        why:
          'The domain ID is DDS’s way of letting separate groups share one physical network: nodes on the same domain discover each other freely; nodes on different domains cannot. Every node uses domain 0 unless `ROS_DOMAIN_ID` says otherwise.',
        check: { label: 'Check on each side', code: 'echo "domain=${ROS_DOMAIN_ID:-0 (default)}"' },
        fix: [
          {
            label: 'Fix: same number everywhere (put it in ~/.bashrc on every machine)',
            code: `export ROS_DOMAIN_ID=7
echo "export ROS_DOMAIN_ID=7" >> ~/.bashrc`,
          },
        ],
        note:
          'Pick a domain ID between 0 and 101 inclusive. The domain ID is used to compute the UDP ports DDS listens on, so on Linux IDs 102–214 can collide with the operating system’s ephemeral ports (32768–60999 by default); 232 is the highest valid ID.',
      },
      {
        id: 'discovery-range',
        title: 'Discovery is limited to this machine (or switched off)',
        symptom:
          'Two terminals on the same computer work, but a second computer sees nothing — or, with `OFF`, even two terminals on one computer do not see each other.',
        why:
          'Since Iron, `ROS_AUTOMATIC_DISCOVERY_RANGE` controls how far nodes look: `SUBNET` (the default: anything reachable by multicast), `LOCALHOST` (this machine only), `OFF` (no automatic discovery at all) or `SYSTEM_DEFAULT` (leave the middleware’s own settings alone). Classroom and lab setups often set `LOCALHOST` in `~/.bashrc` so robots do not interfere, and then forget it is there. The older switch, `ROS_LOCALHOST_ONLY=1`, is the only one on Humble. Iron deprecated it, but on Jazzy it is still honoured — and while it is set to 1 it overrides `ROS_AUTOMATIC_DISCOVERY_RANGE` and `ROS_STATIC_PEERS`, so a leftover line in `~/.bashrc` silently cancels the fixes below. It is gone from Kilted onward.',
        check: { label: 'Check', code: `printenv | grep -E 'ROS_AUTOMATIC_DISCOVERY_RANGE|ROS_LOCALHOST_ONLY|ROS_STATIC_PEERS'` },
        fix: [
          {
            label: 'Fix (Jazzy and later): clear the old switch, then allow the subnet',
            code: `unset ROS_LOCALHOST_ONLY            # and delete it from ~/.bashrc
export ROS_AUTOMATIC_DISCOVERY_RANGE=SUBNET   # SUBNET is also the default
ros2 daemon stop                    # the daemon keeps the old settings`,
          },
          {
            label: 'Or keep LOCALHOST and add specific machines as static peers',
            code: `export ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST
export ROS_STATIC_PEERS='192.168.1.20;192.168.1.21'`,
          },
          { label: 'Fix (Humble)', code: `unset ROS_LOCALHOST_ONLY            # and delete it from ~/.bashrc
ros2 daemon stop` },
        ],
        note:
          'Static peers work as long as the other side’s range is not `OFF`. They are also the way through networks that block multicast (next cause). Humble has no `ROS_STATIC_PEERS`.',
      },
      {
        id: 'multicast',
        title: 'Multicast is blocked between the machines',
        symptom:
          'Same domain, discovery range is `SUBNET`, still nothing across machines. Common on guest Wi-Fi with client isolation, some corporate networks, many cloud networks and machines running a firewall.',
        why:
          'DDS discovery relies on UDP multicast, and the official troubleshooting guide says it plainly: the network interface in use has to be multicast-enabled, and that is not always the default — it has even been missing on the loopback adapter on Ubuntu and macOS. ROS 2 ships a tool that tests exactly this.',
        check: {
          label: 'Check: run receive on machine A, send on machine B',
          code: `ros2 multicast receive     # machine A
ros2 multicast send        # machine B
# success on A looks like: Received from 192.168.1.21:43751: 'Hello World!'`,
        },
        fix: [
          {
            label: 'Fix a ufw firewall (from the official troubleshooting guide)',
            code: `sudo ufw allow in proto udp to 224.0.0.0/4
sudo ufw allow in proto udp from 224.0.0.0/4`,
          },
          { label: 'Check the interface has the MULTICAST flag', code: 'ip link show   # look for MULTICAST in the <…> flags' },
        ],
        note:
          'If the network itself will not pass multicast and you cannot change it, use `ROS_STATIC_PEERS` (Iron and later) with the other machine’s IP address, so discovery goes point to point instead. On Humble, the Fast DDS discovery server (`ROS_DISCOVERY_SERVER`) does the same job without multicast.',
      },
      {
        id: 'daemon',
        title: 'A stale ros2 daemon is answering your command-line queries',
        symptom:
          '`ros2 topic list` or `ros2 node list` shows nodes that have stopped, misses ones you just started, or disagrees with what the nodes themselves are doing.',
        why:
          'To answer quickly, the `ros2` command-line tools ask a background daemon that keeps a picture of the ROS graph. It starts automatically the first time you run `ros2 node list` or `ros2 topic list` and listens on localhost on a port offset by `ROS_DOMAIN_ID`, so each domain has its own daemon. It keeps the middleware and discovery settings of the terminal that started it: after you change `RMW_IMPLEMENTATION`, `ROS_AUTOMATIC_DISCOVERY_RANGE` or `ROS_LOCALHOST_ONLY`, it can go on answering with the old view.',
        fix: [
          {
            label: 'Fix: stop it; the next command starts a fresh one',
            code: `ros2 daemon stop
ros2 topic list`,
          },
          { label: 'Or bypass the daemon for one query', code: 'ros2 topic list --no-daemon' },
        ],
        note:
          'This only affects what the CLI shows you. If nodes themselves are not exchanging data, keep going down this list.',
      },
      {
        id: 'rmw',
        title: 'The two sides use different middleware or different ROS 2 versions',
        symptom:
          'One machine runs Jazzy and the other Humble, or one terminal has `RMW_IMPLEMENTATION=rmw_cyclonedds_cpp` and the other uses the default. Discovery works partly or not at all.',
        why:
          'ROS 2 can run on several middleware implementations (Fast DDS is the default, Cyclone DDS and Connext are alternatives). The official guidance on cross-vendor communication: different implementations may be compatible in limited circumstances, but this is not guaranteed, so every part of a system should use the same ROS version and the same RMW implementation.',
        check: {
          label: 'Check on each side',
          code: `echo "rmw=${'$'}{RMW_IMPLEMENTATION:-default (Fast DDS)} distro=$ROS_DISTRO"
ros2 doctor --report | grep -A4 "RMW MIDDLEWARE"`,
        },
        fix: [
          { label: 'Fix: set the same implementation everywhere (example)', code: 'export RMW_IMPLEMENTATION=rmw_fastrtps_cpp\nros2 daemon stop' },
        ],
      },
      {
        id: 'zenoh',
        title: 'You switched to rmw_zenoh and there is no router running',
        symptom:
          '`RMW_IMPLEMENTATION=rmw_zenoh_cpp` is set and nodes that should talk do not, even on one machine.',
        why:
          'Zenoh is a non-DDS middleware with its own discovery. By default its nodes do not use multicast discovery: they learn about each other through a Zenoh router. Without the router, according to the rmw_zenoh documentation, nodes will not discover each other. The ROS discovery variables (`ROS_AUTOMATIC_DISCOVERY_RANGE`, `ROS_STATIC_PEERS`) are not supported by rmw_zenoh either.',
        fix: [
          {
            label: 'Fix: start the router in its own terminal first',
            code: `ros2 daemon stop                    # it may still be running another RMW
export RMW_IMPLEMENTATION=rmw_zenoh_cpp
ros2 run rmw_zenoh_cpp rmw_zenohd`,
          },
        ],
        note:
          'Across machines, each side’s Zenoh session or router has to be told where the other router is; the rmw_zenoh README shows how with `ZENOH_CONFIG_OVERRIDE`.',
      },
      {
        id: 'qos',
        title: 'They found each other, but the QoS is incompatible',
        symptom:
          'The topic appears in `ros2 topic list`, both nodes are in `ros2 node list`, and the subscriber still receives nothing. A C++ subscriber logs `New publisher discovered on topic \'/scan\', offering incompatible QoS. No messages will be sent to it. Last incompatible policy: RELIABILITY_QOS_POLICY`; a Python one says “No messages will be received from it”.',
        why:
          'ROS 2 matches a publisher and a subscription only if the subscription asks for nothing stricter than the publisher offers. The classic case: sensor drivers publish with the sensor-data profile, which is best effort, and a subscriber asks for reliable. Best-effort publisher plus reliable subscriber is incompatible, so no connection is made. The same applies to durability: a transient-local subscriber cannot connect to a volatile publisher.',
        check: { label: 'Check: compare the publisher and subscription QoS', code: 'ros2 topic info /scan --verbose' },
        fix: [
          {
            label: 'Fix in the subscriber (Python): match the publisher',
            code: `from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import LaserScan

self.create_subscription(LaserScan, '/scan', self.on_scan, qos_profile_sensor_data)`,
          },
          {
            label: 'Fix in the subscriber (C++)',
            code: `sub_ = create_subscription<sensor_msgs::msg::LaserScan>(
  "/scan", rclcpp::SensorDataQoS(), cb);`,
          },
        ],
        note:
          '`ros2 topic echo` already adapts: unless every publisher offers reliable, it subscribes best effort, and it matches durability the same way, so “echo works but my node doesn’t” is a strong hint that QoS is the cause. You can force it with `--qos-reliability best_effort`.',
      },
    ],
    more: [
      {
        title: 'A quick test that rules out your own code',
        body: [
          'Before debugging your nodes, prove the plumbing with the demo pair from the official install check (it needs `ros-<distro>-desktop`, or the `demo-nodes-cpp` and `demo-nodes-py` packages). If these two do not talk, the problem is the environment or the network; if they do, it is in your nodes or their QoS.',
        ],
        code: [
          {
            label: 'Terminal (or machine) A, then B',
            code: `ros2 run demo_nodes_cpp talker
ros2 run demo_nodes_py listener   # should print: I heard: [Hello World: 1] …`,
          },
        ],
      },
      {
        title: 'Let ros2 doctor look for you',
        body: [
          '`ros2 doctor` checks platform, version, network, environment and running systems, and warns about likely problems. `ros2 doctor --report` prints everything, including the network interfaces and the RMW in use — the part worth pasting when you ask for help.',
        ],
      },
    ],
    prevent: [
      'Decide one `ROS_DOMAIN_ID` per robot or team and set it in `~/.bashrc` on every machine involved.',
      'Write discovery settings down next to the robot (domain, range, static peers) rather than only in someone’s `~/.bashrc`.',
      'Keep every machine on the same ROS 2 distro and the same RMW implementation.',
      'On networks you do not control, plan on `ROS_STATIC_PEERS` (or a discovery server on Humble) from the start.',
      'When a topic is silent, run `ros2 topic info <topic> --verbose` before touching code: it shows each endpoint’s QoS.',
    ],
    faq: [
      {
        q: 'Why does ros2 topic list show only /parameter_events and /rosout?',
        a: 'Every node creates those two topics by default, including the CLI’s own. Seeing only them means your terminal is not discovering the node that publishes the topic you want — usually a different domain ID, a restricted discovery range, or blocked multicast. If the list looks stale instead, run `ros2 daemon stop` and try again.',
      },
      {
        q: 'Is ROS_LOCALHOST_ONLY still used?',
        a: 'On Humble it is the only switch. Iron introduced `ROS_AUTOMATIC_DISCOVERY_RANGE` and `ROS_STATIC_PEERS` and deprecated it; on Jazzy it still works, prints a deprecation warning, and overrides the new variables while it is set to 1. It was removed in Kilted. On Jazzy and later, use `ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST` instead.',
      },
      {
        q: 'Can a Humble machine talk to a Jazzy machine?',
        a: 'Sometimes, for simple messages, but it is not guaranteed and not supported: the ROS 2 documentation advises using the same ROS version and the same middleware across a system. Mixed fleets are a common source of “some topics work, some don’t”.',
      },
      {
        q: 'Does ROS 2 work over Wi-Fi?',
        a: 'Yes, as long as the network passes multicast, or you use static peers (a discovery server on Humble). Test with `ros2 multicast receive` and `ros2 multicast send` before blaming your nodes.',
      },
    ],
    verifiedOn: 'Humble and Jazzy documentation; rcl, rclcpp, rclpy, rmw and ros2cli source (Jazzy); rmw_zenoh README',
    related: [
      { href: '/ros2/fix/ros2-command-not-found', label: 'Earlier problem: “ros2: command not found”' },
      { href: '/atlas/concept/dds-middleware', label: 'DDS: the middleware under ROS 2' },
      { href: '/atlas/concept/quality-of-service', label: 'Quality of Service (QoS) explained' },
      { href: '/atlas/concept/ros2-topics', label: 'ROS 2 topics' },
      { href: '/learn/ros2-cheatsheet', label: 'ROS 2 command cheatsheet' },
    ],
    sources: [
      { name: 'ROS 2 docs — Discovery', url: 'https://docs.ros.org/en/jazzy/Concepts/Basic/About-Discovery.html' },
      { name: 'ROS 2 docs — The ROS_DOMAIN_ID', url: 'https://docs.ros.org/en/jazzy/Concepts/Intermediate/About-Domain-ID.html' },
      { name: 'ROS 2 docs — Improved Dynamic Discovery', url: 'https://docs.ros.org/en/jazzy/Tutorials/Advanced/Improved-Dynamic-Discovery.html' },
      { name: 'ROS 2 docs — Iron release notes (ROS_LOCALHOST_ONLY deprecated)', url: 'https://docs.ros.org/en/jazzy/Releases/Release-Iron-Irwini.html' },
      { name: 'ROS 2 docs — Installation troubleshooting (multicast, firewall)', url: 'https://docs.ros.org/en/jazzy/How-To-Guides/Installation-Troubleshooting.html' },
      { name: 'ROS 2 docs — Command line tools and the ROS 2 daemon', url: 'https://docs.ros.org/en/jazzy/Concepts/Basic/About-Command-Line-Tools.html' },
      { name: 'ROS 2 docs — Different middleware vendors (cross-vendor communication)', url: 'https://docs.ros.org/en/jazzy/Concepts/Intermediate/About-Different-Middleware-Vendors.html' },
      { name: 'ROS 2 docs — Quality of Service settings (compatibility tables)', url: 'https://docs.ros.org/en/jazzy/Concepts/Intermediate/About-Quality-of-Service-Settings.html' },
      { name: 'ROS 2 docs — Using ros2doctor', url: 'https://docs.ros.org/en/jazzy/Tutorials/Beginner-Client-Libraries/Getting-Started-With-Ros2doctor.html' },
      { name: 'ROS 2 docs — Fast DDS discovery server (Humble)', url: 'https://docs.ros.org/en/humble/Tutorials/Advanced/Discovery-Server/Discovery-Server.html' },
      { name: 'rcl source — ROS_LOCALHOST_ONLY still honoured on Jazzy and overriding the new variables', url: 'https://github.com/ros2/rcl/blob/jazzy/rcl/src/rcl/init.c' },
      { name: 'rmw_zenoh README — the Zenoh router', url: 'https://github.com/ros2/rmw_zenoh#start-the-zenoh-router' },
      { name: 'rclcpp source — the incompatible-QoS warning (Jazzy)', url: 'https://github.com/ros2/rclcpp/blob/jazzy/rclcpp/src/rclcpp/subscription_base.cpp' },
      { name: 'rclpy source — the incompatible-QoS warning (Jazzy)', url: 'https://github.com/ros2/rclpy/blob/jazzy/rclpy/rclpy/event_handler.py' },
    ],
    updated: '2026-11-24',
  },
]

export function getRos2Fix(slug: string): Ros2Fix | undefined {
  return ROS2_FIXES.find((f) => f.slug === slug)
}
