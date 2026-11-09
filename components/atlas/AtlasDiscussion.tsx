'use client';

import { useEffect, useState } from 'react';
import { LabThread } from '@/components/lab/LabThread';

/**
 * The community thread on an Atlas entry, shown only once it has something
 * to show. The thread used to be server-rendered on every entry as
 * "Community discussion — 0 questions & insights … Loading discussion…", an
 * empty state printed into the HTML of 500+ pages. Now nothing is rendered
 * until the client has confirmed at least one post exists.
 */
export function AtlasDiscussion({ contentSlug }: { contentSlug: string }) {
  const [hasPosts, setHasPosts] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sp = new URLSearchParams({
      content_type: 'atlas',
      content_slug: contentSlug,
      page: '0',
      limit: '1',
    });
    fetch(`/api/lab/posts?${sp.toString()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { total?: number; posts?: unknown[] } | null) => {
        if (cancelled || !data) return;
        const total = typeof data.total === 'number' ? data.total : (data.posts?.length ?? 0);
        setHasPosts(total > 0);
      })
      .catch(() => {
        /* no thread shown */
      });
    return () => {
      cancelled = true;
    };
  }, [contentSlug]);

  if (!hasPosts) return null;
  return <LabThread contentType="atlas" contentSlug={contentSlug} />;
}
