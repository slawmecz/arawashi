# 0003 – Club content in a headless CMS (Sanity), not in git

- **Status:** Accepted (subject to a usability test with the club's editors)
- **Date:** 2026-11-06

## Context

Non-technical club staff must be able to log in and update news, the schedule, camps,
achievements, coaches and documents themselves, often from a phone. The code repository is
**public**, and the content includes personal data, such as names and photos of minors, that
must not end up in git history: removing a file from history requires a rewrite and cannot
reach existing clones.

## Decision

Store all editable content in **Sanity** (free plan). The Studio has a Polish UI, Google login
and schema-as-code in TypeScript. At build time an Astro content loader fetches **published**
documents only; images are served through Sanity's CDN and optimised by Astro. Publishing a
document triggers a webhook that starts the deploy workflow (`workflow_dispatch`).

Guardrails built into the schema:

- A news photo cannot be published until the editor confirms parental consent, or that no
  child can be identified.
- Alt text is required for every image.
- Signup data, consent records and internal notes are never stored in the CMS.

## Alternatives considered

- **Git-based CMSs (Decap, Sveltia, TinaCMS, Keystatic)**: free and simple, but they commit
  content and photos into the repository. That conflicts with a public repo and with the right
  to erasure. Editors also usually need a GitHub account.
- **Headless WordPress on the existing hosting**: familiar editor and data kept in Poland. It
  requires permanent patching and is the fallback if the editors' test of Sanity fails.
- **A custom admin panel** (e.g. Cloudflare Workers + D1 + R2): the best fit for the editors,
  but several weeks of work, and the developer would own authentication, backups and account
  recovery. It may become a separate demo project.
- **Storyblok, Contentful, Hygraph, Prismic, Strapi, Directus**: weaker free tiers for this
  use case (seats, quotas, data location, a missing Polish UI or a paid cloud plan).

## Consequences

- The repository stays free of club content; erasing a photo happens in the CMS.
- Free-plan datasets are public, so only content meant for publication is stored there.
- Content is backed up with periodic exports to a private location.
- Previews before publishing are limited on a static host; editors publish, then check the
  live site a few minutes later.
