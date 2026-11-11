# Architecture decision records

Short records of the main technical decisions, in the
[MADR](https://adr.github.io/madr/) style: context, decision, alternatives and consequences.

| #                                         | Decision                                               | Status   |
| ----------------------------------------- | ------------------------------------------------------ | -------- |
| [0001](0001-static-site-with-astro.md)    | Static site built with Astro and React islands         | Accepted |
| [0002](0002-hosting-on-github-pages.md)   | Hosting on GitHub Pages, deployed by GitHub Actions    | Accepted |
| [0003](0003-content-in-a-headless-cms.md) | Club content in a headless CMS (Sanity), not in git    | Accepted |
| [0004](0004-signup-form-on-a-worker.md)   | Signup form handled by a stateless Cloudflare Worker   | Accepted |
| [0005](0005-quality-gates.md)             | Quality gates: lint, types, tests, accessibility in CI | Accepted |
