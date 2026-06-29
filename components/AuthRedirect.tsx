'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function AuthRedirect() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!cancelled && user) router.replace('/dashboard');
      } catch {
        /* fail open — landing renders as normal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);
  return null;
}

export default AuthRedirect;
