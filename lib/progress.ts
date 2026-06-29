// Shared server-side reads for the per-content-item progress table.
// All functions short-circuit to safe defaults when unauthenticated.

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ProgressRow = {
  content_type: 'atlas' | 'academy';
  content_slug: string;
  understood: boolean;
  completed: boolean;
  last_visited_at: string;
};

export type StreakRow = { streak_count: number; last_active_date: string | null };

export async function getStreak(): Promise<StreakRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('streak_count, last_active_date')
    .eq('id', user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    streak_count: (data.streak_count as number) ?? 0,
    last_active_date: (data.last_active_date as string | null) ?? null,
  };
}

/** Counts of understood/completed rows for the current user. Zero if not logged in. */
export async function getProgressCounts(): Promise<{
  understoodAtlas: number;
  completedLessons: number;
}> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { understoodAtlas: 0, completedLessons: 0 };
  const [u, c] = await Promise.all([
    supabase
      .from('user_progress')
      .select('content_slug', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('content_type', 'atlas')
      .eq('understood', true),
    supabase
      .from('user_progress')
      .select('content_slug', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('content_type', 'academy')
      .eq('completed', true),
  ]);
  return {
    understoodAtlas: u.count ?? 0,
    completedLessons: c.count ?? 0,
  };
}

/** Set of completed academy slugs (e.g. "spark/01") for checkmark rendering. */
export async function getCompletedAcademy(): Promise<Set<string>> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();
  const { data } = await supabase
    .from('user_progress')
    .select('content_slug')
    .eq('user_id', user.id)
    .eq('content_type', 'academy')
    .eq('completed', true);
  return new Set((data ?? []).map((r) => r.content_slug as string));
}
