# Sanity Studio

The content editor of the website, in Polish, published at <https://arawashi.sanity.studio>.
Club editors log in with Google. The menu follows the website's own menu: Aktualności, Treningi
(schedule and groups), Obozy i półkolonie, Klub (about, coaches, achievements, documents, FAQ)
and Kontakt i dane klubu. With the Sanity webhook, publishing updates the website within 2–3
minutes; without it, only GitHub's (often late) scheduled runs rebuild the site (see
[`docs/setup.md`](../../docs/setup.md), "Rebuild on publish").

- Schemas: [`schemaTypes/documents.ts`](schemaTypes/documents.ts). Field names must match the
  GROQ query in [`apps/web/src/lib/content/sanity.ts`](../web/src/lib/content/sanity.ts).
- Kept simple on purpose: few rich-text buttons (style, bold, bullets, link), no developer tools
  for editors, and Growth-plan features switched off (the project runs on the Free plan).
- News addresses fill themselves in from the title
  ([`components/AutoSlugInput.tsx`](components/AutoSlugInput.tsx)) and stay fixed after the first
  publication, so shared links keep working.
- Privacy guardrails: photos are optional; once one is uploaded it needs alt text and a
  confirmation that the club has consent of the people shown (or their parents). The website
  ignores photos without it.
- Rich text only allows what the site renders, and links must use `https:`, `mailto:` or `tel:`.

```sh
pnpm dev                 # http://localhost:3333 (includes the Vision query tool)
npx sanity login         # once per computer
pnpm deploy              # publishes https://arawashi.sanity.studio
```
