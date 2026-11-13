/**
 * Single entry point for page content, resolved once per build:
 * - Sanity, when SANITY_PROJECT_ID is set (production builds in GitHub Actions);
 * - synthetic fixtures, when CONTENT_SOURCE=fixtures (E2E tests and local UI work);
 * - the club's content as JSON in CONTENT_JSON, until the CMS is connected. In CI it comes from
 *   the SITE_CONTENT_JSON secret, so the club's data never enters the repository;
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

/**
 * Parses and validates content JSON (the shape of SiteContent). Invalid content fails the build
 * instead of publishing a broken site. The JSON parser's own message is not passed on because it
 * quotes part of the input, which would put the club's data into the public build log.
 */
export function parseContentJson(json: string): SiteContent {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('CONTENT_JSON is not valid JSON. Check the file locally with JSON.parse.');
  }
  return siteContentSchema.parse(data);
}

async function load(): Promise<SiteContent> {
  const projectId = process.env['SANITY_PROJECT_ID'];
  if (projectId) {
    const dataset = process.env['SANITY_DATASET'] || 'production';
    const token = process.env['SANITY_READ_TOKEN'] || undefined;
    return siteContentSchema.parse(await fetchSanityContent({ projectId, dataset, token }));
  }
  if (process.env['CONTENT_SOURCE'] === 'fixtures') return siteContentSchema.parse(FIXTURE_CONTENT);
  const json = process.env['CONTENT_JSON'];
  if (json?.trim()) return parseContentJson(json);
  return EMPTY_CONTENT;
}

/** Returns the site content (fetched once and shared by all pages of a build). */
export function getSiteContent(): Promise<SiteContent> {
  cached ??= load().then(typesetContent);
  return cached;
}
