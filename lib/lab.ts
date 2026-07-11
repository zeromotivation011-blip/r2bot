import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Build the display name we'll persist on a lab post/reply. We snapshot it
 * at insert time so the public feed can read it without violating the
 * "Read own profile" RLS on the profiles table.
 *
 *   "Ravi Bohra"           → "Ravi B."
 *   "Ravi"                 → "Ravi"
 *   no display_name        → email prefix, e.g. "asha.patel@example.com" → "Asha.patel"
 */
export async function deriveAuthorDisplay(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined,
): Promise<string> {
  let displayName: string | null = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle();
    displayName = (data?.display_name as string | null) ?? null;
  } catch {
    /* RLS or transient — fall through to email */
  }
  if (displayName && displayName.trim()) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
  }
  if (email) {
    const local = email.split('@')[0] ?? '';
    if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return 'Anonymous';
}

export type LabContentType = 'atlas' | 'academy' | 'pulse' | 'general';

export function isContentType(s: unknown): s is LabContentType {
  return s === 'atlas' || s === 'academy' || s === 'pulse' || s === 'general';
}
