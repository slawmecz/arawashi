# Setup and deployment

Everything needed to take the site from this repository to `https://arawashi.eu`.
Each step lists where to click and what to copy where. Steps 1–2 are enough for a first
deployment with "coming soon" pages; steps 3–5 connect the CMS and the signup form.

> Create the service accounts (Sanity, Cloudflare, Brevo) under a **club-owned** Google account
> and add yourself as a member: the club is the data controller and must be able to take over.

## 0. Optional: public test copy at `test.arawashi.eu`

Lets the club see the site before launch without touching the current website or e-mail.

1. Verify the domain as in step 1.2 below.
2. In the DNS provider's panel add **`test` CNAME `<github-user>.github.io.`** (in DirectAdmin
   keep the trailing dot, otherwise the panel appends the zone name).
3. Repository **Settings → Secrets and variables → Actions → Variables:** `SITE_STAGE` = `test`.
   The build then marks every page `noindex`, blocks crawling in `robots.txt`, drops the
   sitemap and shows a "Wersja testowa" banner.
4. Repository **Settings → Pages:** Source _GitHub Actions_, custom domain `test.arawashi.eu`;
   tick **Enforce HTTPS** once the certificate is issued.

**At launch:** delete the `SITE_STAGE` variable, change the custom domain to `arawashi.eu`
(steps 1–2) and remove the `test` CNAME.

## 1. GitHub Pages

1. **Repository → Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Verify the domain first** (prevents domain takeover): profile **Settings → Pages →
   Add a domain** → `arawashi.eu` → create the shown TXT record
   (`_github-pages-challenge-<user>.arawashi.eu`) in the DNS provider's panel → **Verify**.
3. **Repository → Settings → Pages → Custom domain:** `arawashi.eu` → Save.
4. Run **Actions → Deploy to GitHub Pages → Run workflow** (it also runs on every push to `main`).

## 2. DNS (keep the e-mail working)

A day before, lower the TTL of the `@` and `www` records to 300 and export the zone as a backup.

| Record                           | Change to                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| `@` A                            | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (4 records)     |
| `@` AAAA (optional)              | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| `www`                            | delete the A record, add `CNAME` → `<github-user>.github.io`                               |
| **MX, `mail`, SPF, DKIM, DMARC** | **do not touch**                                                                           |

After DNS propagates, tick **Enforce HTTPS** in the repository Pages settings (it can take up to
24 hours to become available). Rollback: restore the old `@` and `www` records.

## 3. Sanity (content editing)

1. Create a project at <https://www.sanity.io/manage> (Free plan), dataset `production`,
   **public** visibility.
2. `cp apps/studio/.env.example apps/studio/.env` and set `SANITY_STUDIO_PROJECT_ID`.
3. `pnpm studio:dev` to try it locally, then `pnpm --filter @arawashi/studio deploy` →
   the Studio is published at `https://arawashi.sanity.studio`.
4. **Manage → Members → Invite** the editors (Google accounts).
5. Repository **Settings → Secrets and variables → Actions → Variables**:
   `SANITY_PROJECT_ID` = project ID, `SANITY_DATASET` = `production`.
   _Privacy note:_ in a public dataset every uploaded file is reachable by its URL as soon as it
   is uploaded, even before publishing. Editors must upload photos only after consent exists. For
   stronger protection make the dataset **private** (a paid Sanity plan): create a read-only API
   token and add it as the repository **secret** `SANITY_READ_TOKEN` (the deploy workflow already
   passes it to the build when it exists).
6. Start by filling **Dane klubu i kontakt**, then groups, schedule and documents. The phone
   number, e-mail and Facebook/Instagram addresses matter most: until they are set, the pages
   point visitors to the signup form instead of the contact page, and the social icons are hidden.
7. Optional: **Dane klubu i kontakt → Zdjęcie w tle hasła** adds the home page hero photo (a
   generic karate photo with no recognisable children; its source and licence are required).
   Drag the focal point onto the subject: phones show a portrait crop around it, larger screens a
   wide crop. Without a photo the hero keeps its dark gradient. A dark, low-key photo with the
   subject on the right suits the layout best; the text stays readable on any photo.

### Rebuild on publish (webhook)

1. GitHub → profile **Settings → Developer settings → Fine-grained tokens → Generate**:
   repository access _only this repository_, permission **Actions: Read and write**.
   Set an expiry and a calendar reminder to renew it; the nightly scheduled build is the safety net.
2. Sanity **Manage → API → Webhooks → Create**:
   - URL: `https://api.github.com/repos/<github-user>/arawashi/actions/workflows/deploy.yml/dispatches`
   - Dataset: `production`; trigger on create, update and delete; drafts **off**
   - Filter: `_type in ["siteSettings","aboutPage","trainingGroup","scheduleSlot","newsPost","camp","achievement","coach","clubDocument","faqItem"]`
   - Projection: `{"ref": "main"}`; HTTP method `POST`
   - Headers: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`,
     `X-GitHub-Api-Version: 2022-11-28`

Publishing in the Studio now updates the site within a few minutes.

## 4. Signup form (Cloudflare Worker, Turnstile, Brevo)

1. **Brevo**: create an account, then **Senders, domains → Domains → add `arawashi.eu`** and add
   the DKIM and verification records it shows in the DNS provider's panel. Create an API key
   (**SMTP & API → API keys**). Accept the data processing agreement in the account settings.
2. **Cloudflare dashboard → Turnstile → Add widget**: hostnames `arawashi.eu`, `www.arawashi.eu`
   (and `localhost` for testing), mode _Managed_. Copy the site key and the secret key.
3. Deploy the Worker: see [`apps/signup-worker/README.md`](../apps/signup-worker/README.md)
   (`wrangler login`, three `wrangler secret put` commands, `pnpm deploy`).
4. Repository **Variables**: `PUBLIC_SIGNUP_ENDPOINT` = `https://arawashi-signup.<account>.workers.dev/signup`,
   `PUBLIC_TURNSTILE_SITE_KEY` = the Turnstile site key. Re-run the deploy workflow.
5. Send a test signup and check that the e-mail arrives (also check the spam folder).

## 5. Before announcing the site

- [ ] Club contact data (phone, e-mail, Facebook/Instagram), groups, schedule and the child-protection standards (both versions) are published in the Studio.
- [ ] The privacy policy (`apps/web/src/pages/polityka-prywatnosci.astro`) is completed and approved by the club; then remove its `noindex`.
- [ ] Brevo, Cloudflare and Sanity DPAs are accepted; the club inbox is decided.
- [ ] The old WordPress is backed up privately and removed.
- [ ] Google Search Console: verify the domain (DNS TXT) and submit `https://arawashi.eu/sitemap-index.xml`.
- [ ] Text files are served compressed: `curl -sI -H "Accept-Encoding: gzip" https://arawashi.eu/ | grep -i content-encoding` shows `gzip` (page-speed measurements assume it).
- [ ] Open the site on a real Android phone and an iPhone: the menu, the tap highlight, the signup form and the date picker.
