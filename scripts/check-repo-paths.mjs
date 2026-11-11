#!/usr/bin/env node
/**
 * Repository hygiene guard (runs in CI and can be run locally with `pnpm check:paths`).
 *
 * This repository is public, so it may contain only source code and approved assets.
 * Club content and photos (which can include personal data) live in the CMS, never in git.
 * The check fails when a file that is tracked, or would be added by `git add -A`:
 *   - sits outside the allow-listed top-level paths, or
 *   - is an image, video or document outside the approved asset folders.
 */
import { execFileSync } from 'node:child_process';

/** Top-level files and folders that may exist in the repository. */
const ALLOWED_ROOT_ENTRIES = new Set([
  '.editorconfig',
  '.github',
  '.gitignore',
  '.nvmrc',
  '.prettierignore',
  '.vscode',
  'LICENSE',
  'README.md',
  'apps',
  'docs',
  'eslint.config.js',
  'package.json',
  'packages',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'prettier.config.js',
  'scripts',
]);

const MEDIA_FILE = /\.(avif|gif|heic|ico|jpe?g|png|svg|webp|pdf|docx?|odt|mp4|mov|webm)$/i;
const MEDIA_ALLOWED_IN = [/^apps\/web\/src\/assets\//, /^apps\/web\/public\//];

const files = execFileSync(
  'git',
  ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean);

const problems = [];
for (const file of files) {
  const rootEntry = file.split('/')[0];
  if (!ALLOWED_ROOT_ENTRIES.has(rootEntry)) {
    problems.push(`not allow-listed: ${file}`);
  } else if (MEDIA_FILE.test(file) && !MEDIA_ALLOWED_IN.some((pattern) => pattern.test(file))) {
    problems.push(`media file outside the approved asset folders: ${file}`);
  }
}

if (problems.length > 0) {
  console.error(`Repository hygiene check failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`Repository hygiene check passed (${files.length} files).`);
