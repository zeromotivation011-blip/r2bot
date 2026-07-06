import type { Metadata } from 'next';
import { WorkspaceIDEClient } from '@/components/WorkspaceIDEClient';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.r2bot.in';

export const metadata: Metadata = {
  title: 'R2BOT Workspace — Simulated ROS2 IDE',
  description: 'Write ROS2-style Python code in a full IDE and watch a simulated TurtleBot3 respond — Monaco editor, xterm terminal, all in your browser.',
  alternates: { canonical: `${BASE_URL}/workspace` },
};

export default function WorkspacePage() {
  return <WorkspaceIDEClient />;
}
