# 0005 – Quality gates: lint, types, tests and accessibility in CI

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

The site is maintained by one developer and will be handed over to a non-technical club, so
regressions must be caught automatically. The repository is also a portfolio piece, so the
tooling should be standard and easy to read. It must not outweigh the size of the site.

## Decision

Every pull request and every push to `main` runs one CI job:

1. a **repository hygiene check**: an allow-list of top-level paths, plus a rule that images
   and documents may only live in the approved asset folders, so club content cannot be
   committed by accident;
2. **ESLint** (flat config, typescript-eslint, eslint-plugin-astro) and **Prettier**;
3. **`astro check`** with TypeScript 6 in the `strictest` preset;
4. **Vitest** unit tests for helpers and validation schemas;
5. a production **build**;
6. **Playwright** end-to-end tests on desktop and mobile viewports, with **axe-core** scans
   that fail on any WCAG 2.2 A/AA violation;
7. a **Polish typography check** of the built HTML (added 2026-11-08), run on both the empty
   launch-day build and the fixtures build: it fails on a space before punctuation and on
   one-letter words left breakable at a line end. The checker has its own unit tests.

Dependabot proposes monthly grouped updates for npm packages and GitHub Actions.
pnpm's default minimum release age (1 day) blocks freshly published packages.

## Alternatives considered

- **Biome or Oxlint instead of ESLint + Prettier**: faster, but their Astro support is still
  experimental. Revisit in 2027.
- **eslint-plugin-jsx-a11y**: does not support ESLint 10 yet. Accessibility is covered by the
  axe scans in the E2E suite.
- **Lighthouse CI, visual regression, release automation**: useful later; added one at a
  time after launch so the tooling stays proportional to the site.
- **TypeScript 7**: not yet supported by `astro check` and typescript-eslint. Dependabot
  ignores TypeScript major updates until it is.

## Consequences

- A broken page, an accessibility regression or a stray photo fails CI before deployment.
- Local runs need a one-time `playwright install chromium`.
