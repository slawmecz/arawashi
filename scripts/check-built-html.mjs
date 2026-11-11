#!/usr/bin/env node
/**
 * Polish typography check of the built website. Runs in CI after each build; locally:
 * `pnpm check:html` (checks apps/web/dist) or `node scripts/check-built-html.mjs <dir>`.
 *
 * It fails on a space before . , ; : ! ? (e.g. a full stop on its own line after </a>, which
 * the formatter produces and HTML renders as "Skontaktuj się z nami ."; fix: put the full stop
 * inside the link text) and on one-letter words (a, i, o, u, w, z) that can be left hanging at
 * the end of a line (fix: &nbsp; in templates, the helpers in apps/web/src/lib/typography.ts
 * for CMS text). The rules are in scripts/lib/typography-check.mjs.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { findTypographyProblems } from './lib/typography-check.mjs';

const root = process.argv[2] ?? 'apps/web/dist';

const htmlFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });

const files = htmlFiles(root);
if (files.length === 0) {
  console.error(`No HTML files found in ${root}. Build the website first.`);
  process.exit(1);
}

const problems = files.flatMap((file) =>
  findTypographyProblems(readFileSync(file, 'utf8')).map((p) => `${relative(root, file)}: ${p}`),
);
if (problems.length > 0) {
  console.error(
    `Typography check failed (${problems.length}):\n${problems.map((p) => `  - ${p}`).join('\n')}`,
  );
  process.exit(1);
}
console.log(`Typography check passed (${files.length} pages in ${root}).`);
