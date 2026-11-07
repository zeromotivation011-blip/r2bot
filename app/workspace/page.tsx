import type { Metadata } from 'next';
import { WorkspaceIDEClient } from '@/components/WorkspaceIDEClient';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export const metadata: Metadata = {
  title: 'Workspace: Simulated ROS2 Code Editor in Your Browser',
  description: 'Write ROS2-style Python code in a full IDE and watch a simulated TurtleBot3 respond — Monaco editor, xterm terminal, all in your browser.',
  alternates: { canonical: `${BASE_URL}/workspace` },
};

export default function WorkspacePage() {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>Workspace: write ROS2-style Python and watch a simulated robot respond</h1>
      <WorkspaceIDEClient />
    </>
  );
}
