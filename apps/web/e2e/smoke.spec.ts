import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Every page of the fixtures build; each one gets an automated accessibility scan. */
const PAGES = [
  '/',
  '/aktualnosci/',
  '/aktualnosci/testowa-aktualnosc/',
  '/klub/',
  '/klub/kadra/',
  '/klub/osiagniecia/',
  '/klub/dokumenty/',
  '/klub/faq/',
  '/klub/przekaz-1-5-procent/',
  '/treningi/',
  '/obozy/',
  '/kontakt/',
  '/zapisz-sie/',
  '/polityka-prywatnosci/',
];

/** WCAG 2.0, 2.1 and 2.2 level A and AA rules. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test('home page shows the slogan and both calls to action', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Arawashi/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /Szacunek, dyscyplina, charakter/i,
  );
  await expect(page.getByRole('link', { name: 'Zapisz się do klubu' })).toHaveAttribute(
    'href',
    '/zapisz-sie/',
  );
  await expect(page.getByRole('link', { name: 'Poznaj Arawashi' })).toHaveAttribute(
    'href',
    '/klub/',
  );
});

test('footer links to every partner organisation and the privacy policy', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');

  for (const href of [
    'https://www.siechnice.gmina.pl/',
    'https://karate-polska.pl/',
    'https://www.wkf.net/',
    '/polityka-prywatnosci/',
  ]) {
    await expect(footer.locator(`a[href="${href}"]`)).toBeVisible();
  }
});

test('mobile menu opens and links to the main sections', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The collapsible menu is only shown on small screens.');
  await page.goto('/');

  await page.locator('summary', { hasText: 'Menu' }).click();
  const menu = page.getByRole('navigation', { name: 'Menu mobilne' });
  await expect(menu.getByRole('link', { name: 'Treningi' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Zapisz się' })).toBeVisible();
});

test('the current section is marked in the main menu', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The desktop menu is hidden on small screens.');
  await page.goto('/klub/kadra/');
  const menu = page.getByRole('navigation', { name: 'Menu główne' });
  await expect(menu.getByRole('link', { name: 'Klub' })).toHaveAttribute('aria-current', 'true');
});

test('unknown URLs show the 404 page', async ({ page }) => {
  const response = await page.goto('/ta-strona-nie-istnieje/');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Nie znaleziono strony/i);
});

test('every internal link points to an existing page', async ({ page, request }) => {
  const seen = new Set<string>();
  for (const path of PAGES) {
    await page.goto(path);
    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
    for (const href of hrefs) seen.add(href.split('#')[0] ?? href);
  }
  for (const href of seen) {
    const response = await request.get(href);
    expect(response.status(), `broken link: ${href}`).toBe(200);
  }
});

for (const path of PAGES) {
  test(`${path} has no detectable WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('no page violates the Content Security Policy', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (/Content Security Policy|Refused to/i.test(message.text())) violations.push(message.text());
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(`Refused to load: ${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }
  expect(violations).toEqual([]);
});
