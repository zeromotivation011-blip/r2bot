/** Plain text length → read-time string. ~200 wpm is the standard rule. */
export function readTime(text: string): { minutes: number; words: number; label: string } {
  const words = (text.trim().match(/\S+/g) ?? []).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return { minutes, words, label: `${minutes} min read` };
}

/** Strip markdown for accurate word counts (good enough — not a full MDX parser). */
export function plainTextFromMd(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~#>-]/g, ' ')
    .replace(/\s+/g, ' ');
}
