import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Single round-trip streak update.
 *  - same day as last_active_date → no-op, return current streak
 *  - yesterday → increment, return new streak
 *  - older or null → reset to 1
 * Returns the streak_count after the update, or 0 on any error.
 */
export async function updateStreak(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(today.getUTCDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const { data: profile, error: readErr } = await supabase
    .from('profiles')
    .select('streak_count, last_active_date')
    .eq('id', userId)
    .maybeSingle();
  if (readErr || !profile) return 0;

  const prevDate = (profile.last_active_date as string | null) ?? null;
  const prevCount = (profile.streak_count as number | null) ?? 0;

  if (prevDate === todayStr) return Math.max(prevCount, 1);

  // Compute yesterday relative to UTC today.
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yYy = yesterday.getUTCFullYear();
  const yMm = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
  const yDd = String(yesterday.getUTCDate()).padStart(2, '0');
  const yesterdayStr = `${yYy}-${yMm}-${yDd}`;

  const nextCount = prevDate === yesterdayStr ? prevCount + 1 : 1;

  const { error: writeErr } = await supabase
    .from('profiles')
    .update({ streak_count: nextCount, last_active_date: todayStr })
    .eq('id', userId);
  if (writeErr) return prevCount;

  return nextCount;
}
