/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

/** Unit tests for plain TypeScript modules in src/. Browser tests live in e2e/ (Playwright). */
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
