// scripts/generate-atlas-terms-v2.ts
// V2 generator: deep-body terms with the new bucket/difficulty/quiz schema.
// Idempotent — never overwrites existing files.
// Run: npx tsx scripts/generate-atlas-terms-v2.ts

import fs from 'node:fs';
import path from 'node:path';
import { mdxFor } from './atlas/v2-types';
import { TERMS_BATCH_1 } from './atlas/v2-data-1';
import { TERMS_BATCH_2 } from './atlas/v2-data-2';
import { TERMS_BATCH_3 } from './atlas/v2-data-3';
import { TERMS_BATCH_4 } from './atlas/v2-data-4';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'atlas', 'concept');

async function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  const TERMS = [...TERMS_BATCH_1, ...TERMS_BATCH_2, ...TERMS_BATCH_3, ...TERMS_BATCH_4];
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const t of TERMS) {
    const target = path.join(CONTENT_DIR, `${t.slug}.mdx`);
    if (fs.existsSync(target)) {
      console.log(`skip  ${t.slug} (exists)`);
      skipped++;
      continue;
    }
    try {
      const mdx = mdxFor(t);
      fs.writeFileSync(target, mdx, 'utf8');
      console.log(`write ${t.slug}`);
      created++;
    } catch (e) {
      errors.push(`${t.slug}: ${(e as Error).message}`);
    }
  }

  console.log(`\nV2 atlas generation complete:`);
  console.log(`  created: ${created}`);
  console.log(`  skipped (already existed): ${skipped}`);
  console.log(`  total in registry: ${TERMS.length}`);
  if (errors.length) {
    console.log(`  errors: ${errors.length}`);
    errors.forEach((e) => console.log(`    - ${e}`));
  }
}

main();
