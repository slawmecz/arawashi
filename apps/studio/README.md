# Sanity Studio

The content editor of the website, in Polish. Club editors log in with Google and manage news,
training groups, the schedule, camps, coaches, achievements, documents, FAQ and contact data.
Publishing triggers a rebuild of the website (see [`docs/setup.md`](../../docs/setup.md)).

- Schemas: [`schemaTypes/documents.ts`](schemaTypes/documents.ts). Field names must match the
  GROQ query in [`apps/web/src/lib/content/sanity.ts`](../web/src/lib/content/sanity.ts).
- Privacy guardrails: every photo needs alt text and a confirmation that the club has consent
  of the people shown (or their parents). The website ignores photos without it.
- Rich text only allows what the site renders, and links must use `https:`, `mailto:` or `tel:`.

```sh
cp .env.example .env     # set SANITY_STUDIO_PROJECT_ID
pnpm dev                 # http://localhost:3333
pnpm deploy              # publishes https://arawashi.sanity.studio
```
