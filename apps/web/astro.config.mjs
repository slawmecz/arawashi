// @ts-check
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

/** Origin of the signup Worker (from the build environment), allowed in the CSP connect-src. */
function signupOrigin() {
  try {
    return new URL(process.env.PUBLIC_SIGNUP_ENDPOINT ?? '').origin;
  } catch {
    return null;
  }
}

const TURNSTILE = 'https://challenges.cloudflare.com';
/** Google Maps embed on the contact page; it loads only after a click (MapOnClick). */
const GOOGLE_MAPS = 'https://www.google.com';

/**
 * SITE_STAGE=test builds the public test copy at test.arawashi.eu: every page is noindex,
 * robots.txt disallows crawling, there is no sitemap and a banner says it is a test version.
 * Set as a repository variable for the deploy workflow; remove it for the real launch.
 */
const isTestStage = process.env.SITE_STAGE === 'test';

// https://astro.build/config
export default defineConfig({
  // Content Security Policy as a <meta> tag (GitHub Pages cannot send HTTP headers).
  // Astro adds hashes for its own scripts and styles; everything else is same-origin only,
  // except the Turnstile widget on the signup page and the signup Worker endpoint.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        `connect-src 'self' ${[TURNSTILE, signupOrigin()].filter(Boolean).join(' ')}`,
        `frame-src ${TURNSTILE} ${GOOGLE_MAPS}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      scriptDirective: { resources: ["'self'", TURNSTILE] },
    },
  },
  // Production URL, used for canonical links, Open Graph tags and the sitemap.
  site: isTestStage ? 'https://test.arawashi.eu' : 'https://arawashi.eu',
  // Fully static output: the site is hosted on GitHub Pages, which cannot run server code.
  output: 'static',
  // Pages are built as folders with index.html, so every URL ends with a slash.
  trailingSlash: 'always',
  // Classic HTML whitespace collapsing: keeps a single space between a line of text and a
  // following inline element (Astro 7's default 'jsx' mode would glue them together).
  compressHTML: true,
  // React is used only for a few interactive islands (signup form, schedule filter).
  integrations: [
    react(),
    // Pages marked noindex (e.g. the draft privacy policy) are left out of the sitemap;
    // the test copy has none.
    ...(isTestStage
      ? []
      : [sitemap({ filter: (page) => !page.includes('/polityka-prywatnosci/') })]),
  ],
  // Photos from the CMS are downloaded and optimised at build time, so visitors never
  // request them from a third-party CDN.
  image: {
    domains: ['cdn.sanity.io'],
  },
  // No code blocks on this site; Shiki's inline styles would also conflict with the CSP.
  markdown: { syntaxHighlight: false },
  // Build-time configuration. All values are optional so the site also builds without them.
  env: {
    schema: {
      PUBLIC_SIGNUP_ENDPOINT: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      SITE_STAGE: envField.enum({
        context: 'server',
        access: 'public',
        values: ['production', 'test'],
        default: 'production',
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
