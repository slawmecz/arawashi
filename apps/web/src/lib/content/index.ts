/**
 * Single entry point for page content, resolved once per build:
 * - Sanity, when SANITY_PROJECT_ID is set (production builds in GitHub Actions);
 * - synthetic fixtures, when CONTENT_SOURCE=fixtures (E2E tests and local UI work);
 * - otherwise empty content, so every page shows its "coming soon" state
 *   instead of invented data.
 * Polish typesetting (non-breaking spaces) is applied to the displayed text of every source.
 */
import { FIXTURE_CONTENT } from './fixtures';
import { fetchSanityContent } from './sanity';
import { EMPTY_CONTENT, siteContentSchema, type SiteContent } from './schema';
import { typesetContent } from './typeset';

export type { SiteContent } from './schema';

let cached: Promise<SiteContent> | undefined;

async function load(): Promise<SiteContent> {
  const projectId = process.env['SANITY_PROJECT_ID'];
  if (projectId) {
    const dataset = process.env['SANITY_DATASET'] || 'production';
    const token = process.env['SANITY_READ_TOKEN'] || undefined;
    return siteContentSchema.parse(await fetchSanityContent({ projectId, dataset, token }));
  }
  if (process.env['CONTENT_SOURCE'] === 'fixtures') return siteContentSchema.parse(FIXTURE_CONTENT);
  return EMPTY_CONTENT;
}

/** Returns the site content (fetched once and shared by all pages of a build). */
export function getSiteContent(): Promise<SiteContent> {
  cached ??= load().then(typesetContent);
  return cached;
}
