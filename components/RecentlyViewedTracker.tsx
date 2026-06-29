'use client';

import { useEffect } from 'react';

const KEY = 'r2bot_recent';
const MAX = 5;

export type RecentItem = { type: string; slug: string; title: string };

export function recordRecent(item: RecentItem) {
  try {
    const raw = localStorage.getItem(KEY);
    const list: RecentItem[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((r) => !(r.type === item.type && r.slug === item.slug));
    filtered.unshift(item);
    localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX)));
  } catch {
    /* localStorage blocked */
  }
}

export function readRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    return [];
  }
}

export function RecentlyViewedTracker({ type, slug, title }: RecentItem) {
  useEffect(() => {
    recordRecent({ type, slug, title });
  }, [type, slug, title]);
  return null;
}
