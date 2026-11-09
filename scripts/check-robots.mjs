#!/usr/bin/env node
// scripts/check-robots.mjs
// Asserts the invariants of lib/robots-data.ts that TypeScript cannot:
//   - unique slugs and unique fameRank
//   - >= 2 sources per robot, every URL https
//   - metaTitle <= 60 chars, metaDescription <= 155 chars
//   - description 100 to 200 words
//   - every atlasLearnLinks href resolves to a content file or an app route
//   - lastVerified is an ISO date
// Usage: node scripts/check-robots.mjs   (exit 1 on any failure)

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const src = readFileSync(path.join(root, 'lib/robots-data.ts'), 'utf8');

// Crude but dependency-free: pull every top-level object literal out of ROBOTS_UNSORTED
// by scanning the array text and splitting on `{\n    slug:` boundaries.
const arrStart = src.indexOf('const ROBOTS_UNSORTED: Robot[] = [');
const arrEnd = src.indexOf('\n];', arrStart);
const body = src.slice(arrStart, arrEnd);
const chunks = body.split(/\n  \{\n\s+slug:/).slice(1).map((c) => 'slug:' + c);

const str = (chunk, key) => {
  // matches key: 'value' | "value" (first occurrence, single line or multi-line template)
  const re = new RegExp(`\\n\\s*${key}:\\s*\\n?\\s*(['"])((?:\\\\.|(?!\\1).)*)\\1`, 's');
  const m = chunk.match(re);
  return m ? m[2].replace(/\\(['"])/g, '$1') : null;
};
const num = (chunk, key) => {
  const m = chunk.match(new RegExp(`\\n\\s*${key}:\\s*(\\d+)`));
  return m ? Number(m[1]) : null;
};
const hrefs = (chunk) => [...chunk.matchAll(/href:\s*'([^']+)'/g)].map((m) => m[1]);
const sourceUrls = (chunk) => {
  const s = chunk.indexOf('sources: [');
  if (s < 0) return [];
  const e = chunk.indexOf(']', s);
  return [...chunk.slice(s, e).matchAll(/url:\s*'([^']+)'/g)].map((m) => m[1]);
};

const errors = [];
const slugs = new Map();
const ranks = new Map();

function routeExists(href) {
  // Atlas content: /atlas/<type>/<slug> -> content/atlas/<type>/<slug>.mdx
  const atlas = href.match(/^\/atlas\/([a-z-]+)\/([a-z0-9-]+)$/);
  if (atlas) return existsSync(path.join(root, 'content/atlas', atlas[1], `${atlas[2]}.mdx`));
  // Robots: /robots/<slug> -> must be a slug in this file
  const robot = href.match(/^\/robots\/([a-z0-9-]+)$/);
  if (robot) return slugs.has(robot[1]);
  // Any other app route: app/<path>/page.tsx or a dynamic segment directory
  const parts = href.replace(/^\//, '').split('/');
  let dir = path.join(root, 'app');
  for (const p of parts) {
    const direct = path.join(dir, p);
    if (existsSync(direct)) { dir = direct; continue; }
    const dyn = ['[slug]', '[id]', '[track]', '[lesson]'].map((d) => path.join(dir, d)).find((d) => existsSync(d));
    if (dyn) { dir = dyn; continue; }
    return false;
  }
  return existsSync(path.join(dir, 'page.tsx')) || existsSync(path.join(dir, 'route.ts'));
}

for (const chunk of chunks) {
  const slug = chunk.match(/^slug:\s*'([^']+)'/)?.[1];
  if (!slug) { errors.push('entry without slug'); continue; }
  if (slugs.has(slug)) errors.push(`${slug}: duplicate slug`);
  slugs.set(slug, chunk);
}

for (const [slug, chunk] of slugs) {
  const rank = num(chunk, 'fameRank');
  if (rank == null) errors.push(`${slug}: missing fameRank`);
  else if (ranks.has(rank)) errors.push(`${slug}: fameRank ${rank} already used by ${ranks.get(rank)}`);
  else ranks.set(rank, slug);

  const urls = sourceUrls(chunk);
  if (urls.length < 2) errors.push(`${slug}: ${urls.length} source(s), need >= 2`);
  for (const u of urls) if (!/^https:\/\//.test(u)) errors.push(`${slug}: source URL not https: ${u}`);

  const mt = str(chunk, 'metaTitle');
  if (!mt) errors.push(`${slug}: missing metaTitle`);
  else if (mt.length > 60) errors.push(`${slug}: metaTitle ${mt.length} chars (> 60): "${mt}"`);

  const md = str(chunk, 'metaDescription');
  if (!md) errors.push(`${slug}: missing metaDescription`);
  else if (md.length > 155) errors.push(`${slug}: metaDescription ${md.length} chars (> 155)`);

  const desc = str(chunk, 'description');
  if (!desc) errors.push(`${slug}: missing description`);
  else {
    const words = desc.trim().split(/\s+/).length;
    if (words < 100 || words > 200) errors.push(`${slug}: description ${words} words (need 100 to 200)`);
  }

  const lv = str(chunk, 'lastVerified');
  if (!lv || !/^\d{4}-\d{2}-\d{2}$/.test(lv)) errors.push(`${slug}: lastVerified missing or not YYYY-MM-DD`);

  for (const h of hrefs(chunk)) {
    if (!routeExists(h)) errors.push(`${slug}: atlasLearnLinks href does not resolve: ${h}`);
  }

  const atlasSlug = str(chunk, 'atlasSlug');
  if (atlasSlug && !existsSync(path.join(root, 'content/atlas/concept', `${atlasSlug}.mdx`))) {
    errors.push(`${slug}: atlasSlug has no content file: content/atlas/concept/${atlasSlug}.mdx`);
  }

  // Em-dash budget: at most 2 per field keeps the prose from reading as machine-written.
  for (const key of ['oneLiner', 'hookLine', 'inOneSentence', 'description', 'teamBehind', 'popCulture']) {
    const v = str(chunk, key);
    if (v && (v.match(/—/g) ?? []).length > 2) errors.push(`${slug}: ${key} has more than 2 em-dashes`);
  }
}

console.log(`check-robots: ${slugs.size} robots, ${ranks.size} unique ranks`);
if (errors.length) {
  for (const e of errors) console.error('  FAIL ' + e);
  console.error(`check-robots: ${errors.length} problem(s)`);
  process.exit(1);
}
console.log('check-robots: all checks passed');
