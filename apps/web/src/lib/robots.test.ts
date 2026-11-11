import { describe, expect, it } from 'vitest';
import { robotsTxt } from './robots';

describe('robotsTxt', () => {
  it('points crawlers to the sitemap on the production site', () => {
    expect(robotsTxt(false, 'https://arawashi.eu')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://arawashi.eu/sitemap-index.xml\n',
    );
  });

  it('blocks all crawling on the test copy', () => {
    expect(robotsTxt(true, 'https://test.arawashi.eu')).toBe('User-agent: *\nDisallow: /\n');
  });
});
