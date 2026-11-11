# 0004 – Signup form handled by a stateless Cloudflare Worker

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

Parents sign their children up through a form: the child's name and date of birth, the
training group, and the parent's name, phone and e-mail. The data concerns minors and falls
under GDPR, so collection must be minimal and the data should not be stored by the website.
GitHub Pages cannot run server code.

## Decision

The form posts to a small **Cloudflare Worker** written in TypeScript. The Worker:

1. accepts requests only from the site's origin (CORS allow-list) and applies a per-IP
   rate limit;
2. drops bot submissions: honeypot field, minimum fill time, **Turnstile** token check;
3. validates the payload with the same **Zod** schema the browser uses (a shared package);
4. sends one e-mail to the club inbox through a transactional e-mail API (Brevo, EU),
   with `Reply-To` set to the parent;
5. stores nothing and does not log request bodies.

Only the six fields in the brief are collected, plus two required declarations (the parent
has read the information clause and is the child's parent or legal guardian). There is no
free-text field, so no health or other special-category data arrives by accident.

## Alternatives considered

- **A PHP endpoint on the existing hosting**: data stays with a Polish host, but anti-spam
  and rate limiting would be hand-written and the form would depend on the paid plan. It is
  the fallback if the club rejects Cloudflare or Brevo.
- **Hosted form backends (Formspree, Web3Forms, Basin)**: quick to set up, but they store
  submissions with another processor, often outside the EU, and have small free quotas.
- **Google Forms**: no control over the UX, and it adds Google tracking to the signup flow.

## Consequences

- Free at this scale (Workers and Brevo free tiers).
- Two additional processors (Cloudflare, Brevo) must be listed in the privacy policy, with
  their data processing agreements accepted.
- The Turnstile script is the only third-party request on the site, loaded only on the
  signup page.
- The handler is a pure function with injected dependencies, so it is unit-tested without
  the Workers runtime.
