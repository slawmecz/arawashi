import { expect, test } from '@playwright/test';

/** Behaviour added in the front-end review: menu, responsive header, cards, form, motion. */

const PAGES = [
  '/',
  '/aktualnosci/',
  '/aktualnosci/testowa-aktualnosc/',
  '/klub/',
  '/klub/kadra/',
  '/klub/faq/',
  '/treningi/',
  '/obozy/',
  '/kontakt/',
  '/zapisz-sie/',
  '/polityka-prywatnosci/',
];

test('the contact page loads the Google map only after a click', async ({ page }) => {
  const googleRequests: string[] = [];
  await page.route('https://www.google.com/**', (route) => {
    googleRequests.push(route.request().url());
    return route.abort();
  });
  await page.goto('/kontakt/');
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(googleRequests).toEqual([]);

  await page.getByRole('button', { name: 'Pokaż mapę' }).first().click();
  const map = page.locator('iframe[title^="Mapa"]').first();
  await expect(map).toHaveAttribute(
    'src',
    /^https:\/\/www\.google\.com\/maps\?q=Sala%20testowa%2C/,
  );
  // Typesetting characters (non-breaking space, word joiner) must not leak into the query.
  expect(await map.getAttribute('src')).not.toMatch(/%C2%A0|%E2%81%A0/);
});

test('the mobile menu closes on a tap outside it', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The collapsible menu is only shown on small screens.');
  await page.goto('/klub/');
  const summary = page.locator('summary', { hasText: 'Menu' });
  const menu = page.getByRole('navigation', { name: 'Menu mobilne' });

  await summary.click();
  await expect(menu).toBeVisible();
  // Tap the left end of the page title; the open panel covers the right side.
  await page.getByRole('heading', { level: 1 }).click({ position: { x: 4, y: 8 } });
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/\/klub\/$/);
});

test('with the keyboard, the menu closes on Escape (focus back on Menu) and when focus leaves it', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Keyboard navigation is tested on desktop, here at a phone width.');
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/klub/');
  const summary = page.locator('summary', { hasText: 'Menu' });
  const menu = page.getByRole('navigation', { name: 'Menu mobilne' });

  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  // Move into the menu first, so the focus check below proves the script moved it back.
  await page.keyboard.press('Tab');
  await expect(menu.getByRole('link', { name: 'Strona główna' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(summary).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  // Every link in the menu (signup included), then one more Tab leaves the menu.
  const links = await menu.getByRole('link').count();
  for (let i = 0; i <= links; i += 1) await page.keyboard.press('Tab');
  await expect(menu).toBeHidden();
});

test('tablets get the Menu button with the signup button beside it, on one line', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Uses a tablet-sized desktop viewport.');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Menu główne' })).toBeHidden();
  await expect(page.locator('summary', { hasText: 'Menu' })).toBeVisible();
  const cta = page.getByRole('banner').getByRole('link', { name: 'Zapisz się', exact: true });
  await expect(cta).toBeVisible();
  // One box, not split over two lines.
  expect(await cta.evaluate((el) => el.getClientRects().length)).toBe(1);
});

test('no page scrolls sideways on a small phone or a tablet', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Viewport sizes are set explicitly.');
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
    }
  }
});

test('a news card opens the post wherever it is tapped', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('li', {
    has: page.getByRole('link', { name: 'Testowa aktualność', exact: true }),
  });
  // Tap the card's corner (padding), away from the title text: the stretched link covers it.
  await card.click({ position: { x: 8, y: 8 } });
  await expect(page).toHaveURL(/\/aktualnosci\/testowa-aktualnosc\/$/);
});

test('club sub-pages link back to the club page', async ({ page }) => {
  await page.goto('/klub/kadra/');
  await page.getByRole('link', { name: '← Poznaj Arawashi' }).click();
  await expect(page).toHaveURL(/\/klub\/$/);
});

test('colour transitions are switched off for visitors who prefer reduced motion', async ({
  page,
}) => {
  const linkTransition = async () => {
    await page.goto('/kontakt/');
    return page
      .getByRole('link', { name: 'Wypełnij formularz.' })
      .evaluate((el) => getComputedStyle(el).transitionDuration);
  };
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await linkTransition()).toBe('0.15s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await linkTransition()).toBe('0s');
});
