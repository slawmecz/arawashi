// @ts-check
/**
 * ESLint flat config for the whole workspace.
 * Recommended JavaScript and TypeScript rules plus the Astro plugin for .astro files.
 * Formatting is left to Prettier.
 */
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // Generated output, dependencies and local-only folders are never linted.
  globalIgnores([
    '**/dist/',
    '**/.astro/',
    '**/node_modules/',
    '**/playwright-report/',
    '**/test-results/',
    'coverage/',
    '_summary/',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
]);
