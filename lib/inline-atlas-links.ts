/**
 * Wrap the first occurrence of each known Atlas term in a string with a
 * markdown link to the matching Atlas entry. Used to turn R2 Co-pilot's
 * plain-text responses into navigable, cited prose.
 *
 *   inlineAtlasLinks("LIDAR is a time-of-flight sensor.", { LIDAR: "/atlas/concept/lidar" })
 *   // → "[LIDAR](/atlas/concept/lidar) is a time-of-flight sensor."
 *
 * Rules:
 *   - Case-insensitive match, but the link preserves the casing in the source text.
 *   - Only the FIRST occurrence of each term is linked, to avoid noise.
 *   - Skips matches inside fenced/inline code, existing markdown links,
 *     URLs, and image refs.
 *   - Longer terms take priority over shorter overlapping ones
 *     (so "Boston Dynamics" beats "Boston").
 */

export type TermMap = Record<string, string>;

const SKIP_PATTERN =
  /(```[\s\S]*?```|`[^`]*`|\[[^\]]*\]\([^)]*\)|!\[[^\]]*\]\([^)]*\)|https?:\/\/\S+)/g;

const WORD_BOUNDARY_LEFT = /[A-Za-z0-9_]/;

export function inlineAtlasLinks(text: string, terms: TermMap): string {
  if (!text || !terms) return text;
  const termEntries = Object.entries(terms);
  if (termEntries.length === 0) return text;

  // Longest first so multi-word terms win over their substrings.
  termEntries.sort((a, b) => b[0].length - a[0].length);

  // Split into segments. Skip segments alternate (they're code/links and untouchable).
  const segments: { text: string; skip: boolean }[] = [];
  let cursor = 0;
  for (const m of text.matchAll(SKIP_PATTERN)) {
    const start = m.index ?? 0;
    if (start > cursor) segments.push({ text: text.slice(cursor, start), skip: false });
    segments.push({ text: m[0], skip: true });
    cursor = start + m[0].length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), skip: false });

  const used = new Set<string>();

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.skip) continue;
    let working = seg.text;
    for (const [term, href] of termEntries) {
      const key = term.toLowerCase();
      if (used.has(key)) continue;
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|[^A-Za-z0-9_])(${escaped})(?![A-Za-z0-9_])`, 'i');
      const match = working.match(re);
      if (!match || match.index === undefined) continue;

      // Don't link inside an already-bracketed link label like [foo bar].
      // Quick check: count unmatched `[` before this position.
      const before = working.slice(0, match.index);
      const openBrackets = (before.match(/\[/g) || []).length;
      const closeBrackets = (before.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) continue;

      const matchedTerm = match[2];
      const prefix = match[1];
      const startIdx = match.index + prefix.length;
      const endIdx = startIdx + matchedTerm.length;
      // Guard against linking when the term is glued to a word char to the left
      // that the regex prefix didn't catch (e.g. start of string).
      const leftChar = startIdx === 0 ? '' : working[startIdx - 1];
      if (leftChar && WORD_BOUNDARY_LEFT.test(leftChar)) continue;

      working =
        working.slice(0, startIdx) +
        `[${matchedTerm}](${href})` +
        working.slice(endIdx);
      used.add(key);
    }
    segments[i] = { text: working, skip: false };
  }

  return segments.map((s) => s.text).join('');
}
