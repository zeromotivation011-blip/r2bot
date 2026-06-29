/**
 * Atlas auto-linker.
 *
 * Scans every MDX file under content/atlas/ and turns the FIRST mention of
 * each other Atlas term in the body into a markdown link to that term's
 * canonical /atlas/<type>/<slug> URL.
 *
 * Rules:
 *  - Only the body is touched. The YAML frontmatter is preserved byte-for-byte.
 *  - Only the first mention per file is linked (the rest are left as plain text).
 *  - Case-insensitive matching, but the original capitalisation in the body
 *    is preserved.
 *  - A term never links to itself.
 *  - Existing markdown links, fenced code blocks, and inline code spans are
 *    skipped (we don't link inside `code` or [already linked](...) text).
 *  - Aliases per entry come from the title (no parenthetical extraction —
 *    that produces false matches like "Redundancy (robotics)" → robotics).
 *
 * Re-runs are idempotent: as the first step on every body, the script strips
 * any existing `[text](/atlas/...)` links and re-derives them. So you can
 * safely run this whenever new Atlas entries are added.
 *
 *   npm run link:atlas
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

type Entry = {
  type: string;
  slug: string;
  title: string;
  url: string;
  filePath: string;
  raw: string;
  fmRaw: string;
  body: string;
};

const ROOT = path.join(process.cwd(), 'content', 'atlas');

function walk(): Entry[] {
  const out: Entry[] = [];
  if (!fs.existsSync(ROOT)) return out;
  for (const type of fs.readdirSync(ROOT)) {
    const dir = path.join(ROOT, type);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue;
      const slug = file.replace(/\.(mdx|md)$/, '');
      const filePath = path.join(dir, file);
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = matter(raw);
      const fmEnd = raw.indexOf('---', 4);
      const fmRaw = fmEnd !== -1 ? raw.slice(0, fmEnd + 3) : '';
      const body = fmEnd !== -1 ? raw.slice(fmEnd + 3) : raw;
      const title = String((parsed.data as Record<string, unknown>).title ?? slug);
      out.push({
        type,
        slug,
        title,
        url: `/atlas/${type}/${slug}`,
        filePath,
        raw,
        fmRaw,
        body,
      });
    }
  }
  return out;
}

/** Generate the search aliases for an entry. */
function aliasesFor(entry: Entry): string[] {
  const set = new Set<string>();
  const add = (s: string) => {
    const trimmed = s.trim();
    if (trimmed.length >= 3) set.add(trimmed);
  };
  // The title — but with any parenthetical removed (so "Cobot (collaborative robot)" → "Cobot").
  const titleClean = entry.title.replace(/\s*\([^)]*\)/g, '').trim();
  if (titleClean) add(titleClean);
  // slug with spaces (e.g. "sense-think-act-loop" → "sense think act loop")
  add(entry.slug.replace(/-/g, ' '));
  // common variants with non-standard casing
  const lower = titleClean.toLowerCase();
  if (lower === 'lidar') add('LiDAR');
  if (lower === 'imu') add('IMU');
  if (lower === 'pid') add('PID');
  if (lower === 'ros') add('ROS');
  if (lower === 'slam') add('SLAM');
  if (lower === 'pwm') add('PWM');
  if (lower === 'fpga') add('FPGA');
  if (lower === 'pcb') add('PCB');
  if (lower === 'gps / gnss') {
    add('GPS');
    add('GNSS');
  }
  return [...set];
}

/**
 * Build the master list of {alias, entry} pairs.
 *
 * Sorted by alias length descending so the longest specific term wins when
 * candidates overlap (e.g. "computer vision" before "vision"). When two
 * aliases have the same length, slug order is the tiebreaker so the result
 * is deterministic.
 */
function buildAliasIndex(entries: Entry[]): Array<{ alias: string; entry: Entry; rx: RegExp }> {
  const out: Array<{ alias: string; entry: Entry; rx: RegExp }> = [];
  for (const e of entries) {
    for (const alias of aliasesFor(e)) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(`(?<![\\w-])(${escaped})(?![\\w-])`, 'i');
      out.push({ alias, entry: e, rx });
    }
  }
  out.sort((a, b) => {
    if (b.alias.length !== a.alias.length) return b.alias.length - a.alias.length;
    return a.entry.slug.localeCompare(b.entry.slug);
  });
  return out;
}

/**
 * Untouchable segments: fenced code blocks, inline code spans, existing
 * markdown links, and image refs. The linker only mutates linkable segments.
 */
type Segment = { kind: 'linkable' | 'skip'; text: string };

const SKIP_RX = /(```[\s\S]*?```|`[^`\n]*`|!\[[^\]]*\]\([^)]*\)|\[[^\]]+\]\([^)]+\))/g;

function tokenize(body: string): Segment[] {
  const segs: Segment[] = [];
  SKIP_RX.lastIndex = 0;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = SKIP_RX.exec(body)) !== null) {
    if (m.index > last) segs.push({ kind: 'linkable', text: body.slice(last, m.index) });
    segs.push({ kind: 'skip', text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < body.length) segs.push({ kind: 'linkable', text: body.slice(last) });
  return segs;
}

/** Strip all `[text](/atlas/...)` markdown links, replacing each with its display text. */
function stripExistingAtlasLinks(body: string): string {
  // Repeat until stable to unwind any accidental nesting from previous runs.
  let prev = body;
  for (let i = 0; i < 8; i++) {
    const next = prev.replace(/\[([^\][]+)\]\(\/atlas\/[^)]+\)/g, '$1');
    if (next === prev) break;
    prev = next;
  }
  return prev;
}

function linkInFile(
  entry: Entry,
  index: Array<{ alias: string; entry: Entry; rx: RegExp }>,
): { newBody: string; added: number } {
  const cleanBody = stripExistingAtlasLinks(entry.body);
  let segs = tokenize(cleanBody);
  const usedSlugs = new Set<string>([entry.slug]); // never self-link
  let added = 0;

  for (const { entry: target, rx } of index) {
    if (usedSlugs.has(target.slug)) continue;
    // Find the first linkable segment containing this alias and split it.
    let inserted = false;
    for (let i = 0; i < segs.length && !inserted; i++) {
      const seg = segs[i];
      if (seg.kind !== 'linkable') continue;
      const match = rx.exec(seg.text);
      if (!match) continue;
      const matched = match[1];
      const pre = seg.text.slice(0, match.index);
      const post = seg.text.slice(match.index + matched.length);
      const linkText = `[${matched}](${target.url})`;
      const replacement: Segment[] = [];
      if (pre.length > 0) replacement.push({ kind: 'linkable', text: pre });
      replacement.push({ kind: 'skip', text: linkText });
      if (post.length > 0) replacement.push({ kind: 'linkable', text: post });
      segs = segs.slice(0, i).concat(replacement, segs.slice(i + 1));
      usedSlugs.add(target.slug);
      added++;
      inserted = true;
    }
  }

  return { newBody: segs.map((s) => s.text).join(''), added };
}

function main() {
  const entries = walk();
  if (entries.length === 0) {
    console.error('No Atlas entries found.');
    process.exit(1);
  }
  const index = buildAliasIndex(entries);
  let filesUpdated = 0;
  let linksAdded = 0;
  const perFile: Array<{ file: string; added: number }> = [];

  for (const entry of entries) {
    const { newBody, added } = linkInFile(entry, index);
    if (newBody !== entry.body) {
      fs.writeFileSync(entry.filePath, entry.fmRaw + newBody, 'utf8');
      filesUpdated++;
      linksAdded += added;
      perFile.push({ file: path.relative(process.cwd(), entry.filePath), added });
    }
  }

  console.log('— Atlas auto-linker —');
  console.log(`scanned: ${entries.length} files`);
  console.log(`updated: ${filesUpdated} files`);
  console.log(`added:   ${linksAdded} links`);
  if (perFile.length > 0) {
    console.log('\ntop 20 by links added:');
    for (const r of perFile.sort((a, b) => b.added - a.added).slice(0, 20)) {
      console.log(`  ${r.added.toString().padStart(3)}  ${r.file}`);
    }
    if (perFile.length > 20) console.log(`  …and ${perFile.length - 20} more`);
  }
}

main();
