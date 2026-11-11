# 0001 — Static site built with Astro and React islands

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

The website presents a small sports club: news, training schedule, camps, coaches, documents
and a signup form. Most pages are content that changes a few times per season. The site must
be fast on phones, cheap to run, easy to hand over, and should show modern frontend skills.

## Decision

Build the site with **Astro 7** using **static output**. Every page is rendered to HTML at
build time. **React 19** is used only for the few interactive "islands" (the signup form and,
later, the schedule filter). Navigation, FAQ and similar widgets use native HTML elements
(`<details>`, links) and need no JavaScript. Styling uses **Tailwind CSS 4** with brand
tokens. TypeScript runs with Astro's `strictest` preset.

## Alternatives considered

- **Astro with vanilla TypeScript only**: the smallest bundle. Rejected for now because a
  couple of stateful widgets are easier to build and test in React. The site can drop React
  later by deleting the islands.
- **Next.js static export**: a static export loses server actions, route handlers, ISR and the
  default image optimisation, yet still ships the React runtime on every page.
- **SvelteKit / Nuxt**: good static support, but they don't fit the developer's React focus
  any better than Astro.

## Consequences

- Content pages ship about 0 KB of framework JavaScript; images are optimised at build time.
- Update 2026-11-08: a small inline script (about 0.3 KB gzip, bundled and hashed by Astro)
  enhances the native `<details>` mobile menu: it closes on Escape, an outside tap or when
  focus leaves it. The menu still works without JavaScript.
- Server-only Astro features (Actions, server islands, sessions) are not available on a
  static host, so the signup form posts to an external endpoint (see 0004).
- Astro releases majors often. Static output has no runtime attack surface, so upgrades can
  wait until a build breaks or a security advisory applies.
