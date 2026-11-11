import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env['CI']);

/** Fake signup endpoint baked into the test build; tests intercept requests to it. */
export const TEST_SIGNUP_ENDPOINT = 'https://signup.test/signup';

/**
 * End-to-end and accessibility tests. The web server builds the site with synthetic
 * fixture content and a fake signup endpoint, then serves it with `astro preview`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // `astro preview` is a single dev-grade server; too many parallel browsers overload it.
  workers: isCI ? 2 : 4,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: !isCI,
    timeout: 180_000,
    env: {
      CONTENT_SOURCE: 'fixtures',
      PUBLIC_SIGNUP_ENDPOINT: TEST_SIGNUP_ENDPOINT,
    },
  },
});
