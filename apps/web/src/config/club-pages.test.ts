import { describe, expect, it } from 'vitest';
import { clubPages } from './club-pages';
import { mainNav, partners, signupLink } from './site';

describe('clubPages', () => {
  it('shows the 1.5% tax page only for public benefit organisations', () => {
    const hrefs = (isOpp: boolean) => clubPages(isOpp).map((page) => page.href);
    expect(hrefs(false)).not.toContain('/klub/przekaz-1-5-procent/');
    expect(hrefs(true)).toContain('/klub/przekaz-1-5-procent/');
  });

  it('uses trailing-slash URLs under /klub/', () => {
    for (const page of clubPages(true)) expect(page.href).toMatch(/^\/klub\/[a-z0-9-]+\/$/);
  });
});

describe('site config', () => {
  it('menu and call-to-action links are unique trailing-slash paths', () => {
    const hrefs = [...mainNav, signupLink].map((link) => link.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) expect(href).toMatch(/^\/[a-z0-9-]+\/$/);
  });

  it('partner links use https', () => {
    for (const partner of partners) expect(partner.href).toMatch(/^https:\/\//);
  });
});
