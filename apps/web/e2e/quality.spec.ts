import { expect, test } from '@playwright/test';

/** Pages that must be indexed by search engines (fixtures build). */
const INDEXED = [
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
];

test('every page has one h1, a canonical URL, a unique title and Open Graph tags', async ({
  page,
}) => {
  const titles = new Set<string>();
  for (const path of INDEXED) {
    await page.goto(path);
    await expect(page.locator('h1'), path).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]'), path).toHaveAttribute(
      'href',
      `https://arawashi.eu${path}`,
    );
    await expect(page.locator('meta[property="og:image"]'), path).toHaveAttribute(
      'content',
      'https://arawashi.eu/og-default.png',
    );
    await expect(page.locator('meta[name="robots"]'), path).toHaveCount(0);
    titles.add(await page.title());
  }
  expect(titles.size).toBe(INDEXED.length);
});

test('the draft privacy policy and the 404 page are not indexed', async ({ page }) => {
  for (const path of ['/polityka-prywatnosci/', '/404.html']) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute('content', 'noindex');
  }
});

test('robots.txt and the sitemap are published', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Sitemap: https://arawashi.eu/sitemap-index.xml');

  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  expect(sitemap).toContain('<loc>https://arawashi.eu/treningi/</loc>');
  expect(sitemap).not.toContain('polityka-prywatnosci');
});

test('the skip link moves keyboard users to the main content', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is tested on desktop.');
  await page.goto('/kontakt/');
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Przejdź do treści' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#tresc$/);
});

test('the home page publishes SportsOrganization structured data', async ({ page }) => {
  await page.goto('/');
  const json = await page.locator('script[type="application/ld+json"]').textContent();
  const data = JSON.parse(json ?? '{}') as Record<string, unknown>;
  expect(data['@type']).toBe('SportsOrganization');
  expect(data['sport']).toBe('Karate');
});

test('the signup form can be completed with the keyboard only', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is tested on desktop.');
  await page.route('https://signup.test/signup', (route) => route.fulfill({ json: { ok: true } }));
  await page.goto('/zapisz-sie/');
  await page.waitForLoadState('networkidle');

  await page.getByLabel('Imię i nazwisko dziecka').focus();
  await page.keyboard.type('Jan Testowy');
  await page.keyboard.press('Tab');
  await page.keyboard.type('2016-05-20'); // ignored by some date pickers, so set it explicitly below
  await page.getByLabel('Data urodzenia dziecka').fill('2016-05-20');
  await page.getByLabel('Grupa treningowa').focus();
  await page.keyboard.press('ArrowDown');
  for (const [label, text] of [
    ['Imię i nazwisko', 'Anna Testowa'],
    ['Telefon', '600 700 800'],
    ['E-mail', 'anna@example.com'],
  ] as const) {
    await page.getByLabel(label, { exact: true }).focus();
    await page.keyboard.type(text);
  }
  await page.getByLabel(/Zapoznałem\/am się/).focus();
  await page.keyboard.press('Space');
  // The label contains a link, which is the next tab stop; then the second checkbox.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /informacją o przetwarzaniu/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel(/Jestem rodzicem lub opiekunem/)).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Wyślij zgłoszenie' })).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('status')).toContainText('Dziękujemy!');
});
