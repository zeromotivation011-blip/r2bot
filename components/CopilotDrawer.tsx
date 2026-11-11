'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useCopilot } from './CopilotProvider';

// The drawer itself (react-markdown, remark-gfm, the Supabase client, the
// streaming chat) is ~200 KB of JavaScript that 45 routes used to ship on
// first load even though almost nobody opens it. It is now downloaded the
// first time the drawer opens and stays mounted afterwards.
const Impl = dynamic(() => import('./CopilotDrawerImpl'), { ssr: false });

export function CopilotDrawer() {
  const { open } = useCopilot();
  const [everOpened, setEverOpened] = useState(false);
  useEffect(() => { if (open) setEverOpened(true); }, [open]);
  if (!everOpened) return null;
  return <Impl />;
}
