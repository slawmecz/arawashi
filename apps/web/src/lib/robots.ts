/**
 * robots.txt content. The production site points crawlers to the sitemap; the public test
 * copy (SITE_STAGE=test) asks them not to crawl anything.
 */
export function robotsTxt(isTest: boolean, site: URL | string): string {
  if (isTest) return 'User-agent: *\nDisallow: /\n';
  const sitemap = new URL('sitemap-index.xml', site).href;
  return `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`;
}
