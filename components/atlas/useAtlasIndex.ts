'use client';

import { useEffect, useState } from 'react';

/** One row of /api/atlas/index — the light Atlas index shared by client features. */
export type AtlasIndexItem = {
  slug: string;
  type: string;
  title: string;
  summary: string;
  bucket?: string;
};

let cached: AtlasIndexItem[] | null = null;
let inflight: Promise<AtlasIndexItem[]> | null = null;

/**
 * Fetch the Atlas index once per page load and share it between every
 * component that asks. Resolves to [] on a network error so callers degrade
 * to "no suggestions" rather than throwing.
 */
export function loadAtlasIndex(): Promise<AtlasIndexItem[]> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch('/api/atlas/index')
      .then((r) => (r.ok ? (r.json() as Promise<AtlasIndexItem[]>) : []))
      .then((items) => {
        cached = Array.isArray(items) ? items : [];
        return cached;
      })
      .catch(() => {
        inflight = null;
        return [] as AtlasIndexItem[];
      });
  }
  return inflight;
}

/** Load the index when `enabled` flips true (e.g. on first interaction). */
export function useAtlasIndex(enabled: boolean): { items: AtlasIndexItem[] | null; loading: boolean } {
  const [items, setItems] = useState<AtlasIndexItem[] | null>(cached);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled || items) return;
    let alive = true;
    setLoading(true);
    loadAtlasIndex().then((list) => {
      if (!alive) return;
      setItems(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [enabled, items]);
  return { items, loading };
}
